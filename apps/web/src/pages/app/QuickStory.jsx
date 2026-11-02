import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function StoryLibrary() {
  const { authFetch, user } = useAuth()
  const draftKey = `memoir-draft:${user?.id}:standalone`
  const readDraft = () => {
    try {
      return JSON.parse(sessionStorage.getItem(draftKey) || '{}')
    } catch {
      return {}
    }
  }
  const [title, setTitle] = useState(() => readDraft().title || '')
  const [content, setContent] = useState(() => readDraft().content || '')
  const [editingId, setEditingId] = useState(() => readDraft().editingId || null)
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(
    async (offset = 0) => {
      setLoading(true)
      try {
        const res = await authFetch(`/api/free-stories?limit=50&offset=${offset}`)
        if (!res.ok) throw new Error('Could not load your saved stories. Please try again.')
        const body = await res.json()
        if (!Array.isArray(body.data)) throw new Error('Could not load your saved stories.')
        setStories(old => (offset ? [...old, ...body.data] : body.data))
        setHasMore(body.data.length === 50)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [authFetch]
  )

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    try {
      if (content || title)
        sessionStorage.setItem(draftKey, JSON.stringify({ title, content, editingId }))
      else sessionStorage.removeItem(draftKey)
    } catch {
      /* Server saves remain available without browser storage. */
    }
  }, [title, content, editingId, draftKey])

  const handleSave = async event => {
    event.preventDefault()
    if (!content.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await authFetch(
        editingId ? `/api/free-stories/${editingId}` : '/api/free-stories',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify({ title: title.trim() || null, content: content.trim() })
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save. Your draft is kept in this tab.')
      }
      setTitle('')
      setContent('')
      setEditingId(null)
      setSaved(true)
      sessionStorage.removeItem(draftKey)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const edit = story => {
    if ((content || title) && !window.confirm('Replace the current draft with this saved story?'))
      return
    setTitle(story.title || '')
    setContent(story.content)
    setEditingId(story.id)
    setSaved(false)
    window.scrollTo?.({ top: 0, behavior: 'smooth' })
  }
  const remove = async story => {
    if (!window.confirm('Delete this story from your memoir?')) return
    try {
      const res = await authFetch(`/api/free-stories/${story.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not delete the story.')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 page-enter">
      <Link to="/home" className="text-sepia/60 hover:text-sepia">
        ← Back to your memoir
      </Link>
      <h1 className="text-3xl font-display text-ink mt-6 mb-2">Tell a Story</h1>
      <p className="text-sepia/60 mb-6">
        Write a memory in your own words. Saved stories are included in your memoir and can be
        edited below.
      </p>
      {error && (
        <div role="alert" className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      {saved && (
        <p role="status" className="text-green-700 mb-4">
          Story saved. You can reopen it in Your stories below.
        </p>
      )}
      <form onSubmit={handleSave}>
        <h2 className="text-lg font-medium mb-3">{editingId ? 'Edit story' : 'New story'}</h2>
        <label htmlFor="story-title" className="block mb-1">
          Title (optional)
        </label>
        <input
          id="story-title"
          value={title}
          onChange={e => {
            setTitle(e.target.value)
            setSaved(false)
          }}
          maxLength={200}
          className="w-full px-4 py-3 border border-sepia/20 rounded-xl mb-4"
        />
        <label htmlFor="story-content" className="block mb-1">
          Your story
        </label>
        <textarea
          id="story-content"
          value={content}
          onChange={e => {
            setContent(e.target.value)
            setSaved(false)
          }}
          required
          className="w-full px-4 py-4 border border-sepia/20 rounded-xl min-h-[300px] leading-relaxed"
        />
        <div className="flex justify-between items-center mt-4 mb-10 gap-4">
          <span className="text-sm text-sepia/60">
            {content.trim().split(/\s+/).filter(Boolean).length} words · Draft kept in this tab
          </span>
          <button
            type="submit"
            disabled={!content.trim() || saving}
            className="px-6 py-3 bg-sepia text-white rounded-xl disabled:opacity-40"
          >
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Story'}
          </button>
        </div>
      </form>
      <section aria-labelledby="saved-stories-heading">
        <h2 id="saved-stories-heading" className="text-2xl font-display mb-4">
          Your stories
        </h2>
        {loading && <p role="status">Loading stories...</p>}
        {!loading && !stories.length && (
          <p className="text-sepia/60">Your saved stories will appear here.</p>
        )}
        <ul className="space-y-4">
          {stories.map(story => (
            <li key={story.id} className="p-4 border border-sepia/20 rounded-xl">
              <h3 className="font-medium">{story.title || 'Untitled story'}</h3>
              <p className="text-sepia/70 whitespace-pre-wrap mt-2">
                {story.content.slice(0, 250)}
                {story.content.length > 250 ? '…' : ''}
              </p>
              <div className="flex gap-4 mt-3">
                <button
                  onClick={() => edit(story)}
                  className="underline"
                  aria-label={`Edit ${story.title || 'untitled story'}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(story)}
                  className="text-red-700 underline"
                  aria-label={`Delete ${story.title || 'untitled story'}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            disabled={loading}
            onClick={() => load(stories.length)}
            className="underline mt-4"
          >
            Load more stories
          </button>
        )}
      </section>
    </main>
  )
}

export default function QuickStory() {
  const { user } = useAuth()
  return <StoryLibrary key={user?.id} />
}
