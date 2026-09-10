from dotenv import load_dotenv
import os
load_dotenv()

params = {
    "client_id": os.getenv("CLIENT_ID"),
    "response_type": "code",
    "redirect_uri": "http://127.0.0.1:8000" 
}
def get_spotify_auth_url():
    return 