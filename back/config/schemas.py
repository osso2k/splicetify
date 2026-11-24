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

class GoogleSignIn(BaseModel):
    appwrite_token: str


class PinnedPlaylistItem(BaseModel):
    id: str
    name: str
    image_url: str | None = None
    track_count: int = 0
    owner_name: str | None = None


class PinnedPlaylistsRequest(BaseModel):
    items: list[PinnedPlaylistItem]
