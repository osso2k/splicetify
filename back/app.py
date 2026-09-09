from fastapi import FastAPI
from config.database import Base, engine
from sqlalchemy import text
from contextlib import asynccontextmanager

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

@app.get("/")
def Home():
    return "YOOOO WAZZAAAAP KDOT"


def get_song_url(song_name, song_artist):
    pass