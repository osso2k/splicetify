from services.spotify import get_spotify_auth_url
def connect_spotify():
    return {"url": get_spotify_auth_url()}