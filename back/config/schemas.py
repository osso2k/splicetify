from pydantic import BaseModel

class PlayerCreate(BaseModel):
    name: str
class IngestRequest(BaseModel):
    playlist_id: str
    owner: str
class SongPicker(BaseModel):
    song_name: str
    artist: str