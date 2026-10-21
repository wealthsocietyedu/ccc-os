# Personal clipping workspace

The live app exposes Clipper, Video Downloader, and Channel Downloader. The previous content creation screens and their running API routes are removed. Existing account and business data are not deleted.

## Processing
- YouTube video links or resumable 8 MB file chunks. Only HTTPS YouTube video URLs are accepted by the clipper.
- ffprobe enforces a three-hour source duration limit. Upload byte limit defaults to 12 GB **subject to available disk space**. The existing Railway volume may be smaller; the UI displays free space and the server reserves headroom.
- Persistent job metadata and source files live beside the database under `clips/`, or at `CLIPPER_PATH`. One CPU-intensive job runs at a time. Transcripts are checkpoints; unfinished processing resumes after a restart. Keep Railway at one replica because the queue is local to the process.
- Local faster-whisper small.en (CPU int8) transcribes the full audio with word timings. It runs in a subprocess. Three-hour jobs can take substantial time on CPU. English is the default model.
- Default selection uses local transcript rules, clearly labeled as suggestions requiring review. It does not understand meaning as reliably as a language model. Optional Groq semantic review is explicit and uses the configured account; no Anthropic or OpenAI call is made by this clipper. Groq free quotas and any account billing are outside this app's control.
- Semantic review traverses all transcript windows with overlap, keeps natural boundaries, and supports repeating a question before separate answers. Model proposals are validated and deduplicated.
- Candidates are reviewed before rendering. No fixed clip count and no claimed virality probability. Custom ranges are available if an automatic suggestion misses a moment.

## Captions and exports
- 16:9 (1920×1080) and 9:16 (1080×1920), fit or crop, adjustable horizontal crop position. Fit preserves the full picture with black padding; crop is manual, not speaker tracking.
- Word text, timing, font size, and yellow emphasis can be edited. Caption changes require re-export.
- Classic-style uses Liberation Sans Bold, **not the proprietary TikTok Classic font**. Yellow is #E6C900. No logos, music, generated images, or generated video are added.
- ASS/libass rendering with H.264/AAC and faststart. Caption failures fail the export instead of returning a misleading uncaptioned file.
- Multi-range clips concatenate the question and chosen answer; timestamps are remapped for captions.
- Native previews/downloads use scoped expiring media tickets, never account JWTs in media URLs.
- Deleting a project explicitly removes its source, transcript and exports. Nothing is automatically purged.

## Deployment and configuration
Dockerfile provides FFmpeg, yt-dlp with Node JS runtime support, faster-whisper, and the model. `av==15.1.0` is pinned because newer PyAV versions change the API faster-whisper uses. `railway.json` selects the Dockerfile and health route.

`CLIPPER_OWNER_EMAILS`: comma-separated allowlist for the private workspace. Also closes new account registration. Falls back to ADMIN_EMAIL when unset.
`CLIPPER_PATH`: persistent project directory; defaults alongside DB_PATH.
`CLIPPER_MAX_BYTES`: upload byte cap, default 12 GiB, still subject to volume free space.
`WHISPER_MODEL`: baked-in model path, default `/opt/whisper-small.en`.
`WHISPER_THREADS`: CPU threads, default 2.
`GROQ_API_KEY`: optional, existing server configuration. Used only when Groq review is selected.
`CLIP_ANALYSIS_MODEL`: Groq review model, default llama-3.3-70b-versatile.
`YTDLP_COOKIES_FILE`: existing cookie-file support. YouTube may reject data-center downloads; file upload remains available.

## Validation
`node --test server/tests/clipper.test.js` covers URL validation, time ranges, word boundary handling, subtitles, late-video analysis and distinct-answer deduplication.
`server/tests/integration.cjs` exercises a local server on port 3101 using a separate test directory. It checks real FFmpeg portrait exports, stitched answer timings, media range playback, upload offsets, and cross-account isolation. Its transcript timings are fixtures, separate from real Whisper smoke testing.

A three-hour limit is implemented, but a full three-hour end-to-end benchmark must be run on the deployed resource tier before claiming a throughput guarantee.
