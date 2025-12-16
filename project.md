# Automated Photo Animation Service

## Project Overview

Automate the creation of animated photo videos for gift-giving. Customers submit orders via the existing Lovable site, backend processes with AI, Luke reviews clips in an admin dashboard, then downloads and manually delivers the final video.

### Current State
- ✅ Customer-facing site exists (this Lovable repo)
- ❌ Backend API (needs to be built)
- ❌ Admin dashboard (needs to be built)
- ❌ AI processing pipeline (needs to be built)

### Goal
Automate the video creation workflow while keeping Luke in control of quality through a review step.

---

## Video Vibes

The customer selects one of 4 video vibes that determines the animation style:

| Vibe Value | Display Name | Description |
|------------|--------------|-------------|
| `cinematic_emotional` | **Cinematic & Emotional** | A cinematic, film-like feel with emotional movement and a sense of story. |
| `warm_human` | **Warm & Human** | Natural, lifelike motion that feels personal, comforting, and real. |
| `joyful_alive` | **Joyful & Alive** | Brighter, more expressive energy that highlights happiness and celebration. |
| `quiet_timeless` | **Quiet & Timeless** | Almost still — calm, respectful, and timeless. |

*These vibes are used by OpenAI to generate animation prompts that match the desired mood and energy.*

---

## Workflow

```
1. Customer submits order
   ├─ Uploads 5+ photos
   ├─ Selects video vibe (Cinematic & Emotional / Warm & Human / Joyful & Alive / Quiet & Timeless)
   └─ Adds personalization message

2. Backend processes automatically
   ├─ OpenAI analyzes each photo (vibe-aware prompts)
   ├─ Kling AI generates 5-second animation clips
   └─ Saves clips for review

3. Luke reviews in admin dashboard
   ├─ Views each animated clip
   ├─ Approves good clips
   ├─ Rejects bad clips (optional: regenerate with new prompt)
   └─ All clips approved → finalize order

4. Backend stitches final video
   ├─ Concatenates approved clips with transitions
   ├─ Adds personalization message screen at end
   └─ Marks order complete

5. Luke delivers manually
   ├─ Downloads final video from dashboard
   └─ Emails/uploads to customer
```

---

## Architecture

### Monorepo Structure (This Repo)

```
/cherished-motion-lab
  /src                          ← Existing customer site (Lovable)
    /pages
      - Index.tsx               Landing page
      - Upload.tsx              Photo upload flow
      - Checkout.tsx            Order submission
    /components
      - ...

  /admin-dashboard              ← NEW: Admin frontend
    /src
      /pages
        - Login.tsx             Luke's login
        - Orders.tsx            Order list
        - OrderReview.tsx       Review clips for an order
      /components
        - ClipReviewer.tsx
        - VideoPlayer.tsx
    package.json
    vite.config.ts
    index.html

  /backend                      ← NEW: FastAPI backend
    /app
      /routes
        /customer
          - orders.py           POST /api/customer/orders
        /admin
          - auth.py             POST /api/admin/login
          - orders.py           GET /api/admin/orders
          - clips.py            POST /api/admin/clips/:id/approve
      /services
        - openai_service.py     Image analysis + prompt generation
        - kling_service.py      Animation generation
        - video_service.py      FFmpeg video stitching
        - storage_service.py    Supabase Storage integration
      /models
        - database.py           Supabase PostgreSQL models
      /core
        - config.py
        - security.py           JWT auth
    main.py
    requirements.txt

  package.json                  ← Root (customer site)
  project.md
  README.md
```

### Tech Stack

**Customer Site** (already exists)
- Vite + React + TypeScript
- Deployed on Lovable
- Uses existing domain

**Admin Dashboard** (to build)
- Vite + React + TypeScript
- Deploy to Vercel (free tier)
- Separate deployment from customer site

**Backend** (to build)
- FastAPI (Python)
- Deploy to Railway (~$5-20/month)
- Handles both customer + admin requests

**Database**
- Supabase PostgreSQL (existing project)
- Free tier should be sufficient initially

**File Storage**
- Supabase Storage OR Cloudflare R2
- Stores: uploaded photos, generated clips, final videos

**External APIs**
- OpenAI GPT-4 Vision (image analysis)
- Kling AI (animation generation)

---

## Database Schema

Using Supabase PostgreSQL:

