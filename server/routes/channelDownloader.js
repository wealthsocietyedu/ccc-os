const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Constants ────────────────────────────────────────────────────────────────
const DOWNLOADS_BASE = '/data/downloads';
const MAX_CONCURRENT_JOBS = 3;

// ─── In-memory process map (keyed by jobId) ───────────────────────────────────
const activeProcesses = new Map();

// ─── DB helper (injected via middleware or direct require) ────────────────────
// We access the shared `db` instance from the main app
function getDb() {
  // CCC OS pattern: db is attached to app or required from a shared module
  try {
    return require('../database'); // adjust path if needed
  } catch {
    return null;
  }
}

// ─── Schema bootstrap (call once on route load) ───────────────────────────────
function ensureSchema(db) {
  if (!db) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS download_jobs (
      id              TEXT PRIMARY KEY,
      url             TEXT NOT NULL,
      platform        TEXT NOT NULL,
      channel_handle  TEXT,
      status          TEXT NOT NULL DEFAULT 'queued',
      progress        INTEGER DEFAULT 0,
      total_videos    INTEGER DEFAULT 0,
      downloaded_videos INTEGER DEFAULT 0,
      current_file    TEXT,
      output_dir      TEXT,
      options         TEXT,
      file_list       TEXT,
      meta_summary    TEXT,
      error_message   TEXT,
      created_at      TEXT NOT NULL,
      completed_at    TEXT,
      total_size_mb   REAL DEFAULT 0
    );
  `);
}

// ─── Utility: detect platform from URL ───────────────────────────────────────
function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return null;
}

// ─── Utility: extract handle from URL ────────────────────────────────────────
function extractHandle(url, platform) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (platform === 'tiktok') return parts[0]?.replace('@', '') || 'unknown';
    if (platform === 'instagram') return parts[0]?.replace('@', '') || 'unknown';
    if (platform === 'youtube') {
      const handle = parts.find(p => p.startsWith('@'));
      return handle || parts[parts.length - 1] || 'unknown';
    }
  } catch {}
  return 'unknown';
}

// ─── Utility: build yt-dlp args per platform ─────────────────────────────────
function buildYtdlpArgs(url, jobId, platform, options) {
  const { maxVideos = 25, quality = '1080', audioOnly = false, dateAfter = '' } = options;
  const outputDir = path.join(DOWNLOADS_BASE, jobId);
  const outputTemplate = path.join(outputDir, '%(uploader)s_%(id)s.%(ext)s');

  const baseArgs = [
    url,
    '--output', outputTemplate,
    '--playlist-items', `1-${maxVideos}`,
    '--write-thumbnail',
    '--write-info-json',
    '--newline',
    '--no-warnings',
    '--ignore-errors',
    '--no-playlist-reverse',
  ];

  if (dateAfter) {
    baseArgs.push('--dateafter', dateAfter.replace(/-/g, ''));
  }

  if (audioOnly) {
    baseArgs.push('--format', 'bestaudio/best');
    baseArgs.push('--extract-audio');
    baseArgs.push('--audio-format', 'mp3');
    return baseArgs;
  }

  if (platform === 'tiktok') {
    baseArgs.push('--format', 'best[ext=mp4]/best');
    return baseArgs;
  }

  if (platform === 'instagram') {
    baseArgs.push('--format', 'best[ext=mp4]/best');
    return baseArgs;
  }

  if (platform === 'youtube') {
    const heightMap = { '720': '720', '1080': '1080', '4k': '2160', 'best': '9999' };
    const maxH = heightMap[quality] || '1080';
    baseArgs.push('--format', `bestvideo[height<=${maxH}]+bestaudio/best`);
    baseArgs.push('--merge-output-format', 'mp4');
    if (options.subtitles !== false) {
      baseArgs.push('--write-subs', '--sub-lang', 'en');
    }
    return baseArgs;
  }

  return baseArgs;
}

// ─── Utility: estimate storage ────────────────────────────────────────────────
function estimateStorageMB(platform, maxVideos, quality, audioOnly) {
  if (audioOnly) return Math.round(maxVideos * 5);
  const perVideo = {
    tiktok:    { default: 8   },
    instagram: { default: 12  },
    youtube:   { '720': 80, '1080': 150, '4k': 400, 'best': 200 },
  };
  if (platform === 'youtube') {
    return Math.round(maxVideos * (perVideo.youtube[quality] || 150));
  }
  return Math.round(maxVideos * (perVideo[platform]?.default || 10));
}

// ─── Parse yt-dlp progress line ───────────────────────────────────────────────
function parseProgress(line) {
  const pctMatch = line.match(/(\d+\.?\d*)%/);
  const fileMatch = line.match(/\[download\]\s+Destination:\s+(.+)/);
  const videoMatch = line.match(/\[download\]\s+Downloading item (\d+) of (\d+)/);

  return {
    percent: pctMatch ? parseFloat(pctMatch[1]) : null,
    currentFile: fileMatch ? path.basename(fileMatch[1]) : null,
    videoIndex: videoMatch ? parseInt(videoMatch[1]) : null,
    videoTotal: videoMatch ? parseInt(videoMatch[2]) : null,
  };
}

// ─── Get directory size in MB ─────────────────────────────────────────────────
function getDirSizeMB(dirPath) {
  try {
    let total = 0;
    const files = fs.readdirSync(dirPath);
    for (const f of files) {
      try {
        const stat = fs.statSync(path.join(dirPath, f));
        if (stat.isFile()) total += stat.size;
      } catch {}
    }
    return Math.round((total / 1024 / 1024) * 10) / 10;
  } catch {
    return 0;
  }
}

// ─── Scan completed dir for video files ───────────────────────────────────────
function scanOutputFiles(outputDir) {
  try {
    const videoExts = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi', '.mp3', '.m4a']);
    return fs.readdirSync(outputDir)
      .filter(f => videoExts.has(path.extname(f).toLowerCase()))
      .map(f => {
        const full = path.join(outputDir, f);
        const stat = fs.statSync(full);
        const thumb = full.replace(path.extname(full), '') + '.webp';
        const infoJson = full.replace(path.extname(full), '') + '.info.json';
        return {
          filename: f,
          sizeMB: Math.round((stat.size / 1024 / 1024) * 10) / 10,
          thumbnail: fs.existsSync(thumb) ? thumb : null,
          hasInfo: fs.existsSync(infoJson),
        };
      });
  } catch {
    return [];
  }
}

// ─── Read all info.json files in dir ─────────────────────────────────────────
function readInfoJsons(outputDir) {
  try {
    return fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.info.json'))
      .map(f => {
        try {
          const raw = fs.readFileSync(path.join(outputDir, f), 'utf8');
          const d = JSON.parse(raw);
          return {
            id: d.id,
            title: d.title || '',
            viewCount: d.view_count || 0,
            likeCount: d.like_count || 0,
            uploadDate: d.upload_date || '',
            duration: d.duration || 0,
            description: (d.description || '').slice(0, 300),
          };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => b.viewCount - a.viewCount);
  } catch {
    return [];
  }
}

// ─── Claude content analysis ──────────────────────────────────────────────────
async function analyzeWithClaude(videos, platform, channelHandle) {
  if (!videos.length) return null;

  const videoData = videos.slice(0, 40).map(v =>
    `Title: "${v.title}" | Views: ${v.viewCount.toLocaleString()} | Likes: ${v.likeCount.toLocaleString()} | Date: ${v.uploadDate} | Duration: ${v.duration}s`
  ).join('\n');

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are a content strategist analyzing a ${platform} creator's video library.

Channel: @${channelHandle}
Videos analyzed: ${videos.length}

DATA:
${videoData}

Return ONLY valid JSON:
{
  "topPerformers": [
    { "title": "...", "views": 0, "likes": 0, "uploadDate": "YYYYMMDD" }
  ],
  "hookPatterns": ["pattern 1", "pattern 2", "pattern 3"],
  "uploadFrequency": "e.g. 3-4 times per week",
  "topicClusters": ["cluster 1", "cluster 2", "cluster 3"],
  "avgViewCount": 0,
  "bestPerformingLength": "e.g. 60-90 seconds",
  "contentInsight": "2 sentence strategic observation about what makes this channel work"
}`
    }]
  });

  const text = message.content[0].text.trim();
  const clean = text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(clean);
}

