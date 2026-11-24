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
  owner?: { display_name: string } | null
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
  const [pinnedPlaylists, setPinnedPlaylists] = useState<Playlist[]>([])
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [playlistRefreshing, setPlaylistRefreshing] = useState(false)
  const [loadingMorePlaylists, setLoadingMorePlaylists] = useState(false)
  const [playlistOffset, setPlaylistOffset] = useState(0)
  const [playlistTotal, setPlaylistTotal] = useState(0)
  const [hasMorePlaylists, setHasMorePlaylists] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState("")

  const loadPlaylists = useCallback(async (refresh = false) => {
    if (refresh) setPlaylistRefreshing(true)
    else setPlaylistLoading(true)
    try {
      const [playlistResponse, pinnedResponse] = await Promise.all([
        api.get("/spotify/getplaylists", { params: { limit: 50, offset: 0 } }),
        api.get("/spotify/pinned-playlists"),
      ])
      const page = playlistResponse.data
      setPlaylists(page.items ?? [])
      setPlaylistOffset((page.offset ?? 0) + (page.items?.length ?? 0))
      setPlaylistTotal(page.total ?? 0)
      setHasMorePlaylists(Boolean(page.next))
      setPinnedPlaylists(pinnedResponse.data.items ?? [])
      setSpotifyConnected(true)
      setError("")
    } catch (requestError) {
      if (isAxiosError(requestError) && requestError.response?.status === 404) {
        setSpotifyConnected(false)
      } else {
        setError(getErrorMessage(requestError))
      }
    } finally {
      if (refresh) setPlaylistRefreshing(false)
      else setPlaylistLoading(false)
    }
  }, [])

  const loadMorePlaylists = useCallback(async () => {
    if (!hasMorePlaylists || loadingMorePlaylists) return
    setLoadingMorePlaylists(true)
    try {
      const response = await api.get("/spotify/getplaylists", {
        params: { limit: 50, offset: playlistOffset },
      })
      const page = response.data
      setPlaylists((current) => {
        const knownIds = new Set(current.map((playlist) => playlist.id))
        return [...current, ...(page.items ?? []).filter((playlist: Playlist) => !knownIds.has(playlist.id))]
      })
      setPlaylistOffset((page.offset ?? playlistOffset) + (page.items?.length ?? 0))
      setPlaylistTotal(page.total ?? playlistTotal)
      setHasMorePlaylists(Boolean(page.next))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoadingMorePlaylists(false)
    }
  }, [hasMorePlaylists, loadingMorePlaylists, playlistOffset, playlistTotal])

  const togglePinnedPlaylist = useCallback(async (playlist: Playlist) => {
    const alreadyPinned = pinnedPlaylists.some((item) => item.id === playlist.id)
    if (!alreadyPinned && pinnedPlaylists.length >= 4) {
      setError("You can pin four quick picks. Unpin one to make room.")
      return
    }

    const next = alreadyPinned
      ? pinnedPlaylists.filter((item) => item.id !== playlist.id)
      : [...pinnedPlaylists, playlist]
    try {
      const response = await api.put("/spotify/pinned-playlists", {
        items: next.map((item) => ({
          id: item.id,
          name: item.name,
          image_url: item.images?.[0]?.url ?? null,
          track_count: item.tracks?.total ?? 0,
          owner_name: item.owner?.display_name ?? null,
        })),
      })
      setPinnedPlaylists(response.data.items ?? [])
      setError("")
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }, [pinnedPlaylists])

  const refreshPlaylists = useCallback(() => {
    void loadPlaylists(true)
  }, [loadPlaylists])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const spotifyError = params.get("spotify_error")
    if (spotifyError) setError(spotifyError)
    if (spotifyError || params.has("spotify")) {
      params.delete("spotify_error")
      params.delete("spotify")
      const query = params.toString()
      const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
      window.history.replaceState({}, document.title, cleanUrl)
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
    setPinnedPlaylists([])
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
          pinnedPlaylists={pinnedPlaylists}
          spotifyConnected={spotifyConnected}
          playlistLoading={playlistLoading}
          playlistRefreshing={playlistRefreshing}
          loadingMorePlaylists={loadingMorePlaylists}
          hasMorePlaylists={hasMorePlaylists}
          playlistTotal={playlistTotal}
          connecting={connecting}
          onSignIn={signIn}
          onConnectSpotify={connectSpotify}
          onRefreshPlaylists={refreshPlaylists}
          onLoadMorePlaylists={loadMorePlaylists}
          onTogglePinnedPlaylist={togglePinnedPlaylist}
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
