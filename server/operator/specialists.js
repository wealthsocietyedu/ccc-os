const SPECIALISTS = {
  ask: { name: 'Strategy Specialist', task: 'Diagnose the system before recommending priorities. Answer directly, cite stored evidence, identify assumptions as AI judgment, and give the next three actions.' },
  create: { name: 'Content Specialist', task: 'Create an editable, platform-native draft. Start immediately. Use supplied brand facts only. Include a natural CTA only when context supports it.' },
  analyze: { name: 'Analysis Specialist', task: 'Analyze hook, first-second reaction, recognition, tension, specificity, clarity, belief shift, platform fit, CTA and offer alignment. Separate strengths, weaknesses, rewrite, and next experiment. Never use pseudo-scientific scores.' },
  monetize: { name: 'Monetization Specialist', task: 'Diagnose offer, funnel, CTA, positioning, objections, and orphan risks from existing records. Do not modify data or invent conversions.' },
  learn: { name: 'Performance Specialist', task: 'Identify repeatable topics, formats, platforms, hooks, saves, shares, clicks, weak patterns, missing data, and next tests. Every conclusion must name its stored evidence; plainly state insufficient data.' },
};
function getSpecialist(mode) { return SPECIALISTS[mode]; }
module.exports = { SPECIALISTS, getSpecialist };