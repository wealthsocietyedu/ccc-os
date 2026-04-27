// server/routes/advisor.js
// Content Advisor — AI coaching wired to real performance data
// Requires: performance table populated via CSV import

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── MEMORY HELPERS ───────────────────────────────────────────────────────────

function getMemoryContext(db, userId, limit = 20) {
  try {
    const memories = db.prepare(`
      SELECT memory_type, content FROM advisor_memory
      WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(userId, limit);

    if (!memories.length) return '';

    const grouped = memories.reduce((acc, m) => {
      if (!acc[m.memory_type]) acc[m.memory_type] = [];
      acc[m.memory_type].push(m.content);
      return acc;
    }, {});

    let ctx = '\n\n--- MEMORY FROM PAST SESSIONS ---\n';
    if (grouped.voice_sample?.length) ctx += `\nVOICE STYLE SAMPLES (write like this):\n${grouped.voice_sample.slice(0,3).join('\n---\n')}\n`;
    if (grouped.content_win?.length) ctx += `\nPAST WINS:\n${grouped.content_win.slice(0,5).join('\n')}\n`;
    if (grouped.content_loss?.length) ctx += `\nPAST LOSSES:\n${grouped.content_loss.slice(0,3).join('\n')}\n`;
    if (grouped.interview?.length) ctx += `\nINTERVIEW INSIGHTS:\n${grouped.interview.slice(0,3).join('\n')}\n`;
    ctx += '--- END MEMORY ---\n';
    return ctx;
  } catch(e) { return ''; }
}

function saveMemory(db, userId, type, content, metadata = {}) {
  try {
    db.prepare(`
      INSERT INTO advisor_memory (id, user_id, memory_type, content, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, type, content.slice(0, 2000), JSON.stringify(metadata));
  } catch(e) { console.error('saveMemory error:', e.message); }
}

function getBrandContext(db, userId, brandId) {
  if (!brandId) return '';
  try {
    const brand = db.prepare('SELECT * FROM brands WHERE id = ? AND user_id = ?').get(brandId, userId);
    if (!brand) return '';
    const pillars = db.prepare('SELECT name FROM pillars WHERE brand_id = ? AND user_id = ?').all(brandId, userId);
    let ctx = `\n\nBRAND: ${brand.name}`;
    if (brand.niche) ctx += ` | Niche: ${brand.niche}`;
    if (brand.voice_tone) ctx += ` | Voice: ${brand.voice_tone}`;
    if (brand.target_audience) ctx += ` | Audience: ${brand.target_audience}`;
    if (pillars.length) ctx += ` | Pillars: ${pillars.map(p => p.name).join(', ')}`;
    return ctx;
  } catch(e) { return ''; }
}

function getPerformanceData(db, userId, brandId, period) {
  const safeperiod = parseInt(period) || 30;
  const params = brandId ? [userId, brandId, safeperiod] : [userId, safeperiod];
  const brandFilter = brandId ? 'AND p.brand_id = ?' : '';

  const posts = db.prepare(`
    SELECT
      a.title,
      p.platform, p.publish_date,
      p.views, p.likes, p.comments, p.shares, p.saves,
      p.followers, p.leads, p.revenue, p.decision,
      pl.name as pillar_name
    FROM performance p
    JOIN assets a ON p.asset_id = a.id
    LEFT JOIN pillars pl ON a.pillar_id = pl.id
    WHERE p.user_id = ?
      ${brandFilter}
      AND p.publish_date >= date('now', '-' || ? || ' days')
    ORDER BY (
      COALESCE(p.views,0) * 0.2 +
      (CAST(p.likes+p.comments+p.shares+p.saves AS REAL) / NULLIF(p.views,0) * 100) * 0.3 +
      COALESCE(p.followers,0) * 0.3 +
      COALESCE(p.leads,0) * 0.2
    ) DESC
    LIMIT 100
  `).all(...params);

  return { posts, period: safeperiod };
}

function buildDataSummary(posts, period) {
  if (!posts.length) return `No performance data found for the last ${period} days. User needs to import CSV data.`;

  const totals = posts.reduce((acc, p) => {
    acc.views += p.views || 0;
    acc.likes += p.likes || 0;
    acc.comments += p.comments || 0;
    acc.shares += p.shares || 0;
    acc.saves += p.saves || 0;
    acc.followers += p.followers || 0;
    acc.leads += p.leads || 0;
    acc.revenue += p.revenue || 0;
    return acc;
  }, { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, followers: 0, leads: 0, revenue: 0 });

  const engRate = totals.views > 0
    ? ((totals.likes + totals.comments + totals.shares + totals.saves) / totals.views * 100).toFixed(1)
    : 0;

  // Platform breakdown
  const byPlatform = {};
  posts.forEach(p => {
    if (!byPlatform[p.platform]) byPlatform[p.platform] = { posts: 0, views: 0, leads: 0 };
    byPlatform[p.platform].posts++;
    byPlatform[p.platform].views += p.views || 0;
    byPlatform[p.platform].leads += p.leads || 0;
  });

  // Pillar breakdown
  const byPillar = {};
  posts.forEach(p => {
    const key = p.pillar_name || 'Untagged';
    if (!byPillar[key]) byPillar[key] = { posts: 0, views: 0 };
    byPillar[key].posts++;
    byPillar[key].views += p.views || 0;
  });

  const top5 = posts.slice(0, 5);
  const bottom5 = posts.slice(-5).reverse();

  return `
PERFORMANCE SUMMARY — Last ${period} days (${posts.length} posts analyzed):
Views: ${totals.views.toLocaleString()} | Leads: ${totals.leads} | Followers gained: ${totals.followers} | Revenue: $${totals.revenue} | Avg engagement: ${engRate}%

TOP 5 POSTS:
${top5.map((p, i) => `${i+1}. "${p.title}" — ${p.platform} — ${(p.views||0).toLocaleString()} views, ${p.leads||0} leads, ${p.followers||0} followers — Pillar: ${p.pillar_name||'none'}`).join('\n')}

BOTTOM 5 POSTS:
${bottom5.map((p, i) => `${i+1}. "${p.title}" — ${p.platform} — ${(p.views||0).toLocaleString()} views`).join('\n')}

BY PLATFORM:
${Object.entries(byPlatform).map(([plat, d]) => `${plat}: ${d.posts} posts, ${d.views.toLocaleString()} views, ${d.leads} leads`).join('\n')}

BY PILLAR:
${Object.entries(byPillar).map(([pillar, d]) => `${pillar}: ${d.posts} posts, ${d.views.toLocaleString()} total views`).join('\n')}
  `.trim();
}

// ─── ENDPOINT 1: ANALYZE ─────────────────────────────────────────────────────
router.post('/analyze', async (req, res) => {
  const { brandId, period = 30 } = req.body;
  const db = getDB();

  try {
    const { posts, period: p } = getPerformanceData(db, req.userId, brandId, period);
    const dataSummary = buildDataSummary(posts, p);
    const memoryCtx = getMemoryContext(db, req.userId);
    const brandCtx = getBrandContext(db, req.userId, brandId);

    const hasData = posts.length > 0;

    if (!hasData) {
      return res.json({
        success: true,
        hasData: false,
        analysis: null,
        stats: { totalPosts: 0 },
        top3: [], bottom3: [],
        message: 'No data yet. Import a CSV from Instagram, YouTube, TikTok, or X to get started.'
      });
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      system: `You are a sharp content strategist analyzing real social media performance data. Be direct, specific, and actionable. No generic advice. Every insight must come from the actual numbers.${brandCtx}${memoryCtx}`,
      messages: [{
        role: 'user',
        content: `Analyze this real content performance data. Give me:
1. What's working — the specific pattern driving results
2. What's not working — be direct about what to cut
3. The single biggest lever to pull right now
4. Three specific actions for next week

No fluff. Every point must reference actual numbers from the data.

${dataSummary}`
      }]
    });

    const analysis = message.content[0].text;

    // Save wins to memory
    if (posts[0]) {
      saveMemory(db, req.userId, 'content_win',
        `Top post (${new Date().toLocaleDateString()}): "${posts[0].title}" on ${posts[0].platform} — ${posts[0].views||0} views, ${posts[0].leads||0} leads.`,
        { brandId, period: p }
      );
    }

    const totals = posts.reduce((acc, p) => ({
      views: acc.views + (p.views||0),
      leads: acc.leads + (p.leads||0),
      followers: acc.followers + (p.followers||0),
      likes: acc.likes + (p.likes||0),
      comments: acc.comments + (p.comments||0),
      shares: acc.shares + (p.shares||0),
      saves: acc.saves + (p.saves||0),
    }), { views: 0, leads: 0, followers: 0, likes: 0, comments: 0, shares: 0, saves: 0 });

    const engRate = totals.views > 0
      ? ((totals.likes + totals.comments + totals.shares + totals.saves) / totals.views * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      hasData: true,
      analysis,
      stats: {
        totalPosts: posts.length,
        totalViews: totals.views,
        totalLeads: totals.leads,
        totalFollowers: totals.followers,
        engagementRate: engRate
      },
      top3: posts.slice(0, 3),
      bottom3: posts.slice(-3).reverse(),
      period: p
    });

  } catch (error) {
    console.error('Advisor analyze error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

// ─── ENDPOINT 2: DRAFT ───────────────────────────────────────────────────────
router.post('/draft', async (req, res) => {
  const { topic, format, platform, brandId, toneHint } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });
  const db = getDB();

  const formatGuides = {
    'Short Form Video': 'Write a short-form video script. Hook (0-3 seconds, one punchy sentence). Body (30-60 seconds, 3 clear points). CTA (5 seconds, one action). Total under 150 words.',
    'Thread': 'Write an X/Twitter thread. Tweet 1: scroll-stopping hook (under 280 chars). Tweets 2-6: one point each, plain language, no jargon. Final tweet: CTA. Label each tweet.',
    'Carousel': 'Write a carousel. Slide 1: bold hook headline (5 words max). Slides 2-6: one insight per slide with a short headline and 1-2 sentences. Last slide: clear CTA.',
    'Long Form Video': 'Write a YouTube video outline. Hook (0-30s). Problem (30-60s). 3 main points with timestamps. CTA + outro. Include what to say at each section.',
    'Static Post': 'Write a social media caption. First line: the hook (make them stop scrolling). 2-3 body sentences. One CTA. Under 150 words total.',
  };

  try {
    const memoryCtx = getMemoryContext(db, req.userId);
    const brandCtx = getBrandContext(db, req.userId, brandId);
    const instruction = formatGuides[format] || formatGuides['Short Form Video'];

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 700,
      system: `You are a world-class content creator. Every piece you write has a hook that stops the scroll, delivers undeniable value, and ends with a CTA that feels natural. You write in the creator's authentic voice — never generic.${brandCtx}${memoryCtx}`,
      messages: [{
        role: 'user',
        content: `Write a ${format || 'Short Form Video'} about: "${topic}"
Platform: ${platform || 'Instagram'}
${toneHint ? `Tone: ${toneHint}` : ''}

${instruction}`
      }]
    });

    res.json({ success: true, draft: message.content[0].text, metadata: { topic, format, platform } });
  } catch (error) {
    res.status(500).json({ error: 'Draft failed', details: error.message });
  }
});