```sql
-- Customer orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  vibe TEXT NOT NULL CHECK (vibe IN ('cinematic_emotional', 'warm_human', 'joyful_alive', 'quiet_timeless')),
  personalization_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending → processing → generating_clips → pending_review → approved → completed
  payment_status TEXT DEFAULT 'unpaid',  -- for future Stripe integration
  payment_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users (just Luke initially)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,           -- path in Supabase Storage
  upload_order INTEGER NOT NULL,        -- ordering (1, 2, 3...)
  analysis_result JSONB,                -- OpenAI analysis result
  animation_prompt TEXT,                -- Generated prompt for Kling
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated animation clips
CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,           -- path in Supabase Storage
  duration REAL DEFAULT 5.0,            -- seconds
  status TEXT DEFAULT 'generating',     -- generating → ready → approved → rejected
  review_status TEXT,                   -- approved | rejected | needs_regen
  admin_notes TEXT,                     -- Luke's notes if rejected
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Final stitched videos
CREATE TABLE final_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,           -- path in Supabase Storage
  duration REAL,                        -- total duration in seconds
  file_size_mb REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_photos_order ON photos(order_id);
CREATE INDEX idx_clips_photo ON clips(photo_id);
CREATE INDEX idx_clips_review ON clips(review_status);
```

---

## API Endpoints

### Customer Endpoints (Public)

**POST /api/v1/customer/orders**
- Submit new order with photos
- No authentication required
- Triggers background processing

```typescript
// Request (multipart/form-data)
{
  photos: File[],              // 5+ images
  customer_name: string,
  customer_email: string,
  vibe: 'cinematic_emotional' | 'warm_human' | 'joyful_alive' | 'quiet_timeless',
  personalization_message: string
}

// Response
{
  order_id: string,
  message: "Order received! We'll email you when ready."
}
```

### Admin Endpoints (Protected - JWT)

**POST /api/v1/admin/login**
```json
{
  "email": "luke@example.com",
  "password": "***"
}
// Returns: { "access_token": "eyJ...", "token_type": "bearer" }
```

**GET /api/v1/admin/orders?status=pending_review**
- List all orders, optionally filtered by status

**GET /api/v1/admin/orders/:id**
- Get order details + all clips for review

**POST /api/v1/admin/clips/:id/approve**
- Mark clip as approved
- If all clips approved → order status becomes "approved"

**POST /api/v1/admin/clips/:id/reject**
```json
{
  "notes": "Animation doesn't match photo",
  "regenerate": true,
  "new_prompt": "Optional custom prompt for regeneration"
}
```

**POST /api/v1/admin/orders/:id/finalize**
- Trigger final video stitching
- Only works if all clips approved

**GET /api/v1/admin/orders/:id/download**
- Download final video file
- Returns video/mp4 stream

**GET /api/v1/admin/clips/:id/stream**
- Stream individual clip for preview

---

## Processing Pipeline

### Step 1: Order Submission
```python
# Customer submits via Lovable site → hits backend

1. Validate photos (format, size, count >= 5)
2. Create order record in database
3. Upload photos to Supabase Storage
4. Create photo records with storage paths
5. Return order_id to customer
6. Trigger async processing (background job)
```

### Step 2: AI Analysis (OpenAI)
```python
# For each photo, vibe-aware analysis

1. Download photo from storage
2. Send to OpenAI GPT-4 Vision:
   - "Analyze this photo and describe what's happening"
   - Returns: subjects, setting, mood, suggested actions

3. Generate animation prompt based on vibe:
   - Vibe "cinematic_emotional" → A cinematic, film-like feel with emotional movement and story
   - Vibe "warm_human" → Natural, lifelike motion that feels personal, comforting, and real
   - Vibe "joyful_alive" → Brighter, expressive energy highlighting happiness and celebration
   - Vibe "quiet_timeless" → Almost still, calm, respectful, and timeless

4. Save analysis + prompt to photo record

Example prompts:
- Cinematic & Emotional: "Animate the family gathered around the table with cinematic, film-like movement emphasizing emotional connection and story"
- Warm & Human: "Animate grandmother smiling warmly with natural, lifelike motion that feels personal and comforting"
- Joyful & Alive: "Animate the kids jumping and laughing with bright, expressive energy highlighting pure joy and celebration"
- Quiet & Timeless: "Animate the couple holding hands with minimal, calm movement that feels respectful and timeless"
```

### Step 3: Animation Generation (Kling)
```python
# For each photo with generated prompt

1. Submit job to Kling API:
   - Image: photo URL
   - Prompt: animation_prompt
   - Duration: 5 seconds
   - Resolution: 1080p
   - FPS: 30

2. Poll Kling API for completion (every 5-10 seconds)
   - Typical generation time: 5-10 minutes per clip

3. When complete:
   - Download clip from Kling
   - Upload to Supabase Storage
   - Create clip record
   - Mark status: "ready"

4. When all clips ready:
   - Update order status: "pending_review"
   - TODO: Send notification to Luke (email/webhook)
```