// ─── Run download job ─────────────────────────────────────────────────────────
async function runDownloadJob(db, jobId, url, platform, channelHandle, options) {
  const outputDir = path.join(DOWNLOADS_BASE, jobId);
  fs.mkdirSync(outputDir, { recursive: true });

  const args = buildYtdlpArgs(url, jobId, platform, options);

  db.prepare(`UPDATE download_jobs SET status='running', output_dir=? WHERE id=?`)
    .run(outputDir, jobId);

  const proc = spawn('yt-dlp', args, { cwd: outputDir });
  activeProcesses.set(jobId, proc);

  let lastUpdate = Date.now();
  let currentProgress = 0;
  let currentFile = '';
  let downloadedVideos = 0;
  let totalVideos = options.maxVideos || 25;
  let buffer = '';

  const flushUpdate = () => {
    if (Date.now() - lastUpdate < 2000) return;
    lastUpdate = Date.now();
    db.prepare(`
      UPDATE download_jobs SET
        progress=?, downloaded_videos=?, current_file=?, total_size_mb=?
      WHERE id=?
    `).run(
      Math.min(currentProgress, 99),
      downloadedVideos,
      currentFile,
      getDirSizeMB(outputDir),
      jobId
    );
  };

  proc.stdout.on('data', chunk => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      const parsed = parseProgress(line);
      if (parsed.percent !== null) currentProgress = parsed.percent;
      if (parsed.currentFile) currentFile = parsed.currentFile;
      if (parsed.videoIndex) downloadedVideos = parsed.videoIndex;
      if (parsed.videoTotal) totalVideos = parsed.videoTotal;
      flushUpdate();
    }
  });

  proc.stderr.on('data', chunk => {
    const line = chunk.toString();
    // Only log real errors, not warnings
    if (line.includes('ERROR:')) {
      console.error(`[ChannelDownloader:${jobId}] ${line.trim()}`);
    }
  });

  return new Promise(resolve => {
    proc.on('close', async code => {
      activeProcesses.delete(jobId);

      const wasCancelled = db.prepare(`SELECT status FROM download_jobs WHERE id=?`)
        .get(jobId)?.status === 'cancelled';

      if (wasCancelled) return resolve();

      const fileList = scanOutputFiles(outputDir);
      const totalSizeMB = getDirSizeMB(outputDir);

      let metaSummary = null;
      if (fileList.length > 0) {
        try {
          const infos = readInfoJsons(outputDir);
          if (infos.length > 0) {
            metaSummary = await analyzeWithClaude(infos, platform, channelHandle);
          }
        } catch (e) {
          console.error('Claude analysis failed:', e.message);
        }
      }

      const status = code === 0 || fileList.length > 0 ? 'completed' : 'failed';

      db.prepare(`
        UPDATE download_jobs SET
          status=?, progress=100, downloaded_videos=?,
          total_videos=?, file_list=?, meta_summary=?,
          total_size_mb=?, completed_at=?
        WHERE id=?
      `).run(
        status,
        fileList.length,
        fileList.length,
        JSON.stringify(fileList),
        metaSummary ? JSON.stringify(metaSummary) : null,
        totalSizeMB,
        new Date().toISOString(),
        jobId
      );

      resolve();
    });
  });
}

