function safeJson(value, fallback = []) { try { return JSON.parse(value); } catch { return fallback; } }
function ownedBrand(db, userId, brandId) { return db.prepare('SELECT * FROM brands WHERE id = ? AND user_id = ?').get(brandId, userId); }
function all(db, sql, userId, brandId, limit) { return db.prepare(sql).all(userId, brandId, limit); }

function buildOperatorContext(db, userId, brandId) {
  const brand = ownedBrand(db, userId, brandId);
  if (!brand) return null;
  brand.platforms = safeJson(brand.platforms);
  const context = {
    brand,
    pillars: all(db, 'SELECT id,name,type,trigger,dream_outcome,cta FROM pillars WHERE user_id=? AND brand_id=? ORDER BY created_at DESC LIMIT ?', userId, brandId, 30),
    ideas: all(db, 'SELECT id,title,format,platform,hook_angle,cta,status,priority FROM ideas WHERE user_id=? AND brand_id=? ORDER BY date_captured DESC LIMIT ?', userId, brandId, 30),
    assets: all(db, 'SELECT id,title,format,platform,status,hook,cta,cta_destination,funnel_stage,pillar_id FROM assets WHERE user_id=? AND brand_id=? ORDER BY updated_at DESC LIMIT ?', userId, brandId, 40),
    performance: all(db, `SELECT p.asset_id,a.title,p.platform,p.views,p.likes,p.comments,p.shares,p.saves,p.followers,p.link_clicks,p.leads,p.revenue,p.publish_date FROM performance p JOIN assets a ON a.id=p.asset_id AND a.user_id=p.user_id WHERE p.user_id=? AND p.brand_id=? ORDER BY p.publish_date DESC LIMIT ?`, userId, brandId, 60),
    offers: all(db, 'SELECT id,name,type,price,active,sales_page_url,notes FROM offers WHERE user_id=? AND brand_id=? ORDER BY created_at DESC LIMIT ?', userId, brandId, 20),
    funnels: all(db, 'SELECT id,name,stage,entry_point,micro_conversion,lead_capture,nurture_step,conversion_step,active FROM funnels WHERE user_id=? AND brand_id=? ORDER BY created_at DESC LIMIT ?', userId, brandId, 20),
    ctaRoutes: all(db, 'SELECT id,label,cta_copy,destination_url,funnel_stage,platform,active,monthly_clicks,conversion_rate FROM cta_routes WHERE user_id=? AND brand_id=? ORDER BY created_at DESC LIMIT ?', userId, brandId, 30),
    campaigns: all(db, 'SELECT id,name,type,start_date,end_date,revenue_goal,leads_goal,pieces_planned,leads_actual,status FROM campaigns WHERE user_id=? AND brand_id=? ORDER BY created_at DESC LIMIT ?', userId, brandId, 20),
    reviews: all(db, 'SELECT week_date,posts_published,total_views,new_followers,leads_generated,revenue,best_hook_type,best_pillar,best_platform,next_week_plan FROM weekly_reviews WHERE user_id=? AND brand_id=? ORDER BY week_date DESC LIMIT ?', userId, brandId, 12),
  };
  const counts = Object.fromEntries(Object.entries(context).filter(([,v]) => Array.isArray(v)).map(([k,v]) => [k,v.length]));
  const evidence = Object.entries(counts).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`);
  return { context, counts, evidence, missing: Object.entries(counts).filter(([,v]) => v === 0).map(([k]) => k) };
}

function serializeContext(bundle) {
  const replacer = (key, value) => ['notes','script','sales_page_url','destination_url'].includes(key) && typeof value === 'string' ? value.slice(0, 500) : value;
  return JSON.stringify(bundle.context, replacer, 2).slice(0, 24000);
}
module.exports = { ownedBrand, buildOperatorContext, serializeContext };