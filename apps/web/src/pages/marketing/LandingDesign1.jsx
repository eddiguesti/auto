import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SEO from '../../components/SEO'
import '../../styles/editorial.css'

const steps = [
  {
    title: 'Remember',
    description:
      'Start with a place, a person, a moment. Talk to Clio or write at your own pace. Thoughtful questions help you find a way in.'
  },
  {
    title: 'Shape',
    description:
      'See your memories become a draft. Read it, change it, add the details only you know. You have the final word.'
  },
  {
    title: 'Keep',
    description:
      'Bring your chapters together, add photographs and preview your memoir. Make something your family can come back to.'
  }
]

const questions = [
  [
    'Do I have to be a writer?',
    'No. You can talk with Clio, your AI memoir companion, or type your memories. Start with an ordinary moment and let the questions guide you.'
  ],
  [
    'Can I change what Clio writes?',
    'Yes. The draft is a starting point. You can review and edit your chapters so the details and the voice feel right to you.'
  ],
  [
    'Do I need to tell my whole life story?',
    'You choose what to include. Start with the memories you want to keep, skip questions that do not suit you and return to other chapters when you are ready.'
  ],
  [
    'How do I share my memoir?',
    'You can preview your book and explore the download and printing options in your account. Visit Pricing for the available plans and what each includes.'
  ]
]

function Wordmark() {
  return (
    <Link to="/" className="memoir-wordmark" aria-label="Easy Memoir home">
      Easy<span>Memoir</span>
      <span className="wordmark-dot" aria-hidden="true">
        .
      </span>
    </Link>
  )
}

function Manuscript() {
  return (
    <figure className="manuscript-figure">
      <figcaption className="manuscript-caption">
        <span>A life, in chapters</span>
        <span>Illustrative sample</span>
      </figcaption>
      <div className="manuscript-sheet">
        <div className="manuscript-running">
          <span>THE THINGS WE KEEP</span>
          <span>CHAPTER I</span>
        </div>
        <div className="manuscript-chapter" aria-hidden="true">
          01
        </div>
        <h2>
          The house
          <br />
          with the blue door.
        </h2>
        <div className="manuscript-prose">
          <p>
            I remember the sound of the gate before anything else. Its familiar creak meant someone
            was coming home, and Mum would look up from whatever she was doing.
          </p>
          <p>
            The house was small, but to me it held the whole world. On Sunday afternoons, the
            kitchen filled with stories, the kettle was always on, and there was always room for one
            more.
          </p>
        </div>
        <div className="manuscript-footer">
          <span>EARLY DAYS</span>
          <span>1</span>
        </div>
      </div>
      <div className="sample-prompt">
        <span className="memoir-eyebrow">A QUESTION TO BEGIN WITH</span>
        <p>“What did home feel like when you were young?”</p>
      </div>
    </figure>
  )
}