// ─── Middleware: inject db ────────────────────────────────────────────────────
router.use((req, res, next) => {
  const db = req.app.get('db') || getDb();
  if (!db) return res.status(500).json({ error: 'Database not available' });
  req.db = db;
  ensureSchema(db);
  next();
});

// ─── POST /start ──────────────────────────────────────────────────────────────
router.post('/start', async (req, res) => {
  const { url, maxVideos = 25, quality = '1080', audioOnly = false, dateAfter = '', subtitles = true } = req.body;

  if (!url?.trim()) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return res.status(400).json({ error: 'Unsupported platform. Use TikTok, Instagram, or YouTube URLs.' });
  }

  const running = req.db.prepare(`SELECT COUNT(*) as c FROM download_jobs WHERE status IN ('running','queued')`).get();
  if (running.c >= MAX_CONCURRENT_JOBS) {
    return res.status(429).json({ error: `Max ${MAX_CONCURRENT_JOBS} concurrent downloads. Wait for a job to finish.` });
  }

  const jobId = uuidv4();
  const channelHandle = extractHandle(url, platform);
  const options = { maxVideos: Math.min(parseInt(maxVideos) || 25, 100), quality, audioOnly, dateAfter, subtitles };
  const estimatedMB = estimateStorageMB(platform, options.maxVideos, quality, audioOnly);

  req.db.prepare(`
    INSERT INTO download_jobs (id, url, platform, channel_handle, status, options, created_at, total_videos)
    VALUES (?, ?, ?, ?, 'queued', ?, ?, ?)
  `).run(jobId, url.trim(), platform, channelHandle, JSON.stringify(options), new Date().toISOString(), options.maxVideos);

  // Fire and forget
  runDownloadJob(req.db, jobId, url.trim(), platform, channelHandle, options)
    .catch(e => {
      console.error(`Job ${jobId} failed:`, e);
      try {
        req.db.prepare(`UPDATE download_jobs SET status='failed', error_message=? WHERE id=?`)
          .run(e.message, jobId);
      } catch {}
    });

  res.json({
    success: true,
    jobId,
    platform,
    channelHandle,
    estimatedMB,
    message: `Download started for @${channelHandle} on ${platform}`
  });
});

