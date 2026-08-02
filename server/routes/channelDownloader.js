const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');
const { getDB } = require('../db');
const { cookieArgs } = require('../utils/ytdlpCookies');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Constants ────────────────────────────────────────────────────────────────
// Same pattern as DB_PATH (server/db/index.js): must live inside the actual
// Railway volume mount path, or bulk-archived files get wiped on every
// redeploy — the opposite of what "archive" is supposed to mean. Set
// DOWNLOADS_PATH=<RAILWAY_VOLUME_MOUNT_PATH>/downloads in production.
const DOWNLOADS_BASE = process.env.DOWNLOADS_PATH || path.join(__dirname, '../../data/downloads');
const MAX_CONCURRENT_JOBS = 3;

// ─── In-memory process map (keyed by jobId) ───────────────────────────────────
const activeProcesses = new Map();

// ─── Schema bootstrap (call once on route load) ───────────────────────────────
let didReconcileOrphans = false;
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

  // A job left 'running'/'queued' at server start can only be orphaned — the
  // in-memory process map is always empty on a fresh boot, so nothing is
  // actually still downloading. Without this, a container restart mid-job
  // (e.g. a deploy) leaves it stuck showing "running" forever.
  if (!didReconcileOrphans) {
    didReconcileOrphans = true;
    try {
      const orphaned = db.prepare(`
        UPDATE download_jobs SET status='failed', error_message='Job interrupted by a server restart before it finished. Start a new job to retry.', completed_at=?
        WHERE status IN ('running','queued')
      `).run(new Date().toISOString());
      if (orphaned.changes > 0) {
        console.log(`[ChannelDownloader] Marked ${orphaned.changes} orphaned job(s) as failed on startup`);
      }
    } catch (e) {
      console.error('[ChannelDownloader] Orphan reconciliation failed:', e.message);
    }
  }
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
      return (handle || parts[parts.length - 1] || 'unknown').replace('@', '');
    }
  } catch {}
  return 'unknown';
}

// ─── Utility: scope a bare YouTube channel URL to its Videos tab ──────────────
// A bare channel URL (youtube.com/@handle, /channel/UC..., /c/name, /user/name)
// makes yt-dlp enumerate the Videos, Shorts, AND Live tabs simultaneously, each
// independently sliced by --playlist-items — so a "5 videos" request can pull
// 10-15 items across tabs, several of which (upcoming/live streams) aren't even
// downloadable. Pin to /videos explicitly unless a specific tab was requested.
const YT_TAB_SUFFIXES = new Set(['videos', 'shorts', 'streams', 'featured', 'playlists', 'community', 'about']);
function normalizeChannelUrl(url, platform) {
  if (platform !== 'youtube') return url;
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const isChannelRoot = parts.length >= 1 && (
      parts[0].startsWith('@') || parts[0] === 'channel' || parts[0] === 'c' || parts[0] === 'user'
    );
    if (!isChannelRoot) return url; // single video, playlist, or already-specific URL
    const lastPart = parts[parts.length - 1].toLowerCase();
    if (YT_TAB_SUFFIXES.has(lastPart)) return url; // already scoped to a tab
    u.pathname = u.pathname.replace(/\/+$/, '') + '/videos';
    return u.toString();
  } catch {
    return url;
  }
}

