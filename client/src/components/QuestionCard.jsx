import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export default function QuestionCard({
  question,
  answer,
  onAnswerChange,
  onAskAI,
  chapterId,
  storyId,
  photos,
  onPhotosChange
}) {
  const { authFetch } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  const handleAnswerChange = (e) => {
    onAnswerChange(e.target.value)

    // Show saving indicator
    setSaving(true)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      setSaving(false)
    }, 1500)
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !storyId) return

    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('story_id', storyId)

    try {
      const res = await authFetch('/api/photos', {
        method: 'POST',
        body: formData
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Upload failed')
      }
      onPhotosChange()
    } catch (err) {
      console.error('Error uploading photo:', err)
      setError('Failed to upload photo. Please try again.')
      setTimeout(() => setError(null), 4000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const deletePhoto = async (photoId) => {
    if (!confirm('Delete this photo?')) return
    setError(null)
    try {
      const res = await authFetch(`/api/photos/${photoId}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('Delete failed')
      }
      onPhotosChange()
    } catch (err) {
      console.error('Error deleting photo:', err)
      setError('Failed to delete photo. Please try again.')
      setTimeout(() => setError(null), 4000)
    }
  }

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-sepia/10 overflow-hidden page-enter">
      {/* Question Header */}
      <div className="p-4 sm:p-6 border-b border-sepia/10">
        <h2 className="text-lg sm:text-xl text-ink mb-2 font-medium leading-relaxed">
          {question.question}
        </h2>
        <p className="text-sepia/70 text-sm italic">
          {question.prompt}
        </p>
      </div>

      {/* Answer Area */}
      <div className="p-4 sm:p-6">
        <div className="relative">
          <textarea
            value={answer}
            onChange={handleAnswerChange}
            placeholder="Begin your recollection here... Take your time, every memory matters."
            className="w-full h-48 sm:h-64 p-4 sm:p-5 border border-sepia/20 rounded bg-white/50 resize-none focus:outline-none focus:ring-1 focus:ring-sepia/30 focus:border-sepia/40 text-ink leading-loose text-base placeholder:text-sepia/40 placeholder:italic"
          />
          {saving && (
            <span className="absolute bottom-3 right-3 text-xs text-sepia/50 italic">
              Saving...
            </span>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-2 bg-red-50 text-red-700 rounded text-sm text-center">
            {error}
          </div>
        )}

        {/* Photos */}
        {photos && photos.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-sepia mb-2">Photos</p>
            <div className="flex flex-wrap gap-2">
              {photos.map(photo => (
                <div key={photo.id} className="relative group">
                  <img
                    src={`/api/photos/file/${photo.filename}`}
                    alt={photo.caption || 'Memory photo'}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute -top-2 -right-2 w-7 h-7 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition text-sm sm:text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-3">
          {/* Upload Photo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className={`inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 border border-sepia/25 text-sepia/80 rounded hover:bg-white/50 hover:border-sepia/40 transition ${
              !storyId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${uploading ? 'opacity-50' : ''}`}
            onClick={(e) => {
              if (!storyId) {
                e.preventDefault()
                setError('Please write and save your answer first (wait a moment after typing)')
                setTimeout(() => setError(null), 4000)
              }
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm">{uploading ? 'Uploading...' : 'Add Photograph'}</span>
          </label>
          {!storyId && (
            <span className="text-xs text-sepia/50 self-center text-center sm:text-left italic">
              {answer.trim() ? '(Saving... photos enabled shortly)' : '(Write something first to add photos)'}
            </span>
          )}

          {/* AI Assistant */}
          <button
            onClick={onAskAI}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-ink text-white/90 rounded hover:bg-ink/90 transition tap-bounce pulse-gentle"
          >
            <span className="text-base">✒️</span>
            <span className="text-sm">Writing Assistant</span>
          </button>
        </div>

        {/* Tips */}
        <div className="mt-5 sm:mt-6 p-4 bg-sepia/5 rounded border-l-2 border-sepia/30">
          <p className="text-sm text-sepia/70 italic leading-relaxed">
            <span className="text-sepia not-italic">A note:</span> Write as though speaking to a dear friend.
            The words need not be perfect — the assistant can help refine your thoughts
            and draw out the richer details of your memories.
          </p>
        </div>
      </div>
    </div>
  )
}
