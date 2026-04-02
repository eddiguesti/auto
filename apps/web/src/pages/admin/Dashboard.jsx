import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function MetricCard({ label, value, subtext }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-warm-brown/10 p-6">
      <p className="text-sm text-warm-brown/60 font-medium">{label}</p>
      <p className="text-3xl font-serif text-warm-brown mt-1">{value}</p>
      {subtext && <p className="text-xs text-warm-brown/50 mt-1">{subtext}</p>}
    </div>
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
        authFetch('/api/admin/metrics'),
        authFetch('/api/admin/users?limit=10&page=1')
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
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <div className="animate-pulse text-warm-brown">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-parchment">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif text-warm-brown">Admin Dashboard</h1>
            <p className="text-warm-brown/60 mt-1">Easy Memoir overview</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/admin/users"
              className="px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition text-sm"
            >
              Manage Users
            </Link>
            <Link
              to="/admin/payments"
              className="px-4 py-2 border border-warm-brown/20 text-warm-brown rounded-lg hover:bg-warm-brown/5 transition text-sm"
            >
              Payments
            </Link>
            <Link
              to="/home"
              className="px-4 py-2 border border-warm-brown/20 text-warm-brown rounded-lg hover:bg-warm-brown/5 transition text-sm"
            >
              Back to App
            </Link>
          </div>
        </div>

        {/* Metric cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        <div className="bg-white rounded-xl shadow-sm border border-warm-brown/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-warm-brown/10 flex items-center justify-between">
            <h2 className="text-lg font-serif text-warm-brown">Recent Signups</h2>
            <Link
              to="/admin/users"
              className="text-sm text-warm-brown/60 hover:text-warm-brown transition"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-brown/10 text-left">
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Name</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Email</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Stories</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Premium</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr
                    key={u.id}
                    className="border-b border-warm-brown/5 hover:bg-warm-brown/[0.02] transition"
                  >
                    <td className="px-6 py-3 text-warm-brown">
                      <Link to={`/admin/users/${u.id}`} className="hover:underline font-medium">
                        {u.name || 'Unnamed'}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-warm-brown/70">{u.email}</td>
                    <td className="px-6 py-3 text-warm-brown/70">{u.story_count}</td>
                    <td className="px-6 py-3">
                      {u.premium_until && new Date(u.premium_until) > new Date() ? (
                        <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                          Free
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-warm-brown/60">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