// ─── Utility: build yt-dlp args per platform ─────────────────────────────────
function buildYtdlpArgs(url, jobId, platform, options) {
  const { maxVideos = 25, quality = '1080', audioOnly = false, dateAfter = '', startIndex = 1, allVideos = false } = options;
  const outputDir = path.join(DOWNLOADS_BASE, jobId);
  const outputTemplate = path.join(outputDir, '%(uploader)s_%(id)s.%(ext)s');

  const baseArgs = [
    normalizeChannelUrl(url, platform),
    '--output', outputTemplate,
    '--write-thumbnail',
    '--write-info-json',
    '--newline',
    '--no-warnings',
    '--ignore-errors',
    '--no-playlist-reverse',
    // Resumability, the core of tokbackup-style whole-channel archiving. This file
    // records every video that finished downloading; re-running the same job
    // (POST /resume) re-reads it and skips completed videos, so a 200-video job
    // that died at 140 continues from 141 instead of restarting from zero. It
    // lives inside the job's own output dir — which Resume reuses — so the record
    // survives across runs and across container restarts (persistent volume).
    '--download-archive', path.join(outputDir, 'archive.txt'),
    // Bulk channel archiving means many sequential downloads in one run —
    // throttle to reduce the odds of the whole job getting IP-blocked partway
    // through (this is the main real-world failure mode for large channels).
    '--sleep-requests', '1',
    '--sleep-interval', '3',
    '--max-sleep-interval', '8',
    ...cookieArgs(),
  ];

  // Video range. "All videos" pulls the creator's entire public history
  // (tokbackup parity) by omitting the upper bound so yt-dlp paginates the whole
  // channel; a bounded job slices to a fixed count. startIndex lets either mode
  // start deeper into a large channel.
  if (allVideos) {
    if (startIndex > 1) baseArgs.push('--playlist-items', `${startIndex}:`);
  } else {
    const endIndex = startIndex + maxVideos - 1;
    baseArgs.push('--playlist-items', `${startIndex}-${endIndex}`);
  }

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

// ─── Get free space on the volume backing a path, in MB ───────────────────────
// A large channel job can easily be tens of GB — better to reject it up front
// with a clear error than let it run for hours and die when the disk fills.
function getAvailableStorageMB(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const stats = fs.statfsSync(dirPath);
    return Math.round((stats.bavail * stats.bsize) / 1024 / 1024);
  } catch {
    return null; // unknown — caller should not block on a failed check
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
  let attemptIndex = 0;
  // Unknown up front for an "all videos" job — yt-dlp reports the real total via
  // "Downloading item N of M" once it has paginated the channel.
  let totalVideos = options.allVideos ? 0 : (options.maxVideos || 25);
  let buffer = '';

  // "Downloading item N of M" fires when yt-dlp *starts* item N, not when it
  // succeeds — trusting it as "downloaded" made a job that's actually failing
  // on every item (e.g. YouTube bot-check with no cookies) show misleading
  // near-100% progress right up until it flips to Failed with 0 files. Count
  // real completed files on disk instead, same source of truth the job uses
  // at completion.
  const flushUpdate = () => {
    if (Date.now() - lastUpdate < 2000) return;
    lastUpdate = Date.now();
    const completedCount = scanOutputFiles(outputDir).length;
    // Report progress as videos-done / total once the channel's total is known —
    // far more meaningful for a many-video job than the current file's download %,
    // which resets to 0 on every new video. Fall back to the per-file % until the
    // total is known (start of an "all videos" job).
    const overall = totalVideos > 0
      ? Math.round((completedCount / totalVideos) * 100)
      : currentProgress;
    db.prepare(`
      UPDATE download_jobs SET
        progress=?, downloaded_videos=?, current_file=?, total_size_mb=?, total_videos=?
      WHERE id=?
    `).run(
      Math.min(overall, 99),
      completedCount,
      attemptIndex ? `${currentFile} (attempting ${attemptIndex}/${totalVideos})` : currentFile,
      getDirSizeMB(outputDir),
      totalVideos || null,
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
      if (parsed.videoIndex) attemptIndex = parsed.videoIndex;
      if (parsed.videoTotal) totalVideos = parsed.videoTotal;
      flushUpdate();
    }
  });

  const errorLines = [];
  proc.stderr.on('data', chunk => {
    const line = chunk.toString();
    // Only log real errors, not warnings
    if (line.includes('ERROR:')) {
      console.error(`[ChannelDownloader:${jobId}] ${line.trim()}`);
      errorLines.push(line.trim());
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
      // Surface the real yt-dlp failure reason on a hard failure, not just "failed"
      // with no context — this was previously logged server-side only.
      const errorMessage = status === 'failed' && errorLines.length
        ? errorLines.slice(0, 5).join('\n').slice(0, 2000)
        : null;

      db.prepare(`
        UPDATE download_jobs SET
          status=?, progress=100, downloaded_videos=?,
          total_videos=?, file_list=?, meta_summary=?,
          total_size_mb=?, completed_at=?, error_message=?
        WHERE id=?
      `).run(
        status,
        fileList.length,
        fileList.length,
        JSON.stringify(fileList),
        metaSummary ? JSON.stringify(metaSummary) : null,
        totalSizeMB,
        new Date().toISOString(),
        errorMessage,
        jobId
      );

      resolve();
    });
  });
}

// ─── Middleware: inject db ────────────────────────────────────────────────────
router.use((req, res, next) => {
  req.db = getDB();
  ensureSchema(req.db);
  next();
});

