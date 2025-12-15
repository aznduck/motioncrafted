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
    return {
        "status": "healthy",
        "database": "connected",  # TODO: Add actual DB check
        "storage": "connected",   # TODO: Add actual storage check
    }

# Import and include routers (will be added as we build)
# from app.routes.customer import orders as customer_orders
# from app.routes.admin import auth as admin_auth
# from app.routes.admin import orders as admin_orders
# from app.routes.admin import clips as admin_clips

# app.include_router(customer_orders.router, prefix="/api/v1/customer", tags=["customer"])
# app.include_router(admin_auth.router, prefix="/api/v1/admin", tags=["admin-auth"])
# app.include_router(admin_orders.router, prefix="/api/v1/admin", tags=["admin-orders"])
# app.include_router(admin_clips.router, prefix="/api/v1/admin", tags=["admin-clips"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload during development
    )
