import { Link } from 'react-router-dom'
import EditorialPage from '../../components/marketing/EditorialPage'

export default function Gift() {
  return (
    <EditorialPage
      title="Help someone you love preserve their story"
      path="/gift"
      description="Invite someone you love to capture their memories. Explore a sample memoir and the available plans together."
      eyebrow="FOR SOMEONE YOU LOVE"
      heading={
        <>
          The gift of
          <br />
          <em>being remembered.</em>
        </>
      }
      introduction="A parent's childhood. A grandparent's first love. The stories behind the people you know best. An invitation to tell them can be a lovely place to begin."
    >
      <section className="editorial-about-statement">
        <span className="editorial-chapter-number" aria-hidden="true">
          01
        </span>
        <div>
          <h2>
            Start with a question.
            <br />
            <em>Make time for the answer.</em>
          </h2>
          <p>
            Ask which stories they would like to keep. Show them a sample, talk about how they
            prefer to remember and let them choose what they want to share.
          </p>
          <p>
            Clio can help them talk through a memory or shape a typed answer. You can sit together,
            help with the details and enjoy the stories as they unfold.
          </p>
        </div>
      </section>
      <section className="editorial-principles">
        <article>
          <p className="memoir-eyebrow">THE INVITATION</p>
          <h2>“Tell me about…”</h2>
          <p>
            A childhood home, a favourite photograph, the day you met. Bring something familiar and
            begin there.
          </p>
        </article>
        <article>
          <p className="memoir-eyebrow">THE CONVERSATION</p>
          <h2>Their pace. Their words.</h2>
          <p>
            Give the storyteller space to choose the memories they want to include. Read and review
            drafts together, with their permission.
          </p>
        </article>
        <article>
          <p className="memoir-eyebrow">THE NEXT CHAPTER</p>
          <h2>Explore it together.</h2>
          <p>
            Look through the available plans and book options. Choose what suits their story and
            review the order details before any payment.
          </p>
        </article>
      </section>
      <section className="editorial-reading-note">
        <p className="memoir-eyebrow">A STORY YOU CAN SHARE</p>
        <h2>
          Imagine their life <em>on the page.</em>
        </h2>
        <p>
          Our fictional sample offers a glimpse of what a memoir can look like. Pricing lists the
          current products and available purchase options.
        </p>
        <Link className="memoir-text-link" to="/sample">
          Read a sample together <span aria-hidden="true">→</span>
        </Link>
        <Link className="memoir-text-link" to="/pricing">
          Explore the options <span aria-hidden="true">→</span>
        </Link>
      </section>
    </EditorialPage>
  )
}
