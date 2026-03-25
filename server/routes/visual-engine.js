const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Credit Costs Per Generation ────────────────────────────────────────────
const CREDIT_COSTS = {
  'image-flux': 2,
  'image-free': 0,
  'video-faceless': 25,
  'video-broll': 5,
  'video-kling': 15,
  'video-veo': 20,
  'voiceover': 3,
  'carousel': 8,
  'plan-prompt': 1,
};

// ─── DB Init ─────────────────────────────────────────────────────────────────
function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS visual_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      balance INTEGER NOT NULL DEFAULT 0,
      total_earned INTEGER NOT NULL DEFAULT 0,
      total_spent INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS visual_generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      generation_type TEXT NOT NULL,
      provider TEXT NOT NULL,
      credits_used INTEGER NOT NULL DEFAULT 0,
      prompt TEXT,
      result_url TEXT,
      metadata TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
try { initTables(); } catch (e) {}

// ─── Credit Helpers ──────────────────────────────────────────────────────────
function getCredits(userId) {
  let row = db.prepare('SELECT * FROM visual_credits WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO visual_credits (user_id, balance, total_earned) VALUES (?,50,50)').run(userId);
    db.prepare('INSERT INTO credit_transactions (user_id, amount, type, description) VALUES (?,50,"welcome","Welcome credits")').run(userId);
    row = db.prepare('SELECT * FROM visual_credits WHERE user_id = ?').get(userId);
  }
  return row;
}

function spendCredits(userId, amount, desc) {
  const c = getCredits(userId);
  if (c.balance < amount) return false;
  db.prepare('UPDATE visual_credits SET balance=balance-?, total_spent=total_spent+?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?').run(amount, amount, userId);
  db.prepare('INSERT INTO credit_transactions (user_id,amount,type,description) VALUES (?,?,?,?)').run(userId, -amount, 'spend', desc);
  return true;
}

function addCredits(userId, amount, desc) {
  getCredits(userId);
  db.prepare('UPDATE visual_credits SET balance=balance+?, total_earned=total_earned+?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?').run(amount, amount, userId);
  db.prepare('INSERT INTO credit_transactions (user_id,amount,type,description) VALUES (?,?,?,?)').run(userId, amount, 'add', desc);
}

