import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import type { Models } from "appwrite"
import type { Playlist } from "../App"

const ListeningScene = lazy(() => import("../components/ListeningScene"))

type HomepageProps = {
  user: Models.User<Models.Preferences> | null
  playlists: Playlist[]
  pinnedPlaylists: Playlist[]
  spotifyConnected: boolean
  playlistLoading: boolean
  playlistRefreshing: boolean
  loadingMorePlaylists: boolean
  hasMorePlaylists: boolean
  playlistTotal: number
  connecting: boolean
  onSignIn: () => void
  onConnectSpotify: () => void
  onRefreshPlaylists: () => void
  onLoadMorePlaylists: () => void
  onTogglePinnedPlaylist: (playlist: Playlist) => void
  error: string
}
const ArrowIcon = () => <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10h10m-4-4 4 4-4 4" /></svg>

function PlaylistArtwork({ playlist, index }: { playlist: Playlist; index: number }) {
  const image = playlist.images?.[0]?.url
  return (
    <div className={`playlist-art playlist-art--${index % 4}`}>
      {image ? <img src={image} alt="" loading="lazy" /> : <span className="art-note" aria-hidden="true">♪</span>}
      <span className="art-index">{String(index + 1).padStart(2, "0")}</span>
    </div>
  )
}

function ListeningSceneFallback() {
  return (
    <div className="listening-scene listening-scene--fallback" aria-hidden="true">
      <div className="figure-fallback"><span className="fallback-vinyl" /><span className="fallback-head" /><span className="fallback-body" /><span className="fallback-band" /></div>
    </div>
  )
}

