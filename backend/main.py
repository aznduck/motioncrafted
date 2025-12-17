"""
Cherished Motion Lab - Backend API
FastAPI application for automated photo animation service
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# Create FastAPI app
app = FastAPI(
    title="Cherished Motion Lab API",
    description="Backend API for automated photo animation service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.CUSTOMER_SITE_URL,
        settings.ADMIN_SITE_URL,
        "http://localhost:3000",  # Local development
        "http://localhost:3001",  # Local admin
        "http://localhost:8080",  # Customer site (Vite)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Cherished Motion Lab API",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    from app.core.database import get_db

    health_status = {
        "status": "healthy",
        "database": "unknown",
        "storage": "unknown",
    }

    # Test database connection
    try:
        db = get_db()
        # Try a simple query
        result = db.table("admin_users").select("count", count="exact").execute()
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"

    # Test storage connection
    try:
        db = get_db()
        # Try to list buckets
        buckets = db.storage.list_buckets()
        health_status["storage"] = "connected"
    except Exception as e:
        health_status["storage"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"

    return health_status

# Import and include routers
from app.routes.customer import orders as customer_orders
from app.routes.admin import auth as admin_auth
from app.routes.admin import orders as admin_orders
from app.routes.admin import clips as admin_clips
from app.routes import webhooks

app.include_router(customer_orders.router, prefix="/api/v1/customer", tags=["customer"])
app.include_router(admin_auth.router, prefix="/api/v1/admin", tags=["admin-auth"])
app.include_router(admin_orders.router, prefix="/api/v1/admin", tags=["admin-orders"])
app.include_router(admin_clips.router, prefix="/api/v1/admin", tags=["admin-clips"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload during development
    )
