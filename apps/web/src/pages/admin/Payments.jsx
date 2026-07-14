import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { IconAlertCircle, IconReceipt } from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, Badge, Skeleton, EmptyState } from '../../components/ui'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatCurrency(pence) {
  if (pence == null) return '-'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(pence / 100)
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

export default function AdminPayments() {
  const { authFetch } = useAuth()
  const [payments, setPayments] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refundLoading, setRefundLoading] = useState(null)

  const loadPayments = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ page, limit: 20 })
        const res = await authFetch(`/api/admin/payments?${params}`)
        if (!res.ok) throw new Error('Failed to load payments')

        const data = await res.json()
        setPayments(data.payments)
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
    loadPayments()
  }, [loadPayments])

  function handlePageChange(page) {
    loadPayments(page)
  }

  async function handleProcessRefund(paymentId) {
    const confirmed = window.confirm(
      'Are you sure you want to process this refund? This will mark the refund as approved and the payment as refunded.'
    )
    if (!confirmed) return

    setRefundLoading(paymentId)
    try {
      const res = await authFetch(`/api/admin/refunds/${paymentId}/process`, {
        method: 'POST'
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to process refund')
      }

      await loadPayments(meta.page)
    } catch (err) {
      alert(err.message)
    } finally {
      setRefundLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-parchment">
      <div className="max-w-6xl mx-auto px-4 py-8 page-enter">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display text-ink">Payments</h1>
            <p className="text-sepia-600 mt-1">{meta.total} total payments</p>
          </div>
          <Button to="/admin" variant="secondary" size="sm">
            Back to Dashboard
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-soft text-error-strong rounded-xl text-sm flex items-center gap-3">
            <IconAlertCircle size={20} stroke={1.75} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Payments table */}
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-sepia-100">
                  <th className={TH_CLASSES}>ID</th>
                  <th className={TH_CLASSES}>User</th>
                  <th className={TH_CLASSES}>Product</th>
                  <th className={TH_CLASSES}>Amount</th>
                  <th className={TH_CLASSES}>Status</th>
                  <th className={TH_CLASSES}>Date</th>
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
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={<IconReceipt size={24} stroke={1.5} />}
                        title="No payments found"
                        description="Payments will appear here as customers purchase."
                      />
                    </td>
                  </tr>
                ) : (
                  payments.map(p => (
                    <tr key={p.id} className="hover:bg-sepia-50 transition-colors">
                      <td className="px-6 py-3 text-sepia-500 font-mono text-xs">{p.id}</td>
                      <td className="px-6 py-3">
                        <Link to={`/admin/users/${p.user_id}`} className="text-ink hover:underline">
                          {p.user_name || p.user_email || `User #${p.user_id}`}
                        </Link>
                        {p.user_email && p.user_name && (
                          <p className="text-sepia-500 text-xs">{p.user_email}</p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-ink">
                        {p.product_type}
                        {p.product_id && (
                          <span className="text-sepia-500 ml-1 text-xs">({p.product_id})</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-ink font-medium">{formatCurrency(p.amount)}</td>
                      <td className="px-6 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-3 text-sepia-500 text-xs">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-6 py-3">
                        {p.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error hover:text-error-strong hover:bg-error-soft"
                            onClick={() => handleProcessRefund(p.id)}
                            disabled={refundLoading === p.id}
                          >
                            {refundLoading === p.id ? 'Processing...' : 'Refund'}
                          </Button>
                        )}
                        {p.status === 'refunded' && (
                          <span className="text-xs text-sepia-400">Refunded</span>
                        )}
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
