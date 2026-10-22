const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(command, args, { signal, timeout = 6 * 3600000, onLine } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      signal,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "",
      err = "",
      buffer = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
    child.stdout.on("data", (b) => {
      out = (out + b).slice(-8 * 1024 * 1024);
      buffer += b;
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) onLine?.(line);
    });
    child.stderr.on("data", (b) => {
      err = (err + b).slice(-16000);
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out.trim());
      else
        reject(
          new Error(
            signal?.aborted
              ? "Job canceled"
              : `${command} failed: ${err.slice(-2000) || `exit ${code}`}`,
          ),
        );
    });
  });
}
function atomicJSON(file, value) {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value));
  fs.renameSync(temp, file);
}
function youtubeURL(input) {
  let u;
  try {
    u = new URL(input);
  } catch {
    throw new Error("Enter a valid YouTube video URL.");
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port)
    throw new Error("Use an HTTPS YouTube URL.");
  let id;
  if (u.hostname === "youtu.be") id = u.pathname.slice(1);
  else if (
    ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname)
  ) {
    id =
      u.pathname === "/watch"
        ? u.searchParams.get("v")
        : u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)$/)?.[1];
  }
  if (!/^[\w-]{11}$/.test(id || ""))
    throw new Error(
      "Use a single YouTube video link, not a channel or playlist.",
    );
  return `https://www.youtube.com/watch?v=${id}`;
}
const cleanWord = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']/gu, "");
const emphasis =
  /^(never|always|stop|wrong|broke|rich|money|million|millions|billion|free|fear|truth|failure|fail|success|sell|sales|profit|debt|attention|risk|believe|hate|love|first|second|third|because|why|how)$/i;