### Step 4: Luke's Review (Manual)
```
Luke logs into admin dashboard:
1. Sees list of orders with status "pending_review"
2. Clicks order → sees grid of all clips
3. For each clip:
   - Views original photo
   - Plays generated animation
   - Reads the prompt that was used
   - Clicks "Approve" or "Reject"

If rejected:
   - Adds notes explaining why
   - Optionally checks "Regenerate with new prompt"
   - System regenerates clip in background
   - Luke reviews again when ready

When all clips approved:
   - "Finalize Order" button becomes enabled
   - Luke clicks to trigger stitching
```

### Step 5: Video Stitching (FFmpeg)
```python
# Triggered when Luke clicks "Finalize Order"

1. Fetch all approved clips in upload order
2. Download clips from storage to temp directory
3. Use FFmpeg to:
   a. Concatenate clips with 0.5s fade transitions
   b. Create 5-second black screen with personalization message
   c. Append message screen to end
   d. Output: final_video.mp4 (1080p, 30fps, H.264)

4. Upload final video to Supabase Storage
5. Create final_video record
6. Update order status: "completed"
7. TODO: Notify Luke that download is ready

FFmpeg command (simplified):
ffmpeg -i clip1.mp4 -i clip2.mp4 ... \
  -filter_complex "[0][1]xfade=transition=fade:duration=0.5" \
  -c:v libx264 -preset medium -crf 23 \
  output.mp4
```

### Step 6: Manual Delivery
```
Luke:
1. Downloads final video from admin dashboard
2. Manually emails to customer or uploads to Google Drive
3. Sends download link to customer
4. Marks order as delivered (optional status update)
```

---

## Environment Variables

