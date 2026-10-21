const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  run,
  atomicJSON,
  youtubeURL,
  normalizeWords,
  validateRanges,
  clipWords,
  makeASS,
} = require("../clipper/core");
const { analyze } = require("../clipper/analysis");
const { cookieArgs } = require("../utils/ytdlpCookies");
const router = express.Router();
const ROOT =
  process.env.CLIPPER_PATH ||
  path.join(
    path.dirname(
      process.env.DB_PATH || path.join(__dirname, "../../data/ccc_os.db"),
    ),
    "clips",
  );
fs.mkdirSync(ROOT, { recursive: true });
const MAX_SECONDS = 10800,
  MAX_BYTES = Number(process.env.CLIPPER_MAX_BYTES) || 12 * 1024 ** 3;
const SECRET =
  process.env.JWT_SECRET || "ccc-os-dev-secret-change-in-production";
const controllers = new Map(),
  uploadLocks = new Set(),
  queue = [];
let working = false;
const file = (id, name) => path.join(ROOT, id, name);
const read = (id) => JSON.parse(fs.readFileSync(file(id, "job.json"), "utf8"));
const save = (j) => {
  j.updatedAt = new Date().toISOString();
  atomicJSON(file(j.id, "job.json"), j);
  return j;
};
const update = (id, patch) => save({ ...read(id), ...patch });
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
function owned(req) {
  if (!/^job_[a-f0-9-]{36}$/.test(req.params.id || "")) return null;
  try {
    const j = read(req.params.id);
    return j.owner === String(req.userId) ? j : null;
  } catch {
    return null;
  }
}
function publicJob(j) {
  const { owner, source, ...rest } = j;
  return rest;
}
function freeBytes() {
  const s = fs.statfsSync(ROOT);
  return s.bavail * s.bsize;
}
function space(bytes = 256 * 1024 ** 2) {
  if (freeBytes() < bytes + 256 * 1024 ** 2)
    throw new Error(
      "Not enough storage. Delete finished projects or increase the Railway volume before retrying.",
    );
}
function options(body = {}) {
  const maxDuration = Number(body.maxDuration ?? 120);
  if (!Number.isFinite(maxDuration) || maxDuration < 20 || maxDuration > 180)
    throw new Error("Choose a maximum clip duration of 20–180 seconds.");
  const analysis = body.analysis === "groq" ? "groq" : "local";
  if (analysis === "groq" && !process.env.GROQ_API_KEY)
    throw new Error("Groq is not configured. Choose local analysis.");
  return {
    format: body.format === "9:16" ? "9:16" : "16:9",
    analysis,
    maxDuration,
  };
}
function create(owner, data) {
  const id = `job_${crypto.randomUUID()}`;
  fs.mkdirSync(file(id, ""));
  return save({
    id,
    owner: String(owner),
    createdAt: new Date().toISOString(),
    progress: 0,
    clips: [],
    ...data,
  });
}
function enqueue(id, task = "analyze", clipId = null) {
  if (queue.some((x) => x.id === id && x.task === task && x.clipId === clipId))
    return;
  queue.push({ id, task, clipId });
  setImmediate(drain);
}
async function drain() {
  if (working) return;
  working = true;
  while (queue.length) {
    const task = queue.shift();
    let j;
    try {
      j = read(task.id);
    } catch {
      continue;
    }
    if (j.status === "canceled") continue;
    const controller = new AbortController();
    controllers.set(j.id, controller);
    try {
      if (task.task === "render")
        await render(j.id, task.clipId, controller.signal);
      else await pipeline(j.id, controller.signal);
    } catch (e) {
      if (fs.existsSync(file(j.id, "job.json"))) {
        const current = read(j.id);
        if (task.task === "render") {
          const clips = current.clips.map((c) =>
            c.id === task.clipId
              ? {
                  ...c,
                  renderStatus: controller.signal.aborted
                    ? "canceled"
                    : "failed",
                  renderError: e.message,
                }
              : c,
          );
          update(j.id, { clips });
        } else
          update(j.id, {
            status: controller.signal.aborted ? "canceled" : "failed",
            error: e.message,
          });
      }
    } finally {
      controllers.delete(j.id);
    }
  }
  working = false;
}
async function probe(source, signal) {
  const p = JSON.parse(
    await run(
      "ffprobe",
      ["-v", "error", "-show_format", "-show_streams", "-of", "json", source],
      { signal, timeout: 60000 },
    ),
  );
  const duration = Number(p.format?.duration);
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > MAX_SECONDS + 0.1
  )
    throw new Error("Video must be playable and no longer than 3 hours.");
  if (
    !p.streams.some((s) => s.codec_type === "video") ||
    !p.streams.some((s) => s.codec_type === "audio")
  )
    throw new Error("Video must contain both picture and spoken audio.");
  return { duration, streams: p.streams };
}
async function pipeline(id, signal) {
  let j = read(id);
  let source = j.source;
  if (!source) {
    update(id, { status: "downloading", progress: 2, error: null });
    space(500 * 1024 ** 2);
    const common = [
      "--no-playlist",
      "--socket-timeout",
      "30",
      "--retries",
      "2",
      "--js-runtimes",
      "node",
      ...cookieArgs(),
    ];
    const meta = JSON.parse(
      await run(
        "yt-dlp",
        [...common, "--dump-single-json", "--skip-download", "--", j.url],
        { signal, timeout: 180000 },
      ),
    );
    if (
      meta.is_live ||
      meta.live_status === "is_upcoming" ||
      !Number.isFinite(meta.duration) ||
      meta.duration > MAX_SECONDS
    )
      throw new Error("Use a finished video no longer than 3 hours.");
    update(id, { title: meta.title || j.title, duration: meta.duration });
    // 720p H.264 limits storage while preserving the landscape frame.
    const maxSize = Math.min(
      MAX_BYTES,
      Math.max(0, freeBytes() - 600 * 1024 ** 2),
    );
    await run(
      "yt-dlp",
      [
        ...common,
        "--max-filesize",
        String(maxSize),
        "-f",
        "bv*[height<=720][vcodec^=avc1]+ba[language=en]/bv*[height<=720][vcodec^=avc1]+ba/b[height<=720]/best[height<=720]",
        "--merge-output-format",
        "mp4",
        "--newline",
        "--progress-template",
        "download:%(progress._percent_str)s",
        "-o",
        file(id, "source.%(ext)s"),
        "--",
        j.url,
      ],
      {
        signal,
        timeout: 3 * 3600000,
        onLine: (line) => {
          const p = parseFloat(line);
          if (Number.isFinite(p))
            update(id, { progress: Math.min(18, 2 + p * 0.16) });
        },
      },
    );
    source = fs
      .readdirSync(file(id, ""))
      .find((f) => /^source\.(mp4|mkv|webm|mov)$/.test(f));
    if (!source)
      throw new Error(
        "YouTube download did not produce a video. Upload the file instead.",
      );
    update(id, { source });
  }
  const sourcePath = file(id, source),
    info = await probe(sourcePath, signal);
  update(id, {
    duration: info.duration,
    status: "transcribing",
    progress: 20,
    error: null,
  });
  if (!fs.existsSync(file(id, "transcript.json"))) {
    space(Math.min(info.duration * 32000, 400 * 1024 ** 2));
    // Stream decoding in a separate process; no three-hour audio Blob in Node memory.
    const audio = file(id, "audio.wav");
    if (!fs.existsSync(audio))
      await run(
        "ffmpeg",
        [
          "-nostdin",
          "-v",
          "error",
          "-y",
          "-i",
          sourcePath,
          "-vn",
          "-ac",
          "1",
          "-ar",
          "16000",
          audio,
        ],
        { signal },
      );
    await run(
      process.env.PYTHON_BIN || "python3",
      [
        path.join(__dirname, "../clipper/transcribe.py"),
        audio,
        file(id, "transcript.json"),
      ],
      {
        signal,
        timeout: 24 * 3600000,
        onLine: (line) => {
          try {
            const p = JSON.parse(line);
            update(id, {
              progress: 20 + Math.min(45, (p.seconds / info.duration) * 45),
              transcribedSeconds: p.seconds,
            });
          } catch {}
        },
      },
    );
    fs.rmSync(audio, { force: true });
  }
  const transcript = JSON.parse(
      fs.readFileSync(file(id, "transcript.json"), "utf8"),
    ),
    words = normalizeWords(transcript.segments);
  if (!words.length)
    throw new Error(
      "No speech was detected. Check the audio and try a different source.",
    );
  atomicJSON(file(id, "words.json"), words);
  update(id, { status: "analyzing", progress: 66 });
  j = read(id);
  const result = await analyze(
    words,
    info.duration,
    j.options,
    signal,
    (done, total) =>
      update(id, {
        progress: 66 + Math.round((done / total) * 30),
        analysisWindows: { done, total },
      }),
  );
  update(id, {
    status: "ready",
    progress: 100,
    method: result.method,
    clips: result.clips.map((c) => ({
      ...c,
      format: j.options.format,
      fit: "contain",
      cropX: 50,
      fontSize: 52,
      revision: 0,
      renderStatus: "idle",
    })),
    error: null,
  });
}
async function render(id, clipId, signal) {
  const j = read(id),
    clip = j.clips.find((c) => c.id === clipId);
  if (!clip) return;
  const ranges = validateRanges(clip.ranges, j.duration, 180),
    duration = ranges.reduce((s, r) => s + r.end - r.start, 0);
  space(Math.max(100 * 1024 ** 2, duration * 1000000));
  const words =
    clip.words ||
    clipWords(
      JSON.parse(fs.readFileSync(file(id, "words.json"), "utf8")),
      ranges,
      clip.highlights,
    );
  if (!words.length)
    throw new Error(
      "This clip has no timed speech captions. Adjust the boundaries.",
    );
  const prefix = `${clipId}_v${clip.revision}`,
    ass = path.join("clips", `${prefix}.ass`);
  fs.mkdirSync(file(id, "clips"), { recursive: true });
  fs.writeFileSync(file(id, ass), makeASS(words, clip.format, clip.fontSize));
  update(id, {
    clips: read(id).clips.map((c) =>
      c.id === clipId
        ? { ...c, renderStatus: "rendering", renderError: null }
        : c,
    ),
  });
  const W = clip.format === "9:16" ? 1080 : 1920,
    H = clip.format === "9:16" ? 1920 : 1080;
  const vf =
    clip.fit === "crop"
      ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:(iw-ow)*${clip.cropX / 100}:(ih-oh)/2,setsar=1`
      : `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
  const inputs = [],
    filters = [];
  ranges.forEach((r, i) => {
    inputs.push(
      "-ss",
      String(r.start),
      "-t",
      String(r.end - r.start),
      "-i",
      file(id, j.source),
    );
    filters.push(
      `[${i}:v]setpts=PTS-STARTPTS,${vf},fps=30[v${i}]`,
      `[${i}:a]asetpts=PTS-STARTPTS,aresample=48000[a${i}]`,
    );
  });
  filters.push(
    `${ranges.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${ranges.length}:v=1:a=1[v][a]`,
  );
  // Only generated filesystem paths enter this filter; no user-supplied shell command.
  const assPath = file(id, ass)
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:")
    .replace(/'/g, "'\\''");
  filters.push(`[v]subtitles=filename='${assPath}'[out]`);
  const target = file(id, path.join("clips", `${prefix}.mp4`)),
    partial = target + ".partial.mp4";
  try {
    await run(
      "ffmpeg",
      [
        "-nostdin",
        "-v",
        "error",
        "-y",
        "-filter_complex_threads",
        "1",
        ...inputs,
        "-filter_complex",
        filters.join(";"),
        "-map",
        "[out]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "21",
        "-threads",
        "2",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-movflags",
        "+faststart",
        partial,
      ],
      { signal },
    );
    await probe(partial, signal);
    fs.renameSync(partial, target);
    update(id, {
      clips: read(id).clips.map((c) =>
        c.id === clipId
          ? {
              ...c,
              renderStatus: "complete",
              file: `${prefix}.mp4`,
              renderedRevision: clip.revision,
              renderError: null,
            }
          : c,
      ),
    });
  } finally {
    fs.rmSync(partial, { force: true });
  }
}
router.get(
  "/health",
  wrap(async (req, res) => {
    const checks = {};
    for (const [key, cmd, args] of [
      ["ffmpeg", "ffmpeg", ["-version"]],
      ["ytdlp", "yt-dlp", ["--version"]],
      [
        "transcription",
        process.env.PYTHON_BIN || "python3",
        [
          "-c",
          'import faster_whisper; import os; assert os.path.isdir(os.environ.get("WHISPER_MODEL","/opt/whisper-small.en"))',
        ],
      ],
    ]) {
      try {
        await run(cmd, args, { timeout: 30000 });
        checks[key] = true;
      } catch {
        checks[key] = false;
      }
    }
    res.json({
      checks,
      ready: checks.ffmpeg && checks.transcription,
      groqAvailable: !!process.env.GROQ_API_KEY,
      maxSeconds: MAX_SECONDS,
      maxBytes: MAX_BYTES,
      freeBytes: freeBytes(),
      font: "Liberation Sans Bold (Classic-style substitute)",
    });
  }),
);
router.get("/jobs", (req, res) => {
  const jobs = fs
    .readdirSync(ROOT)
    .filter((id) => /^job_[a-f0-9-]{36}$/.test(id))
    .flatMap((id) => {
      try {
        const j = read(id);
        return j.owner === String(req.userId) ? [publicJob(j)] : [];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(jobs);
});
router.post(
  "/clip",
  wrap(async (req, res) => {
    const url = youtubeURL(req.body.url),
      opts = options(req.body);
    space();
    const j = create(req.userId, {
      title: "YouTube video",
      url,
      options: opts,
      status: "queued",
    });
    enqueue(j.id);
    res.status(202).json(publicJob(j));
  }),
);
router.post(
  "/uploads",
  wrap(async (req, res) => {
    const size = Number(req.body.size);
    const ext = path.extname(String(req.body.name || "")).toLowerCase();
    if (![".mp4", ".mov", ".mkv", ".webm", ".m4v"].includes(ext))
      throw new Error("Upload MP4, MOV, MKV, WEBM, or M4V.");
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES)
      throw new Error(
        `File exceeds the ${Math.round(MAX_BYTES / 1024 ** 3)} GB upload limit.`,
      );
    space(size + 400 * 1024 ** 2);
    const opts = options(req.body);
    const j = create(req.userId, {
      title: String(req.body.name).slice(0, 200),
      options: opts,
      status: "uploading",
      expectedBytes: size,
      uploadedBytes: 0,
      source: `source${ext}`,
    });
    fs.writeFileSync(file(j.id, j.source), "");
    res.status(201).json(publicJob(j));
  }),
);
router.put(
  "/uploads/:id",
  express.raw({ type: "application/octet-stream", limit: "8mb" }),
  wrap(async (req, res) => {
    const j = owned(req);
    if (!j) return res.sendStatus(404);
    if (j.status !== "uploading")
      return res.status(409).json({ error: "Upload is already finished." });
    if (uploadLocks.has(j.id))
      return res.status(409).json({ error: "Another chunk is being written." });
    const offset = Number(req.headers["upload-offset"]);
    const actual = fs.statSync(file(j.id, j.source)).size;
    if (offset !== actual)
      return res
        .status(409)
        .json({ error: "Upload offset mismatch", offset: actual });
    if (
      !Buffer.isBuffer(req.body) ||
      !req.body.length ||
      actual + req.body.length > j.expectedBytes
    )
      return res.status(400).json({ error: "Invalid upload chunk." });
    space(req.body.length);
    uploadLocks.add(j.id);
    try {
      fs.appendFileSync(file(j.id, j.source), req.body);
      const offset = actual + req.body.length;
      update(j.id, {
        uploadedBytes: offset,
        progress: Math.round((offset / j.expectedBytes) * 100),
      });
      res.json({ offset });
    } finally {
      uploadLocks.delete(j.id);
    }
  }),
);
router.post(
  "/uploads/:id/complete",
  wrap(async (req, res) => {
    const j = owned(req);
    if (!j) return res.sendStatus(404);
    if (
      j.status !== "uploading" ||
      fs.statSync(file(j.id, j.source)).size !== j.expectedBytes
    )
      return res.status(409).json({ error: "Upload is incomplete." });
    const info = await probe(file(j.id, j.source));
    const next = update(j.id, {
      status: "queued",
      progress: 0,
      duration: info.duration,
    });
    enqueue(j.id);
    res.status(202).json(publicJob(next));
  }),
);
router.get("/status/:id", (req, res) => {
  const j = owned(req);
  if (!j) return res.sendStatus(404);
  res.json(publicJob(j));
});
router.post("/jobs/:id/retry", (req, res) => {
  const j = owned(req);
  if (!j) return res.sendStatus(404);
  if (!["failed", "canceled"].includes(j.status) || controllers.has(j.id))
    return res.status(409).json({ error: "Job is not ready to retry." });
  const next = update(j.id, { status: "queued", error: null });
  enqueue(j.id);
  res.json(publicJob(next));
});
router.post("/jobs/:id/cancel", (req, res) => {
  const j = owned(req);
  if (!j) return res.sendStatus(404);
  controllers.get(j.id)?.abort();
  for (let i = queue.length - 1; i >= 0; i--)
    if (queue[i].id === j.id) queue.splice(i, 1);
  res.json(
    publicJob(
      update(j.id, {
        status: "canceled",
        clips: j.clips.map((c) =>
          ["queued", "rendering"].includes(c.renderStatus)
            ? { ...c, renderStatus: "canceled" }
            : c,
        ),
      }),
    ),
  );
});
router.delete("/job/:id", (req, res) => {
  const j = owned(req);
  if (!j) return res.sendStatus(404);
  if (
    controllers.has(j.id) ||
    queue.some((t) => t.id === j.id) ||
    uploadLocks.has(j.id)
  )
    return res
      .status(409)
      .json({
        error: "Cancel the job and wait for it to stop before deleting.",
      });
  fs.rmSync(file(j.id, ""), { recursive: true, force: true });
  res.json({ success: true });
});
router.get("/jobs/:id/transcript", (req, res) => {
  const j = owned(req);
  if (!j || !fs.existsSync(file(j.id, "words.json")))
    return res.sendStatus(404);
  res.json(JSON.parse(fs.readFileSync(file(j.id, "words.json"), "utf8")));
});
router.get("/jobs/:id/clips/:clipId", (req, res) => {
  const j = owned(req),
    c = j?.clips.find((c) => c.id === req.params.clipId);
  if (!c) return res.sendStatus(404);
  const words =
    c.words ||
    clipWords(
      JSON.parse(fs.readFileSync(file(j.id, "words.json"), "utf8")),
      c.ranges,
      c.highlights,
    );
  res.json({ ...c, words });
});
router.post(
  "/jobs/:id/clips",
  wrap(async (req, res) => {
    const j = owned(req);
    if (!j || j.status !== "ready") return res.sendStatus(404);
    const ranges = validateRanges(req.body.ranges, j.duration);
    const c = {
      id: `clip_${crypto.randomUUID()}`,
      title: "Custom clip",
      type: "custom",
      score: null,
      reason: "Manually selected",
      ranges,
      highlights: [],
      format: j.options.format,
      fit: "contain",
      cropX: 50,
      fontSize: 52,
      revision: 0,
      renderStatus: "idle",
    };
    update(j.id, { clips: [...j.clips, c] });
    res.json(c);
  }),
);
router.patch(
  "/jobs/:id/clips/:clipId",
  wrap(async (req, res) => {
    const j = owned(req),
      c = j?.clips.find((c) => c.id === req.params.clipId);
    if (!c) return res.sendStatus(404);
    if (["queued", "rendering"].includes(c.renderStatus))
      return res
        .status(409)
        .json({ error: "Wait for this render to finish before editing." });
    const ranges = validateRanges(req.body.ranges || c.ranges, j.duration),
      duration = ranges.reduce((s, r) => s + r.end - r.start, 0);
    const sameRanges = JSON.stringify(ranges) === JSON.stringify(c.ranges);
    let words = sameRanges ? c.words : undefined;
    if (req.body.words !== undefined) {
      if (!Array.isArray(req.body.words) || req.body.words.length > 2000)
        throw new Error("Invalid caption words.");
      let last = -1;
      words = req.body.words.map((w) => {
        const start = Number(w.start),
          end = Number(w.end),
          text = String(w.text).trim();
        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start < 0 ||
          start < last ||
          end <= start ||
          end > duration + 0.1 ||
          !text ||
          text.length > 100
        )
          throw new Error(
            "Caption timing is outside the clip or text is invalid.",
          );
        last = start;
        return { start, end, text, highlight: w.highlight === true };
      });
    }
    const cropX = Number(req.body.cropX ?? c.cropX),
      fontSize = Number(req.body.fontSize ?? c.fontSize);
    if (
      !Number.isFinite(cropX) ||
      cropX < 0 ||
      cropX > 100 ||
      !Number.isFinite(fontSize) ||
      fontSize < 24 ||
      fontSize > 96
    )
      throw new Error("Invalid crop or font size.");
    const next = {
      ...c,
      title: String(req.body.title ?? c.title).slice(0, 140),
      ranges,
      words,
      cropX,
      fontSize,
      format:
        req.body.format === "9:16"
          ? "9:16"
          : req.body.format === "16:9"
            ? "16:9"
            : c.format,
      fit:
        req.body.fit === "crop"
          ? "crop"
          : req.body.fit === "contain"
            ? "contain"
            : c.fit,
      revision: c.revision + 1,
      renderStatus: "idle",
      file: null,
      renderError: null,
    };
    update(j.id, { clips: j.clips.map((x) => (x.id === c.id ? next : x)) });
    res.json(next);
  }),
);
router.post("/jobs/:id/render", (req, res) => {
  const j = owned(req);
  if (!j || j.status !== "ready")
    return res.status(409).json({ error: "Wait for analysis to finish." });
  const ids = Array.isArray(req.body.clipIds)
    ? new Set(req.body.clipIds)
    : new Set();
  const selected = j.clips.filter(
    (c) => ids.has(c.id) && !["queued", "rendering"].includes(c.renderStatus),
  );
  if (!selected.length)
    return res.status(400).json({ error: "Select clips to export." });
  update(j.id, {
    clips: j.clips.map((c) =>
      selected.includes(c)
        ? { ...c, renderStatus: "queued", renderError: null }
        : c,
    ),
  });
  for (const c of selected) enqueue(j.id, "render", c.id);
  res.status(202).json({ queued: selected.length });
});
// Short-lived, file-scoped tokens let native <video> range requests work without exposing the account JWT.
router.post("/jobs/:id/media", (req, res) => {
  const j = owned(req);
  if (!j) return res.sendStatus(404);
  const filename = req.body.file === "source" ? j.source : req.body.file;
  if (
    !filename ||
    !(filename === j.source || j.clips.some((c) => c.file === filename)) ||
    !fs.existsSync(
      file(
        j.id,
        filename === j.source ? filename : path.join("clips", filename),
      ),
    )
  )
    return res.sendStatus(404);
  const token = jwt.sign(
    { scope: "clip-media", job: j.id, file: filename },
    SECRET,
    { expiresIn: "4h" },
  );
  res.json({
    url: `/api/clip-media/${j.id}/${encodeURIComponent(filename)}?ticket=${token}`,
  });
});
router.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res
    .status(err.type === "entity.too.large" ? 413 : 400)
    .json({ error: err.message || "Clip operation failed." });
});
function media(req, res) {
  try {
    const p = jwt.verify(req.query.ticket, SECRET);
    if (
      p.scope !== "clip-media" ||
      p.job !== req.params.id ||
      p.file !== req.params.filename ||
      !/^job_[a-f0-9-]{36}$/.test(p.job)
    )
      return res.sendStatus(403);
    const j = read(p.job),
      name = p.file;
    if (
      path.basename(name) !== name ||
      !(name === j.source || j.clips.some((c) => c.file === name))
    )
      return res.sendStatus(404);
    const target = file(
      j.id,
      name === j.source ? name : path.join("clips", name),
    );
    res.set("Cache-Control", "private, no-store");
    if (req.query.download === "1") return res.download(target);
    res.sendFile(target);
  } catch {
    return res.sendStatus(403);
  }
}
// Resume durable work after a deploy. Transcripts are checkpoints, completed clips remain available.
for (const id of fs
  .readdirSync(ROOT)
  .filter((id) => /^job_[a-f0-9-]{36}$/.test(id))) {
  try {
    const j = read(id);
    if (
      ["queued", "downloading", "transcribing", "analyzing"].includes(j.status)
    ) {
      update(id, { status: "queued" });
      enqueue(id);
    }
    for (const c of j.clips || [])
      if (["queued", "rendering"].includes(c.renderStatus))
        enqueue(id, "render", c.id);
  } catch {}
}
module.exports = router;
module.exports.media = media;
