import { useState } from 'react'

const TRIGGERS = [
  {
    id: 'photos',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Look at old photos',
    tip: 'Browse family albums or phone photos from that time. Images often unlock forgotten details.'
  },
  {
    id: 'music',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
    title: 'Play music from that era',
    tip: 'Songs transport us back instantly. Search for top hits from the year you\'re remembering.'
  },
  {
    id: 'smells',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Think about smells',
    tip: 'What did the kitchen smell like? Grandma\'s perfume? Fresh-cut grass? Smells trigger powerful memories.'
  },
  {
    id: 'location',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Revisit the place',
    tip: 'Use Google Street View to see your old house, school, or neighbourhood. Walk through it in your mind.'
  },
  {
    id: 'objects',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: 'Hold an old object',
    tip: 'A piece of jewellery, a book, a toy - holding something from that time can unlock vivid memories.'
  },
  {
    id: 'people',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Call someone who was there',
    tip: 'A sibling, old friend, or relative might remember details you\'ve forgotten. Memories spark memories.'
  }
]

// Decade-specific music suggestions
const MUSIC_BY_ERA = {
  '1950s': ['Rock Around the Clock', 'Johnny B. Goode', 'Jailhouse Rock'],
  '1960s': ['Hey Jude', 'Respect', 'Good Vibrations'],
  '1970s': ['Bohemian Rhapsody', 'Stayin\' Alive', 'Hotel California'],
  '1980s': ['Billie Jean', 'Sweet Child O\' Mine', 'Take On Me'],
  '1990s': ['Smells Like Teen Spirit', 'Wonderwall', 'Wannabe'],
  '2000s': ['Crazy in Love', 'Mr. Brightside', 'Umbrella']
}

export default function MemoryTriggers({ chapter, onClose }) {
  const [expandedTrigger, setExpandedTrigger] = useState(null)
  const [showAll, setShowAll] = useState(false)

  // Determine era based on chapter
  const getEra = () => {
    if (chapter?.id === 'earliest-memories' || chapter?.id === 'childhood') {
      return '1960s' // Adjust based on user's birth year if available
    }
    if (chapter?.id === 'teenage-years') {
      return '1970s'
    }
    return '1980s'
  }

  const displayTriggers = showAll ? TRIGGERS : TRIGGERS.slice(0, 3)

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="font-medium text-amber-800">Memory Triggers</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-amber-600/60 hover:text-amber-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-amber-700/70 text-sm mb-4">
        Struggling to remember? Try these techniques:
      </p>

      <div className="space-y-2">
        {displayTriggers.map((trigger) => (
          <div key={trigger.id}>
            <button
              onClick={() => setExpandedTrigger(expandedTrigger === trigger.id ? null : trigger.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition text-left ${
                expandedTrigger === trigger.id
                  ? 'bg-white shadow-sm'
                  : 'hover:bg-white/60'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                expandedTrigger === trigger.id ? 'bg-amber-100 text-amber-600' : 'bg-amber-50 text-amber-500'
              }`}>
                {trigger.icon}
              </div>
              <span className={`flex-1 text-sm ${
                expandedTrigger === trigger.id ? 'text-amber-900 font-medium' : 'text-amber-800'
              }`}>
                {trigger.title}
              </span>
              <svg
                className={`w-4 h-4 text-amber-400 transition-transform ${
                  expandedTrigger === trigger.id ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedTrigger === trigger.id && (
              <div className="ml-13 pl-13 py-3 px-4 text-sm text-amber-700/80 bg-white/50 rounded-b-lg -mt-1 border-t border-amber-100">
                {trigger.tip}

                {/* Music suggestions */}
                {trigger.id === 'music' && (
                  <div className="mt-3 pt-3 border-t border-amber-100">
                    <p className="text-xs font-medium text-amber-800 mb-2">Try searching for:</p>
                    <div className="flex flex-wrap gap-1">
                      {MUSIC_BY_ERA[getEra()]?.map((song) => (
                        <a
                          key={song}
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(song)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200 transition"
                        >
                          {song}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Google Street View link */}
                {trigger.id === 'location' && (
                  <div className="mt-3">
                    <a
                      href="https://www.google.com/maps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200 transition"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open Google Maps
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!showAll && TRIGGERS.length > 3 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-3 py-2 text-amber-600 text-sm hover:text-amber-700 transition"
        >
          Show {TRIGGERS.length - 3} more tips →
        </button>
      )}
    </div>
  )
}