function normalizeWords(segments) {
  return segments
    .flatMap((s) =>
      s.words?.length
        ? s.words.map((w) => ({
            start: Number(w.start),
            end: Number(w.end),
            text: String(w.word ?? w.text).trim(),
          }))
        : [],
    )
    .filter((w) => w.text && Number.isFinite(w.start) && w.end > w.start)
    .sort((a, b) => a.start - b.start);
}
function sentences(words) {
  const result = [];
  let current = [];
  for (let i = 0; i < words.length; i++) {
    current.push(words[i]);
    if (
      /[.!?]["']?$/.test(words[i].text) ||
      !words[i + 1] ||
      words[i + 1].start - words[i].end > 1.2 ||
      current.length >= 55
    ) {
      result.push({
        start: current[0].start,
        end: current.at(-1).end,
        text: current.map((w) => w.text).join(" "),
      });
      current = [];
    }
  }
  return result;
}
function category(text) {
  if (
    /\?|\b(why|how|what happens|what do|what is|do you know)\b/i.test(
      text.slice(0, 180),
    )
  )
    return "question-answer";
  if (
    /\b(i (think|believe|feel|disagree|hate)|in my opinion|should|shouldn't|overrated)\b/i.test(
      text,
    )
  )
    return "opinion";
  if (
    /\b(never|wrong|lie|secret|nobody|million|billion|broke|truth|actually|stop)\b|\d/i.test(
      text,
    )
  )
    return "bold-statement";
  return "insight";
}
function dedupe(clips) {
  const accepted = [];
  for (const c of [...clips].sort((a, b) => b.score - a.score)) {
    const body = c.ranges.at(-1);
    if (
      !accepted.some((a) => {
        const b = a.ranges.at(-1);
        return (
          Math.max(
            0,
            Math.min(b.end, body.end) - Math.max(b.start, body.start),
          ) /
            Math.min(b.end - b.start, body.end - body.start) >
          0.72
        );
      })
    )
      accepted.push(c);
  }
  return accepted;
}
function localCandidates(words, maxDuration = 120) {
  const ss = sentences(words),
    candidates = [];
  ss.forEach((s, i) => {
    const kind = category(s.text);
    if (kind === "insight") return;
    let end = i;
    while (
      end + 1 < ss.length &&
      ss[end].end - s.start < 35 &&
      ss[end + 1].end - s.start <= maxDuration
    )
      end++;
    const duration = ss[end].end - s.start;
    if (duration < 12 || duration > maxDuration) return;
    const text = ss
      .slice(i, end + 1)
      .map((x) => x.text)
      .join(" ");
    let score =
      55 + (kind === "question-answer" ? 15 : kind === "opinion" ? 12 : 10);
    if (/\b(because|for example|here's|reason|instead|so that)\b/i.test(text))
      score += 10;
    if (/^[A-Z]/.test(s.text) && /[.!?]$/.test(ss[end].text)) score += 5;
    if (/^(and|but|so|it|this|that|they|he|she)\b/i.test(s.text)) score -= 12;
    if (/\b(subscribe|link below|sponsor|welcome back)\b/i.test(text))
      score -= 25;
    if (score < 65) return;
    candidates.push({
      title: s.text.slice(0, 100),
      type: kind,
      score,
      reason:
        "Local transcript signals; review the setup and payoff before exporting.",
      ranges: [{ start: s.start, end: ss[end].end }],
      highlights: [],
    });
    // A repeated question plus each numbered answer becomes a distinct edit.
    if (kind === "question-answer") {
      const questionEnd = s.end;
      const answers = [];
      for (
        let j = i + 1;
        j < ss.length && ss[j].start - questionEnd < 300;
        j++
      ) {
        if (
          /^(?:number (?:one|two|three|four|five)|first(?:ly)?|second(?:ly)?|third(?:ly)?|the (?:first|second|third) (?:thing|reason|answer))/i.test(
            ss[j].text,
          )
        )
          answers.push(j);
      }
      if (answers.length >= 2)
        answers.forEach((j, a) => {
          let k = j;
          const bound = answers[a + 1] ?? ss.length;
          while (
            k + 1 < bound &&
            ss[k + 1].end - ss[j].start + s.end - s.start <= maxDuration &&
            ss[k].end - ss[j].start < 65
          )
            k++;
          if (ss[k].end - ss[j].start < 8) return;
          candidates.push({
            title: ss[j].text.slice(0, 100),
            type: "question-answer",
            score: 80,
            reason:
              "Question repeated before a separate numbered answer. Review for complete meaning.",
            ranges: [
              { start: s.start, end: s.end },
              { start: Math.max(questionEnd, ss[j].start), end: ss[k].end },
            ],
            highlights: [],
          });
        });
    }
  });
  return dedupe(candidates).map((c, i) => ({ ...c, id: `clip_${i + 1}` }));
}
function validateRanges(ranges, duration, maxDuration = 180) {
  if (!Array.isArray(ranges) || !ranges.length || ranges.length > 8)
    throw new Error("Choose one to eight source ranges.");
  let prev = -1,
    total = 0;
  const result = ranges.map((r) => {
    const start = Number(r.start),
      end = Number(r.end);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end > duration + 0.05 ||
      end <= start ||
      start < prev
    )
      throw new Error(
        "Clip ranges must be ordered and inside the source video.",
      );
    total += end - start;
    prev = end;
    return { start, end };
  });
  if (total < 1 || total > maxDuration + 0.05)
    throw new Error(`Clip length must be 1–${maxDuration} seconds.`);
  return result;
}
function clipWords(words, ranges, highlights = []) {
  let offset = 0;
  const out = [];
  const marked = new Set(highlights.map(cleanWord));
  for (const r of ranges) {
    for (const w of words.filter((w) => w.end > r.start && w.start < r.end))
      out.push({
        start: Math.max(0, w.start - r.start) + offset,
        end: Math.min(r.end, w.end) - r.start + offset,
        text: w.text,
        highlight: marked.size
          ? marked.has(cleanWord(w.text))
          : emphasis.test(cleanWord(w.text)),
      });
    offset += r.end - r.start;
  }
  return out;
}
function assTime(t) {
  const n = Math.max(0, Math.round(t * 100));
  return `${Math.floor(n / 360000)}:${String(Math.floor(n / 6000) % 60).padStart(2, "0")}:${String(Math.floor(n / 100) % 60).padStart(2, "0")}.${String(n % 100).padStart(2, "0")}`;
}
function escapeASS(s) {
  return String(s).replace(/[{}\\\r\n]/g, " ");
}
function makeASS(words, format = "16:9", size = 52) {
  const width = format === "9:16" ? 1080 : 1920,
    height = 1080 === width ? 1920 : 1080;
  let out = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Liberation Sans,${size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,60,60,${format === "9:16" ? 260 : 90},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  let group = [];
  function flush() {
    if (!group.length) return;
    const text = group
      .map((w) =>
        w.highlight
          ? `{\\c&H00C9E6&}${escapeASS(w.text)}{\\c&HFFFFFF&}`
          : escapeASS(w.text),
      )
      .join(" ");
    out += `Dialogue: 0,${assTime(group[0].start)},${assTime(group.at(-1).end)},Default,,0,0,0,,${text}\n`;
    group = [];
  }
  for (const w of words) {
    if (
      group.length &&
      (w.start - group.at(-1).end > 0.6 ||
        group.map((x) => x.text).join(" ").length + w.text.length >
          (format === "9:16" ? 25 : 48) ||
        group.length >= 7)
    )
      flush();
    group.push(w);
    if (/[.!?]$/.test(w.text)) flush();
  }
  flush();
  return out;
}
module.exports = {
  run,
  atomicJSON,
  youtubeURL,
  normalizeWords,
  sentences,
  localCandidates,
  validateRanges,
  clipWords,
  makeASS,
  dedupe,
};
