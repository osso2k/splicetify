import { useCallback, useEffect, useState } from "react"
import { OAuthProvider, type Models } from "appwrite"
import { isAxiosError } from "axios"
import api from "../api"
import { account } from "./utils/appwrite"
import Header from "./components/Header"
import Homepage from "./pages/Homepage"

export type Playlist = {
  id: string
  name: string
  tracks?: { total: number }
  images?: { url: string }[]
  owner?: { display_name: string }
}

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === "string") return detail
    if (error.response?.status === 404) return "Connect Spotify to load your playlists."
    if (error.response?.status === 401) return "Your session expired. Sign in again to continue."
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again."
}

const App = () => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState("")

  const loadPlaylists = useCallback(async () => {
    setPlaylistLoading(true)
    setError("")
    try {
      const response = await api.get("/spotify/getplaylists")
      setPlaylists(response.data.items ?? [])
      setSpotifyConnected(true)
    } catch (requestError) {
      setSpotifyConnected(false)
      if (!(isAxiosError(requestError) && requestError.response?.status === 404)) {
        setError(getErrorMessage(requestError))
      }
    } finally {
      setPlaylistLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      try {
        const currentUser = await account.get()
        const appwriteJwt = (await account.createJWT()).jwt
        const response = await api.post("/auth/googlesignin", { appwrite_token: appwriteJwt })
        localStorage.setItem("token", response.data.access_token)
        localStorage.setItem("userId", currentUser.$id)
        if (active) setUser(currentUser)
      } catch {
        localStorage.removeItem("token")
        if (active) setUser(null)
      } finally {
        if (active) setAuthLoading(false)
      }
    }
    void restoreSession()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (user) void loadPlaylists()
  }, [user, loadPlaylists])

  const signIn = async () => {
    setError("")
    try {
      await account.createOAuth2Session(
        OAuthProvider.Google,
        window.location.origin,
        `${window.location.origin}/?auth=failed`,
      )
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  const signOut = async () => {
    try {
      await account.deleteSession("current")
    } catch {
      // Clear the local app session even if Appwrite has already expired it.
    }
    localStorage.removeItem("token")
    localStorage.removeItem("userId")
    setUser(null)
    setPlaylists([])
    setSpotifyConnected(false)
    setError("")
  }

  const connectSpotify = async () => {
    setConnecting(true)
    setError("")
    try {
      const response = await api.get("/spotify/connect")
      window.location.assign(response.data.url)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      setConnecting(false)
    }
  }

  return (
    <div className="app-shell">
      <Header
        user={user}
        loading={authLoading}
        onSignIn={signIn}
        onSignOut={signOut}
      />
      <main>
        <Homepage
          user={user}
          playlists={playlists}
          spotifyConnected={spotifyConnected}
          playlistLoading={playlistLoading}
          connecting={connecting}
          onSignIn={signIn}
          onConnectSpotify={connectSpotify}
          onRefreshPlaylists={loadPlaylists}
          error={error}
        />
      </main>
      <footer className="site-footer">
        <a className="brand brand--footer" href="#top" aria-label="Splicetify home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>splicetify</span>
        </a>
        <span>Good music. Better guesses.</span>
        <a href="#how-to-play">How it works <span aria-hidden="true">↗</span></a>
      </footer>
    </div>
  )
}

export default App
