const express = require('express');
const router = express.Router();
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ─── Utility: Detect platform from URL ───────────────────────────────────────
function detectPlatform(url) {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
  if (url.includes('pinterest.com')) return 'pinterest';
  return 'unknown';
}

// ─── Utility: Clean temp files ────────────────────────────────────────────────
function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    // silent cleanup
  }
}

// ─── GET /api/video-downloader/info ──────────────────────────────────────────
// Fetches video metadata before download (title, thumbnail, duration)
router.post('/info', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const platform = detectPlatform(url.trim());

  try {
    // Use yt-dlp to get JSON metadata only
    const ytdlpArgs = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      '--extractor-args', 'youtube:player_client=web',
      '--add-headers', 'Accept-Language:en-US,en;q=0.9',
      url.trim()
    ];

    await new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      const proc = spawn('yt-dlp', ytdlpArgs);

      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { errorOutput += data.toString(); });

      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(errorOutput || 'Failed to fetch video info'));
        }

        try {
          const info = JSON.parse(output.trim());
          const durationSec = info.duration || 0;
          const minutes = Math.floor(durationSec / 60);
          const seconds = Math.floor(durationSec % 60);
          const durationStr = durationSec > 0
            ? `${minutes}:${seconds.toString().padStart(2, '0')}`
            : 'Unknown';

          res.json({
            success: true,
            platform,
            title: info.title || 'Untitled Video',
            thumbnail: info.thumbnail || null,
            duration: durationStr,
            uploader: info.uploader || info.channel || null,
            viewCount: info.view_count || null,
            uploadDate: info.upload_date || null,
            description: info.description ? info.description.slice(0, 200) : null,
          });
          resolve();
        } catch (parseErr) {
          reject(new Error('Failed to parse video metadata'));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`yt-dlp not found: ${err.message}. Ensure it is installed via nixpacks.`));
      });
    });

  } catch (error) {
    console.error('Video info error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/video-downloader/download ─────────────────────────────────────
// Downloads video and streams it as a file to the client
router.post('/download', async (req, res) => {
  const { url, quality = 'best', audioOnly = false } = req.body;

  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const platform = detectPlatform(url.trim());
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `ccc-dl-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  try {
    // Build yt-dlp args
    const ytdlpArgs = [
      '--no-playlist',
      '--no-warnings',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      '--extractor-args', 'youtube:player_client=web',
      '--add-headers', 'Accept-Language:en-US,en;q=0.9',
      '-o', `${tmpFile}.%(ext)s`,
    ];

    if (audioOnly) {
      ytdlpArgs.push('-x', '--audio-format', 'mp3');
    } else {
      // Quality selection
      if (quality === 'best') {
        ytdlpArgs.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
      } else if (quality === '1080p') {
        ytdlpArgs.push('-f', 'bestvideo[height<=1080][ext=mp4]+bestaudio/best[height<=1080]');
      } else if (quality === '720p') {
        ytdlpArgs.push('-f', 'bestvideo[height<=720][ext=mp4]+bestaudio/best[height<=720]');
      } else if (quality === '480p') {
        ytdlpArgs.push('-f', 'bestvideo[height<=480][ext=mp4]+bestaudio/best[height<=480]');
      } else {
        ytdlpArgs.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
      }

      // Merge into MP4 if separate streams
      ytdlpArgs.push('--merge-output-format', 'mp4');
    }

    ytdlpArgs.push(url.trim());

    console.log(`[VideoDownloader] Downloading from ${platform}: ${url.trim()}`);

    // Run yt-dlp
    await new Promise((resolve, reject) => {
      let errorOutput = '';
      const proc = spawn('yt-dlp', ytdlpArgs);

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(
            errorOutput.includes('Private video') ? 'This video is private or unavailable.' :
            errorOutput.includes('This video is age-restricted') ? 'This video is age-restricted.' :
            errorOutput.includes('Login required') ? 'This video requires login to access.' :
            errorOutput || 'Download failed. The video may be unavailable or the URL is invalid.'
          ));
        }
        resolve();
      });

      proc.on('error', (err) => {
        reject(new Error('yt-dlp not installed. Please check nixpacks.toml configuration.'));
      });
    });

    // Find the downloaded file
    const ext = audioOnly ? 'mp3' : 'mp4';
    const downloadedFile = `${tmpFile}.${ext}`;
    const altFile = `${tmpFile}.webm`; // fallback

    let finalFile = null;
    if (fs.existsSync(downloadedFile)) {
      finalFile = downloadedFile;
    } else if (fs.existsSync(altFile) && !audioOnly) {
      finalFile = altFile;
    } else {
      // Search for any file with our temp prefix
      const tmpFiles = fs.readdirSync(tmpDir).filter(f => f.startsWith(path.basename(tmpFile)));
      if (tmpFiles.length > 0) {
        finalFile = path.join(tmpDir, tmpFiles[0]);
      }
    }

    if (!finalFile) {
      throw new Error('Download completed but file could not be located.');
    }

    const stats = fs.statSync(finalFile);
    const fileExt = path.extname(finalFile).slice(1);
    const mimeType = audioOnly ? 'audio/mpeg' : (fileExt === 'webm' ? 'video/webm' : 'video/mp4');
    const fileName = `ccc-os-download-${platform}-${Date.now()}.${fileExt}`;

    // Stream file to client
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);

    const readStream = fs.createReadStream(finalFile);
    readStream.pipe(res);

    readStream.on('end', () => {
      cleanupFile(finalFile);
      console.log(`[VideoDownloader] ✓ Download delivered: ${fileName}`);
    });

    readStream.on('error', (err) => {
      cleanupFile(finalFile);
      console.error('[VideoDownloader] Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });

  } catch (error) {
    // Cleanup temp files on error
    ['mp4', 'mp3', 'webm', 'mkv'].forEach(ext => {
      cleanupFile(`${tmpFile}.${ext}`);
    });

    console.error('[VideoDownloader] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
