const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const { cookieArgs } = require('../utils/ytdlpCookies');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TMP = '/tmp/ccc-clipper';
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

// ─── Upload handling (Smart Clipper is upload-only) ───────────────────────────
// User uploads a long-form video file they already have; multer streams it to
// disk (never buffered in memory — these files are large), then the same
// transcribe → analyze → cut pipeline runs against the local file.
const UPLOAD_TMP = path.join(TMP, 'uploads');
if (!fs.existsSync(UPLOAD_TMP)) fs.mkdirSync(UPLOAD_TMP, { recursive: true });
const ALLOWED_VIDEO_EXT = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v', '.mpeg', '.mpg']);
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_TMP),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '.mp4').toLowerCase();
    cb(null, `up_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const uploadVideo = multer({
  storage: uploadStorage,
  limits: { fileSize: 3 * 1024 * 1024 * 1024 }, // 3GB ceiling for long-form uploads
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const looksVideo = (file.mimetype || '').startsWith('video/') || ALLOWED_VIDEO_EXT.has(ext);
    if (looksVideo) cb(null, true);
    else cb(new Error('Unsupported file type — upload a video file (mp4, mov, mkv, webm, avi).'));
  },
}).single('video');

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// A jobId encodes its owner: `job_<ts>_<userId>` (see /clip below). requireAuth
// only proves the caller is *a* logged-in user, NOT that this job is theirs — so
// every per-job route must also confirm ownership, or account B can read/delete
// account A's clips by guessing a jobId. The regex additionally rejects any jobId
// that isn't the exact expected shape, which blocks path traversal through the
// :jobId route param (it flows straight into path.join below).
function ownsJob(req) {
  const { jobId } = req.params;
  if (typeof jobId !== 'string' || !/^job_\d+_[A-Za-z0-9_-]+$/.test(jobId)) return false;
  return jobId.endsWith('_' + sanitizeId(String(req.userId)));
}

// Resolve a clip file path for the given job, stripping any directory components
// from the filename and confirming the result stays inside the job's own clips
// dir. Returns null if the path escapes (traversal attempt) — callers 404.
function resolveClipPath(req) {
  const clipsDir = path.resolve(TMP, req.params.jobId, 'clips');
  const safeName = path.basename(req.params.filename);
  const filePath = path.resolve(clipsDir, safeName);
  if (filePath !== path.join(clipsDir, safeName) || !filePath.startsWith(clipsDir + path.sep)) {
    return null;
  }
  return filePath;
}

// ─── Check system tools ──────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  const checks = {};
  try { await run('yt-dlp --version'); checks.ytdlp = true; } catch { checks.ytdlp = false; }
  try { await run('ffmpeg -version'); checks.ffmpeg = true; } catch { checks.ffmpeg = false; }
  try { await run('whisper --help'); checks.whisper = true; } catch { checks.whisper = false; }
  try { await run('deno --version'); checks.deno = true; } catch { checks.deno = false; }
  res.json({ checks, ready: checks.ytdlp && checks.ffmpeg, note: 'whisper optional — falls back to OpenAI API; deno required for YouTube JS-runtime challenges' });
});

// ─── POST: Clip from YouTube URL ─────────────────────────────────────────────
router.post('/clip', requireAuth, async (req, res) => {
  const { url, contentPillars, niche, clipCount = 5, maxDuration = 60, captionStyle = 'bold' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const jobId = `job_${Date.now()}_${sanitizeId(req.userId.toString())}`;
  const jobDir = path.join(TMP, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  res.json({ success: true, job_id: jobId, status: 'processing', message: 'Clipping started — poll /status/:jobId for updates' });

  runClipPipeline(jobId, jobDir, url, { contentPillars, niche, clipCount, maxDuration, captionStyle, userId: req.userId })
    .catch(err => {
      console.error(`Clip job ${jobId} failed:`, err.message);
      fs.writeFileSync(path.join(jobDir, 'error.json'), JSON.stringify({ error: err.message }));
    });
});

// ─── POST: Clip from an uploaded local file (upload-only flow) ────────────────
// This is the Smart Clipper entry point — the user uploads a long-form video they
// already downloaded; there is NO URL/YouTube input. Skips the download step and
// runs transcribe → analyze → cut against the uploaded file.
router.post('/clip-upload', requireAuth, (req, res) => {
  uploadVideo(req, res, async (uErr) => {
    if (uErr) return res.status(400).json({ error: uErr.message });
    if (!req.file) return res.status(400).json({ error: 'Video file is required (multipart field name: "video").' });

    const { contentPillars, niche, clipCount = 5, maxDuration = 60, captionStyle = 'bold' } = req.body || {};

    const jobId = `job_${Date.now()}_${sanitizeId(req.userId.toString())}`;
    const jobDir = path.join(TMP, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    // Move the uploaded file into the job dir as the pipeline's source video.
    const ext = (path.extname(req.file.filename) || '.mp4').toLowerCase();
    const localVideoPath = path.join(jobDir, `source${ext}`);
    try {
      fs.renameSync(req.file.path, localVideoPath);
    } catch {
      // rename can fail across devices — fall back to copy+unlink
      fs.copyFileSync(req.file.path, localVideoPath);
      try { fs.unlinkSync(req.file.path); } catch {}
    }

    res.json({ success: true, job_id: jobId, status: 'processing', message: 'Upload received — poll /status/:jobId for updates' });

    runClipPipeline(jobId, jobDir, null, {
      contentPillars,
      niche,
      clipCount: parseInt(clipCount) || 5,
      maxDuration: parseInt(maxDuration) || 60,
      captionStyle,
      userId: req.userId,
      localVideoPath,
    }).catch(err => {
      console.error(`Clip-upload job ${jobId} failed:`, err.message);
      fs.writeFileSync(path.join(jobDir, 'error.json'), JSON.stringify({ error: err.message }));
    });
  });
});

// ─── Full Pipeline ────────────────────────────────────────────────────────────
async function runClipPipeline(jobId, jobDir, url, opts) {
  const statusFile = path.join(jobDir, 'status.json');
  const { contentPillars, niche, clipCount, maxDuration, captionStyle, localVideoPath } = opts;

  const updateStatus = (stage, progress, data = {}) => {
    fs.writeFileSync(statusFile, JSON.stringify({ stage, progress, ...data, updated_at: new Date().toISOString() }));
  };

  // Step 1: Obtain the source video.
  // Upload-only flow (Smart Clipper) passes a local file and skips downloading;
  // the legacy URL flow downloads via yt-dlp.
  let videoPath;
  if (localVideoPath) {
    videoPath = localVideoPath;
    updateStatus('transcribing', 20);
  } else {
    updateStatus('downloading', 5);
    videoPath = path.join(jobDir, 'source.mp4');
    const cookieArgStr = cookieArgs().map(a => `"${a}"`).join(' ');
    await run(
      `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 ` +
      `--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" ` +
      `--extractor-args "youtube:player_client=web,android,tv_embedded" ` +
      `--add-headers "Accept-Language:en-US,en;q=0.9" ` +
      `${cookieArgStr} -o "${videoPath}" "${url}" --no-playlist`
    );
    updateStatus('transcribing', 20);
  }

  // Step 2: Extract audio
  const audioPath = path.join(jobDir, 'audio.wav');
  await run(`ffmpeg -i "${videoPath}" -ar 16000 -ac 1 -vn "${audioPath}" -y`);

  // Step 3: Transcribe
  let transcript;
  let whisperAvailable = false;
  try { await run('whisper --help'); whisperAvailable = true; } catch {}

  if (whisperAvailable) {
    await run(`whisper "${audioPath}" --output_format json --output_dir "${jobDir}" --model base`);
    const whisperOut = JSON.parse(fs.readFileSync(path.join(jobDir, 'audio.json'), 'utf8'));
    transcript = { text: whisperOut.text, segments: whisperOut.segments };
  } else {
    // Cloud fallback when local whisper isn't installed. Uses Groq's
    // OpenAI-compatible transcription endpoint with a Groq-hosted Whisper model.
    //
    // Build the multipart body with the global (undici) FormData + Blob, NOT the
    // `form-data` npm package. Handing a `form-data` stream to the global fetch
    // yields a malformed/empty multipart body (undici doesn't consume the
    // legacy stream and the manually-spread getHeaders() boundary conflicts),
    // which Groq's Go parser rejects with "multipart: NextPart: EOF". Reading
    // the audio into a Blob once lets undici set the boundary + Content-Length
    // correctly, and it's a fresh read of the file (not a reused stream handle).
    const audioBuffer = fs.readFileSync(audioPath);
    const form = new FormData();
    form.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'audio.wav');
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    });
    const data = await resp.json();
    if (!resp.ok || data.error) {
      throw new Error((data.error && (data.error.message || data.error)) || `Transcription failed (HTTP ${resp.status})`);
    }
    transcript = { text: data.text, segments: data.segments || [] };
  }

  updateStatus('analyzing', 50, { transcript_length: transcript.text.length });

  // Step 4: Claude finds best clips
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

  // Step 5: Cut clips
  const clipsDir = path.join(jobDir, 'clips');
  fs.mkdirSync(clipsDir, { recursive: true });

  const processedClips = [];
  for (const clip of clips) {
    const duration = clip.end_time - clip.start_time;
    const clipFile = path.join(clipsDir, `clip_${clip.clip_number}.mp4`);
    const captionedFile = path.join(clipsDir, `clip_${clip.clip_number}_captioned.mp4`);

    await run(`ffmpeg -ss ${clip.start_time} -i "${videoPath}" -t ${duration} -c:v libx264 -c:a aac -preset fast "${clipFile}" -y`);

    const clipSegments = transcript.segments
      .filter(s => s.start >= clip.start_time && s.end <= clip.end_time)
      .map(s => ({ ...s, start: s.start - clip.start_time, end: s.end - clip.start_time }));

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
        fs.copyFileSync(clipFile, captionedFile);
        processedClips.push({ ...clip, file: `clip_${clip.clip_number}_captioned.mp4`, duration: duration.toFixed(1), captions: false });
      }
    } else {
      fs.copyFileSync(clipFile, captionedFile);
      processedClips.push({ ...clip, file: `clip_${clip.clip_number}_captioned.mp4`, duration: duration.toFixed(1) });
    }
  }

  updateStatus('complete', 100, { clips: processedClips, total_clips: processedClips.length, job_id: jobId });
}

