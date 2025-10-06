# 🚀 Tabsy Deployment Guide (Demo/Testing)

## Complete FREE Setup - 30 Minutes

Deploy all 4 services for **$0/month**:
- ✅ Backend API (Node.js)
- ✅ PostgreSQL Database
- ✅ Redis Cache
- ✅ 3 Frontend Apps (Customer, Restaurant, Admin)

---

## Step 1: PostgreSQL Database (5 min)

### Neon (Free: 3GB, 191 compute hours/month)

1. Go to **https://neon.tech**
2. Sign up with GitHub
3. Create project: `tabsy-demo`
4. Copy **Pooled Connection** string (important!)
5. Save it - you'll need it later

```
Example: postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
```

---

## Step 2: Redis Cache (3 min)

### Upstash (Free: 500K commands/month)

1. Go to **https://console.upstash.com**
2. Sign up with GitHub
3. Create database: `tabsy-redis` (Regional, same region as Neon)
4. Click **"Connect"** → **"Redis Client"** tab (NOT REST API!)
5. Copy the **Native Redis URL** (starts with `rediss://`)
6. Save it

```
Example: rediss://default:AbCdEf...@abc-xyz.upstash.io:6379
```

**Important**: Use the Native Redis URL (rediss://), NOT the REST API URL. The backend uses Socket.IO Redis adapter which requires native TCP connections for pub/sub support.

---

## Step 3: Backend API (10 min)

### Render (Free: 750 hours/month)

1. Go to **https://render.com**
2. Sign up with GitHub
3. Click **"New +"** → **"Web Service"**
4. Connect your **`Tabsy-core`** repository
5. Settings:
   - **Name**: `tabsy-api`
   - **Region**: Oregon (or closest to you)
   - **Build Command**: `pnpm install && pnpm run db:generate && pnpm run build`
   - **Start Command**: `pnpm start`
   - **Plan**: Free

6. Click **"Environment"** → Add these variables:

```bash
NODE_ENV=production
PORT=5001
DATABASE_URL=<paste-your-neon-pooled-url>
REDIS_URL=<paste-your-upstash-rest-url>
JWT_SECRET=<generate-random-32-chars>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
ALLOWED_ORIGINS=<leave-blank-for-now>
CUSTOMER_APP_URL=<leave-blank-for-now>
RESTAURANT_APP_URL=<leave-blank-for-now>
ADMIN_APP_URL=<leave-blank-for-now>
```

**Generate JWT Secret:**
```bash
# Run in terminal:
openssl rand -base64 32
```

7. Click **"Create Web Service"** → Wait 3-5 min

8. Copy your backend URL: `https://tabsy-api.onrender.com`

### Run Database Migrations

**IMPORTANT: You MUST run migrations before the app will work!**

```bash
# From your local machine:
cd Tabsy-core
DATABASE_URL="<paste-neon-pooled-url>" npx prisma migrate deploy
```

This creates all required database tables. Without this step, the API will fail.

---

## Step 4: Frontend Apps on Vercel (12 min)

### Why Vercel?
- ✅ Auto-detects your Turborepo monorepo
- ✅ Auto-builds shared packages (@tabsy/ui-components, @tabsy/api-client)
- ✅ 3-5x faster builds than other platforms
- ✅ 100% FREE for demo/testing

### 🔧 Important Configuration Notes

For Turborepo monorepos with shared workspace packages, you **must** use this specific configuration:

```
Framework Preset: Next.js
Root Directory: apps/[app-name]
Build Command: cd ../.. && turbo build --filter=@tabsy/[app-name]
Output Directory: .next
Install Command: cd ../.. && pnpm install
```

**Why these settings:**
- **Root Directory** points to the app folder so Vercel detects Next.js in package.json
- **Install Command** runs from monorepo root to install all workspace dependencies
- **Build Command** uses Turbo to build the app + all its shared package dependencies
- All three command overrides must be enabled

---

### 4A. Customer App (4 min)

1. Go to **https://vercel.com** → Sign up with GitHub
2. Click **"Add New Project"**
3. Import **`Tabsy-Frontend`** repository
4. Configure:
   ```
   Framework Preset: Next.js
   Root Directory: apps/customer
   Build Command: cd ../.. && turbo build --filter=@tabsy/customer (enable Override)
   Output Directory: .next (enable Override)
   Install Command: cd ../.. && pnpm install (enable Override)
   ```

5. Click **"Environment Variables"** → Add:

```bash
NEXT_PUBLIC_API_BASE_URL=https://tabsy-api.onrender.com/api/v1
NEXT_PUBLIC_WS_BASE_URL=https://tabsy-api.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

6. Click **"Deploy"** → Wait 2-3 min

7. **Copy URL**: `https://tabsy-customer.vercel.app` (save it!)

---

### 4B. Restaurant Dashboard (4 min)

1. Vercel → **"Add New Project"**
2. Import **`Tabsy-Frontend`** again
3. Configure:
   ```
   Framework Preset: Next.js
   Root Directory: apps/restaurant-dashboard
   Build Command: cd ../.. && turbo build --filter=@tabsy/restaurant-dashboard (enable Override)
   Output Directory: .next (enable Override)
   Install Command: cd ../.. && pnpm install (enable Override)
   ```

4. Environment Variables:

```bash
NEXT_PUBLIC_API_BASE_URL=https://tabsy-api.onrender.com/api/v1
NEXT_PUBLIC_WS_BASE_URL=https://tabsy-api.onrender.com
NEXT_PUBLIC_CUSTOMER_APP_URL=https://tabsy-customer.vercel.app
NEXT_PUBLIC_ADMIN_APP_URL=<will-add-after-next-step>
NEXT_PUBLIC_RESTAURANT_APP_URL=https://tabsy-restaurant.vercel.app
```

5. Deploy → **Copy URL** (save it!)

---

### 4C. Admin Portal (4 min)

1. Vercel → **"Add New Project"**
2. Import **`Tabsy-Frontend`** again
3. Configure:
   ```
   Framework Preset: Next.js
   Root Directory: apps/admin-portal
   Build Command: cd ../.. && turbo build --filter=@tabsy/admin-portal (enable Override)
   Output Directory: .next (enable Override)
   Install Command: cd ../.. && pnpm install (enable Override)
   ```

4. Environment Variables:

```bash
NEXT_PUBLIC_API_BASE_URL=https://tabsy-api.onrender.com/api/v1
NEXT_PUBLIC_WS_BASE_URL=https://tabsy-api.onrender.com
NEXT_PUBLIC_CUSTOMER_APP_URL=https://tabsy-customer.vercel.app
NEXT_PUBLIC_RESTAURANT_APP_URL=https://tabsy-restaurant.vercel.app
```

5. Deploy → **Copy URL**

---

## Step 5: Update Backend CORS (2 min)

Now that all frontends are deployed:

1. Go to **Render** → Your `tabsy-api` service
2. Click **"Environment"**
3. Update these variables with your actual Vercel URLs:

```bash
ALLOWED_ORIGINS=https://tabsy-customer.vercel.app,https://tabsy-restaurant.vercel.app,https://tabsy-admin.vercel.app

CUSTOMER_APP_URL=https://tabsy-customer.vercel.app
RESTAURANT_APP_URL=https://tabsy-restaurant.vercel.app
ADMIN_APP_URL=https://tabsy-admin.vercel.app
```

4. Click **"Save"** → Auto-redeploys (1-2 min)

---

## Step 6: Stripe Webhook (3 min)

1. Go to **https://dashboard.stripe.com/webhooks**
2. Click **"Add endpoint"**
3. Settings:
   - **Endpoint URL**: `https://tabsy-api.onrender.com/api/v1/payments/webhooks/stripe`
   - **Events to send**:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`

4. Click **"Add endpoint"**
5. Copy **Signing secret**: `whsec_xxxxx`
6. Add to Render environment variables:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```
7. Save → Redeploys

---

## Step 7: Update Restaurant & Admin URLs (2 min)

Go back to Vercel:

1. **Restaurant Dashboard** → Settings → Environment Variables
   - Update `NEXT_PUBLIC_ADMIN_APP_URL` with actual admin URL
   - Redeploy

2. **Admin Portal** → (Already has correct URLs)

---

## ✅ Deployment Complete!

### Your Live URLs:
```
Backend:      https://tabsy-api.onrender.com
Customer:     https://tabsy-customer.vercel.app
Restaurant:   https://tabsy-restaurant.vercel.app
Admin:        https://tabsy-admin.vercel.app
```

### Total Time: ~30 minutes
### Total Cost: $0/month

---

## 🧪 Test Your Deployment

### 1. Backend Health
```bash
curl https://tabsy-api.onrender.com/health
# Should return: {"status":"healthy","services":{"database":"healthy","redis":"healthy"},...}
```

### 2. Complete User Flow
1. Open Customer App
2. Browse menu (or scan QR)
3. Add items to cart
4. Checkout with test card: `4242 4242 4242 4242`
5. Check Restaurant Dashboard for order
6. Verify real-time updates work

---

## 🚀 Auto-Deployment (Already Working!)

Every `git push` to `main` automatically:
- ✅ Rebuilds backend (if Tabsy-core changed)
- ✅ Rebuilds frontend apps (if Tabsy-Frontend changed)
- ✅ Deploys in 2-5 minutes

**Just code and push - everything deploys automatically!**

---

## ⚡ Optional: Keep Backend Warm

Render free tier sleeps after 15 min inactivity. First request takes ~30s.

**Solution: UptimeRobot (Free)**

1. Go to **https://uptimerobot.com**
2. Create HTTP monitor
3. URL: `https://tabsy-api.onrender.com/health`
4. Interval: 5 minutes

Now your backend responds instantly!

---

## 🌐 Optional: Custom Domain

### Add Your Domain to Vercel:

1. **Customer App**:
   - Vercel → Project → Settings → Domains
   - Add: `app.yourdomain.com`
   - Update DNS: `CNAME: app → cname.vercel-dns.com`

2. **Restaurant Dashboard**: `dashboard.yourdomain.com`
3. **Admin Portal**: `admin.yourdomain.com`

### Add Your Domain to Render (Backend):

1. Render → Service → Settings → Custom Domain
2. Add: `api.yourdomain.com`
3. Update DNS: `CNAME: api → tabsy-api.onrender.com`

**SSL certificates auto-provision in 1-2 minutes!**

---

## 🆘 Troubleshooting

### Backend won't start
- Check Render logs
- Verify `DATABASE_URL` has `?sslmode=require&pgbouncer=true`
- Ensure all environment variables are set

### Frontend can't reach backend
- Check `ALLOWED_ORIGINS` in Render matches exact Vercel URLs
- No trailing slashes in URLs
- Must use HTTPS

### Webhook not working
- Verify `STRIPE_WEBHOOK_SECRET` in Render
- Check Stripe Dashboard → Webhooks → Delivery attempts
- Review Render logs for errors

### Slow first request
- Render free tier sleeps after 15 min
- Set up UptimeRobot (see above)
- Or accept 30s first request delay

---

## 📊 Free Tier Limits

| Service | Limit | Your Usage (Demo) |
|---------|-------|-------------------|
| Neon | 3GB, 191 hrs/month | ~100MB, ~50 hrs ✓ |
| Upstash | 500K commands | ~5-10K ✓ |
| Render | 750 hrs/month | ~200 hrs ✓ |
| Vercel | 100GB bandwidth each | ~1-5GB ✓ |

**You'll use <5% of limits for demo!**

---

## 🎯 What's Next?

### For Demo/Testing:
- ✅ You're all set! Share the URLs
- ✅ All services FREE forever for non-commercial use

### Moving to Production:
- Evaluate if staying non-commercial OR
- Upgrade to paid plans for commercial use:
  - Vercel Pro: $20/month (if commercial)
  - Neon: $19/month (if >3GB data)
  - Others: Stay free

---

## 📚 Important Files

**Backend:**
- `Tabsy-core/.env` - Environment variables
- `Tabsy-core/render.yaml` - Deployment config (optional)

**Frontend:**
- Each app reads from Vercel environment variables
- No config files needed (Vercel auto-detects everything)

**Documentation:**
- `API_DOCUMENTATION.md` - API reference
- `CLAUDE.md` - Project overview

---

**🎉 You're Done! Your Tabsy demo is live and FREE!**

Questions? Check API_DOCUMENTATION.md or platform docs:
- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Neon Docs](https://neon.tech/docs)
- [Upstash Docs](https://upstash.com/docs)