const Homepage = ({
  user,
  playlists,
  pinnedPlaylists,
  spotifyConnected,
  playlistLoading,
  playlistRefreshing,
  loadingMorePlaylists,
  hasMorePlaylists,
  playlistTotal,
  connecting,
  onSignIn,
  onConnectSpotify,
  onRefreshPlaylists,
  onLoadMorePlaylists,
  onTogglePinnedPlaylist,
  error,
}: HomepageProps) => {
  const [date, setDate] = useState(() => new Date())
  const [playlistSearch, setPlaylistSearch] = useState("")
  const pinnedIds = useMemo(() => new Set(pinnedPlaylists.map((playlist) => playlist.id)), [pinnedPlaylists])
  const filteredPlaylists = useMemo(() => {
    const query = playlistSearch.trim().toLocaleLowerCase()
    if (!query) return playlists
    return playlists.filter((playlist) =>
      `${playlist.name} ${playlist.owner?.display_name ?? ""}`.toLocaleLowerCase().includes(query),
    )
  }, [playlists, playlistSearch])

  useEffect(() => {
    let intervalId: number | undefined
    const delayToNextMinute = 60_000 - (Date.now() % 60_000)
    const timeoutId = window.setTimeout(() => {
      setDate(new Date())
      intervalId = window.setInterval(() => setDate(new Date()), 60_000)
    }, delayToNextMinute)

    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId !== undefined) window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>("[data-reveal]")
    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"))
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible")
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: "0px 0px -32px 0px" })

    targets.forEach((target) => {
      if (!target.classList.contains("is-visible")) observer.observe(target)
    })
    return () => observer.disconnect()
  }, [playlists.length, pinnedPlaylists.length, spotifyConnected])

  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy" data-reveal="up">
          <div className="eyebrow"><span className="eyebrow-dot" /> THE MUSIC GAME FOR YOUR PEOPLE</div>
          <h1 id="hero-heading">You know the song.<br /><em>Prove it.</em></h1>
          <p className="hero-description">
            Pick a playlist, press play, and race your friends to name that track. The group chat could never.
          </p>
          <div className="hero-actions">
            {!user ? (
              <button className="button button--primary" onClick={onSignIn}>
                Get started <ArrowIcon />
              </button>
            ) : spotifyConnected ? (
              <a className="button button--primary" href="#your-playlists">
                Choose a playlist <ArrowIcon />
              </a>
            ) : (
              <button className="button button--primary" onClick={onConnectSpotify} disabled={connecting}>
                {connecting ? <><span className="button-spinner" /> Connecting…</> : <>Connect Spotify <ArrowIcon /></>}
              </button>
            )}
            <a className="button button--text" href="#how-to-play">See the 3 steps <span aria-hidden="true">↓</span></a>
          </div>
          {error && (
            <div className="notice" role="status">
              <span className="notice-icon" aria-hidden="true">!</span>
              <span>{error}</span>
              {user && !spotifyConnected && <button onClick={onConnectSpotify}>Try again</button>}
            </div>
          )}
          <div className="social-proof" aria-label="Made for your next hangout">
            <div className="avatar-stack" aria-hidden="true"><span>J</span><span>M</span><span>A</span><span>+</span></div>
            <span>Made for <strong>one more round</strong></span>
          </div>
        </div>

        <div className="hero-art" data-reveal="up" role="img" aria-label="A stylized music fan listening to a record">
          <Suspense fallback={<ListeningSceneFallback />}><ListeningScene /></Suspense>
          <div className="scene-kicker" aria-hidden="true"><span>SP / 001</span><span className="scene-kicker-dot" /></div>
          <div className="scene-title" aria-hidden="true">LISTEN<br /><em>CLOSE.</em></div>
          <div className="scene-soundline" aria-hidden="true"><span>THE MOMENT BEFORE THE GUESS</span><span className="scene-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span><span className="text-xl">{String(date.getHours()).padStart(2, "0")}:{String(date.getMinutes()).padStart(2, "0")}</span></div>
        </div>
      </section>

      {user && (
        <section className="library-section" id="your-playlists" aria-labelledby="library-heading">
          <div className="section-heading" data-reveal="up">
            <div><span className="eyebrow">YOUR MUSIC, FRONT AND CENTER</span><h2 id="library-heading">Pick your soundtrack.</h2></div>
            {spotifyConnected && <button className="button button--quiet button--small" onClick={onRefreshPlaylists} disabled={playlistRefreshing || playlistLoading}>{playlistRefreshing ? "Refreshing…" : "Refresh playlists ↻"}</button>}
          </div>
          {!spotifyConnected ? (
            <div className="connect-panel">
              <div className="connect-icon" aria-hidden="true"><span>♪</span></div>
              <div><h3>Bring your playlists into the game.</h3><p>Connect Spotify to choose the songs you and your friends will guess.</p></div>
              <button className="button button--dark" onClick={onConnectSpotify} disabled={connecting}>{connecting ? "Connecting…" : <>Connect Spotify <ArrowIcon /></>}</button>
            </div>
          ) : playlistLoading ? (
            <div className="playlist-loading" role="status"><span className="button-spinner" /> Finding your playlists…</div>
          ) : playlists.length || pinnedPlaylists.length ? (
            <>
              <div className="quick-picks-heading">
                <div><h3>Your quick picks</h3><p>Pin up to four playlists for your next game.</p></div>
                <span>{pinnedPlaylists.length}/4 PINNED</span>
              </div>
              {pinnedPlaylists.length ? (
                <div className="playlist-grid">
                  {pinnedPlaylists.map((playlist, index) => (
                    <article className="playlist-card" data-reveal="up" key={playlist.id}>
                      <PlaylistArtwork playlist={playlist} index={index} />
                      <div className="playlist-info"><h3>{playlist.name}</h3><p>{playlist.tracks?.total ?? "—"} tracks · {playlist.owner?.display_name ?? "Your library"}</p></div>
                      <button className="playlist-pin is-pinned" onClick={() => onTogglePinnedPlaylist(playlist)} aria-label={`Unpin ${playlist.name}`} title="Remove from quick picks">★</button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="quick-picks-empty"><span aria-hidden="true">✳</span><p>Choose playlists from your library below to make them quick picks.</p></div>
              )}

              <details className="all-playlists">
                <summary><span>All playlists</span><span className="all-playlists-count">{playlists.length} loaded{playlistTotal > playlists.length ? ` · ${playlistTotal} total` : ""}</span><span className="all-playlists-chevron" aria-hidden="true">⌄</span></summary>
                <div className="all-playlists-panel">
                  <label className="playlist-search"><span className="sr-only">Search your playlists</span><span aria-hidden="true">⌕</span><input value={playlistSearch} onChange={(event) => setPlaylistSearch(event.target.value)} placeholder="Search your playlists" type="search" /></label>
                  {filteredPlaylists.length ? (
                    <ul className="playlist-list">
                      {filteredPlaylists.map((playlist) => (
                        <li key={playlist.id}>
                          <span className="playlist-list-art">{playlist.images?.[0]?.url ? <img src={playlist.images[0].url} alt="" loading="lazy" /> : "♫"}</span>
                          <span className="playlist-list-copy"><strong>{playlist.name}</strong><small>{playlist.tracks?.total ?? "—"} tracks · {playlist.owner?.display_name ?? "Your library"}</small></span>
                          <button className={`playlist-pin ${pinnedIds.has(playlist.id) ? "is-pinned" : ""}`} onClick={() => onTogglePinnedPlaylist(playlist)} disabled={!pinnedIds.has(playlist.id) && pinnedPlaylists.length >= 4} aria-label={pinnedIds.has(playlist.id) ? `Unpin ${playlist.name}` : `Pin ${playlist.name}`} title={pinnedIds.has(playlist.id) ? "Remove from quick picks" : "Add to quick picks"}>{pinnedIds.has(playlist.id) ? "★" : "☆"}</button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="playlist-no-results">{playlistSearch ? "No match in the playlists loaded so far." : "No playlists found."}</p>}
                  {hasMorePlaylists && <button className="button button--quiet button--small playlist-load-more" onClick={onLoadMorePlaylists} disabled={loadingMorePlaylists}>{loadingMorePlaylists ? "Loading…" : `Load more playlists (${playlists.length} of ${playlistTotal})`}</button>}
                  {playlistSearch && hasMorePlaylists && <p className="playlist-search-note">Search the loaded playlists. Load more to include the rest.</p>}
                </div>
              </details>
            </>
          ) : (
            <div className="empty-playlists"><span aria-hidden="true">♫</span><div><h3>No playlists found yet</h3><p>Create a playlist in Spotify, then refresh this list.</p></div><button className="button button--quiet button--small" onClick={onRefreshPlaylists}>Try again</button></div>
          )}
          {spotifyConnected && <p className="library-footnote"><span className="spotify-dot" /> Spotify connected <span>·</span> Playlist picks will power your game when rooms launch.</p>}
        </section>
      )}

      <section className="journey-strip" id="how-to-play" aria-labelledby="journey-heading">
        <div className="journey-heading" data-reveal="up">
          <div><span className="eyebrow">THE GAME IN THREE STEPS</span><h2 id="journey-heading">That’s the <em>whole game.</em></h2></div>
          <span className="journey-status"><span /> ROOMS ARE ON THE WAY</span>
        </div>
        <ol className="journey-steps">
          <li className="journey-step" data-reveal="up"><span className="journey-icon journey-icon--spotify" aria-hidden="true">↗</span><div><span className="journey-number">01</span><h3>Connect Spotify</h3><p>Bring your playlists.</p></div></li>
          <li className="journey-step" data-reveal="up"><span className="journey-icon journey-icon--playlist" aria-hidden="true">♫</span><div><span className="journey-number">02</span><h3>Choose a playlist</h3><p>Pick the soundtrack.</p></div></li>
          <li className="journey-step" data-reveal="up"><span className="journey-icon journey-icon--guess" aria-hidden="true">✳</span><div><span className="journey-number">03</span><h3>Guess the song</h3><p>Call it before they do.</p></div></li>
        </ol>
      </section>
    </>
  )
}

export default Homepage
