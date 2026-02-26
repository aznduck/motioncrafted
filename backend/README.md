# Cherished Motion Lab - Backend API

FastAPI backend for automated photo animation service.

## Setup

### 1. Install Python Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your actual values:

```bash
cp .env.example .env
```

Update the following in `.env`:
- `OPENAI_API_KEY` - Your OpenAI API key
- `KLING_API_KEY` - Your Kling AI API key
- `JWT_SECRET_KEY` - Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

### 4. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `../supabase/schema.sql`
4. Run the query to create all tables
5. Copy and paste the contents of `../supabase/seed_admin.sql`
6. Run the query to create the admin user

### 5. Set Up Supabase Storage

1. Go to your Supabase project → Storage
2. Create a new bucket named: `cherished-motion-videos`
3. Set it to **Private** (not public)
4. Enable RLS (Row Level Security)

## Running the Server

### Development Mode (with auto-reload)

```bash
python main.py
```

Or:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Project Structure

```
backend/
├── app/
│   ├── core/           # Core functionality
│   │   ├── config.py   # Settings and environment variables
│   │   ├── database.py # Supabase database connection
│   │   └── security.py # JWT auth and password hashing
│   ├── models/         # Database models (to be added)
│   ├── routes/         # API route handlers
│   │   ├── customer/   # Customer-facing endpoints
│   │   └── admin/      # Admin dashboard endpoints
│   ├── services/       # Business logic
│   │   ├── openai_service.py
│   │   ├── kling_service.py
│   │   ├── video_service.py
│   │   └── storage_service.py
│   └── utils/          # Utility functions
├── main.py             # FastAPI application entry point
├── requirements.txt    # Python dependencies
└── .env                # Environment variables (not in git)
```

