import { useState } from 'react'
import { IconPhoto, IconSparkles } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui'

// Chapter-specific placeholder themes — warm surface tints within the system palette
const chapterThemes = {
  childhood: {
    gradient: 'from-cream via-sepia-50 to-bronze-50',
    icon: '🏠',
    label: 'Childhood memories'
  },
  family: { gradient: 'from-sepia-50 via-cream to-bronze-50', icon: '👨‍👩‍👧', label: 'Family bonds' },
  education: {
    gradient: 'from-bronze-50 via-cream to-sepia-50',
    icon: '📚',
    label: 'Learning years'
  },
  career: { gradient: 'from-cream via-sepia-50 to-sepia-100', icon: '💼', label: 'Career journey' },
  love: { gradient: 'from-bronze-50 via-sepia-50 to-cream', icon: '💕', label: 'Love story' },
  adventures: { gradient: 'from-sepia-50 via-bronze-50 to-cream', icon: '🌍', label: 'Adventures' },
  'key-people': {
    gradient: 'from-cream via-bronze-50 to-sepia-50',
    icon: '👥',
    label: 'Important people'
  },
  challenges: {
    gradient: 'from-sepia-100 via-sepia-50 to-cream',
    icon: '⛰️',
    label: 'Life challenges'
  },
  'world-around-you': {
    gradient: 'from-cream via-sepia-50 to-bronze-50',
    icon: '🌎',
    label: 'World events'
  },
  'passions-beliefs': {
    gradient: 'from-bronze-50 via-cream to-sepia-50',
    icon: '✨',
    label: 'Passions & beliefs'
  },
  wisdom: { gradient: 'from-sepia-50 via-cream to-bronze-50', icon: '📖', label: 'Life wisdom' }
}

export default function ChapterIllustration({ chapterId, stories = [], onGenerate }) {
  const { authFetch } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [illustrationPrompt, setIllustrationPrompt] = useState(null)
  const [error, setError] = useState(null)

  const theme = chapterThemes[chapterId] || chapterThemes['childhood']

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const res = await authFetch('/api/ai/generate-illustration', {
        method: 'POST',
        body: JSON.stringify({
          chapterId,
          stories: stories.map(s => s.answer).filter(Boolean)
        })
      })

      if (!res.ok) {
        throw new Error('Failed to generate illustration')
      }

      const data = await res.json()
      setIllustrationPrompt(data.prompt)
      if (onGenerate) onGenerate(data)
    } catch (err) {
      console.error('Error generating illustration:', err)
      setError('Failed to generate. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const hasStories = stories.some(s => s.answer?.trim())

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sepia-200/70">
      {/* Warm-tint placeholder background */}
      <div
        className={`bg-gradient-to-br ${theme.gradient} aspect-[16/9] flex items-center justify-center`}
      >
        {illustrationPrompt ? (
          // Show the generated prompt as a preview
          <div className="p-6 text-center max-w-md">
            <div className="w-11 h-11 bg-surface/70 backdrop-blur-sm text-sepia-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <IconPhoto size={24} stroke={1.5} />
            </div>
            <p className="text-sepia-700 text-sm font-serif italic leading-relaxed mb-3">
              "{illustrationPrompt}"
            </p>
            <p className="text-sepia-500 text-xs">AI illustration coming soon</p>
          </div>
        ) : (
          // Default placeholder
          <div className="text-center">
            <span className="text-5xl mb-3 block opacity-40">{theme.icon}</span>
            <p className="text-sepia-500 text-sm">{theme.label}</p>
          </div>
        )}
      </div>

      {/* Generate button overlay */}
      {!illustrationPrompt && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/0 hover:bg-ink/5 transition-colors group">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating || !hasStories}
              loading={isGenerating}
              icon={!isGenerating ? <IconSparkles size={16} stroke={1.75} /> : null}
              className="shadow-lifted"
            >
              {isGenerating
                ? 'Generating...'
                : hasStories
                  ? 'Generate Illustration'
                  : 'Add stories first'}
            </Button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-2 left-2 right-2 bg-error-soft text-error-strong text-xs p-2 rounded-xl">
          {error}
        </div>
      )}
    </div>
  )
}
