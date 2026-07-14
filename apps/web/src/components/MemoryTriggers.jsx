import { useState } from 'react'
import {
  IconBox,
  IconBulb,
  IconChevronDown,
  IconExternalLink,
  IconFlower,
  IconMapPin,
  IconMusic,
  IconPhoto,
  IconUsers,
  IconX
} from '@tabler/icons-react'

const TRIGGERS = [
  {
    id: 'photos',
    icon: <IconPhoto size={20} stroke={1.75} />,
    title: 'Look at old photos',
    tip: 'Browse family albums or phone photos from that time. Images often unlock forgotten details.'
  },
  {
    id: 'music',
    icon: <IconMusic size={20} stroke={1.75} />,
    title: 'Play music from that era',
    tip: "Songs transport us back instantly. Search for top hits from the year you're remembering."
  },
  {
    id: 'smells',
    icon: <IconFlower size={20} stroke={1.75} />,
    title: 'Think about smells',
    tip: "What did the kitchen smell like? Grandma's perfume? Fresh-cut grass? Smells trigger powerful memories."
  },
  {
    id: 'location',
    icon: <IconMapPin size={20} stroke={1.75} />,
    title: 'Revisit the place',
    tip: 'Use Google Street View to see your old house, school, or neighbourhood. Walk through it in your mind.'
  },
  {
    id: 'objects',
    icon: <IconBox size={20} stroke={1.75} />,
    title: 'Hold an old object',
    tip: 'A piece of jewellery, a book, a toy - holding something from that time can unlock vivid memories.'
  },
  {
    id: 'people',
    icon: <IconUsers size={20} stroke={1.75} />,
    title: 'Call someone who was there',
    tip: "A sibling, old friend, or relative might remember details you've forgotten. Memories spark memories."
  }
]

// Decade-specific music suggestions
const MUSIC_BY_ERA = {
  '1950s': ['Rock Around the Clock', 'Johnny B. Goode', 'Jailhouse Rock'],
  '1960s': ['Hey Jude', 'Respect', 'Good Vibrations'],
  '1970s': ['Bohemian Rhapsody', "Stayin' Alive", 'Hotel California'],
  '1980s': ['Billie Jean', "Sweet Child O' Mine", 'Take On Me'],
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
    <div className="bg-sepia-50 rounded-2xl p-4 sm:p-5 border border-sepia-200/60">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-sepia-100 text-sepia-600 rounded-xl flex items-center justify-center">
            <IconBulb size={20} stroke={1.75} />
          </div>
          <span className="font-medium text-ink">Memory Triggers</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-sepia-400 hover:text-ink hover:bg-sepia-100/70 transition-colors"
          >
            <IconX size={20} stroke={1.75} />
          </button>
        )}
      </div>

      <p className="text-sepia-600 text-sm mb-4">Struggling to remember? Try these techniques:</p>

      <div className="space-y-2">
        {displayTriggers.map(trigger => (
          <div key={trigger.id}>
            <button
              type="button"
              onClick={() => setExpandedTrigger(expandedTrigger === trigger.id ? null : trigger.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                expandedTrigger === trigger.id ? 'bg-surface shadow-soft' : 'hover:bg-surface/70'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  expandedTrigger === trigger.id
                    ? 'bg-sepia-100 text-sepia-700'
                    : 'bg-sepia-100/60 text-sepia-500'
                }`}
              >
                {trigger.icon}
              </div>
              <span
                className={`flex-1 text-sm ${
                  expandedTrigger === trigger.id ? 'text-ink font-medium' : 'text-ink-soft'
                }`}
              >
                {trigger.title}
              </span>
              <IconChevronDown
                size={16}
                stroke={1.75}
                className={`text-sepia-400 transition-transform ${
                  expandedTrigger === trigger.id ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedTrigger === trigger.id && (
              <div className="py-3 px-4 text-sm text-sepia-600 bg-surface/60 rounded-b-xl -mt-1 border-t border-sepia-100">
                {trigger.tip}

                {/* Music suggestions */}
                {trigger.id === 'music' && (
                  <div className="mt-3 pt-3 border-t border-sepia-100">
                    <p className="text-xs font-medium text-ink-soft mb-2">Try searching for:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MUSIC_BY_ERA[getEra()]?.map(song => (
                        <a
                          key={song}
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(song)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-full bg-sepia-100 hover:bg-sepia-200 text-sepia-700 text-xs transition-colors"
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sepia-100 hover:bg-sepia-200 text-sepia-700 text-xs transition-colors"
                    >
                      <IconExternalLink size={14} stroke={1.75} />
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
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full mt-3 py-2 text-sepia-600 text-sm font-medium hover:text-ink rounded-full hover:bg-sepia-100/70 transition-colors"
        >
          Show {TRIGGERS.length - 3} more tips →
        </button>
      )}
    </div>
  )
}
