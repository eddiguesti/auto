import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function isPremiumActive(premiumUntil) {
  return premiumUntil && new Date(premiumUntil) > new Date()
}

function PremiumBadge({ premiumUntil }) {
  if (isPremiumActive(premiumUntil)) {
    return (
      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
        Premium until {formatDate(premiumUntil)}
      </span>
    )
  }
  return (
    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Free</span>
  )
}

function Pagination({ meta, onPageChange }) {
  const totalPages = Math.ceil(meta.total / meta.limit)

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-warm-brown/10">
      <p className="text-sm text-warm-brown/60">
        Showing {(meta.page - 1) * meta.limit + 1}
        {' - '}
        {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
          className="px-3 py-1 text-sm border border-warm-brown/20 rounded hover:bg-warm-brown/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= totalPages}
          className="px-3 py-1 text-sm border border-warm-brown/20 rounded hover:bg-warm-brown/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const { authFetch } = useAuth()
  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [premiumLoading, setPremiumLoading] = useState(null)

  const loadUsers = useCallback(
    async (page = 1, query = '') => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ page, limit: 20 })
        if (query) params.set('q', query)

        const res = await authFetch(`/api/admin/users?${params}`)
        if (!res.ok) throw new Error('Failed to load users')

        const data = await res.json()
        setUsers(data.users)
        setMeta(data.meta)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [authFetch]
  )

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  function handleSearch(e) {
    e.preventDefault()
    loadUsers(1, search)
  }

  function handlePageChange(page) {
    loadUsers(page, search)
  }

  async function handleGrantPremium(userId) {
    const months = window.prompt('How many months of premium to grant?', '1')
    if (!months) return

    const parsed = parseInt(months, 10)
    if (isNaN(parsed) || parsed < 1) {
      alert('Please enter a valid number of months')
      return
    }

    setPremiumLoading(userId)
    try {
      const res = await authFetch(`/api/admin/users/${userId}/premium`, {
        method: 'POST',
        body: JSON.stringify({ months: parsed })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to grant premium')
      }

      // Reload current page to reflect changes
      await loadUsers(meta.page, search)
    } catch (err) {
      alert(err.message)
    } finally {
      setPremiumLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-parchment">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif text-warm-brown">Users</h1>
            <p className="text-warm-brown/60 mt-1">{meta.total} total users</p>
          </div>
          <Link
            to="/admin"
            className="px-4 py-2 border border-warm-brown/20 text-warm-brown rounded-lg hover:bg-warm-brown/5 transition text-sm"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="flex-1 px-4 py-2 border border-warm-brown/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-brown/30 bg-white text-warm-brown placeholder:text-warm-brown/40"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition text-sm"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  loadUsers(1, '')
                }}
                className="px-4 py-2 border border-warm-brown/20 text-warm-brown rounded-lg hover:bg-warm-brown/5 transition text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-brown/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-brown/10 text-left">
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">ID</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Name</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Email</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Stories</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Status</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Joined</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-warm-brown/50">
                      Loading...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-warm-brown/50">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr
                      key={u.id}
                      className="border-b border-warm-brown/5 hover:bg-warm-brown/[0.02] transition"
                    >
                      <td className="px-6 py-3 text-warm-brown/50 font-mono text-xs">{u.id}</td>
                      <td className="px-6 py-3 text-warm-brown font-medium">
                        <Link to={`/admin/users/${u.id}`} className="hover:underline">
                          {u.name || 'Unnamed'}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-warm-brown/70">{u.email}</td>
                      <td className="px-6 py-3 text-warm-brown/70">{u.story_count}</td>
                      <td className="px-6 py-3">
                        <PremiumBadge premiumUntil={u.premium_until} />
                      </td>
                      <td className="px-6 py-3 text-warm-brown/60">{formatDate(u.created_at)}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleGrantPremium(u.id)}
                          disabled={premiumLoading === u.id}
                          className="px-3 py-1 text-xs border border-warm-brown/20 text-warm-brown rounded hover:bg-warm-brown/5 transition disabled:opacity-50"
                        >
                          {premiumLoading === u.id ? 'Granting...' : 'Grant Premium'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && <Pagination meta={meta} onPageChange={handlePageChange} />}
        </div>
      </div>
    </div>
  )
}
