const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

// ─── Clients & Config ─────────────────────────────────────────────────────────
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_BASE_URL = 'https://api.kie.ai/api/v1';

const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY;
const BLOTATO_BASE_URL = 'https://api.blotato.com';

// ─── Poll Helper ──────────────────────────────────────────────────────────────
// Polls a kie.ai job every 4 seconds for up to 2 minutes.
// Returns the final job object when status is terminal, or throws on timeout.
async function pollKieJob(taskId, endpoint) {
  const INTERVAL_MS = 4000;
  const MAX_ATTEMPTS = 30; // 30 × 4s = 120s = 2 minutes
  const TERMINAL = ['completed', 'failed', 'error'];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));

    const response = await fetch(`${KIE_BASE_URL}${endpoint}/${taskId}`, {
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`kie.ai poll failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const status = (data.status || '').toLowerCase();

    if (TERMINAL.includes(status)) {
      return data;
    }
  }

  throw new Error(`kie.ai job ${taskId} timed out after 2 minutes`);
}

// ─── POST /generate-image ─────────────────────────────────────────────────────
// Submits a Nano Banana 2 image generation job. Returns taskId immediately.
router.post('/generate-image', async (req, res) => {
  const { prompt, negativePrompt, aspectRatio = '16:9', style } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await fetch(`${KIE_BASE_URL}/image/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nano-banana-2',
        prompt,
        negative_prompt: negativePrompt || '',
        aspect_ratio: aspectRatio,
        style: style || 'photorealistic',
        n: 1
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'kie.ai image submission failed', details: err });
    }

    const data = await response.json();
    res.json({ success: true, taskId: data.task_id || data.taskId, provider: 'Nano Banana 2' });
  } catch (error) {
    console.error('generate-image error:', error);
    res.status(500).json({ error: 'Failed to submit image job', details: error.message });
  }
});

// ─── GET /image-status/:taskId ────────────────────────────────────────────────
// Polls kie.ai for the current status of an image generation job.
router.get('/image-status/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    const response = await fetch(`${KIE_BASE_URL}/image/generate/${taskId}`, {
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Failed to fetch image status', details: err });
    }

    const data = await response.json();
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('image-status error:', error);
    res.status(500).json({ error: 'Failed to get image status', details: error.message });
  }
});

// ─── POST /generate-variations ────────────────────────────────────────────────
// Submits a Nano Banana 2 job requesting n=4 image variations. Returns taskId.
router.post('/generate-variations', async (req, res) => {
  const { prompt, negativePrompt, aspectRatio = '16:9', style } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await fetch(`${KIE_BASE_URL}/image/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nano-banana-2',
        prompt,
        negative_prompt: negativePrompt || '',
        aspect_ratio: aspectRatio,
        style: style || 'photorealistic',
        n: 4
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'kie.ai variations submission failed', details: err });
    }

    const data = await response.json();
    res.json({ success: true, taskId: data.task_id || data.taskId, provider: 'Nano Banana 2', variations: 4 });
  } catch (error) {
    console.error('generate-variations error:', error);
    res.status(500).json({ error: 'Failed to submit variations job', details: error.message });
  }
});

// ─── POST /generate-video ─────────────────────────────────────────────────────
// Claude Opus writes the video prompt, then submits to Kling 2.1 text-to-video.
// Returns taskId immediately.
router.post('/generate-video', async (req, res) => {
  const { subject, mood, platform, duration, extraDetails, rawPrompt } = req.body;

  if (!subject && !rawPrompt) {
    return res.status(400).json({ error: 'subject or rawPrompt is required' });
  }

  try {
    let videoPrompt = rawPrompt;

    if (!rawPrompt) {
      const claudeRes = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 300,
        system: `You are a professional cinematographer writing prompts for Kling 2.1 AI video generation.
Write a single flowing paragraph (under 200 words). Start immediately with the action or subject.
Include: main subject, action, camera movement, lighting, mood, environment.
Use cinematographic language. Return ONLY the prompt — no preamble, no quotes.`,
        messages: [{
          role: 'user',
          content: `Write a Kling 2.1 video prompt for:
Subject: ${subject}
Mood: ${mood || 'cinematic and professional'}
Platform: ${platform || 'YouTube 16:9'}
Duration feel: ${duration || '5-8 seconds'}
${extraDetails ? `Extra details: ${extraDetails}` : ''}

Write the prompt now:`
        }]
      });

      videoPrompt = claudeRes.content[0].text.trim();
    }

    const response = await fetch(`${KIE_BASE_URL}/kling-2.1/text-to-video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: videoPrompt,
        duration: duration || '5',
        aspect_ratio: platform === 'reels' || platform === 'tiktok' || platform === 'shorts' ? '9:16' : '16:9'
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'kie.ai video submission failed', details: err });
    }

    const data = await response.json();
    res.json({
      success: true,
      taskId: data.task_id || data.taskId,
      prompt: videoPrompt,
      provider: 'Kling 2.1'
    });
  } catch (error) {
    console.error('generate-video error:', error);
    res.status(500).json({ error: 'Failed to submit video job', details: error.message });
  }
});

