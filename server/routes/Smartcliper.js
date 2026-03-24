const express = require('express');
const router = express.Router();
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TMP = '/tmp/ccc-clipper';

// ─── Ensure tmp dir exists ────────────────────────────────────────────────────
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function run(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 300000, maxBuffer: 50 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

function sanitizeId(str) {
  return str.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ─── Check system tools ───────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  const checks = {};
  try { await run('yt-dlp --version'); checks.ytdlp = true; } catch { checks.ytdlp = false; }
  try { await run('ffmpeg -version'); checks.ffmpeg = true; } catch { checks.ffmpeg = false; }
  try { await run('whisper --help'); checks.whisper = true; } catch { checks.whisper = false; }
  res.json({ checks, ready: checks.ytdlp && checks.ffmpeg, note: 'whisper optional — falls back to OpenAI API' });
});

// ─── POST: Clip from YouTube URL or uploaded video ───────────────────────────
router.post('/clip', requireAuth, async (req, res) => {
  const { url, contentPillars, niche, clipCount = 5, maxDuration = 60, captionStyle = 'bold' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const jobId = `job_${Date.now()}_${sanitizeId(req.user.id.toString())}`;
  const jobDir = path.join(TMP, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  // Respond immediately — processing happens async
  res.json({ success: true, job_id: jobId, status: 'processing', message: 'Clipping started — poll /status/:jobId for updates' });

  // Run pipeline async
  runClipPipeline(jobId, jobDir, url, { contentPillars, niche, clipCount, maxDuration, captionStyle, userId: req.user.id })
    .catch(err => {
      console.error(`Clip job ${jobId} failed:`, err.message);
      fs.writeFileSync(path.join(jobDir, 'error.json'), JSON.stringify({ error: err.message }));
    });
});

// ─── The full pipeline ────────────────────────────────────────────────────────
async function runClipPipeline(jobId, jobDir, url, opts) {
  const statusFile = path.join(jobDir, 'status.json');
  const { contentPillars, niche, clipCount, maxDuration, captionStyle, userId } = opts;

  const updateStatus = (stage, progress, data = {}) => {
    fs.writeFileSync(statusFile, JSON.stringify({ stage, progress, ...data, updated_at: new Date().toISOString() }));
  };

  updateStatus('downloading', 5);

  // ── Step 1: Download video ──────────────────────────────────────────────────
  const videoPath = path.join(jobDir, 'source.mp4');
  await run(`yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${videoPath}" "${url}" --no-playlist`);

  updateStatus('transcribing', 20);

  // ── Step 2: Extract audio ───────────────────────────────────────────────────
  const audioPath = path.join(jobDir, 'audio.wav');
  await run(`ffmpeg -i "${videoPath}" -ar 16000 -ac 1 -vn "${audioPath}" -y`);

  // ── Step 3: Transcribe with Whisper (local if available, else OpenAI API) ───
  let transcript;
  let whisperAvailable = false;
  try { await run('whisper --help'); whisperAvailable = true; } catch {}

  if (whisperAvailable) {
    // Local Whisper — free, no API cost
    await run(`whisper "${audioPath}" --output_format json --output_dir "${jobDir}" --model base`);
    const whisperOut = JSON.parse(fs.readFileSync(path.join(jobDir, 'audio.json'), 'utf8'));
    transcript = { text: whisperOut.text, segments: whisperOut.segments };
  } else {
    // OpenAI Whisper API fallback (~$0.006/min)
    const { default: FormData } = await import('form-data');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioPath), { filename: 'audio.wav', contentType: 'audio/wav' });
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    transcript = { text: data.text, segments: data.segments || [] };
  }

  updateStatus('analyzing', 50, { transcript_length: transcript.text.length });

  // ── Step 4: Claude finds the best clips ────────────────────────────────────
  const pillarContext = contentPillars ? `\nCreator's content pillars: ${contentPillars}` : '';
  const nicheContext = niche ? `\nCreator's niche: ${niche}` : '';

  const segmentsForClaude = transcript.segments.slice(0, 200).map(s =>
    `[${s.start?.toFixed(1) || 0}s - ${s.end?.toFixed(1) || 0}s]: ${s.text}`
  ).join('\n');

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are a viral content strategist. Analyze this video transcript and identify the ${clipCount} best clips for short-form social media.${pillarContext}${nicheContext}

TRANSCRIPT SEGMENTS:
${segmentsForClaude}

REQUIREMENTS:
- Each clip: 20-${maxDuration} seconds max
- Must have a strong hook in the first 3 seconds
- Look for: emotional peaks, surprising facts, actionable advice, controversial takes, relatable moments, powerful stories
- Prioritize clips that match the creator's content pillars if provided
- Clips must start and end at natural sentence boundaries

Return ONLY valid JSON array:
[
  {
    "clip_number": 1,
    "start_time": 12.5,
    "end_time": 45.2,
    "title": "Short punchy clip title",
    "hook": "First 5 words that make you stop scrolling",
    "why_viral": "Why this will perform",
    "virality_score": 87,
    "emotion": "curiosity|surprise|inspiration|relatability|controversy",
    "pillar_match": "which content pillar this matches or null"
  }
]`
    }]
  });

  const rawJson = message.content[0].text.trim().replace(/```json\n?|\n?```/g, '');
  const clips = JSON.parse(rawJson);

  updateStatus('cutting', 65);

  // ── Step 5: Cut clips with FFmpeg ──────────────────────────────────────────
  const clipsDir = path.join(jobDir, 'clips');
  fs.mkdirSync(clipsDir, { recursive: true });

  const processedClips = [];

  for (const clip of clips) {
    const duration = clip.end_time - clip.start_time;
    const clipFile = path.join(clipsDir, `clip_${clip.clip_number}.mp4`);
    const captionedFile = path.join(clipsDir, `clip_${clip.clip_number}_captioned.mp4`);

    // Cut clip
    await run(`ffmpeg -ss ${clip.start_time} -i "${videoPath}" -t ${duration} -c:v libx264 -c:a aac -preset fast "${clipFile}" -y`);

    // Generate SRT from transcript segments for this clip
    const clipSegments = transcript.segments.filter(s =>
      s.start >= clip.start_time && s.end <= clip.end_time
    ).map(s => ({
      ...s,
      start: s.start - clip.start_time,
      end: s.end - clip.start_time
    }));

    if (clipSegments.length > 0) {
      const srtContent = clipSegments.map((s, i) => {
        const toSrt = t => {
          const h = Math.floor(t / 3600).toString().padStart(2, '0');
          const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
          const sec = Math.floor(t % 60).toString().padStart(2, '0');
          const ms = Math.round((t % 1) * 1000).toString().padStart(3, '0');
          return `${h}:${m}:${sec},${ms}`;
        };
        return `${i + 1}\n${toSrt(s.start)} --> ${toSrt(s.end)}\n${s.text.trim()}\n`;
      }).join('\n');

      const srtPath = path.join(clipsDir, `clip_${clip.clip_number}.srt`);
      fs.writeFileSync(srtPath, srtContent);

      // Caption styles
      const captionStyles = {
        bold: `fontsize=22:fontcolor=white:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:box=1:boxcolor=black@0.6:boxborderw=5:x=(w-text_w)/2:y=h-100`,
        minimal: `fontsize=18:fontcolor=white:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:x=(w-text_w)/2:y=h-80`,
        yellow: `fontsize=24:fontcolor=yellow:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:box=1:boxcolor=black@0.5:boxborderw=4:x=(w-text_w)/2:y=h-100`,
      };

      const styleStr = captionStyles[captionStyle] || captionStyles.bold;

      try {
        await run(`ffmpeg -i "${clipFile}" -vf "subtitles=${srtPath}:force_style='${styleStr}'" -c:a copy "${captionedFile}" -y`);
        processedClips.push({ ...clip, file: `clip_${clip.clip_number}_captioned.mp4`, duration: duration.toFixed(1) });
      } catch {
        // Caption burn failed — use uncaptioned
        fs.copyFileSync(clipFile, captionedFile);
        processedClips.push({ ...clip, file: `clip_${clip.clip_number}_captioned.mp4`, duration: duration.toFixed(1), captions: false });
      }
    } else {
      fs.copyFileSync(clipFile, captionedFile);
      processedClips.push({ ...clip, file: `clip_${clip.clip_number}_captioned.mp4`, duration: duration.toFixed(1) });
    }
  }

  updateStatus('complete', 100, {
    clips: processedClips,
    total_clips: processedClips.length,
    job_id: jobId
  });
}

// ─── GET: Job status ──────────────────────────────────────────────────────────
router.get('/status/:jobId', requireAuth, (req, res) => {
  const jobDir = path.join(TMP, req.params.jobId);
  const statusFile = path.join(jobDir, 'status.json');
  const errorFile = path.join(jobDir, 'error.json');

  if (!fs.existsSync(jobDir)) return res.status(404).json({ error: 'Job not found' });
  if (fs.existsSync(errorFile)) return res.json({ status: 'failed', ...JSON.parse(fs.readFileSync(errorFile)) });
  if (!fs.existsSync(statusFile)) return res.json({ status: 'queued', progress: 0 });

  const status = JSON.parse(fs.readFileSync(statusFile));
  res.json({ status: status.stage === 'complete' ? 'completed' : 'processing', ...status });
});

// ─── GET: Download a clip ─────────────────────────────────────────────────────
router.get('/download/:jobId/:filename', requireAuth, (req, res) => {
  const filePath = path.join(TMP, req.params.jobId, 'clips', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

// ─── GET: Stream a clip for preview ──────────────────────────────────────────
router.get('/preview/:jobId/:filename', requireAuth, (req, res) => {
  const filePath = path.join(TMP, req.params.jobId, 'clips', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': 'video/mp4' });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ─── POST: Cleanup old jobs ───────────────────────────────────────────────────
router.delete('/job/:jobId', requireAuth, (req, res) => {
  const jobDir = path.join(TMP, req.params.jobId);
  if (fs.existsSync(jobDir)) {
    fs.rmSync(jobDir, { recursive: true, force: true });
  }
  res.json({ success: true });
});

module.exports = router;
