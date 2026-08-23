const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Database = require('better-sqlite3');
const { initSchema } = require('../db/schema');
const { authenticate, signToken } = require('../middleware/auth');
const { createOperatorRouter } = require('../routes/operator');

function fixture() {
  const db = new Database(':memory:');
  initSchema(db);
  const addUser = db.prepare('INSERT INTO users (id,email,password,name) VALUES (?,?,?,?)');
  addUser.run('u1', 'one@operator.test', 'x', 'One');
  addUser.run('u2', 'two@operator.test', 'x', 'Two');
  const addBrand = db.prepare('INSERT INTO brands (id,user_id,name) VALUES (?,?,?)');
  addBrand.run('b1', 'u1', 'One Brand');
  addBrand.run('b2', 'u2', 'Two Brand');
  addBrand.run('b3', 'u1', 'Other One Brand');
  db.prepare('INSERT INTO assets (id,user_id,brand_id,title) VALUES (?,?,?,?)').run('a1', 'u1', 'b1', 'Owned Asset');
  db.prepare('INSERT INTO assets (id,user_id,brand_id,title) VALUES (?,?,?,?)').run('a2', 'u2', 'b2', 'Private Asset');
  db.prepare('INSERT INTO assets (id,user_id,brand_id,title) VALUES (?,?,?,?)').run('a3', 'u1', 'b3', 'Other Brand Asset');
  db.prepare('INSERT INTO pillars (id,user_id,brand_id,name) VALUES (?,?,?,?)').run('p1', 'u1', 'b1', 'Owned Pillar');
  db.prepare('INSERT INTO pillars (id,user_id,brand_id,name) VALUES (?,?,?,?)').run('p3', 'u1', 'b3', 'Other Brand Pillar');
  const addConversation = db.prepare('INSERT INTO operator_conversations (id,user_id,brand_id,title) VALUES (?,?,?,?)');
  addConversation.run('c1', 'u1', 'b1', 'Owned');
  addConversation.run('c2', 'u2', 'b2', 'Private');
  addConversation.run('c3', 'u1', 'b3', 'Other brand');
  const addOutput = db.prepare("INSERT INTO operator_outputs (id,user_id,brand_id,mode,title,content) VALUES (?,?,?,?,?,?)");
  addOutput.run('o1', 'u1', 'b1', 'create', 'Draft', 'Editable draft');
  addOutput.run('o2', 'u2', 'b2', 'create', 'Private', 'Private output');
  return db;
}

async function withApp(generate, run) {
  const db = fixture();
  const app = express();
  app.use(express.json());
  app.use('/api/operator', authenticate, createOperatorRouter({ dbProvider: () => db, generate }));
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/operator`;
  const call = async (path, options = {}, userId = 'u1') => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (userId) headers.Authorization = `Bearer ${signToken(userId)}`;
    const response = await fetch(`${base}${path}`, { ...options, headers });
    return { status: response.status, body: await response.json() };
  };
  try { await run({ db, call }); } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
}

const successProvider = async () => 'Mocked Operator response';
const runBody = (extra = {}) => ({ mode: 'ask', brandId: 'b1', prompt: 'What should I test?', ...extra });

test('Operator routes require authentication', () => withApp(successProvider, async ({ call }) => {
  const result = await call('/context/b1', {}, null);
  assert.equal(result.status, 401);
}));

test('brand context does not cross user boundaries', () => withApp(successProvider, async ({ call }) => {
  const result = await call('/context/b2');
  assert.equal(result.status, 404);
}));

test('outputs and conversations do not cross user boundaries', () => withApp(successProvider, async ({ call }) => {
  const output = await call('/outputs/o2/feedback', { method: 'POST', body: JSON.stringify({ rating: 'helpful' }) });
  assert.equal(output.status, 404);
  const conversation = await call('/run', { method: 'POST', body: JSON.stringify(runBody({ conversationId: 'c2' })) });
  assert.equal(conversation.status, 404);
}));

test('cross-brand conversation IDs are rejected', () => withApp(successProvider, async ({ call }) => {
  const result = await call('/run', { method: 'POST', body: JSON.stringify(runBody({ conversationId: 'c3' })) });
  assert.equal(result.status, 404);
}));

test('cross-user and cross-brand source assets use the same safe 400', () => withApp(successProvider, async ({ call }) => {
  for (const sourceAssetId of ['a2', 'a3', 'missing']) {
    const result = await call('/run', { method: 'POST', body: JSON.stringify(runBody({ sourceAssetId })) });
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, { error: 'Invalid source asset' });
  }
}));

test('invalid pillars are rejected when saving', () => withApp(successProvider, async ({ call }) => {
  const result = await call('/outputs/o1/save-to-production', { method: 'POST', body: JSON.stringify({ target: 'idea', pillarId: 'p3' }) });
  assert.equal(result.status, 400);
}));

test('saving an output to the existing idea workflow works', () => withApp(successProvider, async ({ db, call }) => {
  const result = await call('/outputs/o1/save-to-production', { method: 'POST', body: JSON.stringify({ target: 'idea', title: 'Saved idea', pillarId: 'p1', content: 'Edited idea' }) });
  assert.equal(result.status, 201);
  const idea = db.prepare('SELECT * FROM ideas WHERE id=? AND user_id=? AND brand_id=?').get(result.body.id, 'u1', 'b1');
  assert.equal(idea.title, 'Saved idea');
  assert.equal(idea.hook_angle, 'Edited idea');
}));

test('saving an output to the existing asset workflow works', () => withApp(successProvider, async ({ db, call }) => {
  const result = await call('/outputs/o1/save-to-production', { method: 'POST', body: JSON.stringify({ target: 'asset', title: 'Saved asset', content: 'Edited asset' }) });
  assert.equal(result.status, 201);
  const asset = db.prepare('SELECT * FROM assets WHERE id=? AND user_id=? AND brand_id=?').get(result.body.id, 'u1', 'b1');
  assert.equal(asset.title, 'Saved asset');
  assert.equal(asset.script, 'Edited asset');
}));

test('missing Anthropic configuration returns the intended safe 503', () => {
  const missingProvider = async () => { const error = new Error('not configured'); error.code = 'AI_NOT_CONFIGURED'; throw error; };
  return withApp(missingProvider, async ({ call }) => {
    const result = await call('/run', { method: 'POST', body: JSON.stringify(runBody()) });
    assert.equal(result.status, 503);
    assert.match(result.body.error, /not configured/i);
  });
});

test('provider failures return a safe 502 without leaking internals', () => {
  const failedProvider = async () => { throw new Error('secret provider detail sk-test-do-not-leak'); };
  return withApp(failedProvider, async ({ call }) => {
    const originalError = console.error;
    console.error = () => {};
    try {
      const result = await call('/run', { method: 'POST', body: JSON.stringify(runBody()) });
      assert.equal(result.status, 502);
      assert.equal(result.body.error, 'Operator AI could not complete this request. Please try again.');
      assert.doesNotMatch(JSON.stringify(result.body), /secret provider detail|sk-test-do-not-leak/);
    } finally { console.error = originalError; }
  });
});
