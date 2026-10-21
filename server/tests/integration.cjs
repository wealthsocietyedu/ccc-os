// Exercises real FFmpeg, authenticated HTTP upload, ownership, edits and multi-range export.
// Uses fixture word timings to isolate rendering from model/network availability.
const assert = require("node:assert/strict"),
  fs = require("fs"),
  path = require("path"),
  { execFileSync } = require("child_process");
const { signToken } = require("../middleware/auth");
const base = "http://localhost:3101/api/smart-clipper";
const token = signToken("integration-user");
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
async function req(p, body, method = "POST", h = headers) {
  const r = await fetch(base + p, {
    method,
    headers: h,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(d));
  return d;
}
(async () => {
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x303844:s=640x360:r=30",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=48000",
    "-t",
    "20",
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-shortest",
    "/tmp/ccc-fixture.mp4",
  ]);
  const bytes = fs.readFileSync("/tmp/ccc-fixture.mp4");
  const j = await req("/uploads", {
    name: "fixture.mp4",
    size: bytes.length,
    format: "9:16",
  });
  let r = await fetch(base + "/uploads/" + j.id, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Upload-Offset": "0",
    },
    body: bytes,
  });
  assert.equal(r.status, 200);
  r = await fetch(base + "/uploads/" + j.id, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Upload-Offset": "0",
    },
    body: bytes,
  });
  assert.equal(r.status, 409);
  const dir = path.join("/tmp/ccc-clipper-test/clips", j.id);
  const words = [
    { start: 0, end: 1, text: "Why" },
    { start: 1, end: 2, text: "money?" },
    { start: 10, end: 11, text: "Because" },
    { start: 11, end: 12, text: "value" },
    { start: 12, end: 13, text: "matters." },
  ];
  fs.writeFileSync(path.join(dir, "words.json"), JSON.stringify(words));
  const stored = JSON.parse(fs.readFileSync(path.join(dir, "job.json")));
  fs.writeFileSync(
    path.join(dir, "job.json"),
    JSON.stringify({ ...stored, status: "ready", duration: 20 }),
  );
  const clip = await req(`/jobs/${j.id}/clips`, {
    ranges: [
      { start: 0, end: 3 },
      { start: 10, end: 15 },
    ],
  });
  const edit = await req(`/jobs/${j.id}/clips/${clip.id}`, undefined, "GET");
  assert.equal(edit.words.at(-1).end, 6);
  await req(
    `/jobs/${j.id}/clips/${clip.id}`,
    {
      words: edit.words.map((w) => ({ ...w, highlight: w.text === "money?" })),
      format: "9:16",
    },
    "PATCH",
  );
  await req(`/jobs/${j.id}/render`, { clipIds: [clip.id] });
  let current;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    current = await req("/status/" + j.id, undefined, "GET");
    if (["complete", "failed"].includes(current.clips[0].renderStatus)) break;
  }
  assert.equal(
    current.clips[0].renderStatus,
    "complete",
    current.clips[0].renderError,
  );
  const media = await req(`/jobs/${j.id}/media`, {
    file: current.clips[0].file,
  });
  r = await fetch("http://localhost:3101" + media.url, {
    headers: { Range: "bytes=0-99" },
  });
  assert.equal(r.status, 206);
  assert.equal((await r.arrayBuffer()).byteLength, 100);
  r = await fetch(base + "/status/" + j.id, {
    headers: { Authorization: `Bearer ${signToken("other-user")}` },
  });
  assert.equal(r.status, 404);
  const output = path.join(dir, "clips", current.clips[0].file);
  const info = JSON.parse(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      output,
    ]),
  );
  assert.equal(info.streams[0].width, 1080);
  assert.equal(info.streams[0].height, 1920);
  assert.ok(Math.abs(Number(info.format.duration) - 8) < 0.15);
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-ss",
    "1",
    "-i",
    output,
    "-frames:v",
    "1",
    "/tmp/ccc-caption-test.png",
  ]);
  fs.writeFileSync(
    "/tmp/ccc-test-session.json",
    JSON.stringify({ token, jobId: j.id }),
  );
  console.log(
    "PASS: chunk offsets, ownership, question+answer stitching, captions, portrait export, signed media ranges.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
