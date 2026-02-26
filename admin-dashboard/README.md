# Cherished Motion Lab - Admin Dashboard

Admin dashboard for Luke to review clips, approve/reject animations, and download final videos.

## Setup

### 1. Install Dependencies

```bash
cd admin-dashboard
npm install
```

### 2. Configure Environment

Update `.env` if needed:

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

For production, this will point to your Railway backend URL.

### 3. Run Development Server

```bash
npm run dev
```

The dashboard will be available at: http://localhost:3001

## Features

- **Login** - Luke's admin authentication
- **Orders List** - View all orders filtered by status
- **Order Review** - Review individual clips for each order
- **Clip Approval** - Approve/reject clips with notes
- **Regeneration** - Request clip regeneration with new prompts
- **Final Video Download** - Download completed videos

## Build for Production

```bash
npm run build
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to Vercel → New Project
3. Import your GitHub repo
4. Set Root Directory: `admin-dashboard`
5. Add environment variable: `VITE_API_URL` = your Railway backend URL
6. Deploy

## Project Structure

```
admin-dashboard/
├── src/
│   ├── pages/          # Page components
│   │   ├── Login.tsx
│   │   ├── Orders.tsx
│   │   └── OrderReview.tsx
│   ├── components/     # Reusable components
│   ├── lib/            # Utilities and API client
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