// ─── ENDPOINT 3: ENHANCE ─────────────────────────────────────────────────────
router.post('/enhance', async (req, res) => {
  const { draft, brandId } = req.body;
  if (!draft) return res.status(400).json({ error: 'Draft is required' });
  const db = getDB();

  try {
    const brandCtx = getBrandContext(db, req.userId, brandId);
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 700,
      system: `You are a sharp content editor. Make the hook more compelling, tighten the body, strengthen the CTA. Preserve the creator's voice.${brandCtx}`,
      messages: [{
        role: 'user',
        content: `Improve this draft. Stronger hook, tighter copy, clearer CTA.\n\nORIGINAL:\n${draft}\n\nReturn:\nENHANCED VERSION:\n[full rewrite]\n\nWHAT CHANGED:\n- [3 bullets]`
      }]
    });
    res.json({ success: true, enhanced: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: 'Enhance failed', details: error.message });
  }
});

// ─── ENDPOINT 4: VARIATIONS ──────────────────────────────────────────────────
router.post('/variations', async (req, res) => {
  const { draft, platform } = req.body;
  if (!draft) return res.status(400).json({ error: 'Draft is required' });

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      system: 'You are a content strategist who writes platform-native hooks. Each variation must feel completely different.',
      messages: [{
        role: 'user',
        content: `3 variations of this content with different hooks. Keep the same value, different entry.\n\nORIGINAL:\n${draft}\n\nPlatform: ${platform||'multi-platform'}\n\nVariation 1 — CURIOSITY HOOK (open loop)\nVariation 2 — BOLD CLAIM HOOK (strong statement)\nVariation 3 — STORY HOOK (personal moment)`
      }]
    });
    res.json({ success: true, variations: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: 'Variations failed', details: error.message });
  }
});

