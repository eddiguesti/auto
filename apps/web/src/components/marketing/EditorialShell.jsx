import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../../styles/editorial.css'

export function MemoirWordmark() {
  return (
    <Link to="/" className="memoir-wordmark" aria-label="Easy Memoir home">
      Easy<span>Memoir</span>
      <span className="wordmark-dot" aria-hidden="true">
        .
      </span>
    </Link>
  )
}

export function EditorialNavigation() {
  const { user } = useAuth()
  return (
    <header className="memoir-masthead">
      <nav className="memoir-container memoir-navigation" aria-label="Main navigation">
        <MemoirWordmark />
        <div className="memoir-nav-links">
          <Link to="/how-it-works">How it works</Link>
          <Link to="/sample">Read a sample</Link>
          <Link to="/pricing">Pricing</Link>
        </div>
        <div className="memoir-nav-actions">
          <Link className="memoir-signin" to={user ? '/home' : '/login'}>
            {user ? 'Your story' : 'Sign in'}
          </Link>
          <Link className="memoir-button memoir-button-small" to={user ? '/home' : '/register'}>
            {user ? 'Continue my story' : 'Start my story'}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <details className="memoir-mobile-menu">
          <summary aria-label="Open navigation">
            Menu <span aria-hidden="true">＋</span>
          </summary>
          <div>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/sample">Read a sample</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to={user ? '/home' : '/login'}>{user ? 'Your story' : 'Sign in'}</Link>
          </div>
        </details>
      </nav>
    </header>
  )
}

export function EditorialFooter() {
  return (
    <footer className="memoir-footer memoir-container">
      <div>
        <MemoirWordmark />
        <p>A life, in chapters.</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link to="/about">Our story</Link>
        <Link to="/blog">Journal</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/faq">Help</Link>
      </nav>
      <div className="memoir-footer-bottom">
        <span>© {new Date().getFullYear()} Easy Memoir</span>
        <div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/cookies">Cookies</Link>
        </div>
      </div>
    </footer>
  )
}
