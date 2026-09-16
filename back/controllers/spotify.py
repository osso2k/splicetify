from services.spotify import get_spotify_auth_url

def connect_spotify():
    url, _ = get_spotify_auth_url()
    return {"url": url}

