import { useState } from 'react'
import {
  IconBook,
  IconFeather,
  IconSun,
  IconAnchor,
  IconCheck,
  IconSparkles
} from '@tabler/icons-react'
import { styleOptions } from '../data/styleOptions'
import { Button } from './ui'

const authorIcons = {
  hemingway: IconBook,
  austen: IconFeather,
  angelou: IconSun,
  twain: IconAnchor
}

const SELECTABLE_BASE =
  'w-full text-left rounded-2xl border bg-surface transition-all cursor-pointer'
const SELECTED = 'border-bronze-400 ring-4 ring-bronze-500/10'
const UNSELECTED = 'border-sepia-200 hover:border-sepia-300'

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

  const toggleTone = toneId => {
    if (selectedTones.includes(toneId)) {
      onTonesChange(selectedTones.filter(t => t !== toneId))
    } else {
      onTonesChange([...selectedTones, toneId])
    }
  }

  return (
    <div className="space-y-10">
      {/* Tone Selection - Multi-select */}
      <section>
        <h3 className="text-lg font-display text-ink mb-1 flex items-center gap-2">
          <IconSparkles size={20} stroke={1.75} className="text-bronze-500" />
          Writing Tone
        </h3>
        <p className="text-sm text-sepia-600 mb-4">Select one or more tones to blend together</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {styleOptions.tones.map(tone => {
            const isSelected = selectedTones.includes(tone.id)
            return (
              <div key={tone.id} className="relative">
                <button
                  type="button"
                  onClick={() => toggleTone(tone.id)}
                  className={`${SELECTABLE_BASE} p-4 ${isSelected ? SELECTED : UNSELECTED}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-bronze-500 bg-bronze-500' : 'border-sepia-300'
                      }`}
                    >
                      {isSelected && <IconCheck size={14} stroke={2.5} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-ink">{tone.name}</h4>
                      <p className="text-sm text-sepia-600 mt-0.5">{tone.description}</p>
                    </div>
                  </div>
                </button>

                <SampleToggle
                  id={tone.id}
                  expandedSample={expandedSample}
                  onToggle={setExpandedSample}
                />
                {expandedSample === tone.id && <SampleWell text={tone.sample} />}
              </div>
            )
          })}
        </div>
      </section>

      {/* Narrative Style - Single select */}
      <section>
        <h3 className="text-lg font-display text-ink mb-1">Narrative Style</h3>
        <p className="text-sm text-sepia-600 mb-4">Choose how the story is told</p>

        <div className="space-y-3">
          {styleOptions.narratives.map(narrative => {
            const isSelected = selectedNarrative === narrative.id
            return (
              <div key={narrative.id} className="relative">
                <button
                  type="button"
                  onClick={() => onNarrativeChange(isSelected ? null : narrative.id)}
                  className={`${SELECTABLE_BASE} p-4 ${isSelected ? SELECTED : UNSELECTED}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-bronze-500' : 'border-sepia-300'
                      }`}
                    >
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-bronze-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-ink">{narrative.name}</h4>
                      <p className="text-sm text-sepia-600 mt-0.5">{narrative.description}</p>
                    </div>
                  </div>
                </button>

                <SampleToggle
                  id={narrative.id}
                  expandedSample={expandedSample}
                  onToggle={setExpandedSample}
                />
                {expandedSample === narrative.id && <SampleWell text={narrative.sample} />}
              </div>
            )
          })}
        </div>
      </section>

      {/* Author Style - Single select with cards */}
      <section>
        <h3 className="text-lg font-display text-ink mb-1">Author Inspiration</h3>
        <p className="text-sm text-sepia-600 mb-4">
          Optional: Write in the style of a famous author
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {styleOptions.authors.map(author => {
            const isSelected = selectedAuthor === author.id
            const Icon = authorIcons[author.id] || IconBook

            return (
              <div key={author.id} className="relative">
                <button
                  type="button"
                  onClick={() => onAuthorChange(isSelected ? null : author.id)}
                  className={`${SELECTABLE_BASE} p-5 ${isSelected ? SELECTED : UNSELECTED}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-bronze-500 text-white' : 'bg-sepia-100 text-sepia-600'
                      }`}
                    >
                      <Icon size={24} stroke={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-ink">{author.name}</h4>
                      <p className="text-sm text-sepia-600">{author.description}</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-bronze-500 flex items-center justify-center shrink-0">
                        <IconCheck size={16} stroke={2.5} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>

                <SampleToggle
                  id={author.id}
                  expandedSample={expandedSample}
                  onToggle={setExpandedSample}
                />
                {expandedSample === author.id && <SampleWell text={author.sample} />}
              </div>
            )
          })}
        </div>
      </section>

      {/* Preview button */}
      {onPreviewSample && (selectedTones.length > 0 || selectedNarrative || selectedAuthor) && (
        <div className="pt-6 border-t border-sepia-100">
          <Button
            variant="secondary"
            size="xl"
            onClick={onPreviewSample}
            icon={<IconSparkles size={20} stroke={1.75} />}
          >
            Preview Style on My Story
          </Button>
          <p className="text-xs text-sepia-500 text-center mt-3">
            See how your selections will transform a sample from your memoir
          </p>
        </div>
      )}
    </div>
  )
}

function SampleToggle({ id, expandedSample, onToggle }) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        onToggle(expandedSample === id ? null : id)
      }}
      className="absolute top-3 right-3 text-xs font-medium text-bronze-700 hover:underline z-10"
    >
      {expandedSample === id ? 'Hide sample' : 'See sample'}
    </button>
  )
}

function SampleWell({ text }) {
  return (
    <div className="mt-2 p-4 bg-sepia-50 border border-sepia-100 rounded-xl text-sm text-sepia-700 font-serif italic">
      "{text}"
    </div>
  )
}

export default StyleSelector
