import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SEO from '../SEO'
import { EditorialNavigation, EditorialFooter } from './EditorialShell'
import '../../styles/editorial-pages.css'

export default function EditorialPage({
  title,
  description,
  path,
  eyebrow,
  heading,
  introduction,
  children
}) {
  const { user } = useAuth()
  return (
    <div className="memoir-editorial">
      <SEO title={title} description={description} path={path} />
      <a href="#page-content" className="memoir-skip-link">
        Skip to content
      </a>
      <EditorialNavigation />
      <main id="page-content" className="memoir-container editorial-page">
        <header className="editorial-page-intro">
          <p className="memoir-eyebrow">{eyebrow}</p>
          <h1>{heading}</h1>
          <p>{introduction}</p>
        </header>
        {children}
        <section className="editorial-page-invitation">
          <div>
            <p className="memoir-eyebrow">WHEN YOU ARE READY</p>
            <h2>
              Begin with <em>one memory.</em>
            </h2>
            <p>You can find the rest along the way.</p>
          </div>
          <Link className="memoir-button" to={user ? '/home' : '/register'}>
            {user ? 'Return to your story' : 'Start my story'}
            <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>
      <EditorialFooter />
    </div>
  )
}
