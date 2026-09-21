from pydantic import BaseModel


class SignupRequest(BaseModel):
    username: str
    email: str
    password: str
class LoginRequest(BaseModel):
    email: str
    password: str
class IngestRequest(BaseModel):
    playlist_id: str
    owner: str
class SongPicker(BaseModel):
    song_name: str
    artist: str