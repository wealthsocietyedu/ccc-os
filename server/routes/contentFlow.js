const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.get('/list', async (req, res) => {
  try {
    const { getDB } = require('../db');
    const db = getDB();
    const flows = db.prepare('SELECT * FROM flows WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId);
    res.json({ success: true, flows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch flows', details: error.message });
  }
});

router.post('/save', async (req, res) => {
  try {
    const { name, description, nodes } = req.body;
    if (!name || !nodes) return res.status(400).json({ error: 'Name and nodes required' });
    const { getDB } = require('../db');
    const db = getDB();
    const result = db.prepare(
      'INSERT INTO flows (user_id, name, description, nodes) VALUES (?, ?, ?, ?)'
    ).run(req.userId, name, description || '', JSON.stringify(nodes));
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save flow', details: error.message });
  }
});

router.post('/run', async (req, res) => {
  const { nodes, input } = req.body;
  if (!nodes || !input) return res.status(400).json({ error: 'Nodes and input required' });
  try {
    let context = { topic: input, results: [] };
    for (const node of nodes) {
      context = await executeNode(node, context);
    }
    res.json({ success: true, results: context.results });
  } catch (error) {
    res.status(500).json({ error: 'Flow execution failed', details: error.message });
  }
});

async function executeNode(node, context) {
  const prompts = {
    'hook-generator': `Generate 5 scroll-stopping hooks for this topic. Return as a JSON array of strings.\n\nTopic: ${context.topic}\n\nReturn ONLY a JSON array. No explanation.`,
    'script-writer': `Write a short-form video script for this topic using this hook: ${context.lastOutput || context.topic}\n\nTopic: ${context.topic}\n\nFormat: Hook → Value → CTA. Return plain text script only.`,
    'image-prompt': `Write a detailed photorealistic image generation prompt for this content topic.\n\nTopic: ${context.topic}\nContext: ${context.lastOutput || ''}\n\nReturn ONLY the image prompt. No explanation.`,
    'video-prompt': `Write a cinematic LTX-2 video generation prompt. Single paragraph, under 150 words, start with the main action.\n\nTopic: ${context.topic}\nContext: ${context.lastOutput || ''}\n\nReturn ONLY the video prompt.`,
    'caption-writer': `Write 3 platform-ready social media captions for this content.\n\nTopic: ${context.topic}\nScript/Content: ${context.lastOutput || context.topic}\n\nReturn as JSON: { "instagram": "...", "tiktok": "...", "youtube": "..." }`,
    'repurpose-engine': `Take this long-form content and repurpose it into 3 short-form cuts.\n\nContent: ${context.lastOutput || context.topic}\n\nReturn as JSON array of { "platform": "...", "hook": "...", "body": "...", "cta": "..." }`
  };

  const prompt = prompts[node.type];
  if (!prompt) return { ...context, lastOutput: context.lastOutput };

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  const output = message.content[0].text.trim();
  return {
    ...context,
    lastOutput: output,
    results: [...context.results, { nodeId: node.id, type: node.type, output }]
  };
}

module.exports = router;
