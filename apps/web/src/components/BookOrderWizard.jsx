import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  IconBook,
  IconBookmark,
  IconCheck,
  IconGift,
  IconX,
  IconStack2,
  IconHeadphones,
  IconDiscount2
} from '@tabler/icons-react'
import { Badge, Button, Card, Field, Input, ProgressBar, Skeleton } from './ui'
import { priceInPounds } from '@easy-memoir/shared/products'

const SELECT_CLASSES = [
  'w-full px-4 py-3 rounded-xl text-base text-ink bg-surface',
  'border border-sepia-200 hover:border-sepia-300',
  'focus:border-bronze-400 focus:ring-4 focus:ring-bronze-500/10 focus:outline-none',
  'transition-colors duration-150'
].join(' ')

// Package options with discounts
const PACKAGES = {
  single: {
    id: 'single',
    name: 'Single Copy',
    quantity: 1,
    discount: 0,
    description: 'Perfect for yourself',
    icon: 'book'
  },
  bundle10: {
    id: 'bundle10',
    name: '10 Book Bundle',
    quantity: 10,
    discount: 0.4,
    description: 'Share with family - 40% OFF',
    icon: 'stack',
    popular: true
  }
}

// Audiobook pricing
const AUDIOBOOK_PRICE = priceInPounds('export_audiobook')
const AUDIOBOOK_BUNDLE_DISCOUNT = 0.4 // 40% off when bundled with books

