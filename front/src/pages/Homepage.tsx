import { lazy, Suspense, useEffect } from "react"
import type { Models } from "appwrite"
import type { Playlist } from "../App"

const ListeningScene = lazy(() => import("../components/ListeningScene"))

type HomepageProps = {
  user: Models.User<Models.Preferences> | null
  playlists: Playlist[]
  spotifyConnected: boolean
  playlistLoading: boolean
  connecting: boolean
  onSignIn: () => void
  onConnectSpotify: () => void
  onRefreshPlaylists: () => void
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
  spotifyConnected,
  playlistLoading,
  connecting,
  onSignIn,
  onConnectSpotify,
  onRefreshPlaylists,
  error,
}: HomepageProps) => {
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
  }, [playlists.length, spotifyConnected])

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
          <div className="scene-soundline" aria-hidden="true"><span>THE MOMENT BEFORE THE GUESS</span><span className="scene-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span><span>00:03</span></div>
        </div>
      </section>

      {user && (
        <section className="library-section" id="your-playlists" aria-labelledby="library-heading">
          <div className="section-heading" data-reveal="up">
            <div><span className="eyebrow">YOUR MUSIC, FRONT AND CENTER</span><h2 id="library-heading">Pick your soundtrack.</h2></div>
            {spotifyConnected && <button className="button button--quiet button--small" onClick={onRefreshPlaylists} disabled={playlistLoading}>{playlistLoading ? "Refreshing…" : "Refresh playlists ↻"}</button>}
          </div>
          {!spotifyConnected ? (
            <div className="connect-panel">
              <div className="connect-icon" aria-hidden="true"><span>♪</span></div>
              <div><h3>Bring your playlists into the game.</h3><p>Connect Spotify to choose the songs you and your friends will guess.</p></div>
              <button className="button button--dark" onClick={onConnectSpotify} disabled={connecting}>{connecting ? "Connecting…" : <>Connect Spotify <ArrowIcon /></>}</button>
            </div>
          ) : playlistLoading ? (
            <div className="playlist-loading" role="status"><span className="button-spinner" /> Finding your playlists…</div>
          ) : playlists.length ? (
            <div className="playlist-grid">
              {playlists.slice(0, 4).map((playlist, index) => (
              <article className="playlist-card" data-reveal="up" key={playlist.id}>
                  <PlaylistArtwork playlist={playlist} index={index} />
                  <div className="playlist-info"><h3>{playlist.name}</h3><p>{playlist.tracks?.total ?? "—"} tracks · {playlist.owner?.display_name ?? "Your library"}</p></div>
                  <button className="playlist-action" disabled aria-label={`Game room selection for ${playlist.name} is coming soon`} title="Playlist selection is coming with game rooms"><ArrowIcon /></button>
                </article>
              ))}
            </div>
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
