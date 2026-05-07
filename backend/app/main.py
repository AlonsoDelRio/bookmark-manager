import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import metadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Bookmark Manager API")
    yield
    logger.info("Shutting down Bookmark Manager API")

app = FastAPI(title="Bookmark Manager API", version="0.1.0",lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metadata.router, prefix="/api/metadata", tags=["metadata"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "bookmark-manager-api"}