function logGen(userId, type, provider, credits, prompt, status, url, meta) {
  return db.prepare('INSERT INTO visual_generations (user_id,generation_type,provider,credits_used,prompt,status,result_url,metadata) VALUES (?,?,?,?,?,?,?,?)').run(
    userId, type, provider, credits, prompt, status, url || null, meta ? JSON.stringify(meta) : null
  );
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ─── GET: Credits ────────────────────────────────────────────────────────────
router.get('/credits', requireAuth, (req, res) => {
  const credits = getCredits(req.user.id);
  const history = db.prepare('SELECT * FROM credit_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  const gens = db.prepare('SELECT * FROM visual_generations WHERE user_id=? ORDER BY created_at DESC LIMIT 10').all(req.user.id);
  res.json({ success: true, balance: credits.balance, total_earned: credits.total_earned, total_spent: credits.total_spent, history, recent_generations: gens, credit_costs: CREDIT_COSTS });
});

// ─── GET: History ────────────────────────────────────────────────────────────
router.get('/history', requireAuth, (req, res) => {
  const gens = db.prepare('SELECT * FROM visual_generations WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json({ success: true, generations: gens });
});

// ─── GET: Providers ──────────────────────────────────────────────────────────
router.get('/providers', requireAuth, (req, res) => {
  res.json({
    success: true,
    providers: {
      flux: { name: 'FLUX 1.1 Pro', type: 'image', status: process.env.REPLICATE_API_TOKEN ? 'connected' : 'not_connected', credits: CREDIT_COSTS['image-flux'], quality: 'premium', setup: 'Add REPLICATE_API_TOKEN to Railway' },
      pollinations: { name: 'Pollinations AI', type: 'image', status: 'connected', credits: 0, quality: 'standard', note: 'Free fallback always active' },
      blotato: { name: 'Blotato', type: 'video+carousel', status: process.env.BLOTATO_API_KEY ? 'connected' : 'not_connected', credits: CREDIT_COSTS['video-faceless'], quality: 'premium', setup: 'Add BLOTATO_API_KEY to Railway', capabilities: ['faceless_video', 'carousel', 'cross_posting'] },
      ltx2: { name: 'LTX-2', type: 'video_prompt', status: 'connected', credits: CREDIT_COSTS['video-broll'], quality: 'cinematic', note: 'Prompt-based — paste into LTX playground' },
      kling: { name: 'Kling 3.0', type: 'video', status: 'coming_soon', credits: CREDIT_COSTS['video-kling'], quality: 'premium' },
      veo: { name: 'Veo 3.1', type: 'video', status: 'coming_soon', credits: CREDIT_COSTS['video-veo'], quality: 'premium' },
    }
  });
});

// ─── POST: Plan (Claude) ─────────────────────────────────────────────────────
router.post('/plan', requireAuth, async (req, res) => {
  const { brief, contentType, niche, platform, targetEmotion } = req.body;
  if (!brief) return res.status(400).json({ error: 'Brief required' });

  const cost = CREDIT_COSTS['plan-prompt'];
  const credits = getCredits(req.user.id);
  if (credits.balance < cost) return res.status(402).json({ error: 'Insufficient credits', balance: credits.balance, required: cost });

  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are an AI content director. Given this brief, generate optimized prompts for all content types.
Brief: ${brief}
Type: ${contentType || 'general'} | Niche: ${niche || 'lifestyle'} | Platform: ${platform || 'Instagram'} | Emotion: ${targetEmotion || 'inspired'}

Return ONLY valid JSON:
{
  "imagePrompt": "detailed FLUX image prompt — photorealistic, cinematic quality",
  "videoPrompt": "LTX-2 video prompt — single paragraph under 150 words",
  "facelessVideoScript": "30-second faceless narration script, no personal pronouns",
  "carouselSlides": ["hook headline","slide 2","slide 3","slide 4","CTA slide"],
  "visualStyle": "2 sentence visual direction",
  "recommendedProvider": "flux|blotato|ltx2",
  "rationale": "why this provider for this content"
}`
      }]
    });

    const plan = JSON.parse(msg.content[0].text.trim().replace(/```json\n?|\n?```/g, ''));
    spendCredits(req.user.id, cost, `Plan: ${brief.slice(0, 50)}`);
    logGen(req.user.id, 'plan-prompt', 'claude', cost, brief, 'completed', null, plan);
    res.json({ success: true, plan, credits_used: cost, remaining: credits.balance - cost });
  } catch (e) {
    res.status(500).json({ error: 'Plan generation failed', details: e.message });
  }
});

// ─── POST: Generate Image ────────────────────────────────────────────────────
router.post('/generate/image', requireAuth, async (req, res) => {
  const { prompt, style, aspectRatio, useFlux = true } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  const provider = (useFlux && process.env.REPLICATE_API_TOKEN) ? 'flux' : 'pollinations';
  const cost = provider === 'flux' ? CREDIT_COSTS['image-flux'] : 0;
  const credits = getCredits(req.user.id);
  if (credits.balance < cost) return res.status(402).json({ error: 'Insufficient credits', balance: credits.balance, required: cost });

  const styleMap = {
    photorealistic: 'photorealistic, 8k, professional photography, sharp focus',
    cinematic: 'cinematic film still, dramatic lighting, movie quality, 4k',
    artistic: 'digital art, concept art, artstation, highly detailed',
    minimal: 'minimalist, clean, studio lighting, white background',
    dark: 'dark moody aesthetic, dramatic shadows, noir, high contrast',
    vibrant: 'vibrant saturated colors, bold composition, dynamic'
  };
  const dims = {
    '16:9': { w: 1280, h: 720 }, '9:16': { w: 720, h: 1280 },
    '1:1': { w: 1024, h: 1024 }, '4:3': { w: 1024, h: 768 }
  };
  const enhanced = `${prompt}, ${styleMap[style] || styleMap.photorealistic}`;
  const { w, h } = dims[aspectRatio] || dims['16:9'];

  try {
    let imageUrl;
    if (provider === 'flux') {
      const r = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json', 'Prefer': 'wait' },
        body: JSON.stringify({ input: { prompt: enhanced, width: w, height: h, output_format: 'jpg', output_quality: 90, prompt_upsampling: true } })
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      if (d.status === 'succeeded') {
        imageUrl = Array.isArray(d.output) ? d.output[0] : d.output;
      } else if (d.urls?.get) {
        let attempts = 0;
        while (attempts < 30) {
          await new Promise(r => setTimeout(r, 2000));
          const p = await fetch(d.urls.get, { headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` } });
          const pd = await p.json();
          if (pd.status === 'succeeded') { imageUrl = Array.isArray(pd.output) ? pd.output[0] : pd.output; break; }
          if (pd.status === 'failed') throw new Error('FLUX failed');
          attempts++;
        }
      }
    } else {
      const seed = Math.floor(Math.random() * 999999);
      imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
    }

    if (!imageUrl) throw new Error('No image URL returned');
    spendCredits(req.user.id, cost, `Image: ${prompt.slice(0, 50)}`);
    const g = logGen(req.user.id, `image-${provider}`, provider, cost, enhanced, 'completed', imageUrl, { style, aspectRatio, w, h });
    res.json({ success: true, imageUrl, provider, originalPrompt: prompt, enhancedPrompt: enhanced, credits_used: cost, remaining: credits.balance - cost, generation_id: g.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: 'Image generation failed', details: e.message });
  }
});

