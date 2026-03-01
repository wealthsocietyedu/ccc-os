# Content Command Center OS
### The all-in-one operating system that turns any social media account into a content business.

Built by **Levi Acay**

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |
| Deploy | Railway (free tier) |

---

## Project Structure

```
ccc-os/
├── server/                 # Express API
│   ├── db/
│   │   ├── index.js        # DB connection + seed data
│   │   └── schema.js       # Full SQLite schema (15 tables)
│   ├── middleware/
│   │   └── auth.js         # JWT authentication
│   ├── routes/
│   │   ├── auth.js         # Register, login, /me
│   │   ├── brands.js       # Brands + Pillars
│   │   ├── production.js   # Assets, Ideas, Hooks, Performance
│   │   ├── distribution.js # Funnels, CTA Routes, Platform Stats, Orphan Check
│   │   └── data.js         # Analytics, Reviews, Offers, Campaigns
│   ├── index.js            # Server entry point
│   └── .env.example        # Environment variables template
├── client/                 # React frontend
│   ├── src/
│   │   ├── lib/
│   │   │   └── api.js      # Centralized API client
│   │   ├── App.jsx         # Full application (all 6 modules)
│   │   └── main.jsx        # Entry point
│   ├── index.html
│   └── vite.config.js      # Dev proxy to Express
├── data/                   # SQLite database (auto-created)
├── package.json            # Root monorepo scripts
└── railway.toml            # Railway deployment config
```

---

## API Routes

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account (seeds demo data) |
| POST | `/api/auth/login` | Sign in, get JWT |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/me` | Update name/password |

### Brands & Strategy
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/brands` | List all brands for user |
| POST | `/api/brands` | Create brand |
| PATCH | `/api/brands/:id` | Update brand |
| DELETE | `/api/brands/:id` | Delete brand (cascades all data) |
| GET | `/api/brands/:brandId/pillars` | List pillars |
| POST | `/api/brands/:brandId/pillars` | Create pillar |
| PATCH | `/api/brands/:brandId/pillars/:id` | Update pillar |
| DELETE | `/api/brands/:brandId/pillars/:id` | Delete pillar |

### Production
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/production/assets` | List assets (filterable) |
| POST | `/api/production/assets` | Create asset |
| PATCH | `/api/production/assets/:id` | Update asset / move status |
| DELETE | `/api/production/assets/:id` | Delete asset |
| POST | `/api/production/assets/:id/performance` | Log performance data |
| GET | `/api/production/ideas` | List ideas |
| POST | `/api/production/ideas` | Create idea |
| GET | `/api/production/hooks` | List hooks |
| POST | `/api/production/hooks` | Create hook |

### Distribution
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/distribution/funnels` | List funnels with attached CTA routes |
| POST | `/api/distribution/funnels` | Create funnel |
| GET | `/api/distribution/funnels/:id` | Get funnel + orphan check |
| GET | `/api/distribution/cta-routes` | List CTA routes |
| POST | `/api/distribution/cta-routes` | Create CTA route |
| PATCH | `/api/distribution/cta-routes/:id` | Toggle active, update |
| GET | `/api/distribution/platform-stats` | List platform stats |
| POST | `/api/distribution/platform-stats` | Upsert platform stat |
| GET | `/api/distribution/orphan-check?brandId=` | **Finds content with no CTA destination** |

### Data & Analytics
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/data/analytics/:brandId` | Full analytics (totals, by platform, by pillar, top/bottom performers) |
| GET | `/api/data/reviews` | List weekly reviews |
| POST | `/api/data/reviews` | Save weekly review |
| GET | `/api/data/offers` | List offers |
| POST | `/api/data/offers` | Create offer |
| GET | `/api/data/campaigns` | List campaigns |
| POST | `/api/data/campaigns` | Create campaign |

---

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd ccc-os

# 2. Install all dependencies
npm run install:all

# 3. Set up environment variables
cp server/.env.example server/.env
# Edit server/.env — change JWT_SECRET to a random string

# 4. Run in development
npm run dev
# Server: http://localhost:3001
# Client: http://localhost:5173 (proxies /api to :3001)
```

On first run, the database is created automatically at `./data/ccc_os.db`.
When you register the first account, seed data is automatically loaded.

---

## Deploy to Railway (Free)

Railway gives you $5/month free credit. A small SQLite app runs well within this.

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — Content Command Center OS"
git remote add origin https://github.com/yourusername/ccc-os.git
git push -u origin main
```

### Step 2 — Create Railway Project

1. Go to [railway.app](https://railway.app) and sign up (free)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `ccc-os` repository
4. Railway auto-detects the config from `railway.toml`

### Step 3 — Set Environment Variables

In the Railway dashboard → Variables, add:

```
NODE_ENV=production
JWT_SECRET=<generate a 64-char random string>
DB_PATH=/var/data/ccc_os.db
CLIENT_URL=https://your-app.railway.app
PORT=3001
```

To generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4 — Add a Volume (SQLite persistence)

In Railway dashboard:
1. Click your service → **Volumes**
2. Add volume, mount path: `/var/data`
3. This ensures your database survives redeploys

### Step 5 — Deploy

Railway auto-deploys on every `git push`. Your app will be live at the Railway-assigned URL.

---

## Adding a Custom Domain

1. Railway dashboard → Settings → Domains
2. Add your domain (e.g. `app.yourdomain.com`)
3. Add the CNAME record to your DNS provider
4. Update `CLIENT_URL` environment variable to your custom domain

---

## Scaling to PostgreSQL

When you're ready to scale beyond SQLite:

1. Add a PostgreSQL plugin in Railway (free tier available)
2. Replace `better-sqlite3` with `pg` or `knex`
3. The schema maps directly — all tables and indexes translate 1:1
4. Update `getDB()` in `server/db/index.js` to use the pg pool

The API routes don't need to change — only the DB adapter.

---

## Product Tiers — Feature Gating

The `tier` field on the `users` table (`starter`, `pro`, `operator`) is ready for feature gating.

Example middleware:
```js
const requirePro = (req, res, next) => {
  if (!['pro','operator'].includes(req.userTier)) {
    return res.status(403).json({ error: 'Upgrade to Pro to access this feature' });
  }
  next();
};
```

Apply to any route to enforce tier restrictions.

---

## Security Checklist (Before Going Public)

- [ ] Change `JWT_SECRET` to a random 64-character string
- [ ] Set `NODE_ENV=production`
- [ ] Use a Railway volume for `/var/data` (SQLite persistence)
- [ ] Enable HTTPS (Railway provides this automatically)
- [ ] Review rate limits in `server/index.js`
- [ ] Set `CLIENT_URL` to your exact production domain (CORS)

---

Built with the Content Command Center OS framework.
*Not a content calendar. A content business.*
