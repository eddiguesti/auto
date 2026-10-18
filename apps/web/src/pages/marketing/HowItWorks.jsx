import { Link } from 'react-router-dom'
import EditorialPage from '../../components/marketing/EditorialPage'

const steps = [
  {
    title: 'Start somewhere familiar.',
    label: 'REMEMBER',
    body: 'A childhood kitchen. A first job. Someone who changed your life. Choose a chapter and talk with Clio, your AI memoir companion, or type a memory at your own pace.',
    detail:
      'You can also start with a photograph or write a quick memory without following the chapter questions.'
  },
  {
    title: 'Find the words together.',
    label: 'SHAPE',
    body: 'Clio helps you explore the details and turn your memories into a draft. Read through your chapters, correct names and dates, and change the wording until it feels like you.',
    detail:
      'AI can make mistakes. Your review is an essential part of making the story accurate and personal.'
  },
  {
    title: 'Bring your chapters together.',
    label: 'KEEP',
    body: 'Return to your story, add the memories you want to include and explore the book and digital export options in your account.',
    detail:
      'The available plans and product options are listed on Pricing. You see your final order details before paying.'
  }
]

export default function HowItWorks() {
  return (
    <EditorialPage
      title="How your memories become a memoir"
      path="/how-it-works"
      description="Talk or type a memory, shape your draft and bring your chapters together. See how Easy Memoir helps you preserve your story."
      eyebrow="FROM MEMORY TO MANUSCRIPT"
      heading={
        <>
          Your life.
          <br />
          <em>A chapter at a time.</em>
        </>
      }
      introduction="You do not have to start at the beginning, remember everything or know how to write a book. One moment is enough to open the door."
    >
      <ol className="editorial-process-list">
        {steps.map((step, index) => (
          <li key={step.label}>
            <span className="editorial-chapter-number">0{index + 1}</span>
            <div>
              <p className="memoir-eyebrow">{step.label}</p>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
              <p className="editorial-step-detail">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <section className="editorial-reading-note">
        <p className="memoir-eyebrow">SEE THE POSSIBILITIES</p>
        <h2>
          A few pages can <em>say a lot.</em>
        </h2>
        <p>
          Read our fictional sample for an illustration of how a memoir might look. Your own
          memories, details and voice make yours unique.
        </p>
        <Link className="memoir-text-link" to="/sample">
          Read a sample <span aria-hidden="true">→</span>
        </Link>
        <Link className="memoir-text-link" to="/pricing">
          Explore plans <span aria-hidden="true">→</span>
        </Link>
      </section>
    </EditorialPage>
  )
}
