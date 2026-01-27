import { useState, useRef } from 'react'

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
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
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
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('story_id', storyId)

    try {
      await fetch('/api/photos', {
        method: 'POST',
        body: formData
      })
      onPhotosChange()
    } catch (err) {
      console.error('Error uploading photo:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const deletePhoto = async (photoId) => {
    if (!confirm('Delete this photo?')) return
    try {
      await fetch(`/api/photos/${photoId}`, { method: 'DELETE' })
      onPhotosChange()
    } catch (err) {
      console.error('Error deleting photo:', err)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Question Header */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 sm:p-6 border-b border-amber-200">
        <h2 className="text-lg sm:text-xl font-bold text-ink mb-2">
          {question.question}
        </h2>
        <p className="text-sepia/80 text-sm">
          {question.prompt}
        </p>
      </div>

      {/* Answer Area */}
      <div className="p-4 sm:p-6">
        <div className="relative">
          <textarea
            value={answer}
            onChange={handleAnswerChange}
            placeholder="Start writing your memory here... Take your time, there's no rush."
            className="w-full h-48 sm:h-64 p-3 sm:p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sepia/30 focus:border-sepia text-ink leading-relaxed text-base"
          />
          {saving && (
            <span className="absolute bottom-3 right-3 text-xs text-sepia/50">
              Saving...
            </span>
          )}
        </div>

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
        <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-3">
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
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 border border-sepia/30 text-sepia rounded-lg hover:bg-sepia/5 active:bg-sepia/10 transition cursor-pointer ${
              !storyId ? 'opacity-50 cursor-not-allowed' : ''
            } ${uploading ? 'opacity-50' : ''}`}
          >
            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {uploading ? 'Uploading...' : 'Add Photo'}
          </label>
          {!storyId && answer.trim() && (
            <span className="text-xs text-sepia/50 self-center text-center sm:text-left">
              (Save some text first to add photos)
            </span>
          )}

          {/* AI Assistant */}
          <button
            onClick={onAskAI}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 active:scale-[0.98] transition"
          >
            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Ask AI for Help
          </button>
        </div>

        {/* Tips */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 rounded-lg">
          <p className="text-sm text-sepia/80">
            <strong className="text-ink">Writing tip:</strong> Don't worry about perfect prose.
            Just write naturally as if you're telling a friend. The AI can help you expand your thoughts
            or ask follow-up questions to dig deeper into your memories.
          </p>
        </div>
      </div>
    </div>
  )
}
