import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function QuickStory() {
  const { authFetch } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await authFetch('/api/free-stories', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim() || null,
          content: content.trim()
        })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => navigate('/home'), 1200)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save. Please try again.')
      }
    } catch (err) {
      console.error('Save error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center page-enter">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-display text-ink mb-2">Story saved</h2>
        <p className="text-sepia/60">Your memory has been preserved.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 page-enter">
      <button
        onClick={() => navigate('/home')}
        className="flex items-center gap-2 text-sepia/60 hover:text-sepia transition mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h1 className="text-2xl sm:text-3xl font-display text-ink mb-2">Tell a Story</h1>
      <p className="text-sepia/60 mb-8">
        Write whatever comes to mind. A memory, a moment, a feeling.
      </p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Give it a title (optional)"
        className="w-full px-4 py-3 border border-sepia/15 rounded-xl mb-4 text-lg bg-white focus:border-sepia/40 focus:outline-none focus:ring-2 focus:ring-sepia/10 transition placeholder:text-sepia/30"
      />

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Start writing your story..."
        className="w-full px-4 py-4 border border-sepia/15 rounded-xl min-h-[300px] text-base bg-white resize-y focus:border-sepia/40 focus:outline-none focus:ring-2 focus:ring-sepia/10 transition placeholder:text-sepia/30 leading-relaxed"
        autoFocus
      />

      <div className="flex items-center justify-between mt-6">
        <span className="text-sepia/40 text-sm">
          {content.length > 0 ? `${content.trim().split(/\s+/).filter(Boolean).length} words` : ''}
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/home')}
            className="px-5 py-2.5 text-sepia/60 hover:text-sepia rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim() || saving}
            className="px-8 py-2.5 bg-sepia text-white rounded-xl font-medium hover:bg-sepia/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving...' : 'Save Story'}
          </button>
        </div>
      </div>
    </div>
  )
}