// ─── GET /status/:jobId ───────────────────────────────────────────────────────
router.get('/status/:jobId', (req, res) => {
  const job = req.db.prepare(`SELECT * FROM download_jobs WHERE id=?`).get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json({
    ...job,
    options: job.options ? JSON.parse(job.options) : {},
    file_list: job.file_list ? JSON.parse(job.file_list) : [],
    meta_summary: job.meta_summary ? JSON.parse(job.meta_summary) : null,
    isActive: activeProcesses.has(job.id),
  });
});

// ─── POST /cancel/:jobId ──────────────────────────────────────────────────────
router.post('/cancel/:jobId', (req, res) => {
  const job = req.db.prepare(`SELECT * FROM download_jobs WHERE id=?`).get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const proc = activeProcesses.get(req.params.jobId);
  if (proc) {
    proc.kill('SIGTERM');
    activeProcesses.delete(req.params.jobId);
  }

  req.db.prepare(`UPDATE download_jobs SET status='cancelled', completed_at=? WHERE id=?`)
    .run(new Date().toISOString(), req.params.jobId);

  res.json({ success: true, message: 'Job cancelled' });
});

// ─── GET /jobs ────────────────────────────────────────────────────────────────
router.get('/jobs', (req, res) => {
  const jobs = req.db.prepare(`
    SELECT id, url, platform, channel_handle, status, progress,
           total_videos, downloaded_videos, current_file, total_size_mb,
           created_at, completed_at, error_message,
           CASE WHEN file_list IS NOT NULL THEN json_array_length(file_list) ELSE 0 END as file_count,
           CASE WHEN meta_summary IS NOT NULL THEN 1 ELSE 0 END as has_analysis
    FROM download_jobs
    ORDER BY created_at DESC
    LIMIT 50
  `).all();
  res.json({ jobs });
});