// Simple book cover preview - shows default cloth cover
function BookPreview({ title, format, size = 'normal' }) {
  const isHardcover = format === 'hardcover' || format === 'deluxe'

  const sizes = {
    small: { width: 140, height: 210 },
    normal: { width: 200, height: 300 },
    large: { width: 260, height: 390 }
  }
  const { width, height } = sizes[size] || sizes.normal

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="rounded-r-lg overflow-hidden"
        style={{
          width,
          height,
          boxShadow: isHardcover
            ? '4px 4px 20px rgba(0,0,0,0.4), -2px 0 10px rgba(0,0,0,0.1)'
            : '2px 2px 12px rgba(0,0,0,0.3)'
        }}
      >
        {/* Cloth cover — palette hexes only (sepia #9C7E5D into ink #292420) */}
        <div
          className="w-full h-full flex flex-col justify-center p-5 relative"
          style={{ background: 'linear-gradient(150deg, #9C7E5D 0%, #292420 100%)' }}
        >
          <div className="text-center">
            <h3
              className="font-display text-parchment/90 leading-snug"
              style={{
                fontSize: size === 'large' ? '22px' : size === 'small' ? '14px' : '18px',
                fontWeight: 500
              }}
            >
              {title}
            </h3>
          </div>
          {/* Shine effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)'
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Icon mapping for book formats using Tabler Icons
const formatIcons = {
  paperback: <IconBook size={40} className="text-sepia-500" stroke={1.5} />,
  hardcover: <IconBookmark size={40} className="text-sepia-500" stroke={1.5} />,
  deluxe: <IconGift size={40} className="text-sepia-500" stroke={1.5} />
}

function SelectedCheck({ className = 'top-3 right-3' }) {
  return (
    <span
      className={`absolute ${className} w-5 h-5 rounded-full bg-bronze-500 text-white flex items-center justify-center`}
      aria-hidden="true"
    >
      <IconCheck size={12} stroke={3} />
    </span>
  )
}

// Format card component
function FormatCard({ format, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-5 rounded-2xl border bg-surface transition-all duration-200 text-center ${
        selected
          ? 'border-bronze-400 ring-4 ring-bronze-500/10 shadow-soft'
          : 'border-sepia-200 hover:border-sepia-300 hover:shadow-soft'
      }`}
    >
      {format.popular && (
        <Badge variant="bronze" className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}
      {selected && <SelectedCheck />}
      <div className="flex justify-center mb-2">
        {formatIcons[format.icon] || formatIcons.paperback}
      </div>
      <div className="font-medium text-ink text-lg">{format.name}</div>
      <div className="text-sm text-sepia-600 mt-1">{format.description}</div>
      <div className="text-xl font-display text-ink mt-3">{format.price}</div>
    </button>
  )
}

export default function BookOrderWizard({ userName, pageCount, onClose }) {
  const { authFetch } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [options, setOptions] = useState(null)

  // Wizard state
  const [selectedFormat, setSelectedFormat] = useState('hardcover')
  const [selectedPackage, setSelectedPackage] = useState('single')
  const [includeAudiobook, setIncludeAudiobook] = useState(false)
  const [bookTitle, setBookTitle] = useState('My Life Story')
  const [authorName, setAuthorName] = useState('')

  // Shipping state
  const [shipping, setShipping] = useState({
    name: '',
    email: '',
    street1: '',
    city: '',
    postcode: '',
    countryCode: 'GB'
  })

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      const res = await authFetch('/api/v1/covers/options')
      if (!res.ok) throw new Error('Failed to load options')
      const data = await res.json()
      setOptions(data)
    } catch (err) {
      console.error('Failed to load options:', err)
    } finally {
      setLoading(false)
    }
  }

  const canProceedToStep2 = selectedFormat
  const canProceedToStep3 =
    shipping.name && shipping.email && shipping.street1 && shipping.city && shipping.postcode

  // Calculate total price
  const calculateTotal = () => {
    if (!options) return { books: 0, audiobook: 0, total: 0, savings: 0 }

    const format = options.bookFormats.find(f => f.id === selectedFormat)
    const basePrice = parseFloat(format?.price?.replace('£', '') || 0)
    const pkg = PACKAGES[selectedPackage]

    // Books price with package discount
    const booksFullPrice = basePrice * pkg.quantity
    const booksPrice = booksFullPrice * (1 - pkg.discount)

    // Audiobook price (40% off when bundled with 10 books)
    let audiobookPrice = 0
    if (includeAudiobook) {
      audiobookPrice =
        selectedPackage === 'bundle10'
          ? AUDIOBOOK_PRICE * (1 - AUDIOBOOK_BUNDLE_DISCOUNT)
          : AUDIOBOOK_PRICE
    }

    const total = booksPrice + audiobookPrice
    const savings =
      booksFullPrice -
      booksPrice +
      (includeAudiobook && selectedPackage === 'bundle10'
        ? AUDIOBOOK_PRICE * AUDIOBOOK_BUNDLE_DISCOUNT
        : 0)

    return {
      books: booksPrice,
      audiobook: audiobookPrice,
      total,
      savings,
      quantity: pkg.quantity
    }
  }

  const pricing = calculateTotal()

  if (loading) {
    return (
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <Card className="w-full max-w-sm">
          <p className="text-sepia-600 text-sm mb-4">Loading book options...</p>
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </Card>
      </div>
    )
  }

  const steps = [
    { num: 1, label: 'Book' },
    { num: 2, label: 'Shipping' },
    { num: 3, label: 'Review' }
  ]

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-2">
      <div className="bg-parchment rounded-t-3xl sm:rounded-3xl w-full max-w-[95vw] max-h-[98vh] sm:max-h-[96vh] flex flex-col shadow-modal overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-sepia-100 flex justify-between items-start gap-4 bg-surface/60">
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-1">
              Step {step} of {steps.length} &middot; {steps[step - 1].label}
            </p>
            <h2 className="text-xl sm:text-2xl font-display text-ink">Create Your Book</h2>
            <ProgressBar
              value={(step / steps.length) * 100}
              className="mt-3 max-w-xs"
              label="Order progress"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mr-1 p-2 rounded-full text-sepia-400 hover:text-ink hover:bg-sepia-100/70 transition-colors"
          >
            <IconX size={20} stroke={1.75} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Choose Style */}
          {step === 1 && options && (
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
              {/* Book Format */}
              <div>
                <h3 className="text-lg font-display text-ink mb-3 sm:mb-4">
                  Choose your book format
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {options.bookFormats.map(format => (
                    <FormatCard
                      key={format.id}
                      format={format}
                      selected={selectedFormat === format.id}
                      onClick={() => setSelectedFormat(format.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Package Selection */}
              <div>
                <h3 className="text-lg font-display text-ink mb-3 sm:mb-4">Choose your package</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Single Copy */}
                  <button
                    type="button"
                    onClick={() => setSelectedPackage('single')}
                    className={`relative p-5 rounded-2xl border bg-surface transition-all duration-200 text-left ${
                      selectedPackage === 'single'
                        ? 'border-bronze-400 ring-4 ring-bronze-500/10 shadow-soft'
                        : 'border-sepia-200 hover:border-sepia-300 hover:shadow-soft'
                    }`}
                  >
                    {selectedPackage === 'single' && <SelectedCheck />}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-sepia-100 flex items-center justify-center">
                        <IconBook size={24} className="text-sepia-600" stroke={1.5} />
                      </div>
                      <div>
                        <div className="font-medium text-ink text-lg">Single Copy</div>
                        <div className="text-sm text-sepia-600">Perfect for yourself</div>
                      </div>
                    </div>
                  </button>

                  {/* 10 Book Bundle */}
                  <button
                    type="button"
                    onClick={() => setSelectedPackage('bundle10')}
                    className={`relative p-5 rounded-2xl border bg-surface transition-all duration-200 text-left ${
                      selectedPackage === 'bundle10'
                        ? 'border-bronze-400 ring-4 ring-bronze-500/10 shadow-soft'
                        : 'border-sepia-200 hover:border-sepia-300 hover:shadow-soft'
                    }`}
                  >
                    <span className="absolute -top-2.5 left-4 bg-bronze-500 text-white text-xs px-3 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <IconDiscount2 size={14} stroke={1.75} />
                      40% OFF
                    </span>
                    {selectedPackage === 'bundle10' && <SelectedCheck />}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-bronze-100 flex items-center justify-center">
                        <IconStack2 size={24} className="text-bronze-600" stroke={1.5} />
                      </div>
                      <div>
                        <div className="font-medium text-ink text-lg">10 Book Bundle</div>
                        <div className="text-sm text-sepia-600">Share with family & friends</div>
                        <div className="text-xs text-success-strong font-medium mt-1">
                          Save £
                          {(
                            parseFloat(
                              options.bookFormats
                                .find(f => f.id === selectedFormat)
                                ?.price?.replace('£', '') || 0
                            ) *
                            10 *
                            0.4
                          ).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Audiobook Add-on */}
              <div>
                <h3 className="text-lg font-display text-ink mb-3 sm:mb-4">
                  Add audiobook narration
                </h3>
                <button
                  type="button"
                  onClick={() => setIncludeAudiobook(!includeAudiobook)}
                  className={`w-full relative p-5 rounded-2xl border bg-surface transition-all duration-200 text-left ${
                    includeAudiobook
                      ? 'border-bronze-400 ring-4 ring-bronze-500/10 shadow-soft'
                      : 'border-sepia-200 hover:border-sepia-300 hover:shadow-soft'
                  }`}
                >
                  {selectedPackage === 'bundle10' && (
                    <span className="absolute -top-2.5 right-4 bg-bronze-500 text-white text-xs px-3 py-0.5 rounded-full font-medium">
                      40% OFF with bundle
                    </span>
                  )}
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        includeAudiobook ? 'bg-bronze-100' : 'bg-sepia-100'
                      }`}
                    >
                      <IconHeadphones
                        size={24}
                        className={includeAudiobook ? 'text-bronze-600' : 'text-sepia-600'}
                        stroke={1.5}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-ink text-lg">Professional AI Audiobook</div>
                      <div className="text-sm text-sepia-600">
                        Your memoir read aloud with natural AI narration
                      </div>
                    </div>
                    <div className="text-right">
                      {selectedPackage === 'bundle10' ? (
                        <>
                          <div className="text-lg font-semibold text-ink">
                            £{(AUDIOBOOK_PRICE * (1 - AUDIOBOOK_BUNDLE_DISCOUNT)).toFixed(2)}
                          </div>
                          <div className="text-xs text-sepia-500 line-through">
                            £{AUDIOBOOK_PRICE.toFixed(2)}
                          </div>
                        </>
                      ) : (
                        <div className="text-lg font-semibold text-ink">
                          £{AUDIOBOOK_PRICE.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        includeAudiobook ? 'bg-bronze-500 border-bronze-500' : 'border-sepia-300'
                      }`}
                    >
                      {includeAudiobook && (
                        <IconCheck size={14} stroke={3} className="text-white" />
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* Book Title & Author */}
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Book title">
                  {(id, describedBy) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      type="text"
                      value={bookTitle}
                      onChange={e => setBookTitle(e.target.value)}
                      placeholder="Enter your book title"
                    />
                  )}
                </Field>
                <Field label="Author name">
                  {(id, describedBy) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      type="text"
                      value={authorName}
                      onChange={e => setAuthorName(e.target.value)}
                      placeholder="Your name"
                    />
                  )}
                </Field>
              </div>

              {/* Price Summary */}
              {pricing.savings > 0 && (
                <div className="bg-bronze-50 border border-bronze-200/60 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <IconDiscount2 size={20} stroke={1.75} className="text-bronze-600 shrink-0" />
                      <span className="text-ink font-medium">
                        You're saving £{pricing.savings.toFixed(2)}!
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-display text-ink">
                        £{pricing.total.toFixed(2)}
                      </div>
                      <div className="text-xs text-sepia-600">
                        {pricing.quantity} book{pricing.quantity > 1 ? 's' : ''}
                        {includeAudiobook ? ' + audiobook' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Shipping Details */}
          {step === 2 && (
            <div className="p-6">
              <div className="max-w-lg mx-auto space-y-5">
                <Field label="Full Name *">
                  {(id, describedBy) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      type="text"
                      value={shipping.name}
                      onChange={e => setShipping(prev => ({ ...prev, name: e.target.value }))}
                    />
                  )}
                </Field>

                <Field label="Email *">
                  {(id, describedBy) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      type="email"
                      value={shipping.email}
                      onChange={e => setShipping(prev => ({ ...prev, email: e.target.value }))}
                    />
                  )}
                </Field>

                <Field label="Address *">
                  {(id, describedBy) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      type="text"
                      value={shipping.street1}
                      onChange={e => setShipping(prev => ({ ...prev, street1: e.target.value }))}
                    />
                  )}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="City *">
                    {(id, describedBy) => (
                      <Input
                        id={id}
                        aria-describedby={describedBy}
                        type="text"
                        value={shipping.city}
                        onChange={e => setShipping(prev => ({ ...prev, city: e.target.value }))}
                      />
                    )}
                  </Field>
                  <Field label="Postcode *">
                    {(id, describedBy) => (
                      <Input
                        id={id}
                        aria-describedby={describedBy}
                        type="text"
                        value={shipping.postcode}
                        onChange={e => setShipping(prev => ({ ...prev, postcode: e.target.value }))}
                      />
                    )}
                  </Field>
                </div>

                <Field label="Country *">
                  {id => (
                    <select
                      id={id}
                      value={shipping.countryCode}
                      onChange={e =>
                        setShipping(prev => ({ ...prev, countryCode: e.target.value }))
                      }
                      className={SELECT_CLASSES}
                    >
                      <option value="GB">United Kingdom</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="IE">Ireland</option>
                    </select>
                  )}
                </Field>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Book Preview */}
                  <div className="flex flex-col items-center">
                    <BookPreview
                      title={bookTitle}
                      authorName={authorName}
                      format={selectedFormat}
                      size="normal"
                    />
                    <div className="mt-4 text-center">
                      <div className="font-medium text-ink">{bookTitle}</div>
                      <div className="text-sm text-sepia-600 capitalize">{selectedFormat}</div>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="space-y-4">
                    <Card padding="sm">
                      <h4 className="font-display text-ink mb-3">Order Summary</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-sepia-600">Format</dt>
                          <dd className="text-ink font-medium capitalize">{selectedFormat}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sepia-600">Quantity</dt>
                          <dd className="text-ink font-medium">
                            {pricing.quantity} book{pricing.quantity > 1 ? 's' : ''}
                            {selectedPackage === 'bundle10' && (
                              <span className="text-bronze-700 ml-1">(40% off)</span>
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sepia-600">Cover</dt>
                          <dd className="text-ink font-medium">Classic Cloth</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sepia-600">Pages</dt>
                          <dd className="text-ink font-medium">~{pageCount || 50} pages</dd>
                        </div>
                        {includeAudiobook && (
                          <div className="flex justify-between">
                            <dt className="text-sepia-600">Audiobook</dt>
                            <dd className="text-ink font-medium">
                              AI Narration
                              {selectedPackage === 'bundle10' && (
                                <span className="text-success-strong ml-1">(40% off)</span>
                              )}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </Card>

                    <Card padding="sm">
                      <h4 className="font-display text-ink mb-3">Shipping To</h4>
                      <p className="text-sm text-ink">
                        {shipping.name}
                        <br />
                        {shipping.street1}
                        <br />
                        {shipping.city}, {shipping.postcode}
                      </p>
                    </Card>

                    <Card padding="sm">
                      <dl className="space-y-2 text-sm mb-3">
                        <div className="flex justify-between">
                          <dt className="text-sepia-600">Books ({pricing.quantity}x)</dt>
                          <dd className="text-ink">£{pricing.books.toFixed(2)}</dd>
                        </div>
                        {includeAudiobook && (
                          <div className="flex justify-between">
                            <dt className="text-sepia-600">Audiobook</dt>
                            <dd className="text-ink">£{pricing.audiobook.toFixed(2)}</dd>
                          </div>
                        )}
                        {pricing.savings > 0 && (
                          <div className="flex justify-between text-success-strong">
                            <dt>You saved</dt>
                            <dd>-£{pricing.savings.toFixed(2)}</dd>
                          </div>
                        )}
                      </dl>
                      <div className="flex justify-between items-baseline pt-3 border-t border-sepia-200/70">
                        <span className="text-ink font-medium">Total</span>
                        <span className="text-2xl font-display text-ink">
                          £{pricing.total.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-sepia-500 mt-1">Includes shipping</p>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-sepia-100 bg-surface/60">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="hidden sm:block">
              {step === 1 && selectedFormat && (
                <div className="text-left">
                  <span className="text-xl font-display text-ink">£{pricing.total.toFixed(2)}</span>
                  {pricing.savings > 0 && (
                    <span className="text-sm text-success-strong ml-2">
                      Save £{pricing.savings.toFixed(2)}
                    </span>
                  )}
                  <div className="text-xs text-sepia-600">
                    {pricing.quantity} book{pricing.quantity > 1 ? 's' : ''}
                    {includeAudiobook ? ' + audiobook' : ''}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              {step > 1 && (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setStep(s => s - 1)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Back
                </Button>
              )}
              {step === 1 && (
                <Button
                  size="lg"
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  Continue to Shipping
                </Button>
              )}
              {step === 2 && (
                <Button
                  size="lg"
                  onClick={() => setStep(3)}
                  disabled={!canProceedToStep3}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  Review Order
                </Button>
              )}
              {step === 3 && (
                <Button
                  size="lg"
                  onClick={() => {
                    // TODO: Integrate with Stripe payment
                    // TODO: Integrate Stripe payment flow
                  }}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  Complete Order
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
