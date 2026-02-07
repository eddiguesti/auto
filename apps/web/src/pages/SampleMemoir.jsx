import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

export default function SampleMemoir() {
  const [currentPage, setCurrentPage] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const bookRef = useRef(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const pages = [
    {
      type: 'cover',
      content: {
        title: 'A Life Well Lived',
        subtitle: 'The Memoir of Margaret Thompson',
        year: '1928 - 2022'
      }
    },
    {
      type: 'dedication',
      content: {
        text: 'For my grandchildren,\n\nMay these stories remind you where you come from,\nand inspire where you choose to go.\n\nWith all my love,\nGrandma Margaret'
      }
    },
    {
      type: 'chapter',
      content: {
        chapter: 'Chapter One',
        title: 'The House on Mill Lane',
        text: `I was born on a crisp October morning in 1928, in the small bedroom above my father's bakery on Mill Lane. My mother always said I came into the world demanding to be heard—apparently, my first cry could be heard three streets over.

The bakery was the heart of our community. Every morning at four o'clock, my father would fire up the ovens, and by the time the sun rose, the whole street would be filled with the smell of fresh bread. I can still close my eyes and smell it now, all these years later.

Our house was small but full of love. I shared a room with my two sisters, Mary and Dorothy. We had one bed between us, and in winter, we'd huddle together for warmth, telling each other stories until we fell asleep.`
      }
    },
    {
      type: 'chapter-continued',
      content: {
        text: `My earliest memory is of sitting on the flour sacks in the bakery's back room, watching my father's hands work the dough. Those same hands that could punch down bread dough so forcefully could also gently wipe away a child's tears.

"Margaret," he'd say to me, "bread is patience. You can't rush it. You have to let it rise in its own time." I didn't know it then, but that advice would serve me well throughout my life.

The world outside our little bakery was changing. There were whispers of trouble in Europe, but to a five-year-old girl, the only thing that mattered was whether Cook would let me lick the bowl after making the Christmas pudding.`,
        image: 'Bakery interior, circa 1933'
      }
    },
    {
      type: 'chapter',
      content: {
        chapter: 'Chapter Three',
        title: 'Dancing Through the Blitz',
        text: `When the war came, everything changed. Father joined the Home Guard, and suddenly it was just Mother, my sisters, and me running the bakery. I was twelve years old and learning to knead dough before school.

The first time the air raid sirens wailed, I was terrified. We huddled in the Anderson shelter in our back garden, listening to the planes overhead. Mary held my hand so tight it hurt.

But humans are remarkable creatures. We adapt. We endure. And somehow, we find joy even in the darkest times.

There was a dance hall on Oxford Street that stayed open through the Blitz. "Hitler isn't going to stop us dancing," the owner declared. And he was right.`
      }
    },
    {
      type: 'chapter-continued',
      content: {
        text: `I met my Thomas at that dance hall in 1944. He was a young RAF pilot with kind eyes and two left feet. "I'm sorry," he said after stepping on my toes for the third time. "I'm much better at flying planes than dancing."

"Then perhaps you should stick to the sky," I teased.

He laughed—a warm, genuine laugh that made me want to hear it again and again for the rest of my life. And I did. For fifty-two wonderful years, I did.

We wrote letters while he was stationed in France. I still have every one of them, tied with the same blue ribbon I've used since 1945. Some things you never throw away.`,
        quote:
          '"The secret to a long marriage? Never stop dancing together, even when there\'s no music."'
      }
    },
    {
      type: 'photos',
      content: {
        title: 'Moments in Time',
        photos: [
          { caption: 'Wedding Day, 1949', year: '1949' },
          { caption: 'With baby Elizabeth', year: '1952' },
          { caption: 'The whole family', year: '1975' },
          { caption: 'Golden anniversary', year: '1999' }
        ]
      }
    },
    {
      type: 'chapter',
      content: {
        chapter: 'Chapter Seven',
        title: 'Words of Wisdom',
        text: `Now, at ninety-three, I've learned a few things I'd like to pass on to my grandchildren.

Be kind. Always. You never know what battles others are fighting.

Tell people you love them. Don't wait. Don't assume they know.

Keep dancing, even when your knees ache and your feet are tired. The music is always there if you listen for it.

Write letters. Real ones, on paper. There's magic in holding something written by someone you love.

And finally, tell your stories. Don't let them die with you. Every life is a book worth reading—you just have to write it down.`
      }
    }
  ]

  const flipPage = direction => {
    if (isFlipping) return

    setIsFlipping(true)

    setTimeout(() => {
      if (direction === 'next' && currentPage < pages.length - 1) {
        setCurrentPage(currentPage + 1)
      } else if (direction === 'prev' && currentPage > 0) {
        setCurrentPage(currentPage - 1)
      }
      setIsFlipping(false)
    }, 300)
  }

  const renderPage = page => {
    switch (page.type) {
      case 'cover':
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-heritage-sepia to-heritage-sepia-dark text-white rounded-r-lg">
            <div className="border-4 border-white/30 p-8 sm:p-12">
              <h1 className="font-display text-3xl sm:text-4xl mb-4">{page.content.title}</h1>
              <div className="w-24 h-0.5 bg-white/50 mx-auto mb-4" />
              <p className="font-serif text-lg sm:text-xl italic mb-2">{page.content.subtitle}</p>
              <p className="font-sans text-sm opacity-70">{page.content.year}</p>
            </div>
          </div>
        )

      case 'dedication':
        return (
          <div className="h-full flex items-center justify-center p-8 sm:p-12 bg-heritage-cream">
            <div className="text-center max-w-sm">
              <p className="font-serif text-lg sm:text-xl text-heritage-text italic leading-relaxed whitespace-pre-line">
                {page.content.text}
              </p>
            </div>
          </div>
        )

      case 'chapter':
        return (
          <div className="h-full p-6 sm:p-10 bg-heritage-cream overflow-auto">
            <p className="font-sans text-xs text-heritage-sepia uppercase tracking-[0.3em] mb-2">
              {page.content.chapter}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-heritage-ink mb-6">
              {page.content.title}
            </h2>
            <div className="font-serif text-sm sm:text-base text-heritage-text leading-relaxed space-y-4">
              {page.content.text.split('\n\n').map((para, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? 'first-letter:text-4xl first-letter:font-display first-letter:float-left first-letter:mr-2 first-letter:text-heritage-sepia'
                      : ''
                  }
                >
                  {para}
                </p>
              ))}
            </div>
          </div>
        )

      case 'chapter-continued':
        return (
          <div className="h-full p-6 sm:p-10 bg-heritage-cream overflow-auto">
            <div className="font-serif text-sm sm:text-base text-heritage-text leading-relaxed space-y-4">
              {page.content.text.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {page.content.image && (
              <div className="mt-6 bg-heritage-sepia-light/20 rounded-lg p-4 text-center">
                <div className="w-full h-32 bg-heritage-sepia-light/30 rounded flex items-center justify-center mb-2">
                  <span className="text-4xl">📷</span>
                </div>
                <p className="font-sans text-xs text-heritage-text italic">{page.content.image}</p>
              </div>
            )}
            {page.content.quote && (
              <blockquote className="mt-6 border-l-4 border-heritage-cta pl-4 italic text-heritage-sepia">
                {page.content.quote}
              </blockquote>
            )}
          </div>
        )

      case 'photos':
        return (
          <div className="h-full p-6 sm:p-10 bg-heritage-cream">
            <h2 className="font-display text-2xl text-heritage-ink text-center mb-6">
              {page.content.title}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {page.content.photos.map((photo, i) => (
                <div
                  key={i}
                  className="bg-white p-2 shadow-md rotate-[-1deg] hover:rotate-0 transition-transform"
                >
                  <div className="aspect-square bg-heritage-sepia-light/30 flex items-center justify-center mb-2">
                    <span className="text-3xl">📷</span>
                  </div>
                  <p className="font-sans text-xs text-heritage-text text-center">
                    {photo.caption}
                  </p>
                  <p className="font-sans text-[10px] text-heritage-text/60 text-center">
                    {photo.year}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-heritage-ink">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-heritage-ink/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-white">
            Easy Memoir
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/pricing"
              className="font-sans text-sm text-white/70 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/gift"
              className="font-sans text-sm text-white/70 hover:text-white transition-colors"
            >
              Gift
            </Link>
            <Link
              to="/register"
              className="font-sans bg-heritage-cta text-white px-5 py-2 rounded-full text-sm hover:bg-heritage-cta-hover transition-colors"
            >
              Create Yours
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-8 px-6">
        <div
          className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-6">
            <span className="text-lg">📖</span>
            <p className="font-sans uppercase tracking-[0.3em] text-xs text-white/70">
              Sample Memoir
            </p>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl text-white mb-4">
            See what your memoir could look like
          </h1>

          <p className="font-serif text-lg text-white/70 max-w-2xl mx-auto">
            This is a sample from "A Life Well Lived" by Margaret Thompson. Every memoir we create
            is as unique as the life it celebrates.
          </p>
        </div>
      </section>

      {/* Book Viewer */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div
            ref={bookRef}
            className={`relative transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          >
            {/* Book Container */}
            <div className="relative bg-heritage-sepia-dark rounded-lg shadow-2xl p-2 sm:p-3">
              {/* Book spine effect */}
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/30 to-transparent rounded-l-lg" />

              {/* Page */}
              <div
                className={`bg-heritage-cream rounded-r-lg min-h-[500px] sm:min-h-[600px] transition-all duration-300 ${
                  isFlipping ? 'transform scale-[0.98] opacity-80' : ''
                }`}
              >
                {renderPage(pages[currentPage])}
              </div>

              {/* Page curl effect */}
              <div className="absolute bottom-2 right-2 w-12 h-12 bg-gradient-to-tl from-heritage-sepia-light/30 to-transparent rounded-bl-xl pointer-events-none" />
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={() => flipPage('prev')}
              disabled={currentPage === 0}
              className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-16 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-lg flex items-center justify-center transition-all ${
                currentPage === 0
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:scale-110 hover:shadow-xl'
              }`}
            >
              <svg
                className="w-6 h-6 text-heritage-ink"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              onClick={() => flipPage('next')}
              disabled={currentPage === pages.length - 1}
              className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-16 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-lg flex items-center justify-center transition-all ${
                currentPage === pages.length - 1
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:scale-110 hover:shadow-xl'
              }`}
            >
              <svg
                className="w-6 h-6 text-heritage-ink"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Page Indicators */}
          <div className="flex justify-center items-center gap-2 mt-8">
            {pages.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!isFlipping) {
                    setIsFlipping(true)
                    setTimeout(() => {
                      setCurrentPage(index)
                      setIsFlipping(false)
                    }, 300)
                  }
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentPage ? 'bg-heritage-cta w-6' : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          <p className="text-center text-white/50 font-sans text-sm mt-4">
            Page {currentPage + 1} of {pages.length}
          </p>
        </div>
      </section>

      {/* Book Options */}
      <section className="py-20 px-6 bg-gradient-to-b from-heritage-ink to-heritage-sepia-dark">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl text-white mb-4">
              Choose your format
            </h2>
            <p className="font-serif text-lg text-white/70 max-w-2xl mx-auto">
              Every memoir is available as a digital PDF or a beautifully printed book.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                name: 'Softcover',
                price: '£29',
                image: '📘',
                features: ['Perfect bound', '200gsm paper', 'Matte finish']
              },
              {
                name: 'Hardcover',
                price: '£49',
                image: '📕',
                features: ['Cloth bound', 'Dust jacket', 'Archival paper'],
                popular: true
              },
              {
                name: 'Premium',
                price: '£79',
                image: '📗',
                features: ['Leather-look', 'Gold foil', 'Gift box']
              }
            ].map((book, i) => (
              <div
                key={book.name}
                className={`relative bg-white/10 backdrop-blur rounded-3xl p-8 text-center transition-all duration-500 hover:-translate-y-2 ${
                  book.popular ? 'ring-2 ring-heritage-cta' : ''
                }`}
              >
                {book.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-heritage-cta text-white font-sans text-xs font-bold px-4 py-1.5 rounded-full">
                    Most Popular
                  </div>
                )}
                <span className="text-6xl mb-4 block">{book.image}</span>
                <h3 className="font-display text-2xl text-white mb-2">{book.name}</h3>
                <p className="font-display text-3xl text-heritage-cta mb-4">{book.price}</p>
                <ul className="space-y-2">
                  {book.features.map((feature, j) => (
                    <li key={j} className="font-sans text-sm text-white/70">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-heritage-cream">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-heritage-ink mb-6">
            Ready to write your story?
          </h2>
          <p className="font-serif text-xl text-heritage-text mb-10">
            Start today and create a memoir as beautiful as this one.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="group font-sans bg-heritage-cta text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-heritage-cta-hover transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              Write My First Chapter — Free
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              to="/gift"
              className="font-sans border-2 border-heritage-sepia-light text-heritage-ink px-10 py-4 rounded-full text-lg font-medium hover:bg-heritage-sepia-light/20 transition-all"
            >
              Gift a Memoir
            </Link>
          </div>
        </div>
      </section>

      {/* Custom styles */}
      <style>{`
        .first-letter\\:text-4xl::first-letter {
          font-size: 2.5rem;
          font-family: 'Boska', Georgia, serif;
          float: left;
          margin-right: 0.5rem;
          line-height: 1;
          color: #9C7B5C;
        }
      `}</style>
    </div>
  )
}
