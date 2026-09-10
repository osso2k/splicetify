from dotenv import load_dotenv
from urllib.parse import urlencode
import os
load_dotenv()
scopes = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-read-collaborative"
]
def get_spotify_auth_url():
    params = {
        "client_id": os.getenv("CLIENT_ID"),
        "response_type": "code",
        "redirect_uri": os.getenv("SPOTIFY_REDIRECT_URI"),
        "scope": " ".join(scopes)
    }
    return "https://accounts.spotify.com/authorize?" + urlencode(params) 