// ─── ENDPOINT 5: INTERVIEW ────────────────────────────────────────────────────
router.post('/interview', async (req, res) => {
  const { sessionId, userMessage, brandId, isStart } = req.body;
  const db = getDB();

  try {
    const brandCtx = getBrandContext(db, req.userId, brandId);
    const memoryCtx = getMemoryContext(db, req.userId);

    let conversation = null;
    let messages = [];

    if (sessionId) {
      conversation = db.prepare('SELECT * FROM advisor_conversations WHERE id = ? AND user_id = ?').get(sessionId, req.userId);
      if (conversation) messages = JSON.parse(conversation.messages);
    }

    if (!conversation) {
      const newId = uuidv4();
      db.prepare('INSERT INTO advisor_conversations (id, user_id, session_type, messages, brand_id) VALUES (?, ?, \'interview\', \'[]\', ?)').run(newId, req.userId, brandId || null);
      conversation = db.prepare('SELECT * FROM advisor_conversations WHERE id = ?').get(newId);
    }

    const systemPrompt = `You are a skilled podcast host who interviews content creators to extract their best content ideas. Ask ONE question at a time. Dig deep, not wide. After 6-8 exchanges, wrap up with a structured idea list.

QUESTION BANK:
- What do you believe about [niche] that most experts get wrong?
- What result surprised you most in the last 6 months?
- What's the most common question your audience asks?
- What did you have to unlearn to get where you are?
- What's working right now that wasn't working before?
- What's the hardest part that nobody talks about?
- What would you tell yourself 2 years ago?

When wrapping up, produce exactly this format:
CONTENT IDEAS FROM THIS INTERVIEW:
1. [Title] — Format: [Short Form Video/Thread/Carousel] — Hook: [one-sentence hook]
2. ...
(minimum 5 ideas)
${brandCtx}${memoryCtx}`;

    if (isStart || messages.length === 0) {
      messages = [];
      const opening = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 250,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Start the interview. Brief greeting, then your first question.' }]
      });
      const aiResp = opening.content[0].text;
      messages.push({ role: 'assistant', content: aiResp });
      db.prepare('UPDATE advisor_conversations SET messages = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(messages), conversation.id);
      return res.json({ success: true, sessionId: conversation.id, response: aiResp, messageCount: 1, isWrapping: false });
    }

    if (userMessage) messages.push({ role: 'user', content: userMessage });

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 600,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    });

    const aiResp = response.content[0].text;
    messages.push({ role: 'assistant', content: aiResp });

    const isWrapping = aiResp.includes('CONTENT IDEAS FROM THIS INTERVIEW');
    if (messages.length > 30) messages = messages.slice(-30);

    db.prepare('UPDATE advisor_conversations SET messages = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(messages), conversation.id);

    if (isWrapping) {
      saveMemory(db, req.userId, 'interview', `Interview ${new Date().toLocaleDateString()}: ${messages.length} exchanges. Ideas extracted.`, { sessionId: conversation.id });
    }

    res.json({ success: true, sessionId: conversation.id, response: aiResp, messageCount: messages.length, isWrapping });
  } catch (error) {
    res.status(500).json({ error: 'Interview failed', details: error.message });
  }
});

