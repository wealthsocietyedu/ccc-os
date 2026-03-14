// server/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { getDB, seedUserData } = require('../db');
const { signToken, authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const db = getDB();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    // Auto-grant admin if email matches ADMIN_EMAIL env var
    const isAdmin = process.env.ADMIN_EMAIL &&
      email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase() ? 1 : 0;

    db.prepare(`
      INSERT INTO users (id, email, password, name, is_admin) VALUES (?, ?, ?, ?, ?)
    `).run(userId, email.toLowerCase(), hash, name, isAdmin);

    // Elevate admin to operator tier immediately on registration
    if (isAdmin) {
      db.prepare("UPDATE users SET tier = 'operator' WHERE id = ?").run(userId);
    }

    // Seed starter data for new user
    seedUserData(userId);

    const token = signToken(userId, isAdmin ? 'operator' : 'starter');
    const user = db.prepare('SELECT id, email, name, tier, is_admin, created_at FROM users WHERE id = ?').get(userId);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user.id, user.tier);
    const { password: _, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare('SELECT id, email, name, tier, is_admin, created_at FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /api/auth/me
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
      if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
      const hash = await bcrypt.hash(newPassword, 12);
      db.prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, req.userId);
    }

    if (name) {
      db.prepare('UPDATE users SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, req.userId);
    }

    const updated = db.prepare('SELECT id, email, name, tier, is_admin, created_at FROM users WHERE id = ?').get(req.userId);
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────
// Uses GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars.
// In Railway, set these to the same values as YOUTUBE_CLIENT_ID/SECRET if you're
// using the same Google Cloud OAuth client — just add the userinfo scope in GCC.
// Required redirect URI to whitelist in Google Cloud Console:
//   https://ccc-os-production.up.railway.app/api/auth/google/callback

// GET /api/auth/google — kick off Google Sign-In popup
router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('GOOGLE_CLIENT_ID env var not set');
  }

  // Short-lived JWT state to prevent CSRF
  const state = jwt.sign({ type: 'google_auth', ts: Date.now() }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const redirectUri = `${process.env.SERVER_URL}/api/auth/google/callback`;

  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  res.redirect(url);
});

// GET /api/auth/google/callback — exchange code, find or create user, redirect to popup handler
router.get('/google/callback', async (req, res) => {
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
  const { code, state, error } = req.query;

  const fail = (msg) =>
    res.redirect(`${CLIENT_URL}/oauth-callback.html?status=error&platform=google_auth&reason=${encodeURIComponent(msg)}`);

  if (error || !code) return fail(error || 'Google sign-in was cancelled');

  try {
    // Verify CSRF state
    jwt.verify(state, process.env.JWT_SECRET);

    const clientId     = process.env.GOOGLE_CLIENT_ID     || process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri  = `${process.env.SERVER_URL}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenResp = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token } = tokenResp.data;

    // Fetch Google profile
    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const { email, name, picture } = profile;
    if (!email) return fail('Could not retrieve email from Google account');

    // Find or create user
    const db = getDB();
    let user = db.prepare('SELECT id, email, name, tier, is_admin, created_at FROM users WHERE email = ?').get(email.toLowerCase());

    if (!user) {
      const userId  = uuidv4();
      const isAdmin = process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase() ? 1 : 0;

      // Store sentinel for password — Google users cannot log in via email+password
      db.prepare('INSERT INTO users (id, email, password, name, is_admin) VALUES (?, ?, ?, ?, ?)')
        .run(userId, email.toLowerCase(), '__GOOGLE_OAUTH__', name || email.split('@')[0], isAdmin);

      if (isAdmin) {
        db.prepare("UPDATE users SET tier = 'operator' WHERE id = ?").run(userId);
      }

      seedUserData(userId);
      user = db.prepare('SELECT id, email, name, tier, is_admin, created_at FROM users WHERE id = ?').get(userId);
    }

    // Issue 30-day JWT
    const token = signToken(user.id, user.tier);

    // Redirect to oauth-callback.html — the popup script postMessages token back to parent
    const userPayload = encodeURIComponent(JSON.stringify({ ...user, avatar: picture || null }));
    res.redirect(`${CLIENT_URL}/oauth-callback.html?status=success&platform=google_auth&token=${encodeURIComponent(token)}&user=${userPayload}`);

  } catch (err) {
    console.error('Google auth callback error:', err.response?.data || err.message);
    fail('Authentication failed — please try again');
  }
});

// POST /api/auth/make-admin — promote a user to admin (requires ADMIN_SECRET header)
router.post('/make-admin', (req, res) => {
  const { email } = req.body;
  const secret = req.headers['x-admin-secret'];

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Invalid admin secret' });
  }
  if (!email) return res.status(400).json({ error: 'email required' });

  const db = getDB();
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare("UPDATE users SET is_admin = 1, tier = 'operator', updated_at = datetime('now') WHERE id = ?").run(user.id);
  res.json({ success: true, message: `${email} is now an admin with Operator access` });
});

module.exports = router;