### Backend (.env)
```bash
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx  # Service role key for backend

# Storage
SUPABASE_STORAGE_BUCKET=cherished-motion-videos

# External APIs
OPENAI_API_KEY=sk-...
KLING_API_KEY=xxx
KLING_API_URL=https://api.kling.ai/v1

# JWT Authentication
JWT_SECRET_KEY=your-secret-key-change-me
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440  # 24 hours

# Admin Seed User
ADMIN_EMAIL=luke@example.com
ADMIN_PASSWORD=change-me-on-first-login

# CORS
CUSTOMER_SITE_URL=https://yourdomain.com
ADMIN_SITE_URL=https://admin-yourdomain.vercel.app

# Future: Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Customer Site (.env)
```bash
VITE_API_URL=https://your-backend.railway.app/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # future
```

### Admin Dashboard (.env)
```bash
VITE_API_URL=https://your-backend.railway.app/api/v1
```

---

## Implementation Plan

### Phase 1: Setup & Database (Day 1) ✅ COMPLETED
- [x] Set up Supabase project (or verify existing)
- [x] Create database tables (run SQL schema)
- [x] Set up Supabase Storage bucket
- [x] Initialize backend structure (`/backend` folder)
- [x] Initialize admin dashboard structure (`/admin-dashboard` folder)
- [x] Install dependencies (Python + Node.js)
- [x] Create seed script for admin user

**Validation:**
- ✅ Can connect to Supabase from backend
- ✅ Can upload/download files from Supabase Storage (policies configured)
- ✅ Admin user exists in database
- ✅ Backend health check working at http://localhost:8000

---

### Phase 2: Backend Core (Days 2-3)

**Day 2: Storage & Auth** ✅ COMPLETED
- [x] Implement `storage_service.py`:
  - Upload photos to Supabase Storage
  - Upload clips to Supabase Storage
  - Generate signed URLs for downloads
- [x] Implement `security.py`:
  - Password hashing (bcrypt)
  - JWT token generation/validation
  - Admin authentication middleware
- [x] Create basic FastAPI app structure
- [x] Health check endpoint (tests DB + Storage connection)

**Day 3: Customer Order Intake** ✅ COMPLETED
- [x] POST `/api/v1/customer/orders` endpoint
- [x] Photo upload handling (multipart/form-data)
- [x] Order validation (vibe, photo count, etc.)
- [x] Database operations (create order + photos)
- [x] Basic error handling
- [x] Test script created (`test_order_submission.py`)

**Validation:**
- ✅ Can submit order via API
- ✅ Photos uploaded to Supabase Storage
- ✅ Order created in database
- ✅ Returns order_id

---

### Phase 3: AI Integration (Days 4-5) ✅ COMPLETED

**Day 4: OpenAI Service** ✅
- [x] Implement `openai_service.py`:
  - Image analysis with GPT-4 Vision
  - Vibe-based prompt generation
  - Prompt templates for each vibe
- [x] Test with sample images
- [x] Vibe-specific prompt templates created

**Day 5: Kling Service** ✅
- [x] Implement `kling_service.py`:
  - Submit animation job (image2video)
  - Poll for completion
  - Download generated clip
  - Handle errors/timeouts
- [x] Implement retry logic with exponential backoff
- [x] Test script created (`test_ai_services.py`)

**Validation:**
- ✅ OpenAI service configured with API key
- ✅ Kling service configured with access + secret keys
- ✅ Vibe-based prompts generate correctly
- ✅ Ready to integrate into processing pipeline

---

### Phase 4: Order Processing (Day 6)

- [ ] Create background job processor:
  - Process order: analyze → generate → save clips
  - Update order status at each step
  - Handle failures gracefully
- [ ] Implement order status tracking
- [ ] Error handling and logging
- [ ] Test full pipeline with real order

**Validation:**
- Submit order → automatically processes
- Order status updates correctly
- Clips appear in database when ready
- Failures don't break system

---

### Phase 5: Admin API (Day 7)

- [ ] POST `/api/v1/admin/login`
- [ ] GET `/api/v1/admin/orders` (with filtering)
- [ ] GET `/api/v1/admin/orders/:id` (order details + clips)
- [ ] POST `/api/v1/admin/clips/:id/approve`
- [ ] POST `/api/v1/admin/clips/:id/reject`
- [ ] GET `/api/v1/admin/clips/:id/stream` (video streaming)
- [ ] POST `/api/v1/admin/orders/:id/finalize`
- [ ] GET `/api/v1/admin/orders/:id/download`

**Validation:**
- Admin can log in and get JWT
- Can view all orders
- Can approve/reject clips
- Reject triggers regeneration if requested

---

### Phase 6: Video Processing (Day 8)

- [ ] Implement `video_service.py`:
  - Concatenate clips with FFmpeg
  - Add fade transitions
  - Create text overlay screen
  - Proper encoding settings (1080p, 30fps, H.264)
- [ ] Test with multiple clips
- [ ] Implement finalize endpoint logic
- [ ] Generate final video on demand

**Validation:**
- Can stitch 5+ clips smoothly
- Transitions look good
- Text message is readable
- Final video maintains quality

---

### Phase 7: Admin Dashboard Frontend (Days 9-10)

**Day 9: Auth + Order List**
- [ ] Create Vite + React project in `/admin-dashboard`
- [ ] Build login page
- [ ] JWT storage (localStorage)
- [ ] Protected route wrapper
- [ ] Build orders list page:
  - Fetch orders from API
  - Filter by status
  - Display order cards
  - Click to view details

**Day 10: Clip Review Interface**
- [ ] Build order review page:
  - Order details header
  - Grid of clips
  - Video player for each clip
  - Original photo preview
  - Approve/Reject buttons
  - Reject modal (notes + regenerate option)
- [ ] Implement finalize button
- [ ] Implement download button
- [ ] Add loading states and error handling

**Validation:**
- Luke can log in
- See list of pending orders
- Review each clip
- Approve/reject works
- Download final video

---

### Phase 8: Integration & Testing (Day 11)

- [ ] Connect customer site to backend API
- [ ] Update Upload.tsx to submit to new backend
- [ ] Test full end-to-end flow:
  - Customer submits order
  - Backend processes
  - Luke reviews in dashboard
  - Finalizes and downloads
- [ ] Fix bugs
- [ ] Add error messages
- [ ] Improve loading states

**Validation:**
- Complete order goes through entire pipeline
- No critical bugs
- Error messages are helpful

---

### Phase 9: Deployment (Days 12-13)

**Deploy Backend (Railway)**
- [ ] Create Railway project
- [ ] Connect GitHub repo
- [ ] Set root directory to `/backend`
- [ ] Add environment variables
- [ ] Deploy and test

**Deploy Admin Dashboard (Vercel)**
- [ ] Create Vercel project
- [ ] Connect GitHub repo
- [ ] Set root directory to `/admin-dashboard`
- [ ] Add environment variables
- [ ] Deploy and test

**Customer Site**
- [ ] Already deployed on Lovable
- [ ] Update environment variables to point to Railway backend
- [ ] Test production flow

**Validation:**
- All three apps are live
- Customer site can submit orders
- Backend processes orders
- Admin dashboard works
- Can complete full order in production

---

### Phase 10: Polish & Documentation (Day 14)

- [ ] Add loading spinners
- [ ] Better error messages
- [ ] Admin dashboard UX improvements
- [ ] Write README for each folder
- [ ] Document API endpoints
- [ ] Create admin user guide for Luke
- [ ] Set up basic monitoring (Railway logs)

---

## Deployment Architecture

```
Customer Site (Lovable)
  ├─ Domain: yourdomain.com
  └─ Deploys: Automatic on push to main

