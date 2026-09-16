from pydantic import BaseModel, EmailStr

class PlayerCreate(BaseModel):
    name: str
class IngestRequest(BaseModel):
    playlist_id: str
    owner: str
class SongPicker(BaseModel):
    song_name: str
    artist: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
class LoginRequest(BaseModel):
    email: str
    password: str