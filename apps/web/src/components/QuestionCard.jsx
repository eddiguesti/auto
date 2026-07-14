import { useState, useRef, useEffect, memo } from 'react'
import { IconCamera, IconFeather, IconLoader2, IconSearch, IconX } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Input, Textarea } from './ui'
import AuthenticatedImage from './AuthenticatedImage'

export default memo(function QuestionCard({
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
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [replaceCount, setReplaceCount] = useState(null)
  const fileInputRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const textareaRef = useRef(null)

  // Clear saveTimeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleAnswerChange = e => {
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

  const handlePhotoUpload = async e => {
    const file = e.target.files?.[0]
    if (!file || !storyId) return

    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('story_id', storyId)

    try {
      const res = await authFetch('/api/v1/photos', {
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

  const deletePhoto = async photoId => {
    if (!confirm('Delete this photo?')) return
    setError(null)
    try {
      const res = await authFetch(`/api/v1/photos/${photoId}`, { method: 'DELETE' })
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
    <Card padding="none" className="overflow-hidden page-enter">
      {/* Question Header */}
      <div className="p-5 sm:p-8 border-b border-sepia-100">
        <h2 className="font-display text-2xl sm:text-3xl text-ink leading-snug mb-2">
          {question.question}
        </h2>
        <p className="text-sepia-600 text-base">{question.prompt}</p>
      </div>

      {/* Answer Area */}
      <div className="p-5 sm:p-8 pt-5 sm:pt-6">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={answer}
            onChange={handleAnswerChange}
            placeholder="Begin your recollection here... Take your time, every memory matters."
            className="font-serif text-lg min-h-[14rem] sm:min-h-[18rem] p-4 sm:p-5 bg-cream/50"
          />
          {saving && (
            <span className="absolute bottom-3 right-4 inline-flex items-center gap-1.5 text-xs text-sepia-500">
              <IconLoader2 size={14} stroke={2} className="animate-spin" />
              Saving...
            </span>
          )}
        </div>

        {/* Quick edit hint + find/replace - shows when there's substantial content */}
        {answer && answer.length > 100 && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-sm text-sepia-500">
              You can edit the text directly above — fix any names, dates, or details
            </p>
            <Button
              variant={showFindReplace ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowFindReplace(!showFindReplace)}
              icon={<IconSearch size={16} stroke={1.75} />}
              className="whitespace-nowrap shrink-0"
            >
              Find & Replace
            </Button>
          </div>
        )}

        {/* Find & Replace panel */}
        {showFindReplace && (
          <div className="mt-3 p-4 bg-sepia-50 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="text"
                value={findText}
                onChange={e => {
                  setFindText(e.target.value)
                  setReplaceCount(null)
                }}
                placeholder="Find text..."
                className="flex-1 text-sm"
              />
              <Input
                type="text"
                value={replaceText}
                onChange={e => setReplaceText(e.target.value)}
                placeholder="Replace with..."
                className="flex-1 text-sm"
              />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!findText) return
                  const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
                  const matches = (answer.match(regex) || []).length
                  if (matches > 0) {
                    const newAnswer = answer.replace(regex, replaceText)
                    onAnswerChange(newAnswer)
                    setReplaceCount(matches)
                    setTimeout(() => setReplaceCount(null), 3000)
                  } else {
                    setReplaceCount(0)
                    setTimeout(() => setReplaceCount(null), 3000)
                  }
                }}
                disabled={!findText}
                className="shrink-0"
              >
                Replace All
              </Button>
            </div>
            {replaceCount !== null && (
              <p className="text-sm text-sepia-600">
                {replaceCount === 0
                  ? 'No matches found'
                  : `Replaced ${replaceCount} occurrence${replaceCount > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-3 bg-error-soft text-error-strong rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {/* Photos */}
        {photos && photos.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium text-ink-soft mb-2">Photos</p>
            <div className="flex flex-wrap gap-2">
              {photos.map(photo => (
                <div key={photo.id} className="relative group">
                  <AuthenticatedImage
                    src={`/api/v1/photos/file/${photo.filename}`}
                    alt={photo.caption || 'Memory photo'}
                    loading="lazy"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => deletePhoto(photo.id)}
                    aria-label="Delete photo"
                    className="absolute -top-2 -right-2 w-7 h-7 sm:w-6 sm:h-6 bg-error text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-soft"
                  >
                    <IconX size={14} stroke={2} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
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
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium select-none bg-surface text-ink border border-sepia-200 shadow-xs transition-all duration-200 ${
              !storyId
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer hover:border-sepia-300 hover:bg-sepia-50 tap-bounce'
            } ${uploading ? 'opacity-50' : ''}`}
            onClick={e => {
              if (!storyId) {
                e.preventDefault()
                setError('Please write and save your answer first (wait a moment after typing)')
                setTimeout(() => setError(null), 4000)
              }
            }}
          >
            <IconCamera size={20} stroke={1.75} />
            <span>{uploading ? 'Uploading...' : 'Add Photograph'}</span>
          </label>
          {!storyId && (
            <span className="text-sm text-sepia-500 self-center text-center sm:text-left">
              {answer.trim()
                ? '(Saving... photos enabled shortly)'
                : '(Write something first to add photos)'}
            </span>
          )}

          {/* AI Assistant */}
          <Button
            variant="secondary"
            onClick={onAskAI}
            icon={<IconFeather size={20} stroke={1.75} />}
          >
            Writing Assistant
          </Button>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-sepia-50 rounded-xl">
          <p className="text-sm text-sepia-600 leading-relaxed">
            <span className="font-medium text-ink-soft">A note:</span> Write as though speaking to a
            dear friend. The words need not be perfect — the assistant can help refine your thoughts
            and draw out the richer details of your memories.
          </p>
        </div>
      </div>
    </Card>
  )
})
