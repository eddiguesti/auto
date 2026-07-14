import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { IconAlertCircle, IconUsers } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, Badge, Input, Skeleton, EmptyState } from '../../components/ui'

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
    return <Badge variant="success">Premium until {formatDate(premiumUntil)}</Badge>
  }
  return <Badge variant="neutral">Free</Badge>
}

function Pagination({ meta, onPageChange }) {
  const totalPages = Math.ceil(meta.total / meta.limit)

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-sepia-100">
      <p className="text-sm text-sepia-600">
        Showing {(meta.page - 1) * meta.limit + 1}
        {' - '}
        {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

const TH_CLASSES = 'px-6 py-3 text-xs font-medium text-sepia-500 uppercase tracking-caps'

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

        const res = await authFetch(`/api/v1/admin/users?${params}`)
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
      const res = await authFetch(`/api/v1/admin/users/${userId}/premium`, {
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
      <div className="max-w-6xl mx-auto px-4 py-8 page-enter">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display text-ink">Users</h1>
            <p className="text-sepia-600 mt-1">{meta.total} total users</p>
          </div>
          <Button to="/admin" variant="secondary" size="sm">
            Back to Dashboard
          </Button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[16rem]">
              <Input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                aria-label="Search users"
              />
            </div>
            <Button type="submit" size="lg">
              Search
            </Button>
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => {
                  setSearch('')
                  loadUsers(1, '')
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-error-soft text-error-strong rounded-xl text-sm flex items-center gap-3">
            <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Users table */}
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-sepia-100">
                  <th className={TH_CLASSES}>ID</th>
                  <th className={TH_CLASSES}>Name</th>
                  <th className={TH_CLASSES}>Email</th>
                  <th className={TH_CLASSES}>Stories</th>
                  <th className={TH_CLASSES}>Status</th>
                  <th className={TH_CLASSES}>Joined</th>
                  <th className={TH_CLASSES}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sepia-100">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-6 py-3">
                        <Skeleton className="h-6" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={<IconUsers size={24} stroke={1.5} />}
                        title="No users found"
                        description="Try a different name or email."
                      />
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-sepia-50 transition-colors">
                      <td className="px-6 py-3 text-sepia-500 font-mono text-xs">{u.id}</td>
                      <td className="px-6 py-3 text-ink font-medium">
                        <Link to={`/admin/users/${u.id}`} className="hover:underline">
                          {u.name || 'Unnamed'}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-sepia-600">{u.email}</td>
                      <td className="px-6 py-3 text-sepia-600">{u.story_count}</td>
                      <td className="px-6 py-3">
                        <PremiumBadge premiumUntil={u.premium_until} />
                      </td>
                      <td className="px-6 py-3 text-sepia-500">{formatDate(u.created_at)}</td>
                      <td className="px-6 py-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleGrantPremium(u.id)}
                          disabled={premiumLoading === u.id}
                        >
                          {premiumLoading === u.id ? 'Granting...' : 'Grant Premium'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && <Pagination meta={meta} onPageChange={handlePageChange} />}
        </Card>
      </div>
    </div>
  )
}
