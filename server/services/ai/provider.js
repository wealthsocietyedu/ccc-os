const Anthropic = require('@anthropic-ai/sdk');

let anthropic;

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const error = new Error('Operator AI is not configured');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }
  anthropic ||= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

async function generateText({ system, messages, maxTokens = 1400 }) {
  const response = await getAnthropic().messages.create({
    model: process.env.OPERATOR_AI_MODEL || 'claude-opus-4-5',
    max_tokens: Math.min(Math.max(maxTokens, 200), 3000),
    system,
    messages,
  });
  const text = response.content.filter(part => part.type === 'text').map(part => part.text).join('\n').trim();
  if (!text) throw new Error('AI provider returned an empty response');
  return text;
}

module.exports = { generateText };