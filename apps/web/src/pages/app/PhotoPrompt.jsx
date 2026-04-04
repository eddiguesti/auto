import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePremium } from '../../hooks/usePremium'
import { chapters } from '../../data/chapters'

export default function PhotoPrompt() {
  const { authFetch } = useAuth()
  const { isChapterLocked } = usePremium()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [phase, setPhase] = useState('upload') // upload | analyzing | result
  const [preview, setPreview] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [selectedChapter, setSelectedChapter] = useState('')

  const unlockedChapters = chapters.filter(c => !isChapterLocked(c.id))

  const handleFileSelect = e => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Photo must be under 10MB')
      return
    }

    setError(null)
    setPreview(URL.createObjectURL(file))
    handleUpload(file)
  }

  const handleUpload = async file => {
    setPhase('analyzing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('photo', file)
      if (selectedChapter) formData.append('chapter_id', selectedChapter)

      const res = await authFetch('/api/photos/analyze', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to analyse photo')
      }

      const data = await res.json()
      setAnalysis(data)
      setPhase('result')
    } catch (err) {
      setError(err.message)
      setPhase('upload')
    }
  }

  const handleTalkAboutPhoto = () => {
    const chapter = selectedChapter || unlockedChapters[0]?.id || 'earliest-memories'
    const photoContext = encodeURIComponent(
      JSON.stringify({
        description: analysis.description,
        era: analysis.era,
        questions: analysis.questions
      })
    )
    navigate(`/voice?chapter=${chapter}&photo=${photoContext}`)
  }

  const handleReset = () => {
    setPhase('upload')
    setPreview(null)
    setAnalysis(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 page-enter">
      <Link
        to="/home"
        className="flex items-center gap-2 text-sepia/60 hover:text-sepia transition mb-6"
      >
        <span>←</span> Back
      </Link>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-violet-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display text-ink mb-2">Share a Photo</h1>
        <p className="text-sepia/60">
          Upload a photo and Clio will ask you about the memories behind it.
        </p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Upload phase */}
      {phase === 'upload' && (
        <div className="space-y-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[4/3] border-2 border-dashed border-sepia/20 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-sepia/40 hover:bg-sepia/5 transition cursor-pointer"
          >
            {preview ? (
              <img
                src={preview}
                alt="Selected photo"
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <>
                <svg
                  className="w-12 h-12 text-sepia/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <p className="text-sepia/50 text-sm">Tap to choose a photo</p>
                <p className="text-sepia/30 text-xs">JPEG, PNG or WebP up to 10MB</p>
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div>
            <label className="block text-sm text-sepia/60 mb-1">
              Which chapter does this relate to?
            </label>
            <select
              value={selectedChapter}
              onChange={e => setSelectedChapter(e.target.value)}
              className="w-full px-3 py-2 border border-sepia/15 rounded-xl bg-white text-ink focus:border-sepia/40 focus:outline-none"
            >
              <option value="">Let Clio decide</option>
              {unlockedChapters.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Analyzing phase */}
      {phase === 'analyzing' && (
        <div className="text-center py-12">
          {preview && (
            <img
              src={preview}
              alt="Analyzing"
              className="w-48 h-48 object-cover rounded-2xl mx-auto mb-6 opacity-80"
            />
          )}
          <div className="w-8 h-8 border-2 border-sepia/20 border-t-sepia rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sepia/60">Clio is looking at your photo...</p>
        </div>
      )}

      {/* Result phase */}
      {phase === 'result' && analysis && (
        <div className="space-y-6">
          {preview && (
            <img src={preview} alt="Your photo" className="w-full rounded-2xl shadow-md" />
          )}

          <div className="bg-white border border-sepia/10 rounded-2xl p-5">
            <p className="text-ink leading-relaxed mb-3">{analysis.description}</p>
            {analysis.era && analysis.era !== 'unknown' && (
              <p className="text-sepia/50 text-sm">Estimated era: {analysis.era}</p>
            )}
          </div>

          {analysis.questions?.length > 0 && (
            <div className="bg-amber-50/50 border border-amber-200/30 rounded-xl p-4">
              <p className="text-amber-800/70 text-sm font-medium mb-2">
                Clio would love to ask you about:
              </p>
              <ul className="space-y-1.5">
                {analysis.questions.slice(0, 3).map((q, i) => (
                  <li key={i} className="text-amber-800/60 text-sm flex gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleTalkAboutPhoto}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium text-lg hover:shadow-lg transition-all"
          >
            Talk About This Photo
          </button>

          <button
            onClick={handleReset}
            className="w-full py-3 text-sepia/50 hover:text-sepia transition text-sm"
          >
            Choose a different photo
          </button>
        </div>
      )}

      {/* Tips */}
      {phase === 'upload' && (
        <div className="mt-8 p-4 bg-sepia/5 rounded-xl">
          <p className="text-sepia/60 text-sm font-medium mb-2">Great photos for your memoir:</p>
          <ul className="space-y-1 text-sepia/50 text-sm">
            <li>• Family gatherings, weddings, holidays</li>
            <li>• Childhood homes, schools, workplaces</li>
            <li>• Candid moments (more powerful than posed portraits)</li>
            <li>• Old documents, letters, postcards</li>
            <li>• Cherished objects and heirlooms</li>
          </ul>
        </div>
      )}
    </div>
  )
}
