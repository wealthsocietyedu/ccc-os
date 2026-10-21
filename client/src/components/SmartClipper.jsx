import { useEffect, useRef, useState } from "react";
const API = "/api/smart-clipper";
async function request(p, body, method) {
  const r = await fetch(API + p, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("ccc_token")}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r
    .json()
    .catch(() => ({ error: `Request failed (${r.status})` }));
  if (!r.ok) throw new Error(d.error);
  return d;
}
const time = (n) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
const labels = {
  "bold-statement": "Bold statement",
  "question-answer": "Question + answer",
  opinion: "Opinion",
  insight: "Insight",
  custom: "Custom",
};
const active = (j) =>
  ["queued", "downloading", "transcribing", "analyzing"].includes(j?.status);
function ClipEditor({ job, clip, onClose, onSaved }) {
  const [draft, setDraft] = useState(null),
    [url, setURL] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [position, setPosition] = useState(0),
    [tab, setTab] = useState("words");
  const video = useRef(null);
  useEffect(() => {
    let alive = true;
    request(`/jobs/${job.id}/clips/${clip.id}`)
      .then((d) => {
        if (alive) setDraft(d);
      })
      .catch((e) => setError(e.message));
    request(`/jobs/${job.id}/media`, { file: clip.file || "source" })
      .then((d) => {
        if (alive) setURL(d.url);
      })
      .catch((e) => setError(e.message));
    return () => {
      alive = false;
    };
  }, [job.id, clip.id]);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const r = await request(
        `/jobs/${job.id}/clips/${clip.id}`,
        draft,
        "PATCH",
      );
      await onSaved(r);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function range(i, key, value) {
    const ranges = draft.ranges.map((r, j) =>
      j === i ? { ...r, [key]: Number(value) } : r,
    );
    setDraft({ ...draft, ranges, words: undefined });
  }
  async function reloadWords() {
    setBusy(true);
    try {
      await request(`/jobs/${job.id}/clips/${clip.id}`, draft, "PATCH");
      setDraft(await request(`/jobs/${job.id}/clips/${clip.id}`));
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="editor"
        role="dialog"
        aria-modal="true"
        aria-label="Edit clip"
      >
        <header>
          <h2>Edit clip</h2>
          <button onClick={onClose} aria-label="Close editor">
            ✕
          </button>
        </header>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!draft ? (
          <p>Loading captions…</p>
        ) : (
          <>
            <div className="editor-grid">
              <div>
                <video
                  ref={video}
                  src={url}
                  controls
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={() => {
                    if (!clip.file)
                      video.current.currentTime = draft.ranges[0].start;
                  }}
                  onTimeUpdate={() =>
                    setPosition(video.current?.currentTime || 0)
                  }
                />
                <p className="muted">
                  {clip.file
                    ? "Last exported version. Save and export again to apply edits."
                    : "Source preview. Captions and formatting are applied when you export."}{" "}
                  · {time(position)}
                </p>
                <div className="caption-sample">
                  Your next <mark>great clip</mark> starts here.
                </div>
                <p className="muted">
                  Classic-style bold captions with a dark outline. Liberation
                  Sans is an Arial-compatible substitute; exact TikTok Classic
                  is not bundled.
                </p>
                <label>
                  Title
                  <input
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                  />
                </label>
                <div className="fields">
                  <label>
                    Format
                    <select
                      value={draft.format}
                      onChange={(e) =>
                        setDraft({ ...draft, format: e.target.value })
                      }
                    >
                      <option>16:9</option>
                      <option>9:16</option>
                    </select>
                  </label>
                  <label>
                    Framing
                    <select
                      value={draft.fit}
                      onChange={(e) =>
                        setDraft({ ...draft, fit: e.target.value })
                      }
                    >
                      <option value="contain">Fit whole frame</option>
                      <option value="crop">Fill / crop</option>
                    </select>
                  </label>
                  <label>
                    Caption size
                    <input
                      type="number"
                      min="24"
                      max="96"
                      value={draft.fontSize}
                      onChange={(e) =>
                        setDraft({ ...draft, fontSize: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                {draft.fit === "crop" && (
                  <label>
                    Horizontal crop position: {draft.cropX}%
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={draft.cropX}
                      onChange={(e) =>
                        setDraft({ ...draft, cropX: Number(e.target.value) })
                      }
                    />
                  </label>
                )}
              </div>
              <div>
                <div className="tabs">
                  <button
                    className={tab === "words" ? "active" : ""}
                    onClick={() => setTab("words")}
                  >
                    Captions
                  </button>
                  <button
                    className={tab === "ranges" ? "active" : ""}
                    onClick={() => setTab("ranges")}
                  >
                    Source ranges
                  </button>
                </div>
                {tab === "ranges" ? (
                  <>
                    <p>
                      Seconds in the original video. For separate answers, keep
                      the question as range 1 and its answer as range 2.
                    </p>
                    {draft.ranges.map((r, i) => (
                      <div className="fields" key={i}>
                        <label>
                          Start
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={r.start}
                            onChange={(e) => range(i, "start", e.target.value)}
                          />
                        </label>
                        <label>
                          End
                          <input
                            type="number"
                            step="0.01"
                            value={r.end}
                            onChange={(e) => range(i, "end", e.target.value)}
                          />
                        </label>
                        <button
                          disabled={draft.ranges.length === 1}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              ranges: draft.ranges.filter((_, j) => i !== j),
                              words: undefined,
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      disabled={draft.ranges.length >= 8}
                      onClick={() => {
                        const end = draft.ranges.at(-1).end;
                        setDraft({
                          ...draft,
                          ranges: [
                            ...draft.ranges,
                            {
                              start: end,
                              end: Math.min(end + 20, job.duration),
                            },
                          ],
                          words: undefined,
                        });
                      }}
                    >
                      Add answer range
                    </button>
                    <p className="muted">
                      Changing ranges resets caption edits to the original
                      transcript.
                    </p>
                    {!draft.words && (
                      <button onClick={reloadWords} disabled={busy}>
                        Save ranges & reload captions
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p>
                      Correct any word. Tap its yellow swatch to highlight it.
                      Timings are relative to the assembled clip.
                    </p>
                    <div className="word-list">
                      {draft.words?.map((w, i) => (
                        <div className="word-row" key={i}>
                          <button
                            title="Toggle yellow highlight"
                            aria-label={`Highlight ${w.text}`}
                            aria-pressed={w.highlight}
                            className={w.highlight ? "highlighted" : ""}
                            onClick={() =>
                              setDraft({
                                ...draft,
                                words: draft.words.map((v, k) =>
                                  k === i
                                    ? { ...v, highlight: !v.highlight }
                                    : v,
                                ),
                              })
                            }
                          >
                            ●
                          </button>
                          <input
                            aria-label={`Caption word ${i + 1}`}
                            value={w.text}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                words: draft.words.map((v, k) =>
                                  k === i ? { ...v, text: e.target.value } : v,
                                ),
                              })
                            }
                          />
                          <input
                            aria-label={`Word ${i + 1} start`}
                            type="number"
                            step="0.01"
                            value={w.start}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                words: draft.words.map((v, k) =>
                                  k === i
                                    ? { ...v, start: Number(e.target.value) }
                                    : v,
                                ),
                              })
                            }
                          />
                          <input
                            aria-label={`Word ${i + 1} end`}
                            type="number"
                            step="0.01"
                            value={w.end}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                words: draft.words.map((v, k) =>
                                  k === i
                                    ? { ...v, end: Number(e.target.value) }
                                    : v,
                                ),
                              })
                            }
                          />
                        </div>
                      )) || <p>Save ranges and reload captions first.</p>}
                    </div>
                  </>
                )}
              </div>
            </div>
            <footer>
              <button onClick={onClose}>Close</button>
              <button className="primary" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
function Preview({ job, clip }) {
  const [url, setURL] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    request(`/jobs/${job.id}/media`, { file: clip.file })
      .then((d) => {
        if (alive) setURL(d.url);
      })
      .catch((e) => setError(e.message));
    return () => {
      alive = false;
    };
  }, [job.id, clip.file]);
  return (
    <>
      {error && <p className="error">{error}</p>}
      <video src={url} controls playsInline preload="metadata" />
      {url && (
        <a className="download" href={`${url}&download=1`}>
          Download MP4 ↓
        </a>
      )}
    </>
  );
}
export default function SmartClipper() {
  const [jobs, setJobs] = useState([]),
    [jobId, setJobId] = useState(null),
    [health, setHealth] = useState(null),
    [mode, setMode] = useState("url"),
    [url, setURL] = useState(""),
    [source, setSource] = useState(null),
    [format, setFormat] = useState("16:9"),
    [analysis, setAnalysis] = useState("local"),
    [maxDuration, setMaxDuration] = useState(120),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uploadProgress, setUploadProgress] = useState(0),
    [selected, setSelected] = useState([]),
    [filter, setFilter] = useState("all"),
    [editing, setEditing] = useState(null),
    [custom, setCustom] = useState(false),
    [customStart, setCustomStart] = useState(0),
    [customEnd, setCustomEnd] = useState(45);
  const uploadController = useRef(null);
  const job = jobs.find((j) => j.id === jobId);
  async function refresh() {
    const list = await request("/jobs");
    setJobs(list);
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    request("/health")
      .then(setHealth)
      .catch((e) => setError(e.message));
    const timer = setInterval(() => refresh().catch(() => {}), 8000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setSelected([]);
    setFilter("all");
    setEditing(null);
  }, [jobId]);
  async function upload(file, resume) {
    let j = resume;
    if (!j)
      j = await request("/uploads", {
        name: file.name,
        size: file.size,
        format,
        analysis,
        maxDuration,
      });
    setJobId(j.id);
    await refresh();
    localStorage.setItem(
      "ccc_upload",
      JSON.stringify({
        id: j.id,
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
      }),
    );
    const controller = new AbortController();
    uploadController.current = controller;
    let offset = j.uploadedBytes || 0;
    while (offset < file.size) {
      const end = Math.min(offset + 8 * 1024 ** 2, file.size);
      let success = false;
      for (let attempt = 0; attempt < 3 && !success; attempt++) {
        try {
          const r = await fetch(`${API}/uploads/${j.id}`, {
            method: "PUT",
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("ccc_token")}`,
              "Content-Type": "application/octet-stream",
              "Upload-Offset": String(offset),
            },
            body: file.slice(offset, end),
          });
          const d = await r.json();
          if (r.status === 409 && Number.isFinite(d.offset)) {
            offset = d.offset;
            success = true;
            break;
          }
          if (!r.ok) throw new Error(d.error);
          offset = d.offset;
          success = true;
        } catch (e) {
          if (controller.signal.aborted || attempt === 2) throw e;
        }
      }
      setUploadProgress(Math.round((offset / file.size) * 100));
    }
    await request(`/uploads/${j.id}/complete`, {});
    localStorage.removeItem("ccc_upload");
    await refresh();
    uploadController.current = null;
  }
  async function start(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setUploadProgress(0);
    try {
      if (mode === "url") {
        const j = await request("/clip", {
          url,
          format,
          analysis,
          maxDuration,
        });
        setJobId(j.id);
        await refresh();
      } else {
        if (!source) throw new Error("Choose a video file.");
        await upload(source);
      }
    } catch (e) {
      setError(
        e.name === "AbortError"
          ? "Upload paused. Reselect the same file and resume below."
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function resume(e, j) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const saved = JSON.parse(localStorage.getItem("ccc_upload") || "null");
      if (
        file.size !== j.expectedBytes ||
        file.name !== j.title ||
        (saved?.id === j.id && file.lastModified !== saved.lastModified)
      )
        throw new Error("Select the original, unchanged video file.");
      await upload(file, j);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function action(p, body, method) {
    setError("");
    try {
      await request(p, body, method);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  const visible = (job?.clips || []).filter(
    (c) => filter === "all" || c.type === filter,
  );
  return (
    <div className="clip-page">
      <div className="heading">
        <div>
          <span className="eyebrow">MORE SIGNAL. LESS EDITING.</span>
          <h1>Find your next great clip.</h1>
          <p>
            Bold statements. Real answers. Strong opinions.
            <br />
            Keep the moments that stand on their own.
          </p>
        </div>
        <div className="format-stamp">
          16:9 <span>/</span> 9:16
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      <section className="panel import-panel">
        <div className="tabs">
          <button
            className={mode === "url" ? "active" : ""}
            onClick={() => setMode("url")}
          >
            YouTube link
          </button>
          <button
            className={mode === "file" ? "active" : ""}
            onClick={() => setMode("file")}
          >
            Upload video
          </button>
        </div>
        <form onSubmit={start}>
          {mode === "url" ? (
            <label className="source-label">
              Video URL
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={url}
                onChange={(e) => setURL(e.target.value)}
                required
              />
            </label>
          ) : (
            <label className="dropzone">
              Choose a video up to 3 hours
              <input
                type="file"
                accept="video/*,.mkv"
                onChange={(e) => setSource(e.target.files[0])}
              />
              <small>
                {source
                  ? `${source.name} · ${(source.size / 1024 ** 3).toFixed(2)} GB`
                  : "MP4, MOV, MKV, WEBM or M4V · resumable uploads"}
              </small>
            </label>
          )}
          <div className="fields">
            <label>
              Output format
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option>16:9</option>
                <option>9:16</option>
              </select>
            </label>
            <label>
              Max clip length
              <select
                value={maxDuration}
                onChange={(e) => setMaxDuration(Number(e.target.value))}
              >
                {[60, 90, 120, 180].map((n) => (
                  <option key={n} value={n}>
                    {n} seconds
                  </option>
                ))}
              </select>
            </label>
            <label>
              Find moments with
              <select
                value={analysis}
                onChange={(e) => setAnalysis(e.target.value)}
              >
                <option value="local">Local rules · no AI API calls</option>
                {health?.groqAvailable && (
                  <option value="groq">
                    Groq semantic review · account limits apply
                  </option>
                )}
              </select>
            </label>
            <button
              type="submit"
              className="primary"
              disabled={busy || health?.ready === false}
            >
              {busy ? `Uploading ${uploadProgress}%` : "Find clips ↗"}
            </button>
            {busy && (
              <button
                type="button"
                onClick={() => uploadController.current?.abort()}
              >
                Pause upload
              </button>
            )}
          </div>
          <p className="muted">
            {analysis === "local"
              ? "Local rules find candidates; review them for complete meaning. No fixed clip count."
              : "Semantic review reads the full transcript in overlapping sections and looks for complete setup and payoff. Uses your configured Groq account."}{" "}
            {health &&
              `Available storage: ${(health.freeBytes / 1024 ** 3).toFixed(1)} GB.`}
          </p>
          {health?.ready === false && (
            <p className="error">
              Processing is not ready:{" "}
              {Object.entries(health.checks)
                .filter(([k, v]) => !v && k !== "ytdlp")
                .map(([k]) => k)
                .join(", ")}{" "}
              unavailable.
            </p>
          )}
        </form>
      </section>
      <div className="project-layout">
        <aside className="projects">
          <div className="section-title">
            <h2>Projects</h2>
            <span>{jobs.length}</span>
          </div>
          {jobs.length === 0 ? (
            <p className="muted">Your imported videos will appear here.</p>
          ) : (
            jobs.map((j) => (
              <button
                key={j.id}
                className={`project ${j.id === jobId ? "active" : ""}`}
                onClick={() => setJobId(j.id)}
              >
                <strong>{j.title}</strong>
                <small>
                  {j.status} {j.duration ? `· ${time(j.duration)}` : ""}
                </small>
              </button>
            ))
          )}
        </aside>
        <section className="results">
          {!job ? (
            <div className="empty">
              <span>✂</span>
              <h2>A full idea. A clean cut.</h2>
              <p>Import a video or select a project to review its moments.</p>
              <div className="caption-sample">
                Make the <mark>important words</mark> stand out.
              </div>
            </div>
          ) : (
            <>
              <div className="section-title">
                <div>
                  <h2>{job.title}</h2>
                  <p className="muted">
                    {job.method === "groq-semantic"
                      ? "Semantic suggestions"
                      : job.method === "local-rules"
                        ? "Local suggestions · review required"
                        : job.status}{" "}
                    {job.duration && `· ${time(job.duration)}`}
                  </p>
                </div>
                <button
                  className="danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete this project, its source video and all exported clips?",
                      )
                    )
                      action(`/job/${job.id}`, null, "DELETE");
                  }}
                >
                  Delete
                </button>
              </div>
              {active(job) && (
                <div className="progress-panel">
                  <strong>
                    {job.status} · {Math.round(job.progress)}%
                  </strong>
                  <progress value={job.progress} max="100" />
                  <p>
                    Long videos run in the background. You can leave this page
                    after the upload finishes.
                  </p>
                  <button onClick={() => action(`/jobs/${job.id}/cancel`, {})}>
                    Cancel job
                  </button>
                </div>
              )}
              {job.status === "uploading" && (
                <div className="panel">
                  <p>
                    Upload{" "}
                    {Math.round((job.uploadedBytes / job.expectedBytes) * 100)}%
                    complete. Reselect the same file to resume.
                  </p>
                  <input
                    type="file"
                    disabled={busy}
                    onChange={(e) => resume(e, job)}
                  />
                </div>
              )}
              {["failed", "canceled"].includes(job.status) && (
                <div className="error">
                  <p>{job.error || "Job canceled."}</p>
                  <button onClick={() => action(`/jobs/${job.id}/retry`, {})}>
                    Retry from checkpoint
                  </button>
                </div>
              )}
              {job.status === "ready" && (
                <>
                  <div className="toolbar">
                    <select
                      aria-label="Filter clips"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">
                        All moments ({job.clips.length})
                      </option>
                      {Object.entries(labels).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setSelected(visible.map((c) => c.id))}
                    >
                      Select visible
                    </button>
                    <button onClick={() => setSelected([])}>Clear</button>
                    <button onClick={() => setCustom(!custom)}>
                      + Custom clip
                    </button>
                    <button
                      className="primary"
                      disabled={!selected.length}
                      onClick={() =>
                        action(`/jobs/${job.id}/render`, { clipIds: selected })
                      }
                    >
                      Export selected ({selected.length})
                    </button>
                  </div>
                  {custom && (
                    <form
                      className="panel fields"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await action(`/jobs/${job.id}/clips`, {
                          ranges: [{ start: customStart, end: customEnd }],
                        });
                        setCustom(false);
                      }}
                    >
                      <label>
                        Start (seconds)
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={customStart}
                          onChange={(e) =>
                            setCustomStart(Number(e.target.value))
                          }
                        />
                      </label>
                      <label>
                        End (seconds)
                        <input
                          type="number"
                          step="0.1"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(Number(e.target.value))}
                        />
                      </label>
                      <button className="primary">Create clip</button>
                    </form>
                  )}
                  {!visible.length && (
                    <p className="empty">
                      No candidates in this view. Add a custom clip or choose
                      another filter.
                    </p>
                  )}
                  <div className="clip-grid">
                    {visible.map((c) => (
                      <article key={c.id} className="clip-card">
                        <div className="section-title">
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={selected.includes(c.id)}
                              onChange={(e) =>
                                setSelected(
                                  e.target.checked
                                    ? [...selected, c.id]
                                    : selected.filter((id) => id !== c.id),
                                )
                              }
                            />
                            {labels[c.type]}
                          </label>
                          <span className="badge">{c.format}</span>
                        </div>
                        <h3>{c.title}</h3>
                        <p>{c.reason}</p>
                        <div className="ranges">
                          {c.ranges.map((r, i) => (
                            <span key={i}>
                              {time(r.start)}–{time(r.end)}
                            </span>
                          ))}
                          <strong>
                            {Math.round(
                              c.ranges.reduce((s, r) => s + r.end - r.start, 0),
                            )}
                            s
                          </strong>
                        </div>
                        {c.renderStatus === "complete" && c.file && (
                          <Preview job={job} clip={c} />
                        )}
                        <div className="fields">
                          <button
                            disabled={["queued", "rendering"].includes(
                              c.renderStatus,
                            )}
                            onClick={() => setEditing(c)}
                          >
                            Edit & preview
                          </button>
                          <span className="muted">
                            {c.renderStatus === "idle"
                              ? "Ready for review"
                              : c.renderStatus}
                          </span>
                        </div>
                        {c.renderError && (
                          <p className="error">{c.renderError}</p>
                        )}
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
      {editing && job && (
        <ClipEditor
          job={job}
          clip={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
