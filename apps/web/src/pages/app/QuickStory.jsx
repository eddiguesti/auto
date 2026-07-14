import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import AppShell from '../../components/layout/AppShell'
import { Button, Input, Textarea } from '../../components/ui'

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
      const res = await authFetch('/api/v1/free-stories', {
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
      <AppShell back="/home" title="Tell a story">
        <div className="py-16 text-center page-enter">
          <div className="w-16 h-16 bg-success-soft text-success rounded-full flex items-center justify-center mx-auto mb-5">
            <IconCircleCheck size={32} stroke={1.5} />
          </div>
          <h2 className="text-2xl font-display text-ink mb-2">Story saved</h2>
          <p className="text-sepia-600">Your memory has been preserved.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell back="/home" title="Tell a story">
      <div className="py-8 page-enter">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display text-ink mb-2">Tell a Story</h1>
          <p className="text-sepia-600">
            Write whatever comes to mind. A memory, a moment, a feeling.
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

        <Input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Give it a title (optional)"
          aria-label="Story title"
          className="mb-4 font-serif !text-lg"
        />

        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Start writing your story..."
          aria-label="Your story"
          rows={12}
          className="font-serif !text-lg min-h-[320px]"
          autoFocus
        />

        <div className="flex items-center justify-between gap-4 mt-6">
          <span className="text-sepia-500 text-sm">
            {content.length > 0
              ? `${content.trim().split(/\s+/).filter(Boolean).length} words`
              : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/home')}>
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={!content.trim() || saving}
              loading={saving}
            >
              {saving ? 'Saving...' : 'Save Story'}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
