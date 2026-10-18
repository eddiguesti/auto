import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SEO, { breadcrumbSchema } from '../../components/SEO'
import { EditorialNavigation, EditorialFooter } from '../../components/marketing/EditorialShell'
import { sampleMemoirPages } from '../../data/sampleMemoir'
import '../../styles/sample-reader.css'

export default function SampleMemoir() {
  const [currentPage, setCurrentPage] = useState(0)
  const headingRef = useRef(null)
  const firstRender = useRef(true)
  const page = sampleMemoirPages[currentPage]
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus({ preventScroll: true })
  }, [currentPage])

  return (
    <div className="memoir-editorial">
      <SEO
        title="Read a sample memoir"
        description="Explore a fictional, illustrative memoir to see how memories can become readable chapters. Your own memoir stays yours to review and edit."
        path="/sample"
        jsonLd={[breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Sample Memoir' }])]}
      />
      <a href="#sample-content" className="memoir-skip-link">
        Skip to the sample
      </a>
      <EditorialNavigation />
      <main id="sample-content" className="memoir-container sample-main">
        <header className="sample-introduction">
          <p className="memoir-eyebrow">A MOMENT BETWEEN THE PAGES</p>
          <h1>
            A life, <em>remembered.</em>
          </h1>
          <p>
            Explore a few pages from <em>A Life Well Lived</em>. This fictional sample shows how your
            memories could become a memoir.
          </p>
        </header>
        <div className="sample-reader-layout">
          <aside className="sample-contents">
            <p className="memoir-eyebrow">IN THIS SAMPLE</p>
            <ol>
              {sampleMemoirPages.map((item, index) => (
                <li key={index}>
                  <button
                    aria-current={index === currentPage ? 'page' : undefined}
                    onClick={() => setCurrentPage(index)}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {item.type === 'cover'
                      ? 'The cover'
                      : item.type === 'dedication'
                        ? 'A dedication'
                        : item.content.title ||
                          (item.type === 'photos' ? 'Photo memories' : 'The story continues')}
                  </button>
                </li>
              ))}
            </ol>
          </aside>
          <div className="sample-reader">
            <article
              className={`sample-page ${page.type === 'cover' ? 'sample-cover' : ''}`}
              aria-label={`Sample page ${currentPage + 1}`}
            >
              <div className="sample-running">
                <span>ILLUSTRATIVE FICTIONAL SAMPLE</span>
                <span>{currentPage + 1}</span>
              </div>
              <h2 ref={headingRef} tabIndex={-1}>
                {page.type === 'cover'
                  ? page.content.title
                  : page.type === 'dedication'
                    ? 'For my grandchildren'
                    : page.content.title || 'The story continues'}
              </h2>
              {page.content.chapter && (
                <p className="sample-chapter-label">{page.content.chapter}</p>
              )}
              {page.type === 'cover' ? (
                <div className="sample-cover-details">
                  <p>{page.content.subtitle}</p>
                  <p>{page.content.year}</p>
                  <span>A fictional memoir</span>
                </div>
              ) : page.content.text ? (
                <div className="sample-prose">
                  {page.content.text.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <div className="sample-photo-list">
                  <p>
                    Photographs can sit alongside your memories. These are example captions, with no
                    customer photographs shown.
                  </p>
                  {page.content.photos?.map(photo => (
                    <div key={photo.caption}>
                      <span aria-hidden="true">＋</span>
                      <p>{photo.caption}</p>
                    </div>
                  ))}
                </div>
              )}
              {page.content.quote && (
                <blockquote className="sample-pullquote">{page.content.quote}</blockquote>
              )}
              {page.content.image && (
                <p className="sample-image-note">
                  Example photograph caption: {page.content.image}
                </p>
              )}
              <div className="sample-folio">
                <span>A LIFE WELL LIVED</span>
                <span>{currentPage + 1}</span>
              </div>
            </article>
            <nav className="sample-pagination" aria-label="Sample page navigation">
              <button
                onClick={() => setCurrentPage(value => value - 1)}
                disabled={currentPage === 0}
              >
                <span aria-hidden="true">←</span> Previous page
              </button>
              <span aria-live="polite">
                {currentPage + 1} of {sampleMemoirPages.length}
              </span>
              <button
                onClick={() => setCurrentPage(value => value + 1)}
                disabled={currentPage === sampleMemoirPages.length - 1}
              >
                Next page <span aria-hidden="true">→</span>
              </button>
            </nav>
          </div>
        </div>
        <section className="sample-next">
          <div>
            <p className="memoir-eyebrow">YOUR WORDS. YOUR WAY.</p>
            <h2>
              What would your <em>first chapter say?</em>
            </h2>
            <p>Start with a memory. Review each draft and make it sound like you.</p>
          </div>
          <div className="memoir-action-row">
            <Link className="memoir-button" to="/register">
              Start my story <span aria-hidden="true">↗</span>
            </Link>
            <Link className="memoir-text-link" to="/pricing">
              Explore the plans <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <EditorialFooter />
    </div>
  )
}
