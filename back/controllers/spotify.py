from services.spotify import get_spotify_auth_url, handle_code



def connect_spotify():
    url, _ = get_spotify_auth_url()
    return {"url": url}

def store_access_token(code):
    token = handle_code(code)
    