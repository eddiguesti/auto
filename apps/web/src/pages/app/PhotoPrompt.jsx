import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAlertCircle, IconPhoto, IconPhotoPlus } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { usePremium } from '../../hooks/usePremium'
import { chapters } from '../../data/chapters'
import AppShell from '../../components/layout/AppShell'
import { Button, Card, Field, Skeleton } from '../../components/ui'

const SELECT_CLASSES = [
  'w-full px-4 py-3 rounded-xl text-base text-ink bg-surface',
  'border border-sepia-200 hover:border-sepia-300',
  'focus:border-bronze-400 focus:ring-4 focus:ring-bronze-500/10 focus:outline-none',
  'transition-colors duration-150'
].join(' ')

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

      const res = await authFetch('/api/v1/photos/analyze', {
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
    <AppShell back="/home" title="Share a photo">
      <div className="max-w-lg mx-auto py-8 page-enter">
        <header className="text-center mb-8">
          <div className="w-11 h-11 bg-bronze-100 text-bronze-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <IconPhoto size={24} stroke={1.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display text-ink mb-2">Share a Photo</h1>
          <p className="text-sepia-600">
            Upload a photo and Clio will ask you about the memories behind it.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 p-4 bg-error-soft text-error-strong rounded-xl text-sm flex items-center gap-3"
          >
            <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Upload phase */}
        {phase === 'upload' && (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/3] border-2 border-dashed border-sepia-300 bg-sepia-50 hover:bg-sepia-100 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors duration-200 cursor-pointer overflow-hidden"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Selected photo"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <>
                  <IconPhotoPlus size={40} stroke={1.5} className="text-sepia-400" />
                  <p className="text-sepia-600 text-base font-medium">Tap to choose a photo</p>
                  <p className="text-sepia-500 text-sm">JPEG, PNG or WebP up to 10MB</p>
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

            <Field label="Which chapter does this relate to?">
              {id => (
                <select
                  id={id}
                  value={selectedChapter}
                  onChange={e => setSelectedChapter(e.target.value)}
                  className={SELECT_CLASSES}
                >
                  <option value="">Let Clio decide</option>
                  {unlockedChapters.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        )}

        {/* Analyzing phase */}
        {phase === 'analyzing' && (
          <div className="text-center py-12">
            {preview && (
              <img
                src={preview}
                alt="Analyzing"
                className="w-48 h-48 object-cover rounded-2xl shadow-soft mx-auto mb-6 opacity-80"
              />
            )}
            <div className="max-w-xs mx-auto space-y-2.5 mb-5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5 mx-auto" />
            </div>
            <p className="text-sepia-600">Clio is looking at your photo...</p>
          </div>
        )}

        {/* Result phase */}
        {phase === 'result' && analysis && (
          <div className="space-y-5">
            <Card padding="none" className="overflow-hidden">
              {preview && <img src={preview} alt="Your photo" className="w-full object-cover" />}
              <div className="p-5 sm:p-6">
                <p className="font-serif text-ink-soft leading-relaxed mb-3">
                  {analysis.description}
                </p>
                {analysis.era && analysis.era !== 'unknown' && (
                  <p className="text-sepia-500 text-sm">Estimated era: {analysis.era}</p>
                )}
              </div>
            </Card>

            {analysis.questions?.length > 0 && (
              <div className="bg-sepia-50 rounded-xl p-4">
                <p className="text-sepia-700 text-sm font-medium mb-2">
                  Clio would love to ask you about:
                </p>
                <ul className="space-y-1.5">
                  {analysis.questions.slice(0, 3).map((q, i) => (
                    <li key={i} className="text-sepia-600 text-sm flex gap-2">
                      <span className="text-bronze-500 mt-0.5">•</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button size="xl" onClick={handleTalkAboutPhoto}>
              Talk About This Photo
            </Button>

            <Button variant="ghost" className="w-full" onClick={handleReset}>
              Choose a different photo
            </Button>
          </div>
        )}

        {/* Tips */}
        {phase === 'upload' && (
          <div className="mt-8 p-5 bg-cream rounded-2xl">
            <p className="text-ink-soft text-sm font-medium mb-2">Great photos for your memoir:</p>
            <ul className="space-y-1 text-sepia-600 text-sm">
              <li>• Family gatherings, weddings, holidays</li>
              <li>• Childhood homes, schools, workplaces</li>
              <li>• Candid moments (more powerful than posed portraits)</li>
              <li>• Old documents, letters, postcards</li>
              <li>• Cherished objects and heirlooms</li>
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  )
}
