const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Generate LTX-2 Video Prompt ─────────────────────────────────────────────
router.post('/video-prompt', async (req, res) => {
  const { subject, mood, platform, shotStyle, duration, extraDetails } = req.body;

  if (!subject) {
    return res.status(400).json({ error: 'Subject is required' });
  }

  try {
    const platformGuide = {
      reels: 'vertical 9:16, fast-paced, eye-catching first frame, optimized for mobile',
      youtube: 'cinematic 16:9, slower pacing, rich background detail, professional grade',
      tiktok: 'vertical 9:16, energetic motion, bright and saturated, trendy aesthetic',
      shorts: 'vertical 9:16, punchy and immediate, high contrast, quick motion',
      general: 'versatile 16:9, balanced pacing, clean composition'
    };

    const shotGuide = {
      closeup: 'extreme close-up shot, tight framing, shallow depth of field, bokeh background',
      medium: 'medium shot, subject centered, balanced negative space',
      wide: 'wide establishing shot, environmental context, sweeping scale',
      overhead: 'overhead top-down shot, flat lay perspective, geometric composition',
      cinematic: 'cinematic dolly shot, slow push in, anamorphic lens flare, film grain'
    };

    const moodGuide = {
      dark: 'dark moody atmosphere, deep shadows, low-key lighting, noir aesthetic',
      bright: 'bright airy feel, soft natural light, clean whites, optimistic tone',
      warm: 'warm golden hour light, amber tones, cozy intimate atmosphere',
      dramatic: 'dramatic high contrast, chiaroscuro lighting, intense shadows',
      minimal: 'minimalist clean aesthetic, neutral tones, negative space, zen-like calm',
      energetic: 'high energy dynamic motion, vibrant saturated colors, kinetic feel'
    };

    const systemPrompt = `You are a professional cinematographer and AI video prompt engineer specializing in LTX-2 video generation. 

Your job is to write a single, flowing paragraph prompt that will generate stunning cinematic B-roll footage using LTX-2.

LTX-2 PROMPT RULES:
- Single flowing paragraph ONLY — no bullet points, no line breaks
- Maximum 200 words
- Start directly with the main action or subject
- Include: main action, specific movements, appearances, camera work, lighting, environment
- Use cinematographic language (dolly, rack focus, shallow DOF, lens flare, etc.)
- Be literal and precise — describe exactly what should appear visually
- Think like a director writing a shot description

OUTPUT: Return ONLY the prompt text. Nothing else. No preamble, no explanation, no quotes.`;

    const userMessage = `Create an LTX-2 video generation prompt for:

Subject: ${subject}
Mood/Atmosphere: ${moodGuide[mood] || mood || 'cinematic and professional'}
Platform: ${platformGuide[platform] || platform || 'versatile 16:9'}
Shot Style: ${shotGuide[shotStyle] || shotStyle || 'cinematic medium shot'}
Duration feel: ${duration || '6-8 seconds of smooth motion'}
${extraDetails ? `Additional details: ${extraDetails}` : ''}

Write the complete LTX-2 prompt now:`;

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: userMessage }],
      system: systemPrompt
    });

    const prompt = message.content[0].text.trim();

    // Also generate a negative prompt
    const negativePrompt = 'shaky, glitchy, low quality, worst quality, deformed, distorted, disfigured, motion smear, motion artifacts, fused fingers, bad anatomy, weird hands, ugly, transition, static, blurry, overexposed, underexposed';

    res.json({
      success: true,
      prompt,
      negativePrompt,
      metadata: {
        subject,
        mood,
        platform,
        shotStyle,
        duration,
        ltxPlaygroundUrl: 'https://app.ltx.studio/ltx-2-playground/t2v'
      }
    });

  } catch (error) {
    console.error('Video prompt generation error:', error);
    res.status(500).json({ error: 'Failed to generate video prompt', details: error.message });
  }
});