// ─── GET /video-status/:taskId ────────────────────────────────────────────────
// Polls kie.ai for the current status of a Kling 2.1 video job.
router.get('/video-status/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    const response = await fetch(`${KIE_BASE_URL}/kling-2.1/text-to-video/${taskId}`, {
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Failed to fetch video status', details: err });
    }

    const data = await response.json();
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('video-status error:', error);
    res.status(500).json({ error: 'Failed to get video status', details: error.message });
  }
});

// ─── POST /generate-faceless-video ───────────────────────────────────────────
// Claude writes the script, then submits to Blotato /v1/faceless-video.
// Returns jobId immediately.
router.post('/generate-faceless-video', async (req, res) => {
  const { topic, niche, duration, tone, cta, rawScript } = req.body;

  if (!topic && !rawScript) {
    return res.status(400).json({ error: 'topic or rawScript is required' });
  }

  try {
    let script = rawScript;

    if (!rawScript) {
      const claudeRes = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 600,
        system: `You are an expert faceless video scriptwriter. Write punchy, high-retention scripts for faceless content creators.
Keep it engaging, direct, and formatted for voiceover. No stage directions — pure narration only.
Return ONLY the script text.`,
        messages: [{
          role: 'user',
          content: `Write a faceless video script for:
Topic: ${topic}
Niche: ${niche || 'general'}
Duration: ${duration || '60 seconds'}
Tone: ${tone || 'engaging and informative'}
${cta ? `Call to action: ${cta}` : ''}

Write the script now:`
        }]
      });

      script = claudeRes.content[0].text.trim();
    }

    const response = await fetch(`${BLOTATO_BASE_URL}/v1/faceless-video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BLOTATO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ script, topic, niche, duration })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Blotato faceless video submission failed', details: err });
    }

    const data = await response.json();
    res.json({
      success: true,
      jobId: data.job_id || data.jobId || data.id,
      script,
      provider: 'Blotato'
    });
  } catch (error) {
    console.error('generate-faceless-video error:', error);
    res.status(500).json({ error: 'Failed to submit faceless video job', details: error.message });
  }
});

// ─── GET /faceless-status/:jobId ─────────────────────────────────────────────
// Polls Blotato for the current status of a faceless video job.
router.get('/faceless-status/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const response = await fetch(`${BLOTATO_BASE_URL}/v1/faceless-video/${jobId}`, {
      headers: {
        Authorization: `Bearer ${BLOTATO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Failed to fetch faceless video status', details: err });
    }

    const data = await response.json();
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('faceless-status error:', error);
    res.status(500).json({ error: 'Failed to get faceless video status', details: error.message });
  }
});

// ─── POST /build-prompt ───────────────────────────────────────────────────────
// Claude Opus generates both an image prompt and a video prompt from a content brief.
router.post('/build-prompt', async (req, res) => {
  const { contentTopic, niche, targetEmotion, contentType, platform } = req.body;

  if (!contentTopic) {
    return res.status(400).json({ error: 'contentTopic is required' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: `You are a visual content strategist for social media creators. Generate both an image prompt AND a video prompt from this content brief.

Content Topic: ${contentTopic}
Niche: ${niche || 'general lifestyle'}
Target Emotion: ${targetEmotion || 'inspired, motivated'}
Content Type: ${contentType || 'educational/inspirational'}
Platform: ${platform || 'Instagram/YouTube'}

Return ONLY valid JSON in this exact format:
{
  "imagePrompt": "detailed Nano Banana 2 image generation prompt",
  "videoPrompt": "Kling 2.1 video prompt — single paragraph, under 200 words, cinematic language",
  "visualDirection": "2-3 sentence description of the overall visual strategy",
  "colorPalette": ["color1", "color2", "color3"],
  "shotRecommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`
      }]
    });

    const responseText = message.content[0].text.trim();
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    res.json({ success: true, ...parsed });
  } catch (error) {
    console.error('build-prompt error:', error);
    res.status(500).json({ error: 'Failed to build prompts', details: error.message });
  }
});

