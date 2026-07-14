import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  IconChevronLeft,
  IconChevronRight,
  IconPhoto,
  IconBook2,
  IconArrowRight
} from '@tabler/icons-react'
import SEO, { breadcrumbSchema } from '../../components/SEO'
import { Button, Badge } from '../../components/ui'

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
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-bronze-700 to-bronze-900 text-white rounded-r-lg">
            <div className="border-4 border-white/30 p-8 sm:p-12">
              <h1 className="font-display text-3xl sm:text-4xl mb-4">{page.content.title}</h1>
              <div className="w-24 h-0.5 bg-white/50 mx-auto mb-4" />
              <p className="font-serif text-lg sm:text-xl italic mb-2">{page.content.subtitle}</p>
              <p className="text-sm opacity-70">{page.content.year}</p>
            </div>
          </div>
        )

      case 'dedication':
        return (
          <div className="h-full flex items-center justify-center p-8 sm:p-12 bg-cream">
            <div className="text-center max-w-sm">
              <p className="font-serif text-lg sm:text-xl text-ink-soft italic whitespace-pre-line">
                {page.content.text}
              </p>
            </div>
          </div>
        )

      case 'chapter':
        return (
          <div className="h-full p-6 sm:p-10 bg-cream overflow-auto">
            <p className="eyebrow mb-2">{page.content.chapter}</p>
            <h2 className="font-display text-2xl sm:text-3xl text-ink mb-6">
              {page.content.title}
            </h2>
            <div className="prose-memoir space-y-4">
              {page.content.text.split('\n\n').map((para, i) => (
                <p key={i} className={i === 0 ? 'drop-cap' : ''}>
                  {para}
                </p>
              ))}
            </div>
          </div>
        )

      case 'chapter-continued':
        return (
          <div className="h-full p-6 sm:p-10 bg-cream overflow-auto">
            <div className="prose-memoir space-y-4">
              {page.content.text.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {page.content.image && (
              <div className="mt-6 bg-sepia-100 rounded-xl p-4 text-center">
                <div className="w-full h-32 bg-sepia-200/60 rounded-lg flex items-center justify-center mb-2">
                  <IconPhoto size={36} stroke={1.5} className="text-sepia-400" />
                </div>
                <p className="text-xs text-sepia-600 italic">{page.content.image}</p>
              </div>
            )}
            {page.content.quote && (
              <blockquote className="mt-6 border-l-4 border-bronze-400 pl-4 font-serif italic text-sepia-600">
                {page.content.quote}
              </blockquote>
            )}
          </div>
        )

      case 'photos':
        return (
          <div className="h-full p-6 sm:p-10 bg-cream">
            <h2 className="font-display text-2xl text-ink text-center mb-6">
              {page.content.title}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {page.content.photos.map((photo, i) => (
                <div key={i} className="bg-surface p-2 rounded-lg shadow-soft">
                  <div className="aspect-square bg-sepia-100 rounded flex items-center justify-center mb-2">
                    <IconPhoto size={28} stroke={1.5} className="text-sepia-400" />
                  </div>
                  <p className="text-xs text-sepia-600 text-center">{photo.caption}</p>
                  <p className="text-[10px] text-sepia-500 text-center">{photo.year}</p>
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
    <div className="min-h-screen bg-ink">
      <SEO
        title="Sample Memoir — See What Your Book Could Look Like"
        description="Preview a beautifully written sample memoir created with Easy Memoir. See how AI transforms spoken memories into eloquent prose. Flip through a real memoir and imagine your own life story."
        path="/sample"
        jsonLd={[breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Sample Memoir' }])]}
      />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-ink/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-white">
            Easy Memoir
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/pricing"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link to="/gift" className="text-sm text-white/70 hover:text-white transition-colors">
              Gift
            </Link>
            <Button to="/register" variant="secondary" size="sm">
              Create Yours
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-8 px-6">
        <div
          className={`max-w-4xl mx-auto text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <p className="uppercase tracking-caps text-xs font-semibold text-bronze-300 mb-4">
            Sample Memoir
          </p>

          <h1 className="font-display text-4xl sm:text-5xl text-white mb-4">
            See what your memoir could look like
          </h1>

          <p className="text-lg text-white/70 max-w-2xl mx-auto">
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
            className={`relative transition-all duration-700 delay-150 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          >
            {/* Book Container */}
            <div className="relative bg-sepia-900 rounded-lg shadow-modal p-2 sm:p-3">
              {/* Book spine effect */}
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-ink/40 to-transparent rounded-l-lg" />

              {/* Page */}
              <div
                className={`bg-cream rounded-r-lg min-h-[500px] sm:min-h-[600px] transition-all duration-300 ${
                  isFlipping ? 'transform scale-[0.98] opacity-80' : ''
                }`}
              >
                {renderPage(pages[currentPage])}
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={() => flipPage('prev')}
              disabled={currentPage === 0}
              aria-label="Previous page"
              className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-16 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-surface shadow-lifted flex items-center justify-center transition-all ${
                currentPage === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:shadow-modal'
              }`}
            >
              <IconChevronLeft size={24} stroke={1.75} className="text-ink" />
            </button>

            <button
              onClick={() => flipPage('next')}
              disabled={currentPage === pages.length - 1}
              aria-label="Next page"
              className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-16 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-surface shadow-lifted flex items-center justify-center transition-all ${
                currentPage === pages.length - 1
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:shadow-modal'
              }`}
            >
              <IconChevronRight size={24} stroke={1.75} className="text-ink" />
            </button>
          </div>

          {/* Page Indicators */}
          <div className="flex justify-center items-center gap-2 mt-8">
            {pages.map((_, index) => (
              <button
                key={index}
                aria-label={`Go to page ${index + 1}`}
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
                  index === currentPage ? 'bg-bronze-400 w-6' : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          <p className="text-center text-white/50 text-sm mt-4">
            Page {currentPage + 1} of {pages.length}
          </p>
        </div>
      </section>

      {/* Book Options */}
      <section className="py-16 sm:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl text-white mb-4">
              Choose your format
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Every memoir is available as a digital PDF or a beautifully printed book.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                name: 'Softcover',
                price: '£29',
                features: ['Perfect bound', '200gsm paper', 'Matte finish']
              },
              {
                name: 'Hardcover',
                price: '£49',
                features: ['Cloth bound', 'Dust jacket', 'Archival paper'],
                popular: true
              },
              {
                name: 'Premium',
                price: '£79',
                features: ['Leather-look', 'Gold foil', 'Gift box']
              }
            ].map(book => (
              <div
                key={book.name}
                className={`relative bg-white/10 rounded-3xl p-8 text-center ${
                  book.popular ? 'ring-2 ring-bronze-400' : ''
                }`}
              >
                {book.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="bronze">Most Popular</Badge>
                  </div>
                )}
                <IconBook2 size={44} stroke={1.5} className="text-white/80 mx-auto mb-4" />
                <h3 className="font-display text-2xl text-white mb-2">{book.name}</h3>
                <p className="font-display text-3xl text-bronze-300 mb-4">{book.price}</p>
                <ul className="space-y-2">
                  {book.features.map((feature, j) => (
                    <li key={j} className="text-sm text-white/70">
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
      <section className="py-16 sm:py-20 px-6 bg-parchment">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-ink mb-6">
            Ready to write your story?
          </h2>
          <p className="text-lg text-sepia-600 mb-10">
            Start today and create a memoir as beautiful as this one.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button to="/register" size="lg" iconRight={<IconArrowRight size={20} stroke={1.75} />}>
              Write My First Chapter — Free
            </Button>
            <Button to="/gift" variant="secondary" size="lg">
              Gift a Memoir
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
