// server/index.js
// Content Command Center OS — Express API Server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const clipperRoutes = require('./routes/clipper');
const videoDownloaderRoutes = require('./routes/videoDownloader');
const channelDownloaderRoutes = require('./routes/channelDownloader');
const { getDB, reseedUserData } = require('./db');
const { authenticate } = require('./middleware/auth');
const personalAccess = (req,res,next) => {
  const allowed=(process.env.CLIPPER_OWNER_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) return next();
  const user=getDB().prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
  if (!user || !allowed.includes(user.email.toLowerCase())) return res.status(403).json({error:'This is a private workspace.'});
  next();
};

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Trust Railway's reverse proxy — required for express-rate-limit to work correctly
// without this it throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and crashes
app.set('trust proxy', 1);

// ─── SECURITY ─────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { error: 'Too many requests. Please try again in a few minutes.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again later.' }
});

app.use((req, res, next) => req.path.startsWith('/api/smart-clipper') || req.path.startsWith('/api/clip-media') ? next() : limiter(req,res,next));

// ─── STRIPE WEBHOOK — must receive raw body, BEFORE json middleware ───────────
app.use('/api/billing/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.get('/api/clip-media/:id/:filename', clipperRoutes.media);
app.use('/api/smart-clipper', authenticate, personalAccess, rateLimit({ windowMs: 60000, max: 600 }), clipperRoutes);
app.use('/api/video-downloader', authenticate, personalAccess, videoDownloaderRoutes);
app.use('/api/channel-downloader', authenticate, personalAccess, channelDownloaderRoutes);

// ─── ADMIN ENDPOINTS ──────────────────────────────────────────────────────────

// POST /api/admin/reseed — re-run seed data for the authenticated user (admin only)
app.post('/api/admin/reseed', authenticate, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.userId);
  if (!user?.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    reseedUserData(req.userId);
    res.json({ success: true, message: 'Seed data refreshed. Reload the app to see updated KPIs.' });
  } catch (err) {
    res.status(500).json({ error: 'Reseed failed', details: err.message });
  }
});

// ─── META WEBHOOK VERIFICATION ────────────────────────────────────────────────
// Required by Meta to verify ownership of the server before activating Instagram/Facebook products.
// In Meta developer portal → Webhooks, set:
//   Callback URL: https://ccc-os-production.up.railway.app/api/webhook/meta
//   Verify Token: (whatever you set as META_WEBHOOK_VERIFY_TOKEN in Railway)
app.get('/api/webhook/meta', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected  = process.env.META_WEBHOOK_VERIFY_TOKEN || 'ccc_webhook_verify';

  if (mode === 'subscribe' && token === expected) {
    console.log('[Webhook] Meta webhook verified');
    return res.status(200).send(challenge);
  }
  res.status(403).json({ error: 'Webhook verification failed' });
});

// POST handler so Meta doesn't get 404s when it sends events
app.post('/api/webhook/meta', (req, res) => res.sendStatus(200));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Content Command Center OS',
    version: '2.0.0-clipper',
    timestamp: new Date().toISOString()
  });
});

// ─── SERVE CLIENT IN PRODUCTION ───────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuild));
  app.get('/privacy', (req, res) => {
    res.sendFile(path.join(clientBuild, 'privacy.html'));
  });
  app.get('/terms', (req, res) => {
    res.sendFile(path.join(clientBuild, 'terms.html'));
  });
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuild, 'index.html'));
    }
  });
}

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │   Content Command Center OS — Server    │
  │   Running on http://localhost:${PORT}       │
  │   ENV: ${(process.env.NODE_ENV || 'development').padEnd(30)}│
  └─────────────────────────────────────────┘
  `);
});

module.exports = app;
