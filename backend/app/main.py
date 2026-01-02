from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import close_mongo_connection, connect_to_mongo
from app.routes import auth, itinerary, assistant
from app.scheduler import start_scheduler, shutdown_scheduler
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import setup_exception_handlers

# Initialize logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    start_scheduler()
    yield
    shutdown_scheduler()
    await close_mongo_connection()

app = FastAPI(title="LazyTravelogue API", version="1.0.0", lifespan=lifespan)

# Setup global exception handlers
setup_exception_handlers(app)

origins = settings.ALLOWED_ORIGINS.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://lazy-travelogue.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, tags=["Authentication"])
app.include_router(itinerary.router, tags=["Itineraries"], prefix="/api")
app.include_router(assistant.router, tags=["AI Assistant"], prefix="/api")


@app.get("/")
async def root():
    return {"message": "LazyTravelogue API is running"}
