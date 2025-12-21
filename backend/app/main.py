from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import close_mongo_connection, connect_to_mongo
from app.routes import auth, itinerary, assistant
import os
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to DB
    await connect_to_mongo()
    yield
    # Shutdown: Close DB
    await close_mongo_connection()


app = FastAPI(title="LazyTravelogue API", version="1.0.0", lifespan=lifespan)

# CORS (Allow Frontend)
origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
