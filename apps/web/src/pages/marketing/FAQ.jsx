import { Link } from 'react-router-dom'
import EditorialPage from '../../components/marketing/EditorialPage'

const groups = [
  {
    title: 'Getting started',
    questions: [
      [
        'Do I need to be a writer?',
        'No. You can talk with Clio or type your memories. The chapter questions give you a starting point, and you can review and edit the draft in your own words.'
      ],
      [
        'Where should I begin?',
        'Choose a memory that feels familiar: a person, a place or a small moment. You can move between chapters, write a quick memory or use a photograph to help you remember.'
      ],
      [
        'Can I help someone else tell their story?',
        <>
          You can explore the <Link to="/gift">memoir gift options</Link> with someone you love. Let
          the storyteller choose which experiences to share and review the resulting words with
          them.
        </>
      ]
    ]
  },
  {
    title: 'Your words and memories',
    questions: [
      [
        'Can I use both voice and typing?',
        'Yes. Voice conversations and typed chapter answers are available in your account. Choose the way that suits you for each memory. Voice capture requires access to your microphone.'
      ],
      [
        'What if my microphone does not work?',
        'Check that your browser has microphone permission and that your device has a working microphone. You can return to your dashboard and choose Write instead to keep going with typed answers.'
      ],
      [
        'Can I change the AI draft?',
        'Yes. Read and edit your chapters, correct details and change the wording. AI can get things wrong, so check names, dates and events before you share or order your memoir.'
      ],
      [
        'Do I have to answer every question?',
        'You decide what belongs in your memoir. Start with the memories you want to keep, leave out anything you do not want to share and return to another chapter when you are ready.'
      ],
      [
        'What about privacy and deleting my account?',
        <>
          Your account settings include account controls. Read our{' '}
          <Link to="/privacy">Privacy Policy</Link> for details about the information we process and
          your rights, and our <Link to="/cookies">Cookie Policy</Link> for cookie choices.
        </>
      ]
    ]
  },
  {
    title: 'Plans and your finished memoir',
    questions: [
      [
        'What does Easy Memoir cost?',
        <>
          Visit <Link to="/pricing">Pricing</Link> for the current product catalogue, prices and
          purchase availability. The catalogue is shared with checkout, and your final order details
          appear before payment.
        </>
      ],
      [
        'Can I download or order my memoir?',
        'Your account includes digital export and book options. The available products, formats and prices are shown in the product catalogue and in your order flow. Check the details for the option you choose.'
      ],
      [
        'Where can I read about cancellation or refunds?',
        <>
          See our <Link to="/cancellation">Cancellation Policy</Link> and{' '}
          <Link to="/refund-policy">Refund Policy</Link> before ordering. Our{' '}
          <Link to="/terms">Terms</Link> explain the conditions that apply to the service.
        </>
      ]
    ]
  }
]

export default function FAQ() {
  return (
    <EditorialPage
      title="Questions about your memoir"
      path="/faq"
      description="Answers about starting your memoir, talking or typing, reviewing your draft and exploring plans and book options."
      eyebrow="A LITTLE HELP TO BEGIN"
      heading={
        <>
          Good questions.
          <br />
          <em>Thoughtful answers.</em>
        </>
      }
      introduction="A few things you may be wondering about capturing, shaping and keeping your story."
    >
      <div className="editorial-faq-groups">
        {groups.map(group => (
          <section key={group.title}>
            <h2>{group.title}</h2>
            <div className="memoir-faq-list">
              {group.questions.map(([question, answer]) => (
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
        ))}
      </div>
    </EditorialPage>
  )
}