// ─── Generate AI Image via Pollinations (Free, No API Key) ───────────────────
router.post('/generate-image', async (req, res) => {
  const { prompt, style, aspectRatio, enhance } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // First enhance the prompt with Claude if requested
    let finalPrompt = prompt;

    if (enhance) {
      const enhanceMessage = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Enhance this image prompt for maximum visual impact and quality. Make it more detailed, specific, and cinematic. Add lighting details, style references, and technical photo/art terms.

Original prompt: ${prompt}
Style: ${style || 'photorealistic'}

Return ONLY the enhanced prompt. No explanation.`
        }]
      });
      finalPrompt = enhanceMessage.content[0].text.trim();
    }

    // Style modifiers for Pollinations
    const styleModifiers = {
      photorealistic: 'photorealistic, 8k, professional photography, sharp focus, detailed',
      cinematic: 'cinematic shot, film photography, dramatic lighting, movie still, 4k',
      artistic: 'digital art, artstation, trending, concept art, highly detailed',
      minimal: 'minimalist, clean, white background, studio lighting, product photography',
      dark: 'dark aesthetic, moody, dramatic shadows, noir, high contrast',
      vibrant: 'vibrant colors, bright, saturated, dynamic, energetic'
    };

    const styleAdd = styleModifiers[style] || styleModifiers.photorealistic;
    const enhancedForPollinations = `${finalPrompt}, ${styleAdd}`;

    // Aspect ratio dimensions
    const dimensions = {
      '1:1': { width: 1024, height: 1024 },
      '16:9': { width: 1280, height: 720 },
      '9:16': { width: 720, height: 1280 },
      '4:3': { width: 1024, height: 768 },
      '3:4': { width: 768, height: 1024 }
    };

    const { width, height } = dimensions[aspectRatio] || dimensions['16:9'];

    // Pollinations.ai - completely free image generation
    const seed = Math.floor(Math.random() * 999999);
    const encodedPrompt = encodeURIComponent(enhancedForPollinations);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=false`;

    res.json({
      success: true,
      imageUrl,
      originalPrompt: prompt,
      enhancedPrompt: finalPrompt,
      fullPrompt: enhancedForPollinations,
      metadata: {
        width,
        height,
        aspectRatio: aspectRatio || '16:9',
        style: style || 'photorealistic',
        seed,
        provider: 'Pollinations AI (Free)'
      }
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: 'Failed to generate image', details: error.message });
  }
});

// ─── Generate Multiple Image Variations ──────────────────────────────────────
router.post('/generate-variations', async (req, res) => {
  const { prompt, style, aspectRatio, count = 4 } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const styleModifiers = {
      photorealistic: 'photorealistic, 8k, professional photography, sharp focus',
      cinematic: 'cinematic shot, film photography, dramatic lighting, movie still',
      artistic: 'digital art, artstation, concept art, highly detailed',
      minimal: 'minimalist, clean, studio lighting, product photography',
      dark: 'dark aesthetic, moody, dramatic shadows, noir',
      vibrant: 'vibrant colors, bright, saturated, dynamic'
    };

    const styleAdd = styleModifiers[style] || styleModifiers.photorealistic;
    const fullPrompt = `${prompt}, ${styleAdd}`;

    const dimensions = {
      '1:1': { width: 1024, height: 1024 },
      '16:9': { width: 1280, height: 720 },
      '9:16': { width: 720, height: 1280 },
      '4:3': { width: 1024, height: 768 }
    };

    const { width, height } = dimensions[aspectRatio] || dimensions['16:9'];
    const encodedPrompt = encodeURIComponent(fullPrompt);

    const variations = Array.from({ length: Math.min(count, 6) }, (_, i) => {
      const seed = Math.floor(Math.random() * 999999);
      return {
        id: i + 1,
        imageUrl: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`,
        seed
      };
    });

    res.json({
      success: true,
      variations,
      prompt: fullPrompt,
      metadata: { width, height, style }
    });

  } catch (error) {
    console.error('Variations error:', error);
    res.status(500).json({ error: 'Failed to generate variations', details: error.message });
  }
});

// ─── Smart Prompt Builder (from content brief) ───────────────────────────────
router.post('/build-prompt', async (req, res) => {
  const { contentTopic, niche, targetEmotion, contentType, platform } = req.body;

  if (!contentTopic) {
    return res.status(400).json({ error: 'Content topic is required' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are a visual content strategist for social media creators. Generate both an image prompt AND a video prompt for this content brief.

Content Topic: ${contentTopic}
Niche: ${niche || 'general lifestyle'}
Target Emotion: ${targetEmotion || 'inspired, motivated'}
Content Type: ${contentType || 'educational/inspirational'}
Platform: ${platform || 'Instagram/YouTube'}

Return ONLY valid JSON in this exact format:
{
  "imagePrompt": "detailed image generation prompt here",
  "videoPrompt": "detailed LTX-2 video generation prompt here (single paragraph, under 200 words)",
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
    console.error('Prompt builder error:', error);
    res.status(500).json({ error: 'Failed to build prompts', details: error.message });
  }
});

// ─── Generate Storyboard from Topic or Script ────────────────────────────────
router.post('/storyboard', async (req, res) => {
  const { input, mode, platform, style, niche } = req.body;
  // mode: 'quick' (topic/hook) or 'script' (full script text)

  if (!input) {
    return res.status(400).json({ error: 'Input is required' });
  }

  try {
    const platformAspect = {
      youtube: '16:9', reels: '9:16', tiktok: '9:16', shorts: '9:16', general: '16:9'
    };
    const aspect = platformAspect[platform] || '16:9';

    const systemPrompt = `You are a professional film director and storyboard artist who creates visual production plans for social media content creators.

Your job is to break content into cinematic scenes with detailed visual descriptions that can be used to generate AI images and video B-roll.

RULES:
- Return ONLY valid JSON, no markdown, no explanation
- Each scene must have a clear, specific visual description
- Image prompts must be photorealistic and detailed (for Pollinations AI)
- Video prompts must follow LTX-2 format: single paragraph, under 150 words, cinematic language
- Shot types: closeup, medium, wide, overhead, pov, cutaway
- Keep scene count between 4-8 scenes
- Duration per scene: 4-10 seconds typically`;

    const modeInstruction = mode === 'script'
      ? `Parse this script into storyboard scenes. Each scene should represent a distinct visual moment or section:\n\nSCRIPT:\n${input}`
      : `Create a storyboard for this content topic/idea:\n\nTOPIC: ${input}\nNiche: ${niche || 'general'}\nPlatform: ${platform || 'YouTube'}`;

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `${modeInstruction}

Visual style preference: ${style || 'cinematic, professional'}
Aspect ratio: ${aspect}

Return a JSON object in this EXACT format:
{
  "title": "Storyboard title",
  "totalDuration": "estimated total duration e.g. 45-60 seconds",
  "visualTheme": "2 sentence overall visual direction",
  "colorGrade": "e.g. warm golden tones, desaturated cool blues",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene title",
      "duration": "6 seconds",
      "shotType": "closeup",
      "visualDescription": "What the viewer sees on screen — be specific",
      "scriptNote": "What's being said or the content purpose of this scene",
      "imagePrompt": "Detailed photorealistic image generation prompt for this scene",
      "videoPrompt": "LTX-2 cinematic video prompt for this scene — single paragraph under 150 words",
      "mood": "e.g. warm and intimate",
      "cameraMove": "e.g. slow dolly in, static, pan left",
      "lightingNotes": "e.g. soft window light from left, golden hour"
    }
  ]
}`
      }]
    });

    const responseText = message.content[0].text.trim();
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const storyboard = JSON.parse(cleanJson);

    // Generate Pollinations image URLs for each scene
    const dimensions = aspect === '9:16'
      ? { width: 720, height: 1280 }
      : { width: 1280, height: 720 };

    const styleModifier = 'cinematic, professional photography, sharp focus, 4k, film still';

    storyboard.scenes = storyboard.scenes.map(scene => {
      const seed = Math.floor(Math.random() * 999999);
      const fullImagePrompt = `${scene.imagePrompt}, ${styleModifier}`;
      const encodedPrompt = encodeURIComponent(fullImagePrompt);
      return {
        ...scene,
        imageUrl: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dimensions.width}&height=${dimensions.height}&seed=${seed}&nologo=true`,
        seed
      };
    });

    res.json({
      success: true,
      storyboard,
      metadata: {
        mode,
        platform,
        aspect,
        sceneCount: storyboard.scenes.length,
        ltxPlaygroundUrl: 'https://app.ltx.studio/ltx-2-playground/t2v'
      }
    });

  } catch (error) {
    console.error('Storyboard generation error:', error);
    res.status(500).json({ error: 'Failed to generate storyboard', details: error.message });
  }
});

