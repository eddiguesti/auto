import { useState } from 'react'
import { IconBook, IconFeather, IconSun, IconAnchor, IconCheck, IconSparkles } from '@tabler/icons-react'
import { styleOptions } from '../data/styleOptions'

const authorIcons = {
  hemingway: IconBook,
  austen: IconFeather,
  angelou: IconSun,
  twain: IconAnchor
}

function StyleSelector({
  selectedTones = [],
  selectedNarrative = null,
  selectedAuthor = null,
  onTonesChange,
  onNarrativeChange,
  onAuthorChange,
  onPreviewSample
}) {
  const [expandedSample, setExpandedSample] = useState(null)

  const toggleTone = (toneId) => {
    if (selectedTones.includes(toneId)) {
      onTonesChange(selectedTones.filter(t => t !== toneId))
    } else {
      onTonesChange([...selectedTones, toneId])
    }
  }

  return (
    <div className="space-y-8">
      {/* Tone Selection - Multi-select */}
      <section>
        <h3 className="text-lg font-semibold text-sepia mb-2 flex items-center gap-2">
          <IconSparkles size={20} className="text-accent" />
          Writing Tone
        </h3>
        <p className="text-sm text-sepia/60 mb-4">Select one or more tones to blend together</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {styleOptions.tones.map(tone => {
            const isSelected = selectedTones.includes(tone.id)
            return (
              <div key={tone.id} className="relative">
                <button
                  onClick={() => toggleTone(tone.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/10'
                      : 'border-sepia/20 hover:border-sepia/40 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected ? 'border-accent bg-accent' : 'border-sepia/30'
                    }`}>
                      {isSelected && <IconCheck size={14} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sepia">{tone.name}</h4>
                      <p className="text-sm text-sepia/60 mt-0.5">{tone.description}</p>
                    </div>
                  </div>
                </button>

                {/* Sample preview toggle */}
                <button
                  onClick={() => setExpandedSample(expandedSample === tone.id ? null : tone.id)}
                  className="absolute top-3 right-3 text-xs text-accent hover:underline"
                >
                  {expandedSample === tone.id ? 'Hide sample' : 'See sample'}
                </button>

                {/* Sample text */}
                {expandedSample === tone.id && (
                  <div className="mt-2 p-3 bg-cream/50 rounded-lg text-sm text-sepia/80 italic border border-sepia/10">
                    "{tone.sample}"
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Narrative Style - Single select */}
      <section>
        <h3 className="text-lg font-semibold text-sepia mb-2">Narrative Style</h3>
        <p className="text-sm text-sepia/60 mb-4">Choose how the story is told</p>

        <div className="space-y-3">
          {styleOptions.narratives.map(narrative => {
            const isSelected = selectedNarrative === narrative.id
            return (
              <div key={narrative.id} className="relative">
                <button
                  onClick={() => onNarrativeChange(isSelected ? null : narrative.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/10'
                      : 'border-sepia/20 hover:border-sepia/40 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected ? 'border-accent' : 'border-sepia/30'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sepia">{narrative.name}</h4>
                      <p className="text-sm text-sepia/60 mt-0.5">{narrative.description}</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setExpandedSample(expandedSample === narrative.id ? null : narrative.id)}
                  className="absolute top-3 right-3 text-xs text-accent hover:underline"
                >
                  {expandedSample === narrative.id ? 'Hide sample' : 'See sample'}
                </button>

                {expandedSample === narrative.id && (
                  <div className="mt-2 p-3 bg-cream/50 rounded-lg text-sm text-sepia/80 italic border border-sepia/10">
                    "{narrative.sample}"
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Author Style - Single select with cards */}
      <section>
        <h3 className="text-lg font-semibold text-sepia mb-2">Author Inspiration</h3>
        <p className="text-sm text-sepia/60 mb-4">Optional: Write in the style of a famous author</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {styleOptions.authors.map(author => {
            const isSelected = selectedAuthor === author.id
            const Icon = authorIcons[author.id] || IconBook

            return (
              <div key={author.id} className="relative">
                <button
                  onClick={() => onAuthorChange(isSelected ? null : author.id)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-accent bg-gradient-to-br from-accent/10 to-accent/5'
                      : 'border-sepia/20 hover:border-sepia/40 bg-white hover:bg-cream/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-accent text-white' : 'bg-sepia/10 text-sepia/60'
                    }`}>
                      <Icon size={24} stroke={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sepia">{author.name}</h4>
                      <p className="text-sm text-sepia/60">{author.description}</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <IconCheck size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedSample(expandedSample === author.id ? null : author.id)
                  }}
                  className="absolute top-3 right-3 text-xs text-accent hover:underline"
                >
                  {expandedSample === author.id ? 'Hide sample' : 'See sample'}
                </button>

                {expandedSample === author.id && (
                  <div className="mt-2 p-3 bg-cream/50 rounded-lg text-sm text-sepia/80 italic border border-sepia/10">
                    "{author.sample}"
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Preview button */}
      {onPreviewSample && (selectedTones.length > 0 || selectedNarrative || selectedAuthor) && (
        <div className="pt-4 border-t border-sepia/10">
          <button
            onClick={onPreviewSample}
            className="w-full py-3 px-6 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <IconSparkles size={20} />
            Preview Style on My Story
          </button>
          <p className="text-xs text-sepia/50 text-center mt-2">
            See how your selections will transform a sample from your memoir
          </p>
        </div>
      )}
    </div>
  )
}

export default StyleSelector