// ─── GET: Job status ─────────────────────────────────────────────────────────
router.get('/status/:jobId', requireAuth, (req, res) => {
  if (!ownsJob(req)) return res.status(404).json({ error: 'Job not found' });
  const jobDir = path.join(TMP, req.params.jobId);
  const statusFile = path.join(jobDir, 'status.json');
  const errorFile = path.join(jobDir, 'error.json');

  if (!fs.existsSync(jobDir)) return res.status(404).json({ error: 'Job not found' });
  if (fs.existsSync(errorFile)) return res.json({ status: 'failed', ...JSON.parse(fs.readFileSync(errorFile)) });
  if (!fs.existsSync(statusFile)) return res.json({ status: 'queued', progress: 0 });

  const status = JSON.parse(fs.readFileSync(statusFile));
  res.json({ status: status.stage === 'complete' ? 'completed' : 'processing', ...status });
});

// ─── GET: Download a clip ────────────────────────────────────────────────────
router.get('/download/:jobId/:filename', requireAuth, (req, res) => {
  if (!ownsJob(req)) return res.status(404).json({ error: 'File not found' });
  const filePath = resolveClipPath(req);
  if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

// ─── GET: Stream a clip for preview ─────────────────────────────────────────
router.get('/preview/:jobId/:filename', requireAuth, (req, res) => {
  if (!ownsJob(req)) return res.status(404).json({ error: 'File not found' });
  const filePath = resolveClipPath(req);
  if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

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

// ─── DELETE: Cleanup job ─────────────────────────────────────────────────────
router.delete('/job/:jobId', requireAuth, (req, res) => {
  if (!ownsJob(req)) return res.status(404).json({ error: 'Job not found' });
  const jobDir = path.join(TMP, req.params.jobId);
  if (fs.existsSync(jobDir)) {
    fs.rmSync(jobDir, { recursive: true, force: true });
  }
  res.json({ success: true });
});

module.exports = router;