// ─── POST /start ──────────────────────────────────────────────────────────────
router.post('/start', async (req, res) => {
  const { url, maxVideos = 25, quality = '1080', audioOnly = false, dateAfter = '', subtitles = true, startIndex = 1, allVideos = false } = req.body;

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
  const wantsAll = !!allVideos;
  const options = {
    // allVideos = the creator's entire public history (no upper bound). Otherwise
    // a bounded slice; maxVideos stays capped at 300 for a single bounded job.
    maxVideos: wantsAll ? 0 : Math.min(parseInt(maxVideos) || 25, 300),
    quality, audioOnly, dateAfter, subtitles,
    startIndex: Math.max(parseInt(startIndex) || 1, 1),
    allVideos: wantsAll,
  };
  // Can't estimate an unbounded job up front — the count is unknown until yt-dlp
  // paginates the channel. Resumability (--download-archive) is the safety net if
  // the volume fills mid-run: free space, hit Resume, and it skips what's done.
  const estimatedMB = wantsAll ? 0 : estimateStorageMB(platform, options.maxVideos, quality, audioOnly);

  // A bounded channel job can still be tens of GB — check there's actually room
  // before starting a run that might take hours only to die when the volume fills.
  const availableMB = getAvailableStorageMB(DOWNLOADS_BASE);
  if (!wantsAll && availableMB !== null && estimatedMB > availableMB * 0.9) {
    return res.status(400).json({
      error: `Not enough storage: this job is estimated at ~${estimatedMB}MB but only ${availableMB}MB is available. Lower "Clips to find", switch to audio-only, or free up space (Storage tab) first.`
    });
  }

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

// ─── POST /resume/:jobId ──────────────────────────────────────────────────────
// Re-runs a failed, cancelled, or completed job into its ORIGINAL output dir. The
// --download-archive file there records everything already downloaded, so yt-dlp
// skips completed videos and only fetches what's missing — a genuine resume, not a
// restart. This is how a large channel that got IP-blocked, hit an auth wall, or
// was interrupted partway gets finished without re-pulling every video.
router.post('/resume/:jobId', async (req, res) => {
  const job = req.db.prepare(`SELECT * FROM download_jobs WHERE id=?`).get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (activeProcesses.has(job.id) || job.status === 'running' || job.status === 'queued') {
    return res.status(400).json({ error: 'Job is already running' });
  }

  const running = req.db.prepare(`SELECT COUNT(*) as c FROM download_jobs WHERE status IN ('running','queued')`).get();
  if (running.c >= MAX_CONCURRENT_JOBS) {
    return res.status(429).json({ error: `Max ${MAX_CONCURRENT_JOBS} concurrent downloads. Wait for a job to finish.` });
  }

  const options = job.options ? JSON.parse(job.options) : {};
  req.db.prepare(`UPDATE download_jobs SET status='queued', error_message=NULL, completed_at=NULL WHERE id=?`)
    .run(job.id);

  // Fire and forget — same output dir, same archive, so completed videos are skipped.
  runDownloadJob(req.db, job.id, job.url, job.platform, job.channel_handle, options)
    .catch(e => {
      console.error(`Resume ${job.id} failed:`, e);
      try {
        req.db.prepare(`UPDATE download_jobs SET status='failed', error_message=? WHERE id=?`)
          .run(e.message, job.id);
      } catch {}
    });

  res.json({ success: true, jobId: job.id, message: 'Resuming — already-downloaded videos will be skipped' });
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

// ─── GET /download/:jobId/:filename ───────────────────────────────────────────
// Streams a single downloaded file from a completed job to the user's machine as
// an attachment. Files otherwise only live on the server's Railway volume.
router.get('/download/:jobId/:filename', (req, res) => {
  const job = req.db.prepare(`SELECT output_dir FROM download_jobs WHERE id=?`).get(req.params.jobId);
  if (!job || !job.output_dir) return res.status(404).json({ error: 'Job not found' });

  // Strip any directory components to prevent path traversal, then confirm the
  // resolved path is still inside the job's own output directory.
  const safeName = path.basename(req.params.filename);
  const baseDir = path.resolve(job.output_dir);
  const filePath = path.resolve(baseDir, safeName);
  if (filePath !== path.join(baseDir, safeName) || !filePath.startsWith(baseDir + path.sep)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  res.download(filePath, safeName);
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