export default function LandingDesign1() {
  const { user } = useAuth()
  const startPath = user ? '/home' : '/register'
  return (
    <div className="memoir-editorial">
      <SEO
        title="Your life, in your words"
        description="Talk or write about the moments that made you. Clio, your AI memoir companion, helps turn your memories into a story you can edit and share."
        path="/"
      />
      <a href="#main-content" className="memoir-skip-link">
        Skip to content
      </a>
      <header className="memoir-masthead">
        <nav className="memoir-container memoir-navigation" aria-label="Main navigation">
          <Wordmark />
          <div className="memoir-nav-links">
            <a href="#how-it-works">How it works</a>
            <Link to="/sample">Read a sample</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div className="memoir-nav-actions">
            <Link className="memoir-signin" to={user ? '/home' : '/login'}>
              {user ? 'Your story' : 'Sign in'}
            </Link>
            <Link className="memoir-button memoir-button-small" to={startPath}>
              {user ? 'Continue my story' : 'Start my story'}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <details className="memoir-mobile-menu">
            <summary aria-label="Open navigation">
              Menu <span aria-hidden="true">＋</span>
            </summary>
            <div>
              <a href="#how-it-works">How it works</a>
              <Link to="/sample">Read a sample</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to={user ? '/home' : '/login'}>{user ? 'Your story' : 'Sign in'}</Link>
            </div>
          </details>
        </nav>
      </header>
      <main id="main-content">
        <section className="memoir-container memoir-hero">
          <div className="memoir-hero-copy">
            <p className="memoir-eyebrow">
              <span className="eyebrow-rule" /> YOUR LIFE, IN YOUR WORDS
            </p>
            <h1 className="hero-headline">
              A lifetime
              <br />
              of stories.
              <br />
              <em>
                A place to
                <br className="desktop-break" /> keep them.
              </em>
            </h1>
            <p className="memoir-lead hero-description">
              Talk or write about the moments that made you. Clio, your AI memoir companion, helps
              turn your memories into a story you can edit and share.
            </p>
            <div className="memoir-action-row">
              <Link className="memoir-button" to={startPath}>
                {user ? 'Continue my story' : 'Start my story'}
                <span aria-hidden="true">↗</span>
              </Link>
              <Link className="memoir-text-link" to="/sample">
                Read a sample <span aria-hidden="true">→</span>
              </Link>
            </div>
            <p className="memoir-hero-note">One memory is a lovely place to begin.</p>
          </div>
          <Manuscript />
        </section>
        <section id="how-it-works" className="memoir-section memoir-process how-it-works">
          <div className="memoir-container">
            <div className="memoir-section-heading">
              <p className="memoir-eyebrow">FROM A MEMORY TO A MEMOIR</p>
              <h2>
                You bring the stories.
                <br />
                <em>We help you find the words.</em>
              </h2>
              <p>
                You do not need a plan, a perfect memory or a polished first sentence. Just
                somewhere to start.
              </p>
            </div>
            <ol className="memoir-steps">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="memoir-step-number">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="memoir-container memoir-section memoir-example">
          <div className="memoir-example-intro">
            <p className="memoir-eyebrow">THE ORDINARY BECOMES EXTRAORDINARY</p>
            <h2>
              The little things
              <br />
              <em>are the big things.</em>
            </h2>
            <p>
              A familiar smell. A favourite saying. The person who always opened the door. Those
              details make a story yours.
            </p>
            <Link className="memoir-text-link" to="/sample">
              Spend a moment with a sample <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="memoir-example-pages">
            <p className="memoir-example-label">Illustrative example · from a memory to a draft</p>
            <div className="memoir-memory">
              <span className="memoir-eyebrow">YOUR MEMORY</span>
              <blockquote>
                “Dad used to take me to the allotment. I mostly remember the tomatoes, and his old
                green flask.”
              </blockquote>
            </div>
            <div className="memoir-draft">
              <span className="memoir-eyebrow">A POSSIBLE FIRST DRAFT</span>
              <p>
                Saturday mornings belonged to the allotment. Dad would pack his old green flask and
                we would set off together. I remember the tomatoes most of all, their smell filling
                the warm air.
              </p>
              <span className="memoir-draft-note">
                Ready for you to review, edit and make your own.
              </span>
            </div>
          </div>
        </section>
        <section className="memoir-section memoir-path-section">
          <div className="memoir-container">
            <p className="memoir-eyebrow">EVERY STORY HAS A STARTING POINT</p>
            <div className="memoir-paths">
              <Link to={startPath}>
                <span className="memoir-path-index">FOR YOU</span>
                <h2>
                  Tell your
                  <br />
                  <em>own story.</em>
                </h2>
                <p>Gather the moments you want to keep, in your own time and in your own words.</p>
                <span className="memoir-path-link">
                  Begin my memoir <span aria-hidden="true">↗</span>
                </span>
              </Link>
              <Link to="/gift">
                <span className="memoir-path-index">FOR SOMEONE YOU LOVE</span>
                <h2>
                  Give their stories
                  <br />
                  <em>a place to live.</em>
                </h2>
                <p>
                  Help a parent, grandparent or someone special preserve the life behind the
                  memories.
                </p>
                <span className="memoir-path-link">
                  Explore a memoir gift <span aria-hidden="true">↗</span>
                </span>
              </Link>
            </div>
          </div>
        </section>
        <section className="memoir-container memoir-pricing-invitation">
          <div>
            <p className="memoir-eyebrow">A PLAN FOR YOUR STORY</p>
            <h2>Start small. See where it takes you.</h2>
            <p>Explore the plans, what is included and the options for your finished memoir.</p>
          </div>
          <Link className="memoir-button memoir-button-outline" to="/pricing">
            View pricing <span aria-hidden="true">→</span>
          </Link>
        </section>
        <section className="memoir-container memoir-section memoir-faq">
          <div>
            <p className="memoir-eyebrow">A FEW THINGS YOU MAY BE WONDERING</p>
            <h2>
              Before you
              <br />
              <em>turn the page.</em>
            </h2>
            <Link className="memoir-text-link" to="/faq">
              More questions and answers <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="memoir-faq-list">
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">＋</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="memoir-closing">
          <div className="memoir-container">
            <p className="memoir-eyebrow">YOUR NEXT CHAPTER</p>
            <h2>
              There is a story
              <br />
              <em>only you can tell.</em>
            </h2>
            <Link className="memoir-button" to={startPath}>
              {user ? 'Continue my story' : 'Start my story'}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </main>
      <footer className="memoir-footer memoir-container">
        <div>
          <Wordmark />
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
    </div>
  )
}