// ─── POST: Faceless Video (Blotato) ─────────────────────────────────────────
router.post('/generate/faceless-video', requireAuth, async (req, res) => {
  const { script, topic, voiceId, visualStyle, platform } = req.body;
  if (!script && !topic) return res.status(400).json({ error: 'Script or topic required' });

  const cost = CREDIT_COSTS['video-faceless'];
  const credits = getCredits(req.user.id);
  if (credits.balance < cost) return res.status(402).json({ error: 'Insufficient credits', balance: credits.balance, required: cost });
  if (!process.env.BLOTATO_API_KEY) return res.status(503).json({ error: 'Blotato not connected', message: 'Add BLOTATO_API_KEY to Railway env vars', setupUrl: 'https://my.blotato.com' });

  try {
    let finalScript = script;
    if (!script && topic) {
      const m = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: `Write a 30-second faceless video script for: "${topic}". Platform: ${platform || 'Reels'}. Style: ${visualStyle || 'motivational'}. Requirements: strong hook first 3 seconds, clear value, strong CTA, no "I"/"me", under 80 words. Return ONLY the script.` }]
      });
      finalScript = m.content[0].text.trim();
    }

    const r = await fetch('https://api.blotato.com/v1/videos/faceless', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.BLOTATO_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: finalScript, voice_id: voiceId || 'default', visual_style: visualStyle || 'motivational', platform: platform || 'instagram_reels', add_captions: true, background_music: true })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || d.message || 'Blotato error');

    spendCredits(req.user.id, cost, `Faceless video: ${(topic || script || '').slice(0, 50)}`);
    const g = logGen(req.user.id, 'video-faceless', 'blotato', cost, finalScript, 'processing', null, { platform, visualStyle, jobId: d.job_id || d.id });
    res.json({ success: true, job_id: d.job_id || d.id, status: 'processing', script: finalScript, provider: 'blotato', estimated_time: '2-3 minutes', credits_used: cost, remaining: credits.balance - cost, generation_id: g.lastInsertRowid, poll_url: `/api/visual-engine/status/${d.job_id || d.id}` });
  } catch (e) {
    res.status(500).json({ error: 'Faceless video failed', details: e.message });
  }
});