// ─── Regenerate a single storyboard scene ────────────────────────────────────
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
        content: `Regenerate this storyboard scene with fresh visuals and a different creative angle. Keep the same scene purpose and duration but vary the visual approach.

Scene title: ${scene.title}
Scene purpose: ${scene.scriptNote}
Shot type: ${scene.shotType}
Platform: ${platform || 'YouTube'}
Style: ${style || 'cinematic'}

Return ONLY valid JSON:
{
  "visualDescription": "new visual description",
  "imagePrompt": "new detailed image prompt",
  "videoPrompt": "new LTX-2 video prompt",
  "mood": "mood description",
  "cameraMove": "camera movement",
  "lightingNotes": "lighting description"
}`
      }]
    });

    const responseText = message.content[0].text.trim();
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const updates = JSON.parse(cleanJson);

    const platformAspect = { youtube: '16:9', reels: '9:16', tiktok: '9:16', shorts: '9:16', general: '16:9' };
    const aspect = platformAspect[platform] || '16:9';
    const dimensions = aspect === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
    const seed = Math.floor(Math.random() * 999999);
    const encodedPrompt = encodeURIComponent(`${updates.imagePrompt}, cinematic, professional photography, 4k`);

    res.json({
      success: true,
      updatedScene: {
        ...scene,
        ...updates,
        imageUrl: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dimensions.width}&height=${dimensions.height}&seed=${seed}&nologo=true`,
        seed
      }
    });

  } catch (error) {
    console.error('Scene regeneration error:', error);
    res.status(500).json({ error: 'Failed to regenerate scene', details: error.message });
  }
});

module.exports = router;
