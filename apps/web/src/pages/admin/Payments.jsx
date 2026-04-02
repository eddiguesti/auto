import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

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
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif text-warm-brown">Payments</h1>
            <p className="text-warm-brown/60 mt-1">{meta.total} total payments</p>
          </div>
          <Link
            to="/admin"
            className="px-4 py-2 border border-warm-brown/20 text-warm-brown rounded-lg hover:bg-warm-brown/5 transition text-sm"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Payments table */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-brown/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-brown/10 text-left">
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">ID</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">User</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Product</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Amount</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Status</th>
                  <th className="px-6 py-3 text-warm-brown/60 font-medium">Date</th>
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
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-warm-brown/50">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  payments.map(p => (
                    <tr
                      key={p.id}
                      className="border-b border-warm-brown/5 hover:bg-warm-brown/[0.02] transition"
                    >
                      <td className="px-6 py-3 text-warm-brown/50 font-mono text-xs">{p.id}</td>
                      <td className="px-6 py-3">
                        <Link
                          to={`/admin/users/${p.user_id}`}
                          className="text-warm-brown hover:underline"
                        >
                          {p.user_name || p.user_email || `User #${p.user_id}`}
                        </Link>
                        {p.user_email && p.user_name && (
                          <p className="text-warm-brown/50 text-xs">{p.user_email}</p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-warm-brown">
                        {p.product_type}
                        {p.product_id && (
                          <span className="text-warm-brown/50 ml-1 text-xs">({p.product_id})</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-warm-brown font-medium">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-3 text-warm-brown/60 text-xs">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-6 py-3">
                        {p.status === 'completed' && (
                          <button
                            onClick={() => handleProcessRefund(p.id)}
                            disabled={refundLoading === p.id}
                            className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 transition disabled:opacity-50"
                          >
                            {refundLoading === p.id ? 'Processing...' : 'Refund'}
                          </button>
                        )}
                        {p.status === 'refunded' && (
                          <span className="text-xs text-warm-brown/40">Refunded</span>
                        )}
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
