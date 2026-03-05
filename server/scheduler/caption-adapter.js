// server/scheduler/caption-adapter.js
// Adapts post captions per platform — AI-powered (OpenAI) with rule-based fallback

const PLATFORM_RULES = {
  youtube:   { maxChars: 5000, style: 'detailed, SEO-friendly, include timestamps if long, 3-5 relevant hashtags' },
  instagram: { maxChars: 2200, style: 'engaging, relatable, 5-8 hashtags, emojis encouraged, line breaks for readability' },
  tiktok:    { maxChars: 2200, style: 'casual, hook-first, trending phrases, 3-5 hashtags, short punchy sentences' },
  twitter:   { maxChars: 280,  style: 'punchy, conversational, 1-2 hashtags max, no filler words, thread-able if long' },
  threads:   { maxChars: 500,  style: 'casual and authentic, minimal hashtags (0-2), conversational, no forced engagement' },
  facebook:  { maxChars: 2000, style: 'friendly, community-focused, clear CTA, can be longer form, 1-3 hashtags' },
  linkedin:  { maxChars: 1300, style: 'professional, value-driven, 2-3 industry hashtags, insight or lesson format' },
  pinterest: { maxChars: 500,  style: 'descriptive, keyword-rich, helpful/informative tone, no hashtags needed' },
};

// Platform-specific default hashtag sets (used for rule-based fallback)
const PLATFORM_HASHTAGS = {
  tiktok:    ['#fyp', '#foryou', '#viral'],
  instagram: ['#contentcreator', '#socialmedia', '#growyouraccount'],
  threads:   [],
  twitter:   [],
  facebook:  [],
  linkedin:  ['#linkedin', '#growth', '#business'],
  pinterest: [],
  youtube:   [],
};

/**
 * Adapt a caption for a target platform using OpenAI GPT-4o-mini.
 * Falls back to rule-based truncation if no API key is set.
 *
 * @param {string} caption - Original caption
 * @param {string} sourcePlatform - Where the original was posted
 * @param {string} targetPlatform - Where we're repurposing to
 * @param {string} userHints - Optional user notes for the AI (e.g. "always add 3 hashtags")
 * @param {string} openAiKey - OpenAI API key
 * @returns {Promise<string>} - Adapted caption
 */
async function adaptCaption(caption, sourcePlatform, targetPlatform, userHints = '', openAiKey = '') {
  const rules = PLATFORM_RULES[targetPlatform] || PLATFORM_RULES.instagram;

  // If no OpenAI key, use rule-based fallback
  if (!openAiKey) {
    return ruleBasedAdapt(caption, targetPlatform, rules);
  }

  try {
    const systemPrompt = `You are a social media copywriter expert. You adapt content captions from one platform to another.
    
Rules for ${targetPlatform}:
- Max characters: ${rules.maxChars}
- Style: ${rules.style}
- Source platform: ${sourcePlatform}

Your job: rewrite the caption to fit ${targetPlatform} perfectly. Keep the core message and value, but adapt the tone, length, hashtags, and style.${userHints ? `\n\nUser's additional instructions: ${userHints}` : ''}

Return ONLY the adapted caption text. No explanation, no quotes, just the caption.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Original caption (from ${sourcePlatform}):\n\n${caption}` },
        ],
        max_tokens: Math.ceil(rules.maxChars / 3),
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI ${response.status}`);
    }

    const data = await response.json();
    const adapted = data.choices?.[0]?.message?.content?.trim();
    if (!adapted) throw new Error('Empty response from OpenAI');

    // Ensure we don't exceed platform limit
    return adapted.slice(0, rules.maxChars);
  } catch (err) {
    console.warn(`[CaptionAdapter] OpenAI failed for ${targetPlatform}: ${err.message} — using rule-based fallback`);
    return ruleBasedAdapt(caption, targetPlatform, rules);
  }
}

/**
 * Rule-based caption adaptation — no AI required.
 * Truncates to platform limit and appends platform-specific hashtags.
 */
function ruleBasedAdapt(caption, targetPlatform, rules) {
  const hashtags = PLATFORM_HASHTAGS[targetPlatform] || [];
  const hashtagStr = hashtags.length ? '\n\n' + hashtags.join(' ') : '';
  const maxContent = rules.maxChars - hashtagStr.length - 3;

  let adapted = caption;
  if (adapted.length > maxContent) {
    adapted = adapted.slice(0, maxContent - 3) + '...';
  }

  return adapted + hashtagStr;
}

module.exports = { adaptCaption, PLATFORM_RULES };
