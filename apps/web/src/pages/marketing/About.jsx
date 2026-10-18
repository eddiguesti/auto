import { Link } from 'react-router-dom'
import EditorialPage from '../../components/marketing/EditorialPage'

export default function About() {
  return (
    <EditorialPage
      title="A place for your life story"
      path="/about"
      description="Easy Memoir helps people capture their memories, shape their own chapters and preserve the stories they choose to share."
      eyebrow="WHY EASY MEMOIR"
      heading={
        <>
          Every life holds
          <br />
          <em>something worth keeping.</em>
        </>
      }
      introduction="The stories we tell at the kitchen table often matter most. Easy Memoir gives those memories somewhere to live beyond the conversation."
    >
      <section className="editorial-about-statement">
        <span className="editorial-chapter-number" aria-hidden="true">
          01
        </span>
        <div>
          <h2>
            Ordinary moments.
            <br />
            <em>Extraordinary meaning.</em>
          </h2>
          <p>
            You do not need a remarkable career or a life full of adventures to have a story worth
            telling. The people you loved, the places you called home and the things you learned are
            part of a life no one else has lived.
          </p>
          <p>
            Easy Memoir is a place to gather those memories, one at a time, and make something you
            can read, edit and share.
          </p>
        </div>
      </section>
      <section className="editorial-principles">
        <article>
          <p className="memoir-eyebrow">YOUR PACE</p>
          <h2>Room to remember.</h2>
          <p>
            Start with a chapter, a photograph or a passing thought. Talk or type, take a break and
            return when you are ready.
          </p>
        </article>
        <article>
          <p className="memoir-eyebrow">YOUR WORDS</p>
          <h2>Help with the blank page.</h2>
          <p>
            Clio is an AI memoir companion that asks questions and helps shape a draft. You review
            the details and have the final say over the words.
          </p>
        </article>
        <article>
          <p className="memoir-eyebrow">YOUR STORY</p>
          <h2>Something to come back to.</h2>
          <p>
            Bring your chapters together and explore the digital and book options for the memories
            you want to keep.
          </p>
        </article>
      </section>
      <section className="editorial-reading-note">
        <p className="memoir-eyebrow">THE NEXT PAGE</p>
        <h2>
          See how <em>it comes together.</em>
        </h2>
        <p>Learn about the process or spend a moment with our fictional sample memoir.</p>
        <Link className="memoir-text-link" to="/how-it-works">
          How it works <span aria-hidden="true">→</span>
        </Link>
        <Link className="memoir-text-link" to="/sample">
          Read a sample <span aria-hidden="true">→</span>
        </Link>
      </section>
    </EditorialPage>
  )
}
