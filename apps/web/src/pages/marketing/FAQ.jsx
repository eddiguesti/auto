import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconBook2,
  IconMicrophone,
  IconBooks,
  IconLock,
  IconGift,
  IconChevronDown,
  IconHelpCircle,
  IconMail,
  IconPhone,
  IconRocket,
  IconCoin
} from '@tabler/icons-react'
import SEO, { faqSchema, breadcrumbSchema } from '../../components/SEO'
import { Button, Card } from '../../components/ui'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)
  const [activeCategory, setActiveCategory] = useState('general')

  const categories = [
    { id: 'general', name: 'General', icon: IconBook2 },
    { id: 'recording', name: 'Recording', icon: IconMicrophone },
    { id: 'printing', name: 'Printing', icon: IconBooks },
    { id: 'privacy', name: 'Privacy', icon: IconLock },
    { id: 'gifting', name: 'Gifting', icon: IconGift }
  ]

  const faqs = {
    general: [
      {
        question: 'What is Easy Memoir?',
        answer:
          "Easy Memoir is an AI-powered platform that helps you or your loved ones capture life stories through simple voice conversations. Our AI assistant, Clio, asks thoughtful questions, listens to your answers, and transforms your spoken memories into beautifully written prose. No writing skills needed—just talk, and we'll do the rest."
      },
      {
        question: 'Who is Easy Memoir for?',
        answer:
          "Easy Memoir is designed for anyone who wants to preserve their life story or help a loved one preserve theirs. It's particularly popular with seniors who want to share their memories with future generations, and with adult children looking to capture their parents' or grandparents' stories before it's too late."
      },
      {
        question: 'Do I need any technical skills?',
        answer:
          'Not at all! Easy Memoir is designed to be as simple as having a conversation. If you can talk on the phone, you can use Easy Memoir. Our interface is clean, text is large and readable, and our AI guide walks you through every step. Many of our users are in their 70s, 80s, and beyond.'
      },
      {
        question: 'How long does it take to complete a memoir?',
        answer:
          "There's no rush! Most people take 2-6 months, recording 1-2 sessions per week. Each session is about 15-30 minutes—just like chatting with a friend. You can go at your own pace, and your progress is always saved."
      },
      {
        question: 'Can I edit the AI-written text?',
        answer:
          'Absolutely. While our AI does an excellent job of capturing your voice and style, you have full control to edit, add details, or refine anything. Think of the AI as a first draft that you can polish to perfection.'
      }
    ],
    recording: [
      {
        question: 'How does voice recording work?',
        answer:
          "Simply click the record button and start talking. Our AI, Clio, will prompt you with thoughtful questions about different aspects of your life. Speak naturally—there's no need to be formal. When you're done, Clio transforms your spoken words into written prose while preserving your unique voice and personality."
      },
      {
        question: 'What if I make a mistake while recording?',
        answer:
          "Don't worry! You can pause, restart, or re-record any section. There's no pressure to be perfect. Many of our best stories come from natural, unscripted conversation. You can also edit the written version after Clio processes it."
      },
      {
        question: 'How long should each recording session be?',
        answer:
          "We recommend 15-30 minute sessions for the best experience. This gives you enough time to really dive into a memory without getting tired. Of course, you can go shorter or longer—it's entirely up to you."
      },
      {
        question: 'Can I record on my phone or tablet?',
        answer:
          'Yes! Easy Memoir works beautifully on any device with a microphone—smartphone, tablet, laptop, or desktop computer. Simply open our website in your browser and start recording. No app download required.'
      },
      {
        question: "What if I'm not sure what to talk about?",
        answer:
          "That's where Clio shines! Our AI offers 40+ thoughtfully crafted prompts across 7 life chapters: Childhood, Education, Career, Love & Family, Adventures, Wisdom, and Legacy. Each prompt is designed to unlock meaningful memories."
      }
    ],
    printing: [
      {
        question: 'What book options are available?',
        answer:
          'Our complete memoir package is £299 (50% off £599) and includes 4 beautiful colour royal hardcover books in cloth, a professional audiobook, and talk over the phone features. You can also pay over 4 months at £100/month. All books use archival-quality paper that will last generations.'
      },
      {
        question: 'How long does printing and delivery take?',
        answer:
          "Standard delivery takes 10-14 business days from when you approve your final proof. We also offer express delivery (5-7 days) for an additional fee. You'll receive tracking information once your book ships."
      },
      {
        question: 'Can I preview the book before printing?',
        answer:
          "Absolutely! Before any printing, you'll receive a complete digital proof of your book. Review every page, make any final changes, and only approve printing when you're completely satisfied. We want your book to be perfect."
      },
      {
        question: 'Can I order multiple copies?',
        answer:
          'Yes! Many families order copies for siblings, children, and grandchildren. We offer volume discounts: 10% off for 3+ copies, 15% off for 5+ copies, and 20% off for 10+ copies.'
      },
      {
        question: 'Can I include photos in my book?',
        answer:
          "Yes! You can upload photos to accompany your stories. They'll be professionally integrated into your book layout. We recommend high-resolution images for the best print quality, but our team can help optimize what you have."
      }
    ],
    privacy: [
      {
        question: 'Who can see my stories?',
        answer:
          "Your stories are completely private by default. Only you can access them unless you choose to share. When you're ready, you can invite family members to view your memoir, or keep it private until your book is printed."
      },
      {
        question: 'Is my data secure?',
        answer:
          'Absolutely. We use bank-level encryption (256-bit SSL) for all data transmission and storage. Your recordings and stories are stored on secure servers in the UK, compliant with GDPR. We never sell your data or use it for advertising.'
      },
      {
        question: 'What happens to my data if I cancel?',
        answer:
          "You can download all your content at any time. If you cancel your subscription, we'll keep your data for 90 days in case you change your mind. After that, we can permanently delete everything at your request. Your stories are always yours."
      },
      {
        question: 'Do you use my stories to train AI?',
        answer:
          'No. Your personal stories and recordings are never used to train our AI or any third-party AI systems. Your memories are sacred and remain entirely private. The AI processes your recordings only to create your written memoir.'
      },
      {
        question: 'Can I delete my account and all data?',
        answer:
          "Yes, at any time. Simply contact us or use the account settings to request complete deletion. We'll remove all your personal information, recordings, and written content from our servers within 30 days."
      }
    ],
    gifting: [
      {
        question: 'How do gift vouchers work?',
        answer:
          "Purchase a gift package and we'll generate a beautiful digital voucher that you can personalise with a message. Send it instantly via email, or print it at home to give in person. The recipient activates their gift using a unique code."
      },
      {
        question: 'Do gift vouchers expire?',
        answer:
          "No! Our gift vouchers never expire. Your recipient can activate and start their memoir whenever they're ready—no pressure. We understand that timing matters when preserving memories."
      },
      {
        question: 'Can I help my parent use their gift?',
        answer:
          "Absolutely! Many gifts are given with the intention of recording together. You can sit with your parent during their recording sessions, help them navigate the platform, or even ask them questions to prompt their memories. It's a wonderful way to connect."
      },
      {
        question: 'What if they need help getting started?',
        answer:
          'We offer dedicated support for gift recipients. They can schedule a free onboarding call where one of our team members walks them through everything. We also have simple video tutorials and a friendly help chat on every page.'
      },
      {
        question: 'Can I buy a gift that includes a printed book?',
        answer:
          'Yes! Our complete memoir package (£299, 50% off) includes 4 beautiful colour royal hardcover books in cloth, a professional audiobook, and talk over the phone features. You can pay over 4 months at £100/month too. The recipient completes their memoir, approves the design, and we print and ship the books directly to them—or to you, if you want it as a surprise.'
      }
    ]
  }

  const allFaqs = Object.values(faqs).flat()

  const toggleFAQ = index => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-parchment page-enter">
      <SEO
        title="Frequently Asked Questions — Easy Memoir Help Centre"
        description="Find answers to common questions about Easy Memoir. Learn about voice recording, AI memoir writing, book printing, privacy, gift vouchers, and more. Everything you need to get started."
        path="/faq"
        jsonLd={[
          breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'FAQ' }]),
          faqSchema(allFaqs.map(f => ({ question: f.question, answer: f.answer })))
        ]}
      />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-parchment/90 backdrop-blur-sm border-b border-sepia-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-ink">
            Easy Memoir
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/pricing" className="text-sm text-sepia-600 hover:text-ink transition-colors">
              Pricing
            </Link>
            <Link to="/gift" className="text-sm text-sepia-600 hover:text-ink transition-colors">
              Gift
            </Link>
            <Button to="/register" size="sm">
              Start Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="eyebrow mb-4">Help Centre</p>

          <h1 className="font-display text-4xl sm:text-5xl text-ink mb-6">
            Frequently asked questions
          </h1>

          <p className="text-lg text-sepia-600 max-w-2xl mx-auto">
            Everything you need to know about preserving your life story with Easy Memoir.
          </p>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="px-6 mb-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map(cat => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id)
                    setOpenIndex(null)
                  }}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeCategory === cat.id
                      ? 'bg-ink text-white shadow-button'
                      : 'bg-surface text-sepia-600 border border-sepia-200 hover:border-sepia-300 hover:text-ink'
                  }`}
                >
                  <Icon size={18} stroke={1.75} />
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="pb-16 sm:pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Card padding="none" className="divide-y divide-sepia-100">
            {faqs[activeCategory].map((faq, index) => (
              <div key={index}>
                <button
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={openIndex === index}
                  className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-5 text-left"
                >
                  <h3 className="font-medium text-ink text-base">{faq.question}</h3>
                  <IconChevronDown
                    size={20}
                    stroke={1.75}
                    className={`text-sepia-400 flex-shrink-0 transition-transform duration-300 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openIndex === index ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="px-5 sm:px-6 pb-6 text-sepia-600">{faq.answer}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </section>

      {/* Still have questions */}
      <section className="py-16 sm:py-20 px-6 bg-cream">
        <div className="max-w-3xl mx-auto text-center">
          <Card padding="lg" className="rounded-3xl">
            <div className="w-16 h-16 bg-bronze-100 text-bronze-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <IconHelpCircle size={32} stroke={1.5} />
            </div>

            <h2 className="font-display text-3xl text-ink mb-4">Still have questions?</h2>
            <p className="text-lg text-sepia-600 mb-8">
              We're here to help. Reach out and we'll get back to you within 24 hours.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                href="mailto:hello@easymemoir.co.uk"
                size="lg"
                icon={<IconMail size={20} stroke={1.75} />}
              >
                Email Us
              </Button>
              <Button
                href="tel:+441onal"
                variant="secondary"
                size="lg"
                icon={<IconPhone size={20} stroke={1.75} />}
              >
                Call Us
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h3 className="font-display text-2xl text-ink text-center mb-10">Helpful resources</h3>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: 'Getting Started Guide',
                desc: 'Step-by-step walkthrough for new users',
                link: '/how-it-works',
                icon: IconRocket
              },
              {
                title: 'Pricing & Plans',
                desc: 'Find the perfect plan for your needs',
                link: '/pricing',
                icon: IconCoin
              },
              {
                title: 'Gift a Memoir',
                desc: 'Give the gift of preserved memories',
                link: '/gift',
                icon: IconGift
              }
            ].map((resource, i) => {
              const Icon = resource.icon
              return (
                <Card key={i} interactive to={resource.link} className="stagger-item">
                  <div className="w-11 h-11 bg-sepia-100 text-sepia-600 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={24} stroke={1.5} />
                  </div>
                  <h4 className="font-display text-lg text-ink mb-2">{resource.title}</h4>
                  <p className="text-sm text-sepia-600">{resource.desc}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
