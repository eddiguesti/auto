import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, Badge, Skeleton } from '../../components/ui'

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
    <div className="flex justify-between gap-4 py-2 border-b border-sepia-100 last:border-0">
      <span className="text-sepia-600 text-sm">{label}</span>
      <span className="text-ink text-sm font-medium text-right break-all">{value}</span>
    </div>
  )
}

const STATUS_VARIANTS = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
  refunded: 'info'
}

function StatusBadge({ status }) {
  return <Badge variant={STATUS_VARIANTS[status] || 'neutral'}>{status}</Badge>
}

const TH_CLASSES = 'px-6 py-3 text-xs font-medium text-sepia-500 uppercase tracking-caps'

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
      const res = await authFetch(`/api/v1/admin/users/${id}`)
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
      const res = await authFetch(`/api/v1/admin/users/${id}/premium`, {
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
      <div className="min-h-screen bg-parchment">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-5 w-32 mb-3" />
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
          <Skeleton className="h-56" />
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
          <Button to="/admin/users">Back to Users</Button>
        </div>
      </div>
    )
  }

  const user = userData
  const isPremium = user.premium_until && new Date(user.premium_until) > new Date()

  return (
    <div className="min-h-screen bg-parchment">
      <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
        {/* Header */}
        <div className="mb-8">
          <Button
            to="/admin/users"
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2"
            icon={<IconArrowLeft size={18} stroke={1.75} />}
          >
            Back to Users
          </Button>
          <h1 className="text-3xl font-display text-ink">{user.name || 'Unnamed User'}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User info card */}
          <Card>
            <h2 className="text-lg font-display text-ink mb-4">User Info</h2>
            <InfoRow label="ID" value={user.id} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Name" value={user.name || '-'} />
            <InfoRow label="Birth Year" value={user.birth_year || '-'} />
            <InfoRow label="Email Verified" value={user.email_verified ? 'Yes' : 'No'} />
            <InfoRow label="Admin" value={user.is_admin ? 'Yes' : 'No'} />
            <InfoRow label="Stories" value={user.storyCount} />
            <InfoRow label="Joined" value={formatDate(user.created_at)} />
          </Card>

          {/* Premium management card */}
          <Card>
            <h2 className="text-lg font-display text-ink mb-4">Premium Status</h2>
            <div className="mb-5">
              {isPremium ? (
                <div className="p-4 bg-success-soft rounded-xl">
                  <p className="text-success-strong font-medium">Premium Active</p>
                  <p className="text-success-strong text-sm mt-1">
                    Expires: {formatDate(user.premium_until)}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-sepia-50 rounded-xl">
                  <p className="text-sepia-700 font-medium">Free Plan</p>
                  {user.premium_until && (
                    <p className="text-sepia-500 text-sm mt-1">
                      Expired: {formatDate(user.premium_until)}
                    </p>
                  )}
                </div>
              )}
            </div>
            <Button size="xl" onClick={handleGrantPremium} disabled={premiumLoading}>
              {premiumLoading ? 'Granting...' : 'Grant / Extend Premium'}
            </Button>
          </Card>
        </div>

        {/* Payment history */}
        <Card padding="none" className="mt-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-sepia-100">
            <h2 className="text-lg font-display text-ink">Payment History</h2>
          </div>
          {payments.length === 0 ? (
            <div className="px-6 py-8 text-center text-sepia-500 text-sm">No payments</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-sepia-100">
                    <th className={TH_CLASSES}>ID</th>
                    <th className={TH_CLASSES}>Product</th>
                    <th className={TH_CLASSES}>Amount</th>
                    <th className={TH_CLASSES}>Status</th>
                    <th className={TH_CLASSES}>Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sepia-100">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-sepia-50 transition-colors">
                      <td className="px-6 py-3 text-sepia-500 font-mono text-xs">{p.id}</td>
                      <td className="px-6 py-3 text-ink">
                        {p.product_type}
                        {p.product_id && (
                          <span className="text-sepia-500 ml-1">({p.product_id})</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-ink">{formatCurrency(p.amount)}</td>
                      <td className="px-6 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-3 text-sepia-500">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
