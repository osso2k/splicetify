import type { Models } from "appwrite"

type HeaderProps = {
  user: Models.User<Models.Preferences> | null
  loading: boolean
  onSignIn: () => void
  onSignOut: () => void
}

const Header = ({ user, loading, onSignIn, onSignOut }: HeaderProps) => (
  <header className="topbar" id="top">
    <a className="brand" href="#top" aria-label="Splicetify home">
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span>splicetify</span>
      <span className="brand-period" aria-hidden="true">.</span>
    </a>

    <nav className="main-nav" aria-label="Main navigation">
      <a href="#how-to-play">How to play</a>
    </nav>

    <div className="account-actions">
      {loading ? (
        <span className="session-loading" aria-label="Checking sign in status" />
      ) : user ? (
        <>
          <span className="user-greeting">Hey, {user.name?.split(" ")[0] || "music fan"}</span>
          <button className="button button--quiet button--small" onClick={onSignOut}>Sign out</button>
        </>
      ) : (
        <button className="button button--quiet button--small" onClick={onSignIn}>Sign in</button>
      )}
    </div>
  </header>
)

export default Header
