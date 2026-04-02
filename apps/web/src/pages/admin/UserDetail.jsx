import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatCurrency(pence) {
  if (pence == null) return '-'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(pence / 100)
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-warm-brown/5">
      <span className="text-warm-brown/60 text-sm">{label}</span>
      <span className="text-warm-brown text-sm font-medium">{value}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = {
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-blue-100 text-blue-700'
  }

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs ${colors[status] || 'bg-gray-100 text-gray-500'}`}
    >
      {status}
    </span>
  )
}

export default function AdminUserDetail() {
  const { id } = useParams()
  const { authFetch } = useAuth()
  const [userData, setUserData] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [premiumLoading, setPremiumLoading] = useState(false)

  const loadUser = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await authFetch(`/api/admin/users/${id}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load user')
      }

      const data = await res.json()
      setUserData(data.user)
      setPayments(data.payments)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id, authFetch])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  async function handleGrantPremium() {
    const months = window.prompt('How many months of premium to grant?', '1')
    if (!months) return

    const parsed = parseInt(months, 10)
    if (isNaN(parsed) || parsed < 1) {
      alert('Please enter a valid number of months')
      return
    }

    setPremiumLoading(true)
    try {
      const res = await authFetch(`/api/admin/users/${id}/premium`, {
        method: 'POST',
        body: JSON.stringify({ months: parsed })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to grant premium')
      }

      await loadUser()
    } catch (err) {
      alert(err.message)
    } finally {
      setPremiumLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <div className="animate-pulse text-warm-brown">Loading user...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            to="/admin/users"
            className="px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition"
          >
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  const user = userData
  const isPremium = user.premium_until && new Date(user.premium_until) > new Date()

  return (
    <div className="min-h-screen bg-parchment">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              to="/admin/users"
              className="text-sm text-warm-brown/60 hover:text-warm-brown transition"
            >
              &larr; Back to Users
            </Link>
            <h1 className="text-3xl font-serif text-warm-brown mt-1">
              {user.name || 'Unnamed User'}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User info card */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-brown/10 p-6">
            <h2 className="text-lg font-serif text-warm-brown mb-4">User Info</h2>
            <InfoRow label="ID" value={user.id} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Name" value={user.name || '-'} />
            <InfoRow label="Birth Year" value={user.birth_year || '-'} />
            <InfoRow label="Email Verified" value={user.email_verified ? 'Yes' : 'No'} />
            <InfoRow label="Admin" value={user.is_admin ? 'Yes' : 'No'} />
            <InfoRow label="Stories" value={user.storyCount} />
            <InfoRow label="Joined" value={formatDate(user.created_at)} />
          </div>

          {/* Premium management card */}
          <div className="bg-white rounded-xl shadow-sm border border-warm-brown/10 p-6">
            <h2 className="text-lg font-serif text-warm-brown mb-4">Premium Status</h2>
            <div className="mb-4">
              {isPremium ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium">Premium Active</p>
                  <p className="text-green-600 text-sm mt-1">
                    Expires: {formatDate(user.premium_until)}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-600 font-medium">Free Plan</p>
                  {user.premium_until && (
                    <p className="text-gray-500 text-sm mt-1">
                      Expired: {formatDate(user.premium_until)}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleGrantPremium}
              disabled={premiumLoading}
              className="w-full px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown/90 transition text-sm disabled:opacity-50"
            >
              {premiumLoading ? 'Granting...' : 'Grant / Extend Premium'}
            </button>
          </div>
        </div>

        {/* Payment history */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-warm-brown/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-warm-brown/10">
            <h2 className="text-lg font-serif text-warm-brown">Payment History</h2>
          </div>
          {payments.length === 0 ? (
            <div className="px-6 py-8 text-center text-warm-brown/50">No payments</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-brown/10 text-left">
                    <th className="px-6 py-3 text-warm-brown/60 font-medium">ID</th>
                    <th className="px-6 py-3 text-warm-brown/60 font-medium">Product</th>
                    <th className="px-6 py-3 text-warm-brown/60 font-medium">Amount</th>
                    <th className="px-6 py-3 text-warm-brown/60 font-medium">Status</th>
                    <th className="px-6 py-3 text-warm-brown/60 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr
                      key={p.id}
                      className="border-b border-warm-brown/5 hover:bg-warm-brown/[0.02] transition"
                    >
                      <td className="px-6 py-3 text-warm-brown/50 font-mono text-xs">{p.id}</td>
                      <td className="px-6 py-3 text-warm-brown">
                        {p.product_type}
                        {p.product_id && (
                          <span className="text-warm-brown/50 ml-1">({p.product_id})</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-warm-brown">{formatCurrency(p.amount)}</td>
                      <td className="px-6 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-3 text-warm-brown/60">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
