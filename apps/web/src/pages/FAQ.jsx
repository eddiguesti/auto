import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)
  const [activeCategory, setActiveCategory] = useState('general')

  const categories = [
    { id: 'general', name: 'General', icon: '📖' },
    { id: 'recording', name: 'Recording', icon: '🎙️' },
    { id: 'printing', name: 'Printing', icon: '📚' },
    { id: 'privacy', name: 'Privacy', icon: '🔒' },
    { id: 'gifting', name: 'Gifting', icon: '🎁' }
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
          'We offer three beautiful options: Softcover (perfect-bound paperback, £29), Hardcover (cloth-bound with dust jacket, £49), and Premium (leather-look binding with gold foil stamping, £79). All use archival-quality paper that will last generations.'
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
          'Yes! Our Legacy (£299) and Deluxe Family (£499) packages include printed books. The recipient completes their memoir, approves the design, and we print and ship the books directly to them—or to you, if you want it as a surprise.'
      }
    ]
  }

  const toggleFAQ = index => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-heritage-cream">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-heritage-cream/95 backdrop-blur-sm border-b border-heritage-sepia-light/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-heritage-ink">
            Easy Memoir
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/pricing"
              className="font-sans text-sm text-heritage-text hover:text-heritage-ink transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/gift"
              className="font-sans text-sm text-heritage-text hover:text-heritage-ink transition-colors"
            >
              Gift
            </Link>
            <Link
              to="/register"
              className="font-sans bg-heritage-cta text-white px-5 py-2 rounded-full text-sm hover:bg-heritage-cta-hover transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-heritage-sepia-light/30 border border-heritage-sepia-light/50 mb-6 animate-fade-in">
            <span className="text-lg">❓</span>
            <p className="font-sans uppercase tracking-[0.3em] text-xs text-heritage-sepia">
              Help Centre
            </p>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl text-heritage-ink mb-6 animate-slide-up">
            Frequently asked questions
          </h1>

          <p className="font-serif text-xl text-heritage-text max-w-2xl mx-auto animate-slide-up animation-delay-100">
            Everything you need to know about preserving your life story with Easy Memoir.
          </p>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="px-6 mb-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  setOpenIndex(null)
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-full font-sans text-sm font-medium transition-all duration-300 animate-slide-up ${
                  activeCategory === cat.id
                    ? 'bg-heritage-cta text-white shadow-lg scale-105'
                    : 'bg-heritage-card text-heritage-text hover:bg-heritage-sepia-light/30 border border-heritage-sepia-light/30'
                }`}
                style={{ animationDelay: `${i * 50 + 200}ms` }}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {faqs[activeCategory].map((faq, index) => (
              <div
                key={index}
                className={`bg-heritage-card rounded-2xl border border-heritage-sepia-light/30 overflow-hidden transition-all duration-500 animate-slide-up ${
                  openIndex === index ? 'shadow-lg ring-2 ring-heritage-cta/20' : 'hover:shadow-md'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between p-6 text-left group"
                >
                  <h3 className="font-display text-lg text-heritage-ink pr-8 group-hover:text-heritage-cta transition-colors">
                    {faq.question}
                  </h3>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      openIndex === index
                        ? 'bg-heritage-cta text-white rotate-180'
                        : 'bg-heritage-sepia-light/30 text-heritage-sepia'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 pb-6">
                    <div className="pt-2 border-t border-heritage-sepia-light/20">
                      <p className="font-serif text-heritage-text leading-relaxed pt-4">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still have questions */}
      <section className="py-20 px-6 bg-gradient-to-b from-heritage-card to-heritage-cream">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-white rounded-3xl p-10 shadow-xl border border-heritage-sepia-light/20">
            <div className="w-20 h-20 bg-heritage-cta/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-heritage-cta"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h2 className="font-display text-3xl text-heritage-ink mb-4">Still have questions?</h2>
            <p className="font-serif text-lg text-heritage-text mb-8">
              We're here to help. Reach out and we'll get back to you within 24 hours.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:hello@easymemoir.co.uk"
                className="inline-flex items-center justify-center gap-2 font-sans bg-heritage-cta text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-heritage-cta-hover transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Email Us
              </a>
              <a
                href="tel:+441onal"
                className="inline-flex items-center justify-center gap-2 font-sans border-2 border-heritage-sepia-light text-heritage-ink px-8 py-4 rounded-full text-lg font-medium hover:bg-heritage-sepia-light/20 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                Call Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h3 className="font-display text-2xl text-heritage-ink text-center mb-10">
            Helpful resources
          </h3>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: 'Getting Started Guide',
                desc: 'Step-by-step walkthrough for new users',
                link: '/how-it-works',
                icon: '🚀'
              },
              {
                title: 'Pricing & Plans',
                desc: 'Find the perfect plan for your needs',
                link: '/pricing',
                icon: '💰'
              },
              {
                title: 'Gift a Memoir',
                desc: 'Give the gift of preserved memories',
                link: '/gift',
                icon: '🎁'
              }
            ].map((resource, i) => (
              <Link
                key={i}
                to={resource.link}
                className="group bg-heritage-card rounded-2xl p-6 border border-heritage-sepia-light/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <span className="text-3xl mb-4 block">{resource.icon}</span>
                <h4 className="font-display text-lg text-heritage-ink mb-2 group-hover:text-heritage-cta transition-colors">
                  {resource.title}
                </h4>
                <p className="font-sans text-sm text-heritage-text">{resource.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Custom animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
        .animation-delay-100 { animation-delay: 100ms; }
      `}</style>
    </div>
  )
}