// ─── POST: Carousel (Blotato) ────────────────────────────────────────────────
router.post('/generate/carousel', requireAuth, async (req, res) => {
  const { topic, slides, niche, platform } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  const cost = CREDIT_COSTS['carousel'];
  const credits = getCredits(req.user.id);
  if (credits.balance < cost) return res.status(402).json({ error: 'Insufficient credits', balance: credits.balance, required: cost });
  if (!process.env.BLOTATO_API_KEY) return res.status(503).json({ error: 'Blotato not connected', message: 'Add BLOTATO_API_KEY to Railway env vars' });

  try {
    let slideContent = slides;
    if (!slides) {
      const m = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 400,
        messages: [{ role: 'user', content: `Create viral carousel for: "${topic}". Niche: ${niche || 'lifestyle'}. Platform: ${platform || 'Instagram'}. Return ONLY valid JSON array of 6 slides: [{"headline":"...","body":"1-2 sentences","type":"hook|value|cta"}]` }]
      });
      slideContent = JSON.parse(m.content[0].text.trim().replace(/```json\n?|\n?```/g, ''));
    }

    const r = await fetch('https://api.blotato.com/v1/carousels', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.BLOTATO_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, slides: slideContent, platform: platform || 'instagram', style: 'modern' })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Blotato carousel error');

    spendCredits(req.user.id, cost, `Carousel: ${topic.slice(0, 50)}`);
    const g = logGen(req.user.id, 'carousel', 'blotato', cost, topic, 'processing', null, { slides: slideContent, jobId: d.job_id });
    res.json({ success: true, job_id: d.job_id || d.id, status: 'processing', slides: slideContent, provider: 'blotato', credits_used: cost, remaining: credits.balance - cost, generation_id: g.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: 'Carousel generation failed', details: e.message });
  }
});

// ─── POST: B-Roll Prompt (LTX-2, free) ──────────────────────────────────────
router.post('/generate/broll', requireAuth, async (req, res) => {
  const { subject, mood, platform, shotStyle, duration } = req.body;
  if (!subject) return res.status(400).json({ error: 'Subject required' });

  const cost = CREDIT_COSTS['video-broll'];
  const credits = getCredits(req.user.id);
  if (credits.balance < cost) return res.status(402).json({ error: 'Insufficient credits', balance: credits.balance, required: cost });

  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 350,
      system: 'You are a cinematographer writing LTX-2 video prompts. Write a single flowing paragraph under 200 words. Start with the main action. Include camera work and lighting. Return ONLY the prompt text.',
      messages: [{ role: 'user', content: `LTX-2 B-roll prompt for:\nSubject: ${subject}\nMood: ${mood || 'cinematic'}\nPlatform: ${platform || 'youtube'}\nShot: ${shotStyle || 'cinematic'}\nDuration: ${duration || 8} seconds` }]
    });

    const prompt = msg.content[0].text.trim();
    spendCredits(req.user.id, cost, `B-roll: ${subject.slice(0, 50)}`);
    logGen(req.user.id, 'video-broll', 'ltx2', cost, prompt, 'completed', null, { subject, mood, platform });
    res.json({ success: true, prompt, negativePrompt: 'shaky, glitchy, low quality, deformed, motion smear, bad anatomy, static, blurry', provider: 'ltx2', ltxPlaygroundUrl: 'https://app.ltx.studio/ltx-2-playground/t2v', credits_used: cost, remaining: credits.balance - cost });
  } catch (e) {
    res.status(500).json({ error: 'B-roll prompt failed', details: e.message });
  }
});

// ─── GET: Job Status ─────────────────────────────────────────────────────────
router.get('/status/:jobId', requireAuth, async (req, res) => {
  if (!process.env.BLOTATO_API_KEY) return res.status(503).json({ error: 'Blotato not connected' });
  try {
    const r = await fetch(`https://api.blotato.com/v1/jobs/${req.params.jobId}`, {
      headers: { 'Authorization': `Bearer ${process.env.BLOTATO_API_KEY}` }
    });
    const d = await r.json();
    if (d.status === 'completed' && d.output_url) {
      db.prepare("UPDATE visual_generations SET status='completed', result_url=? WHERE metadata LIKE ?").run(d.output_url, `%${req.params.jobId}%`);
    }
    res.json({ success: true, job_id: req.params.jobId, status: d.status, output_url: d.output_url || null, progress: d.progress || 0 });
  } catch (e) {
    res.status(500).json({ error: 'Status check failed', details: e.message });
  }
});

// ─── POST: Add Credits ───────────────────────────────────────────────────────
router.post('/credits/add', requireAuth, (req, res) => {
  const { amount, description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  addCredits(req.user.id, amount, description || 'Manual credit add');
  const c = getCredits(req.user.id);
  res.json({ success: true, balance: c.balance, added: amount });
});

module.exports = router;
