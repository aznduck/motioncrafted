# Deployment Guide

Quick guide to deploy Cherished Motion Lab to production.

## Architecture

```
Customer Site: https://motioncrafted.co (Already deployed)
  └─ Connects to → Backend API (Railway)

Admin Dashboard (Vercel - to deploy)
  └─ Connects to → Backend API (Railway)

Backend API (Railway - to deploy)
  └─ Connects to → Supabase (Database + Storage)
```

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository

### 1.2 Configure Project

**Settings → Root Directory:**
- Set to: `/backend`

**Build Settings:**
- Railway auto-detects Python
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 1.3 Add Environment Variables

Go to Variables tab and add all these:

```bash
# Database
SUPABASE_URL=https://ubobxftnenrinroamqju.supabase.co
SUPABASE_SERVICE_KEY=<your-current-service-key>
SUPABASE_STORAGE_BUCKET=cherished-motion-videos

# External APIs
OPENAI_API_KEY=<your-current-key>
KLING_API_KEY=<your-current-key>
KLING_SECRET_KEY=<your-current-secret>
KLING_API_URL=https://api-singapore.klingai.com/v1

# JWT (IMPORTANT: Generate new secret!)
JWT_SECRET_KEY=<run: python3 -c "import secrets; print(secrets.token_urlsafe(64))">
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Admin User
ADMIN_EMAIL=dhan6663@usc.edu
ADMIN_PASSWORD=<change-this-password>

# CORS
CUSTOMER_SITE_URL=https://motioncrafted.co
ADMIN_SITE_URL=<will-add-after-vercel-deployment>

# Stripe
STRIPE_SECRET_KEY=<your-current-stripe-key>
STRIPE_WEBHOOK_SECRET=<your-current-webhook-secret>
STRIPE_PRICE_PER_PHOTO=5.0

# Email
RESEND_API_KEY=<your-current-resend-key>

# App Settings (IMPORTANT!)
DEBUG=False
LOG_LEVEL=INFO
ENVIRONMENT=production
```

**Generate JWT Secret:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 1.4 Deploy

- Click "Deploy"
- Wait for build to complete
- Copy your Railway URL (e.g., `cherished-motion-production.up.railway.app`)

### 1.5 Verify

```bash
curl https://your-backend.railway.app/health
```

Should return: `{"status": "healthy", "database": "connected", "storage": "connected"}`

---

## Step 2: Deploy Admin Dashboard to Vercel

### 2.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository

### 2.2 Configure Project

**Root Directory:** `/admin-dashboard`
**Framework Preset:** Vite
**Build Command:** `npm run build` (auto-detected)
**Output Directory:** `dist` (auto-detected)

### 2.3 Add Environment Variable

**Settings → Environment Variables:**
```bash
VITE_API_URL=https://your-backend.railway.app/api/v1
```

### 2.4 Deploy

- Click "Deploy"
- Copy your Vercel URL (e.g., `admin-cherished-motion.vercel.app`)

### 2.5 Update Backend CORS

Go back to Railway → Variables:
- Update `ADMIN_SITE_URL` to your Vercel URL
- Click "Redeploy"

---

## Step 3: Update Customer Site (motioncrafted.co)

### 3.1 Update Environment Variables

In your Lovable/Vite deployment settings:

```bash
VITE_API_URL=https://your-backend.railway.app/api/v1
```

Keep existing Supabase variables as-is.

### 3.2 Redeploy

Trigger a redeploy of motioncrafted.co with the new environment variable.

---

## Step 4: Configure Stripe Webhook (If not already configured)

### 4.1 Add Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. **Endpoint URL:** `https://your-backend.railway.app/webhooks/stripe`
4. **Events to listen:** Select `checkout.session.completed`
5. Click "Add endpoint"

### 4.2 Update Webhook Secret

1. Copy the webhook signing secret from Stripe
2. Go to Railway → Variables
3. Update `STRIPE_WEBHOOK_SECRET` with the new value
4. Redeploy

---

## Verification Checklist

### Backend
- [ ] Health check returns "healthy": `curl https://your-backend.railway.app/health`
- [ ] API docs are disabled (404): `curl https://your-backend.railway.app/docs`
- [ ] CORS configured for motioncrafted.co and Vercel URL

### Admin Dashboard
- [ ] Can access at Vercel URL
- [ ] Can login with admin credentials
- [ ] Can view orders list
- [ ] Can review clips
- [ ] Can send delivery emails

### Customer Site
- [ ] Can access at motioncrafted.co
- [ ] Can upload photos
- [ ] Can complete Stripe checkout
- [ ] Order appears in admin dashboard

### Webhooks
- [ ] Stripe webhook endpoint configured
- [ ] Test payment triggers order processing
- [ ] Check Railway logs for webhook confirmation

---

## Production Settings Applied

The application automatically runs in production mode when `ENVIRONMENT=production`:

✅ API documentation disabled (`/docs` returns 404)
✅ CORS restricted to production domains only
✅ Auto-reload disabled
✅ Test endpoints disabled
✅ Proper error logging

---

## Monitoring

### Railway Logs
- Railway Dashboard → Your Project → Deployments → View Logs
- Monitor for errors

### Costs
- Railway: ~$5-20/month
- Vercel: Free tier
- Supabase: Free tier (monitor storage usage)

---

## Quick Reference

### Railway URL
```
Backend: https://your-backend.railway.app
Health: https://your-backend.railway.app/health
```

### Vercel URL
```
Admin: https://your-admin.vercel.app
```

### Customer Site
```
Customer: https://motioncrafted.co
```

### Important Commands

**Generate JWT Secret:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

**Test Backend Health:**
```bash
curl https://your-backend.railway.app/health
```

**View Railway Logs:**
```bash
# In Railway dashboard, or install Railway CLI:
railway logs
```

---

## Troubleshooting

### CORS Errors
- Verify `CUSTOMER_SITE_URL=https://motioncrafted.co` (no trailing slash)
- Verify `ADMIN_SITE_URL` matches your Vercel URL exactly
- Redeploy backend after changing

### "Endpoint not available in production"
- Test endpoint is disabled in production
- Use real orders with Stripe payment

### Database Errors
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Railway
- Verify Supabase project is active

### Email Not Sending
- Check `RESEND_API_KEY` is valid
- Verify sender domain in Resend dashboard