Admin Dashboard (Vercel)
  ├─ Domain: admin-yourdomain.vercel.app (or custom)
  └─ Deploys: Automatic from /admin-dashboard folder

Backend API (Railway)
  ├─ Domain: your-backend.railway.app (or custom)
  └─ Deploys: Automatic from /backend folder

Supabase (Cloud)
  ├─ PostgreSQL Database
  └─ Storage Bucket
```

**Deployment Steps:**

1. **Backend (Railway)**
   - Sign up at railway.app
   - "New Project" → "Deploy from GitHub repo"
   - Select this repo
   - Settings → Root Directory: `/backend`
   - Add environment variables
   - Deploy

2. **Admin Dashboard (Vercel)**
   - Sign up at vercel.com
   - "New Project" → Import from GitHub
   - Select this repo
   - Settings → Root Directory: `/admin-dashboard`
   - Framework Preset: Vite
   - Add environment variables
   - Deploy

3. **Customer Site**
   - Already deployed via Lovable
   - Just update env vars to point to Railway backend

---

## Cost Estimates

### Per Order (5 photos):
- OpenAI GPT-4 Vision: ~$0.05
- Kling AI animations: ~$0.50-2.50 (TBD - need exact pricing)
- Compute/bandwidth: ~$0.01
- Storage: ~$0.01 (500MB × $0.02/GB)
- **Total: ~$0.57-2.57 per order**

### Monthly Fixed Costs:
- Railway (Backend): $5-20/month
- Vercel (Admin): $0 (free tier)
- Lovable (Customer site): Existing plan
- Supabase: $0 (free tier up to 500MB database + 1GB storage)
- **Total: ~$5-20/month + per-order API costs**

### At 100 orders/month:
- Variable costs: $57-257
- Fixed costs: $5-20
- **Total: $62-277/month**
- **Per order: $0.62-2.77**

---

## Future Enhancements

### Phase 2 Features (Post-MVP):

**Stripe Payment Integration**
- Add Stripe checkout before order submission
- Customer pays before processing
- Webhooks to update payment_status
- Refund flow for failed orders

**Email Notifications**
- SendGrid integration
- Email Luke when order is ready for review
- Email customer when video is ready
- Include secure download link

**Customer Self-Service**
- Customer accounts (optional)
- Order status tracking
- Download portal with unique link
- Order history

**Video Enhancements**
- Custom fonts for message overlay
- Background music upload
- Multiple aspect ratios (square for Instagram)
- Variable clip durations (3s, 5s, 7s options)

**Admin Dashboard Improvements**
- Keyboard shortcuts (A=approve, R=reject)
- Batch approve all clips
- Side-by-side photo/clip comparison
- Analytics dashboard
- Customer email templates

### Scaling Considerations:

**When to add async processing:**
- Processing >5 concurrent orders
- Add job queue (Redis + Celery or BullMQ)

**When to upgrade database:**
- >10,000 orders or need advanced features
- Migrate to Supabase Pro plan or separate PostgreSQL

**When to add CDN:**
- Distributing videos globally
- Add Cloudflare in front of storage

---

## Open Questions / TODO

- [x] Kling API access confirmed
- [ ] Kling API exact pricing per 5-second clip
- [ ] Kling API documentation (endpoints, auth method, rate limits)
- [ ] Confirm Supabase project details
- [ ] Decide on storage: Supabase Storage vs Cloudflare R2
- [ ] FFmpeg installation on Railway (Docker container)
- [ ] Video quality testing (ensure Kling outputs are compatible)

---

## Timeline Summary

**Week 1: Backend Core**
- Days 1-3: Setup, database, auth, order intake
- Days 4-5: OpenAI + Kling integration
- Day 6: Order processing pipeline

**Week 2: Admin + Integration**
- Day 7: Admin API endpoints
- Day 8: Video stitching
- Days 9-10: Admin dashboard frontend

**Week 3: Polish + Deploy**
- Day 11: Integration testing
- Days 12-13: Deployment
- Day 14: Polish + documentation

**Total: ~3 weeks to production MVP**

**What's included:**
- ✅ Full order processing pipeline
- ✅ AI-powered animation with vibe-based prompts
- ✅ Admin review workflow
- ✅ Video stitching
- ✅ Manual delivery by Luke
- ✅ Deployed and documented

**What's NOT included (future):**
- Stripe payments
- Automated email delivery
- Customer tracking portal
- Advanced video features
