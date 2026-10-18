import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useFocusTrap } from '../hooks/useFocusTrap'

const orderLabels = {
  proof: 'Ready for your review',
  queued: 'Approved — waiting for the printer',
  submitting: 'Sending to the printer',
  submitted: 'With the printer',
  dispatched: 'Dispatched',
  review: 'Our team needs to check this order'
}

export default function BookOrderWizard({ userName, onClose }) {
  const { user, authFetch } = useAuth()
  const dialog = useRef(null)
  useFocusTrap(dialog)
  const [status, setStatus] = useState(null)
  const [photos, setPhotos] = useState([])
  const [selected, setSelected] = useState([])
  const [title, setTitle] = useState(`${userName || 'My'}'s Life Story`)
  const [author, setAuthor] = useState(userName || '')
  const [proof, setProof] = useState(null)
  const [viewed, setViewed] = useState({})
  const [approved, setApproved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [address, setAddress] = useState({
    addressee: userName || '',
    address1: '',
    address2: '',
    town: '',
    county: '',
    postCode: '',
    countryCode: 'GB',
    email: user?.email || '',
    telNumber: ''
  })
  const confirming = new URLSearchParams(window.location.search).get('paid') === '1'
  useEffect(() => {
    if (dialog.current) dialog.current.scrollTop = 0
  }, [proof?.id])
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const json = useCallback(
    async (path, options) => {
      const response = await authFetch(path, options)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'Please try again.')
      return data
    },
    [authFetch]
  )
  const refresh = useCallback(async () => {
    setStatus(await json('/api/print/status'))
  }, [json])
  useEffect(() => {
    let active = true
    Promise.all([json('/api/print/status'), json('/api/stories/all')])
      .then(([data, stories]) => {
        if (!active) return
        setStatus(data)
        const savedProof =
          data.hasEntitlement && data.orders.find(order => order.status === 'proof')
        if (savedProof)
          setProof({
            id: savedProof.id,
            pageCount: savedProof.page_count,
            colourPages: savedProof.colour_pages
          })
        const availablePhotos = stories.flatMap(story => story.photos || [])
        setPhotos(availablePhotos)
        setSelected(availablePhotos.slice(0, 8).map(photo => photo.id))
      })
      .catch(err => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [json])
  useEffect(() => {
    const timer = setInterval(() => {
      void refresh().catch(() => {})
    }, 10000)
    return () => clearInterval(timer)
  }, [refresh])
  useEffect(() => {
    const handleKey = event => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [busy, onClose])

  async function action(work) {
    setBusy(true)
    setError('')
    try {
      await work()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const checkout = () =>
    action(async () => {
      const data = await json('/api/payments/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          productId: 'premium_bundle',
          successUrl: `${window.location.origin}/export?print=1&paid=1`,
          cancelUrl: `${window.location.origin}/export?print=1`
        })
      })
      if (!/^https:\/\//.test(data.url || '')) throw new Error('Checkout could not be opened.')
      window.location.assign(data.url)
    })
  const prepare = () =>
    action(async () => {
      const data = await json('/api/print/proof', {
        method: 'POST',
        body: JSON.stringify({ title, author, photoIds: selected })
      })
      setProof(data)
      setViewed({})
      setApproved(false)
      await refresh()
    })
  const download = type =>
    action(async () => {
      const response = await authFetch(`/api/print/${proof.id}/proof/${type}`)
      if (!response.ok) throw new Error('Your proof could not be downloaded.')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `memoir-${type}-proof.pdf`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      setViewed(previous => ({ ...previous, [type]: true }))
    })
  const submit = event => {
    event.preventDefault()
    void action(async () => {
      await json(`/api/print/${proof.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved, address })
      })
      setProof(null)
      setApproved(false)
      await refresh()
    })
  }
  const inputClass =
    'mt-1 w-full rounded-lg border border-sepia/25 bg-white px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-sepia'
  const completedOrders = status?.orders.filter(order => order.status !== 'proof') || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6">
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-title"
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-parchment shadow-2xl"
      >
        <header className="sticky top-0 z-10 bg-parchment flex items-start justify-between gap-4 p-6 sm:p-8 border-b border-sepia/15">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sepia mb-2">Your story, shared</p>
            <h2 id="print-title" className="font-display text-3xl text-ink">
              Ten books. One family story.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close book order"
            className="rounded-full p-2 text-ink hover:bg-sepia/10 disabled:opacity-50"
          >
            ✕
          </button>
        </header>
        <div className="p-6 sm:p-8 space-y-6">
          <div className="rounded-xl bg-white p-5 border border-sepia/15 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-xl text-ink">10 hardbacks for the price of 5</p>
              <p className="text-sm text-warmgray mt-2">
                A5 · Matte printed cover · 115gsm coated paper
              </p>
              <p className="text-sm text-warmgray mt-1">
                Up to 200 pages and 8 colour photo pages.
              </p>
            </div>
            <div>
              <p className="font-display text-4xl text-ink">£250</p>
              <p className="text-xs text-warmgray mt-1">One payment. Delivery included.</p>
            </div>
            <p className="text-sm text-warmgray w-full">
              Includes 12 months of memoir access, an audiobook and phone interviews. All ten copies
              go to one UK or French address.
            </p>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
              {error}
            </p>
          )}
          {!status && !error && <p role="status">Loading your print package…</p>}
          {status && !status.available && (
            <p role="status" className="rounded-lg bg-amber-50 p-4 text-amber-900">
              Book printing is being set up. You can keep writing; checkout and print submission
              will open when it is ready.
            </p>
          )}
          {status?.hasLegacyPackage && !status.hasEntitlement && !completedOrders.length && (
            <p role="status" className="rounded-lg bg-amber-50 p-4 text-amber-900">
              Your earlier book package is already paid for. Please contact support to arrange
              printing under your original package terms.
            </p>
          )}
          {completedOrders.map(order => (
            <div key={order.id} className="rounded-xl border border-sepia/20 bg-white p-5">
              <h3 className="font-display text-xl">{order.title}</h3>
              <p role="status" className="mt-2">
                {orderLabels[order.status]}
              </p>
              <p className="text-sm text-warmgray mt-2">10 hardbacks · {order.page_count} pages</p>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-sepia underline"
                >
                  Track your delivery
                </a>
              )}
            </div>
          ))}
          {status?.available &&
            !status.hasEntitlement &&
            !status.hasLegacyPackage &&
            !completedOrders.length &&
            (confirming ? (
              <p role="status">
                Confirming your payment. This page updates automatically; please don’t pay again.
              </p>
            ) : (
              <button
                disabled={busy}
                onClick={checkout}
                className="w-full bg-ink text-white rounded-xl py-4 font-medium disabled:opacity-50"
              >
                {busy ? 'Opening checkout…' : 'Get the complete package — £250'}
              </button>
            ))}
          {status?.available && status.hasEntitlement && !proof && (
            <div className="space-y-4">
              <h3 className="font-display text-2xl">Ready to finish your book?</h3>
              <p className="text-sm text-warmgray">
                Prepare a print proof from your saved memories. Nothing is printed until you review
                it and confirm delivery.
              </p>
              <label className="block text-sm">
                Book title
                <input
                  className={inputClass}
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  maxLength={160}
                />
              </label>
              <label className="block text-sm">
                Author name
                <input
                  className={inputClass}
                  value={author}
                  onChange={event => setAuthor(event.target.value)}
                  maxLength={100}
                />
              </label>
              {photos.length > 0 && (
                <fieldset className="rounded-xl border border-sepia/20 p-4">
                  <legend className="px-2 text-sm">
                    Photographs — {selected.length} of 8 selected
                  </legend>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {photos.map((photo, index) => (
                      <label key={photo.id} className="flex gap-3 items-center text-sm">
                        <input
                          type="checkbox"
                          checked={selected.includes(photo.id)}
                          disabled={!selected.includes(photo.id) && selected.length >= 8}
                          onChange={event =>
                            setSelected(previous =>
                              event.target.checked
                                ? [...previous, photo.id]
                                : previous.filter(id => id !== photo.id)
                            )
                          }
                        />
                        {photo.caption || `Photograph ${index + 1}`}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <button
                onClick={prepare}
                disabled={busy || !title.trim() || !author.trim()}
                className="w-full rounded-xl bg-ink py-4 text-white disabled:opacity-50"
              >
                {busy ? 'Preparing your print proof…' : 'Prepare my print proof'}
              </button>
            </div>
          )}
          {proof && (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <h3 className="font-display text-2xl">Review your finished book</h3>
                <p className="text-sm text-warmgray mt-2">
                  {proof.pageCount} pages, including {proof.colourPages} colour photo pages. Check
                  spelling, photo quality and layout in both PDFs.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => download('text')}
                  className="border border-sepia/30 rounded-lg px-4 py-3"
                >
                  Download interior proof
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => download('cover')}
                  className="border border-sepia/30 rounded-lg px-4 py-3"
                >
                  Download cover proof
                </button>
              </div>
              <h3 className="font-display text-xl">Where should we send your ten copies?</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {Object.entries({
                  addressee: 'Full name',
                  address1: 'Address line 1',
                  address2: 'Address line 2 (optional)',
                  town: 'Town / city',
                  county: 'County / region (optional)',
                  postCode: 'Postcode',
                  email: 'Email',
                  telNumber: 'Telephone (optional)'
                }).map(([field, label]) => (
                  <label key={field} className="block text-sm">
                    {label}
                    <input
                      type={field === 'email' ? 'email' : field === 'telNumber' ? 'tel' : 'text'}
                      required={['addressee', 'address1', 'town', 'postCode', 'email'].includes(
                        field
                      )}
                      maxLength={field === 'telNumber' ? 35 : field === 'email' ? 120 : 99}
                      className={inputClass}
                      value={address[field]}
                      onChange={event =>
                        setAddress(previous => ({ ...previous, [field]: event.target.value }))
                      }
                    />
                  </label>
                ))}
                <label className="block text-sm">
                  Country
                  <select
                    className={inputClass}
                    value={address.countryCode}
                    onChange={event =>
                      setAddress(previous => ({ ...previous, countryCode: event.target.value }))
                    }
                  >
                    <option value="GB">United Kingdom</option>
                    <option value="FR">France</option>
                  </select>
                </label>
              </div>
              <label className="flex gap-3 text-sm items-start">
                <input
                  type="checkbox"
                  className="mt-1"
                  required
                  checked={approved}
                  disabled={!viewed.text || !viewed.cover}
                  onChange={event => setApproved(event.target.checked)}
                />
                <span>
                  I have reviewed both PDFs, finished my memoir and checked my address. Print these
                  exact files and send all ten copies to this address.
                </span>
              </label>
              <p className="text-xs text-warmgray">
                Later edits to your memories won’t change these approved files. Personalised books
                cannot be changed after submission.
              </p>
              <button
                type="submit"
                disabled={busy || !approved || !status?.available}
                className="w-full rounded-xl bg-ink text-white py-4 disabled:opacity-50"
              >
                {busy ? 'Submitting…' : 'Finish my memoir & send to print — no extra payment'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setProof(null)
                  setViewed({})
                  setApproved(false)
                }}
                className="w-full text-sepia underline"
              >
                Go back and prepare a new proof
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
