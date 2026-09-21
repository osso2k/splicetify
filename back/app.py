from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.database import Base, engine
from sqlalchemy import text
from contextlib import asynccontextmanager
from routes.spotify import auth_router, app_router
from dotenv import load_dotenv
import os

load_dotenv()

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        print("--------------DB CONNECTED---------------")
    except Exception as e:
        print("Error in connecting DB...")
    
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins = [os.getenv("FRONTEND_URL")],
    allow_credentials = True,
    allow_methods =["*"],
    allow_headers = ["*"]
    )

app.include_router(auth_router)
app.include_router(app_router)

@app.get("/")
def Home():
    return "YOOOO WAZZAAAAP KDOT"