// ─── POST /storyboard ─────────────────────────────────────────────────────────
// Claude Opus acts as AI director, breaks input into scenes, then submits a
// Nano Banana 2 image job per scene. Returns imageTaskId per scene.
router.post('/storyboard', async (req, res) => {
  const { input, mode, platform, style, niche } = req.body;
  // mode: 'quick' (topic/hook) | 'script' (full script text)

  if (!input) {
    return res.status(400).json({ error: 'Input is required' });
  }

  try {
    const platformAspect = {
      youtube: '16:9', reels: '9:16', tiktok: '9:16', shorts: '9:16', general: '16:9'
    };
    const aspect = platformAspect[platform] || '16:9';

    const systemPrompt = `You are a professional film director and storyboard artist who creates visual production plans for social media content creators.

Break content into cinematic scenes with detailed visual descriptions used to generate AI images via Nano Banana 2 and video B-roll via Kling 2.1.

RULES:
- Return ONLY valid JSON — no markdown, no explanation
- Each scene must have a clear, specific visual description
- imagePrompt: photorealistic, detailed (for Nano Banana 2)
- videoPrompt: Kling 2.1 format — single paragraph, under 150 words, cinematic language
- Shot types: closeup, medium, wide, overhead, pov, cutaway
- Scene count: 4–8 scenes
- Duration per scene: 4–10 seconds`;

    const modeInstruction = mode === 'script'
      ? `Parse this script into storyboard scenes:\n\nSCRIPT:\n${input}`
      : `Create a storyboard for this topic:\n\nTOPIC: ${input}\nNiche: ${niche || 'general'}\nPlatform: ${platform || 'YouTube'}`;

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `${modeInstruction}

Visual style: ${style || 'cinematic, professional'}
Aspect ratio: ${aspect}

Return JSON in this EXACT format:
{
  "title": "Storyboard title",
  "totalDuration": "e.g. 45-60 seconds",
  "visualTheme": "2 sentence overall visual direction",
  "colorGrade": "e.g. warm golden tones",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene title",
      "duration": "6 seconds",
      "shotType": "closeup",
      "visualDescription": "What the viewer sees — be specific",
      "scriptNote": "What's being said or the content purpose",
      "imagePrompt": "Detailed Nano Banana 2 image prompt for this scene",
      "videoPrompt": "Kling 2.1 cinematic video prompt — single paragraph under 150 words",
      "mood": "e.g. warm and intimate",
      "cameraMove": "e.g. slow dolly in",
      "lightingNotes": "e.g. soft window light from left"
    }
  ]
}`
      }]
    });

    const responseText = message.content[0].text.trim();
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const storyboard = JSON.parse(cleanJson);

    // Submit a Nano Banana 2 image job per scene
    const scenesWithTasks = await Promise.all(
      storyboard.scenes.map(async scene => {
        try {
          const imgRes = await fetch(`${KIE_BASE_URL}/image/generate`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${KIE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'nano-banana-2',
              prompt: scene.imagePrompt,
              aspect_ratio: aspect,
              style: style || 'photorealistic',
              n: 1
            })
          });

          if (!imgRes.ok) {
            return { ...scene, imageTaskId: null, imageError: `kie.ai error ${imgRes.status}` };
          }

          const imgData = await imgRes.json();
          return { ...scene, imageTaskId: imgData.task_id || imgData.taskId };
        } catch (err) {
          return { ...scene, imageTaskId: null, imageError: err.message };
        }
      })
    );

    storyboard.scenes = scenesWithTasks;

    res.json({
      success: true,
      storyboard,
      metadata: {
        mode,
        platform,
        aspect,
        sceneCount: storyboard.scenes.length,
        imageProvider: 'Nano Banana 2',
        videoProvider: 'Kling 2.1'
      }
    });
  } catch (error) {
    console.error('storyboard error:', error);
    res.status(500).json({ error: 'Failed to generate storyboard', details: error.message });
  }
});

// ─── POST /storyboard/regenerate-scene ───────────────────────────────────────
// Regenerates one scene — Claude writes new visuals, then submits a fresh
// Nano Banana 2 image job. Returns imageTaskId.
router.post('/storyboard/regenerate-scene', async (req, res) => {
  const { scene, platform, style } = req.body;

  if (!scene) {
    return res.status(400).json({ error: 'Scene data is required' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Regenerate this storyboard scene with a fresh, different creative angle. Keep the same scene purpose and duration but vary the visual approach entirely.

Scene title: ${scene.title}
Scene purpose: ${scene.scriptNote}
Shot type: ${scene.shotType}
Platform: ${platform || 'YouTube'}
Style: ${style || 'cinematic'}

Return ONLY valid JSON:
{
  "visualDescription": "new visual description",
  "imagePrompt": "new detailed Nano Banana 2 image prompt",
  "videoPrompt": "new Kling 2.1 video prompt",
  "mood": "mood description",
  "cameraMove": "camera movement",
  "lightingNotes": "lighting description"
}`
      }]
    });

    const responseText = message.content[0].text.trim();
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const updates = JSON.parse(cleanJson);

    const platformAspect = {
      youtube: '16:9', reels: '9:16', tiktok: '9:16', shorts: '9:16', general: '16:9'
    };
    const aspect = platformAspect[platform] || '16:9';

    // Submit fresh Nano Banana 2 image job
    let imageTaskId = null;
    let imageError = null;

    try {
      const imgRes = await fetch(`${KIE_BASE_URL}/image/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KIE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'nano-banana-2',
          prompt: updates.imagePrompt,
          aspect_ratio: aspect,
          style: style || 'photorealistic',
          n: 1
        })
      });

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        imageTaskId = imgData.task_id || imgData.taskId;
      } else {
        imageError = `kie.ai error ${imgRes.status}`;
      }
    } catch (err) {
      imageError = err.message;
    }

    res.json({
      success: true,
      updatedScene: {
        ...scene,
        ...updates,
        imageTaskId,
        ...(imageError && { imageError })
      }
    });
  } catch (error) {
    console.error('regenerate-scene error:', error);
    res.status(500).json({ error: 'Failed to regenerate scene', details: error.message });
  }
});

module.exports = router;