// ─── ENDPOINT 6: SAVE IDEAS ───────────────────────────────────────────────────
router.post('/interview/save-ideas', (req, res) => {
  const { ideas, brandId } = req.body;
  if (!ideas?.length) return res.status(400).json({ error: 'Ideas array required' });
  const db = getDB();

  try {
    let targetBrandId = brandId || db.prepare('SELECT id FROM brands WHERE user_id = ? LIMIT 1').get(req.userId)?.id;
    if (!targetBrandId) return res.status(400).json({ error: 'Create a brand first.' });

    const insert = db.prepare('INSERT INTO ideas (id, user_id, brand_id, title, format, hook_angle, status, source, date_captured) VALUES (?, ?, ?, ?, ?, ?, \'Raw Idea\', \'Interview\', datetime(\'now\'))');
    const saved = [];
    for (const idea of ideas) {
      if (!idea.title?.trim()) continue;
      const id = uuidv4();
      insert.run(id, req.userId, targetBrandId, idea.title.slice(0,200), idea.format || 'Short Form Video', idea.hookAngle || '');
      saved.push({ id, ...idea });
    }
    res.json({ success: true, saved, count: saved.length });
  } catch (error) {
    res.status(500).json({ error: 'Save ideas failed', details: error.message });
  }
});

// ─── ENDPOINT 7: WEEKLY REVIEW ────────────────────────────────────────────────
router.post('/weekly-review', async (req, res) => {
  const { brandId } = req.body;
  const db = getDB();

  try {
    const brandFilter = brandId ? 'AND brand_id = ?' : '';
    const params = (base) => brandId ? [req.userId, brandId, ...base] : [req.userId, ...base];

    const week = (offset) => db.prepare(`
      SELECT COUNT(*) as posts, COALESCE(SUM(views),0) as views, COALESCE(SUM(leads),0) as leads,
             COALESCE(SUM(followers),0) as followers, COALESCE(SUM(revenue),0) as revenue
      FROM performance WHERE user_id = ? ${brandFilter}
      AND publish_date >= date('now', '-${offset+7} days')
      AND publish_date < date('now', '-${offset} days')
    `).get(...params([]));

    const thisWeek = week(0);
    const lastWeek = week(7);

    const topPosts = db.prepare(`
      SELECT a.title, p.platform, p.views, p.leads, p.followers, pl.name as pillar_name
      FROM performance p
      JOIN assets a ON p.asset_id = a.id
      LEFT JOIN pillars pl ON a.pillar_id = pl.id
      WHERE p.user_id = ? ${brandFilter}
      AND p.publish_date >= date('now', '-7 days')
      ORDER BY (COALESCE(p.views,0) + COALESCE(p.leads,0)*10 + COALESCE(p.followers,0)*5) DESC
      LIMIT 5
    `).all(...params([]));

    const brandCtx = getBrandContext(db, req.userId, brandId);
    const memoryCtx = getMemoryContext(db, req.userId);

    const weekSummary = `
THIS WEEK vs LAST WEEK:
Posts: ${thisWeek.posts} (was ${lastWeek.posts})
Views: ${thisWeek.views.toLocaleString()} (was ${lastWeek.views.toLocaleString()}) ${thisWeek.views >= lastWeek.views ? '↑' : '↓'}
Leads: ${thisWeek.leads} (was ${lastWeek.leads}) ${thisWeek.leads >= lastWeek.leads ? '↑' : '↓'}
Followers: ${thisWeek.followers} (was ${lastWeek.followers}) ${thisWeek.followers >= lastWeek.followers ? '↑' : '↓'}

TOP POSTS THIS WEEK:
${topPosts.map((p,i) => `${i+1}. "${p.title}" — ${p.platform} — ${(p.views||0).toLocaleString()} views, ${p.leads||0} leads`).join('\n') || 'No posts logged this week.'}`.trim();

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 700,
      system: `You are running a weekly content business review. Be direct. No cheerleading. Give verdicts, not observations.${brandCtx}${memoryCtx}`,
      messages: [{
        role: 'user',
        content: `Weekly review:\n\n${weekSummary}\n\nGive me:\n1. VERDICT — one sentence\n2. TOP 3 WINS — specific, with numbers\n3. TOP 3 LOSSES — honest diagnosis\n4. SCALE / REFINE / KILL — one call per loss\n5. ONE PRIORITY for next week`
      }]
    });

    saveMemory(db, req.userId, 'weekly_review',
      `Week of ${new Date().toLocaleDateString()}: ${thisWeek.posts} posts, ${thisWeek.views} views, ${thisWeek.leads} leads.`,
      { brandId }
    );

    res.json({ success: true, review: message.content[0].text, thisWeek, lastWeek, topPosts, weekOf: new Date().toLocaleDateString() });
  } catch (error) {
    res.status(500).json({ error: 'Weekly review failed', details: error.message });
  }
});

