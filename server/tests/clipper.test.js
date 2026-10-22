const test = require("node:test");
const assert = require("node:assert/strict");
const {
  youtubeURL,
  validateRanges,
  clipWords,
  makeASS,
  localCandidates,
  dedupe,
} = require("../clipper/core");
test("YouTube URLs normalize and reject other hosts, credentials and shell-like input", () => {
  assert.equal(
    youtubeURL("https://youtu.be/gpjMKL-Eyzo?t=10"),
    "https://www.youtube.com/watch?v=gpjMKL-Eyzo",
  );
  for (const u of [
    "https://youtube.com.evil.test/watch?v=gpjMKL-Eyzo",
    "file:///etc/passwd",
    "https://youtube.com/@someone",
    "https://user:pw@youtube.com/watch?v=gpjMKL-Eyzo",
    "https://127.0.0.1/watch?v=gpjMKL-Eyzo",
    "https://youtu.be/$(id)",
  ])
    assert.throws(() => youtubeURL(u));
});
test("ranges enforce duration, order and numeric limits", () => {
  assert.equal(
    validateRanges(
      [
        { start: 5, end: 15 },
        { start: 100, end: 150 },
      ],
      200,
    ).length,
    2,
  );
  for (const ranges of [
    [{ start: NaN, end: 3 }],
    [{ start: -1, end: 30 }],
    [{ start: 5, end: 201 }],
    [
      { start: 5, end: 10 },
      { start: 7, end: 20 },
    ],
    [{ start: 0, end: 190 }],
  ])
    assert.throws(() => validateRanges(ranges, 200));
});
test("captions overlap clip boundaries and stitch question plus answer timestamps", () => {
  const words = [
    { start: 1, end: 3, text: "Why?" },
    { start: 8, end: 10, text: "Because" },
    { start: 10, end: 12, text: "money." },
  ];
  const result = clipWords(
    words,
    [
      { start: 2, end: 3 },
      { start: 8, end: 11 },
    ],
    ["money"],
  );
  assert.deepEqual(
    result.map((w) => [w.start, w.end]),
    [
      [0, 1],
      [1, 3],
      [3, 4],
    ],
  );
  assert.equal(result[2].highlight, true);
});
test("ASS uses actual subtitle styles and escapes injection", () => {
  const ass = makeASS(
    [{ start: 0, end: 1, text: "{\\pos(1,1)}money", highlight: true }],
    "9:16",
  );
  assert.match(ass, /PlayResY: 1920/);
  assert.match(ass, /Liberation Sans/);
  assert.match(ass, /c&H00C9E6&/);
  assert.doesNotMatch(ass, /\\pos\(/);
  assert.match(ass, /0:00:01.00/);
});
test("full source is analyzed beyond segment 200 and third hour", () => {
  const words = [];
  for (let i = 0; i < 250; i++)
    words.push({
      start: i * 10,
      end: i * 10 + 9,
      text: "An ordinary sentence.",
    });
  for (let i = 0; i < 10; i++)
    words.push({
      start: 10000 + i * 8,
      end: 10007 + i * 8,
      text:
        i === 0
          ? "Why are people broke?"
          : "Because their expenses exceed their income.",
    });
  const clips = localCandidates(words);
  assert.ok(clips.some((c) => c.ranges[0].start >= 10000));
});
test("distinct answers survive overlap deduplication", () => {
  const question = { start: 0, end: 5 };
  const clips = [
    { score: 90, ranges: [question, { start: 10, end: 40 }] },
    { score: 85, ranges: [question, { start: 45, end: 75 }] },
  ];
  assert.equal(dedupe(clips).length, 2);
  assert.equal(
    dedupe([...clips, { score: 80, ranges: [{ start: 12, end: 38 }] }]).length,
    2,
  );
});