// ─── GET /files/:jobId ────────────────────────────────────────────────────────
router.get('/files/:jobId', (req, res) => {
  const job = req.db.prepare(`SELECT file_list, output_dir FROM download_jobs WHERE id=?`).get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ files: job.file_list ? JSON.parse(job.file_list) : [] });
});

// ─── GET /analysis/:jobId ─────────────────────────────────────────────────────
router.get('/analysis/:jobId', (req, res) => {
  const job = req.db.prepare(`SELECT meta_summary, channel_handle, platform FROM download_jobs WHERE id=?`).get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    channelHandle: job.channel_handle,
    platform: job.platform,
    analysis: job.meta_summary ? JSON.parse(job.meta_summary) : null
  });
});

// ─── POST /analyze/:jobId (re-run analysis) ───────────────────────────────────
router.post('/analyze/:jobId', async (req, res) => {
  const job = req.db.prepare(`SELECT * FROM download_jobs WHERE id=?`).get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'completed') return res.status(400).json({ error: 'Job not completed' });

  try {
    const infos = readInfoJsons(job.output_dir);
    if (!infos.length) return res.status(400).json({ error: 'No info.json files found' });

    const analysis = await analyzeWithClaude(infos, job.platform, job.channel_handle);
    req.db.prepare(`UPDATE download_jobs SET meta_summary=? WHERE id=?`)
      .run(JSON.stringify(analysis), job.id);

    res.json({ success: true, analysis });
  } catch (e) {
    res.status(500).json({ error: 'Analysis failed', details: e.message });
  }
});

// ─── POST /cleanup/:jobId ─────────────────────────────────────────────────────
router.post('/cleanup/:jobId', (req, res) => {
  const job = req.db.prepare(`SELECT output_dir FROM download_jobs WHERE id=?`).get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  try {
    if (job.output_dir && fs.existsSync(job.output_dir)) {
      fs.rmSync(job.output_dir, { recursive: true, force: true });
    }
    req.db.prepare(`UPDATE download_jobs SET file_list=NULL, total_size_mb=0 WHERE id=?`)
      .run(req.params.jobId);
    res.json({ success: true, message: 'Files deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Cleanup failed', details: e.message });
  }
});

// ─── DELETE /job/:jobId (remove record entirely) ──────────────────────────────
router.delete('/job/:jobId', (req, res) => {
  const job = req.db.prepare(`SELECT output_dir FROM download_jobs WHERE id=?`).get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  // Kill if running
  const proc = activeProcesses.get(req.params.jobId);
  if (proc) { proc.kill('SIGTERM'); activeProcesses.delete(req.params.jobId); }

  // Delete files
  try {
    if (job.output_dir && fs.existsSync(job.output_dir)) {
      fs.rmSync(job.output_dir, { recursive: true, force: true });
    }
  } catch {}

  req.db.prepare(`DELETE FROM download_jobs WHERE id=?`).run(req.params.jobId);
  res.json({ success: true });
});

// ─── GET /storage-stats ───────────────────────────────────────────────────────
router.get('/storage-stats', (req, res) => {
  const totalMB = req.db.prepare(`SELECT COALESCE(SUM(total_size_mb),0) as total FROM download_jobs`).get().total;
  const jobCount = req.db.prepare(`SELECT COUNT(*) as c FROM download_jobs`).get().c;

  let ytdlpVersion = 'unknown';
  try {
    const { execSync } = require('child_process');
    ytdlpVersion = execSync('yt-dlp --version', { timeout: 3000 }).toString().trim();
  } catch {}

  res.json({
    totalStorageMB: Math.round(totalMB * 10) / 10,
    jobCount,
    ytdlpVersion,
    downloadsPath: DOWNLOADS_BASE,
  });
});

module.exports = router;