// ─── ENDPOINT 8: CHAT ─────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { message, sessionId, brandId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  const db = getDB();

  try {
    const brandCtx = getBrandContext(db, req.userId, brandId);
    const memoryCtx = getMemoryContext(db, req.userId);

    let conversation = null;
    let messages = [];

    if (sessionId) {
      conversation = db.prepare('SELECT * FROM advisor_conversations WHERE id = ? AND user_id = ?').get(sessionId, req.userId);
      if (conversation) messages = JSON.parse(conversation.messages);
    }

    if (!conversation) {
      const newId = uuidv4();
      db.prepare('INSERT INTO advisor_conversations (id, user_id, session_type, messages, brand_id) VALUES (?, ?, \'chat\', \'[]\', ?)').run(newId, req.userId, brandId || null);
      conversation = db.prepare('SELECT * FROM advisor_conversations WHERE id = ?').get(newId);
    }

    messages.push({ role: 'user', content: message });
    if (messages.length > 20) messages = messages.slice(-20);

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      system: `You are the user's personal AI head of content — strategist, copywriter, analyst, and coach. You know their brand and history. You give sharp, specific answers. No hedging, no filler.${brandCtx}${memoryCtx}`,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    });

    const aiResp = response.content[0].text;
    messages.push({ role: 'assistant', content: aiResp });
    db.prepare('UPDATE advisor_conversations SET messages = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(messages), conversation.id);

    res.json({ success: true, sessionId: conversation.id, response: aiResp });
  } catch (error) {
    res.status(500).json({ error: 'Chat failed', details: error.message });
  }
});

// ─── ENDPOINT 9: SAVE VOICE SAMPLE ───────────────────────────────────────────
router.post('/save-voice-sample', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const db = getDB();
  saveMemory(db, req.userId, 'voice_sample', content);
  res.json({ success: true });
});

// ─── ENDPOINT 10: GET MEMORY ──────────────────────────────────────────────────
router.get('/memory', (req, res) => {
  const db = getDB();
  try {
    const memories = db.prepare('SELECT id, memory_type, content, created_at FROM advisor_memory WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.userId);
    res.json({ success: true, memories, count: memories.length });
  } catch(e) { res.json({ success: true, memories: [], count: 0 }); }
});

router.delete('/memory/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM advisor_memory WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
