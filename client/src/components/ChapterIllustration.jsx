import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

// Chapter-specific gradient themes for placeholders
const chapterThemes = {
  'childhood': { gradient: 'from-amber-100 via-orange-50 to-yellow-100', icon: '🏠', label: 'Childhood memories' },
  'family': { gradient: 'from-rose-100 via-pink-50 to-red-100', icon: '👨‍👩‍👧', label: 'Family bonds' },
  'education': { gradient: 'from-blue-100 via-indigo-50 to-purple-100', icon: '📚', label: 'Learning years' },
  'career': { gradient: 'from-slate-100 via-gray-50 to-zinc-100', icon: '💼', label: 'Career journey' },
  'love': { gradient: 'from-pink-100 via-rose-50 to-red-100', icon: '💕', label: 'Love story' },
  'adventures': { gradient: 'from-emerald-100 via-teal-50 to-cyan-100', icon: '🌍', label: 'Adventures' },
  'key-people': { gradient: 'from-violet-100 via-purple-50 to-fuchsia-100', icon: '👥', label: 'Important people' },
  'challenges': { gradient: 'from-amber-100 via-yellow-50 to-orange-100', icon: '⛰️', label: 'Life challenges' },
  'world-around-you': { gradient: 'from-sky-100 via-blue-50 to-indigo-100', icon: '🌎', label: 'World events' },
  'passions-beliefs': { gradient: 'from-amber-100 via-orange-50 to-red-100', icon: '✨', label: 'Passions & beliefs' },
  'wisdom': { gradient: 'from-amber-100 via-yellow-50 to-orange-100', icon: '📖', label: 'Life wisdom' },
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
    <div className="relative overflow-hidden rounded-2xl">
      {/* Gradient placeholder background */}
      <div className={`bg-gradient-to-br ${theme.gradient} aspect-[16/9] flex items-center justify-center`}>
        {illustrationPrompt ? (
          // Show the generated prompt as a preview
          <div className="p-6 text-center max-w-md">
            <div className="w-12 h-12 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sepia/80 text-sm italic leading-relaxed mb-3">
              "{illustrationPrompt}"
            </p>
            <p className="text-sepia/50 text-xs">
              AI illustration coming soon
            </p>
          </div>
        ) : (
          // Default placeholder
          <div className="text-center">
            <span className="text-5xl mb-3 block opacity-40">{theme.icon}</span>
            <p className="text-sepia/40 text-sm">{theme.label}</p>
          </div>
        )}
      </div>

      {/* Generate button overlay */}
      {!illustrationPrompt && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/5 transition group">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !hasStories}
            className={`opacity-0 group-hover:opacity-100 transition px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              hasStories
                ? 'bg-white/90 text-sepia hover:bg-white shadow-lg'
                : 'bg-white/60 text-sepia/50 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-sepia/30 border-t-sepia rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {hasStories ? 'Generate Illustration' : 'Add stories first'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-2 left-2 right-2 bg-red-100 text-red-700 text-xs p-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  )
}
