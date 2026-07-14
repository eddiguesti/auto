import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { IconAlertCircle } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, Badge, Skeleton } from '../../components/ui'

function MetricCard({ label, value, subtext }) {
  return (
    <Card padding="md">
      <p className="eyebrow mb-2">{label}</p>
      <p className="text-3xl font-display text-ink">{value}</p>
      {subtext && <p className="text-sm text-sepia-500 mt-1">{subtext}</p>}
    </Card>
  )
}

function formatCurrency(pence) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(pence / 100)
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function AdminDashboard() {
  const { authFetch } = useAuth()
  const [metrics, setMetrics] = useState(null)
  const [recentUsers, setRecentUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError(null)

    try {
      const [metricsRes, usersRes] = await Promise.all([
        authFetch('/api/v1/admin/metrics'),
        authFetch('/api/v1/admin/users?limit=10&page=1')
      ])

      if (!metricsRes.ok || !usersRes.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const metricsData = await metricsRes.json()
      const usersData = await usersRes.json()

      setMetrics(metricsData)
      setRecentUsers(usersData.users)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-72 mb-2" />
          <Skeleton className="h-5 w-44 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <div className="mb-6 p-4 bg-error-soft text-error-strong rounded-xl text-sm flex items-center gap-3 text-left">
            <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
            {error}
          </div>
          <Button onClick={loadDashboard}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-parchment">
      <div className="max-w-6xl mx-auto px-4 py-8 page-enter">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-display text-ink">Admin Dashboard</h1>
            <p className="text-sepia-600 mt-1">Easy Memoir overview</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button to="/admin/users" size="sm">
              Manage Users
            </Button>
            <Button to="/admin/payments" variant="secondary" size="sm">
              Payments
            </Button>
            <Button to="/home" variant="ghost" size="sm">
              Back to App
            </Button>
          </div>
        </div>

        {/* Metric cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <MetricCard label="Total Users" value={metrics.totalUsers.toLocaleString()} />
            <MetricCard
              label="Active Users (7d)"
              value={metrics.activeUsers7d.toLocaleString()}
              subtext="Users who wrote stories this week"
            />
            <MetricCard label="Total Stories" value={metrics.totalStories.toLocaleString()} />
            <MetricCard
              label="Revenue"
              value={formatCurrency(metrics.revenueTotal)}
              subtext={`${metrics.totalPayments} payments`}
            />
          </div>
        )}

        {/* Recent signups */}
        <Card padding="none" className="overflow-hidden">
          <div className="px-6 py-4 border-b border-sepia-100 flex items-center justify-between">
            <h2 className="text-lg font-display text-ink">Recent Signups</h2>
            <Button to="/admin/users" variant="ghost" size="sm">
              View all
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-sepia-100">
                  <th className="px-6 py-3 text-xs font-medium text-sepia-500 uppercase tracking-caps">
                    Name
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-sepia-500 uppercase tracking-caps">
                    Email
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-sepia-500 uppercase tracking-caps">
                    Stories
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-sepia-500 uppercase tracking-caps">
                    Premium
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-sepia-500 uppercase tracking-caps">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sepia-100">
                {recentUsers.map(u => (
                  <tr key={u.id} className="hover:bg-sepia-50 transition-colors">
                    <td className="px-6 py-3 text-ink">
                      <Link to={`/admin/users/${u.id}`} className="hover:underline font-medium">
                        {u.name || 'Unnamed'}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sepia-600">{u.email}</td>
                    <td className="px-6 py-3 text-sepia-600">{u.story_count}</td>
                    <td className="px-6 py-3">
                      {u.premium_until && new Date(u.premium_until) > new Date() ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="neutral">Free</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sepia-500">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
