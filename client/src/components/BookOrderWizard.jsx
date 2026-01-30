import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  IconBook, IconBookmark, IconGift, IconSparkles, IconLeaf,
  IconHome2, IconPalette, IconCrown, IconRefresh, IconX, IconCheck
} from '@tabler/icons-react'

// 3D Flippable book cover preview
// Takes a landscape full-wrap image (back | spine | front) and splits it
function BookPreview({ coverImage, title, authorName, format, size = 'normal', allowFlip = true }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const isHardcover = format === 'hardcover' || format === 'deluxe'

  // Size variants
  const sizes = {
    small: { width: 140, height: 210 },
    normal: { width: 200, height: 300 },
    large: { width: 260, height: 390 }
  }
  const { width, height } = sizes[size] || sizes.normal

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 3D Book Container */}
      <div
        className="relative cursor-pointer"
        style={{
          width,
          height,
          perspective: '1000px'
        }}
        onClick={() => allowFlip && coverImage && setIsFlipped(!isFlipped)}
      >
        {/* Book wrapper for 3D transform */}
        <div
          className="relative w-full h-full transition-transform duration-700"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front Cover - RIGHT side of landscape image */}
          <div
            className="absolute inset-0 rounded-r-lg overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              boxShadow: isHardcover
                ? '4px 4px 20px rgba(0,0,0,0.4), -2px 0 10px rgba(0,0,0,0.1)'
                : '2px 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            {coverImage ? (
              <img
                src={coverImage}
                alt="Book cover"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'right center' }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#8b7355] via-[#6b5344] to-[#4a3728] flex flex-col justify-between p-5">
                <div className="text-center pt-8">
                  <h3
                    className="font-serif text-white/60 leading-snug"
                    style={{
                      fontSize: size === 'large' ? '22px' : size === 'small' ? '14px' : '18px',
                      fontWeight: 500,
                    }}
                  >
                    {title}
                  </h3>
                </div>
                <div className="text-center pb-4">
                  <div className="text-white/40 text-xs">
                    Generate cover to see preview
                  </div>
                </div>
              </div>
            )}
            {/* Shine effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
              }}
            />
          </div>

          {/* Back Cover - LEFT side of landscape image */}
          <div
            className="absolute inset-0 rounded-l-lg overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              boxShadow: isHardcover
                ? '4px 4px 20px rgba(0,0,0,0.4), 2px 0 10px rgba(0,0,0,0.1)'
                : '2px 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            {coverImage ? (
              <img
                src={coverImage}
                alt="Book back cover"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'left center' }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#6b5344] via-[#5a4335] to-[#4a3728] flex flex-col justify-between p-5">
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-white/50 text-sm max-w-[80%]">
                    <p className="italic mb-4">"A heartfelt journey through memories..."</p>
                    <p className="text-xs text-white/30">Synopsis will appear here</p>
                  </div>
                </div>
                <div className="text-center pb-2">
                  <div className="w-16 h-10 bg-white/20 mx-auto rounded text-[8px] flex items-center justify-center text-white/40">
                    BARCODE
                  </div>
                </div>
              </div>
            )}
            {/* Shine effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(-135deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Flip indicator */}
      {allowFlip && coverImage && (
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="text-xs text-sepia/60 hover:text-sepia flex items-center gap-1 transition-colors"
        >
          <IconRefresh size={16} stroke={2} />
          {isFlipped ? 'View front' : 'View back'}
        </button>
      )}
    </div>
  )
}

// Icon mapping for cover styles using Tabler Icons
const styleIcons = {
  classic: <IconBookmark size={32} className="text-sepia" stroke={1.5} />,
  modern: <IconSparkles size={32} className="text-sepia" stroke={1.5} />,
  nature: <IconLeaf size={32} className="text-sepia" stroke={1.5} />,
  family: <IconHome2 size={32} className="text-sepia" stroke={1.5} />,
  artistic: <IconPalette size={32} className="text-sepia" stroke={1.5} />,
  heritage: <IconCrown size={32} className="text-sepia" stroke={1.5} />
}

// Style card component
function StyleCard({ style, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
        selected
          ? 'border-sepia bg-sepia/10 shadow-lg scale-[1.02]'
          : 'border-sepia/20 hover:border-sepia/40 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{styleIcons[style.icon] || styleIcons.classic}</div>
        <div>
          <div className="font-medium text-ink">{style.name}</div>
          <div className="text-sm text-warmgray mt-0.5">{style.description}</div>
        </div>
      </div>
      {/* Color preview dots */}
      <div className="flex gap-1.5 mt-3 ml-12">
        {style.colors.map((color, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full border border-black/10"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-sepia rounded-full flex items-center justify-center">
          <IconCheck size={16} className="text-white" stroke={2} />
        </div>
      )}
    </button>
  )
}

// Icon mapping for book formats using Tabler Icons
const formatIcons = {
  paperback: <IconBook size={40} className="text-sepia" stroke={1.5} />,
  hardcover: <IconBookmark size={40} className="text-sepia" stroke={1.5} />,
  deluxe: <IconGift size={40} className="text-sepia" stroke={1.5} />
}

// Format card component
function FormatCard({ format, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative p-5 rounded-2xl border-2 transition-all duration-300 text-center ${
        selected
          ? 'border-sepia bg-sepia/10 shadow-lg scale-[1.02]'
          : 'border-sepia/20 hover:border-sepia/40 hover:shadow-md'
      } ${format.popular ? 'ring-2 ring-amber-400/50' : ''}`}
    >
      {format.popular && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs px-3 py-0.5 rounded-full font-medium">
          Most Popular
        </span>
      )}
      <div className="flex justify-center mb-2">{formatIcons[format.icon] || formatIcons.paperback}</div>
      <div className="font-medium text-ink text-lg">{format.name}</div>
      <div className="text-sm text-warmgray mt-1">{format.description}</div>
      <div className="text-xl font-semibold text-sepia mt-3">{format.price}</div>
    </button>
  )
}

export default function BookOrderWizard({ userName, pageCount, onClose }) {
  const { authFetch } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [options, setOptions] = useState(null)
  const [error, setError] = useState(null)

  // Wizard state
  const [selectedFormat, setSelectedFormat] = useState('hardcover')
  const [selectedStyle, setSelectedStyle] = useState('classic')
  const [coverImage, setCoverImage] = useState(null)
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
      const res = await authFetch('/api/covers/options')
      if (!res.ok) throw new Error('Failed to load options')
      const data = await res.json()
      setOptions(data)
    } catch (err) {
      console.error('Failed to load options:', err)
      setError('Failed to load book options')
    } finally {
      setLoading(false)
    }
  }

  const generateCover = async () => {
    setGenerating(true)
    setError(null)

    try {
      const res = await authFetch('/api/covers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleId: selectedStyle,
          bookTitle
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to generate cover')
      }

      const data = await res.json()
      setCoverImage(data.imageUrl)
    } catch (err) {
      console.error('Cover generation error:', err)
      setError(err.message || 'Failed to generate cover. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const regenerateCover = () => {
    setCoverImage(null)
    generateCover()
  }

  const canProceedToStep2 = selectedFormat && selectedStyle
  const canProceedToStep3 = coverImage
  const canProceedToStep4 = shipping.name && shipping.email && shipping.street1 && shipping.city && shipping.postcode

  if (loading) {
    return (
      <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-12 h-12 border-3 border-sepia border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sepia">Loading book options...</p>
        </div>
      </div>
    )
  }

  const steps = [
    { num: 1, label: 'Style' },
    { num: 2, label: 'Cover' },
    { num: 3, label: 'Details' },
    { num: 4, label: 'Review' }
  ]

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-white to-cream rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-sepia/10 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-serif text-ink">Create Your Book</h2>
            {/* Progress steps */}
            <div className="flex items-center gap-1 mt-2">
              {steps.map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    step > s.num ? 'bg-green-500 text-white' :
                    step === s.num ? 'bg-sepia text-white' : 'bg-sepia/20 text-sepia/60'
                  }`}>
                    {step > s.num ? '✓' : s.num}
                  </div>
                  <span className={`ml-1.5 text-xs ${step === s.num ? 'text-ink font-medium' : 'text-sepia/60'}`}>
                    {s.label}
                  </span>
                  {i < steps.length - 1 && <div className="w-6 h-0.5 mx-2 bg-sepia/20" />}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-sepia/10 text-sepia/60 hover:text-sepia transition"
          >
            <IconX size={24} stroke={2} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Choose Style */}
          {step === 1 && options && (
            <div className="p-6 space-y-8">
              {/* Book Format */}
              <div>
                <h3 className="text-lg font-medium text-ink mb-4">Choose your book format</h3>
                <div className="grid grid-cols-3 gap-4">
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

              {/* Cover Style */}
              <div>
                <h3 className="text-lg font-medium text-ink mb-4">Choose your cover style</h3>
                <div className="grid grid-cols-2 gap-4">
                  {options.coverStyles.map(style => (
                    <StyleCard
                      key={style.id}
                      style={style}
                      selected={selectedStyle === style.id}
                      onClick={() => setSelectedStyle(style.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Book Title & Author */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-lg font-medium text-ink mb-2">Book title</label>
                  <input
                    type="text"
                    value={bookTitle}
                    onChange={e => setBookTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-sepia/20 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-sepia/30"
                    placeholder="Enter your book title"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-ink mb-2">Author name</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    className="w-full px-4 py-3 border border-sepia/20 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-sepia/30"
                    placeholder="Your name"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Generate Cover */}
          {step === 2 && (
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Preview */}
                <div className="flex flex-col items-center">
                  <BookPreview
                    coverImage={coverImage}
                    title={bookTitle}
                    authorName={authorName}
                    format={selectedFormat}
                    size="large"
                  />
                  <p className="text-center text-sm text-warmgray mt-4 max-w-xs">
                    {coverImage
                      ? 'Your AI-generated cover. Click regenerate for a new design.'
                      : 'Click "Generate Cover" to create your unique book cover with AI.'}
                  </p>
                </div>

                {/* Controls */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-medium text-ink mb-2">Your Book Cover</h3>
                    <p className="text-warmgray">
                      We'll create a unique cover based on the "{options?.coverStyles.find(s => s.id === selectedStyle)?.name}" style.
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    {!coverImage ? (
                      <button
                        onClick={generateCover}
                        disabled={generating}
                        className="w-full py-4 bg-sepia text-white rounded-xl hover:bg-sepia/90 disabled:opacity-50 transition font-medium text-lg flex items-center justify-center gap-2"
                      >
                        {generating ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating your cover...
                          </>
                        ) : (
                          <>
                            <IconSparkles size={20} />
                            Generate Cover
                          </>
                        )}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={regenerateCover}
                          disabled={generating}
                          className="w-full py-3 border-2 border-sepia text-sepia rounded-xl hover:bg-sepia/10 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
                        >
                          {generating ? (
                            <>
                              <div className="w-5 h-5 border-2 border-sepia/30 border-t-sepia rounded-full animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <IconRefresh size={20} />
                              Try a Different Design
                            </>
                          )}
                        </button>
                        <p className="text-center text-xs text-warmgray">
                          Each generation creates a unique design
                        </p>
                      </>
                    )}
                  </div>

                  {/* Style reminder */}
                  <div className="p-4 bg-sepia/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {styleIcons[options?.coverStyles.find(s => s.id === selectedStyle)?.icon] || styleIcons.classic}
                      </div>
                      <div>
                        <div className="font-medium text-ink text-sm">
                          {options?.coverStyles.find(s => s.id === selectedStyle)?.name}
                        </div>
                        <div className="text-xs text-warmgray">
                          {options?.coverStyles.find(s => s.id === selectedStyle)?.description}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Shipping Details */}
          {step === 3 && (
            <div className="p-6">
              <div className="max-w-lg mx-auto space-y-5">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={shipping.name}
                    onChange={e => setShipping(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-sepia/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sepia/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Email *</label>
                  <input
                    type="email"
                    value={shipping.email}
                    onChange={e => setShipping(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-sepia/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sepia/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Address *</label>
                  <input
                    type="text"
                    value={shipping.street1}
                    onChange={e => setShipping(prev => ({ ...prev, street1: e.target.value }))}
                    className="w-full px-4 py-3 border border-sepia/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sepia/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">City *</label>
                    <input
                      type="text"
                      value={shipping.city}
                      onChange={e => setShipping(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-3 border border-sepia/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sepia/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Postcode *</label>
                    <input
                      type="text"
                      value={shipping.postcode}
                      onChange={e => setShipping(prev => ({ ...prev, postcode: e.target.value }))}
                      className="w-full px-4 py-3 border border-sepia/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sepia/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Country *</label>
                  <select
                    value={shipping.countryCode}
                    onChange={e => setShipping(prev => ({ ...prev, countryCode: e.target.value }))}
                    className="w-full px-4 py-3 border border-sepia/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sepia/30 bg-white"
                  >
                    <option value="GB">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="IE">Ireland</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Book Preview */}
                  <div className="flex flex-col items-center">
                    <BookPreview
                      coverImage={coverImage}
                      title={bookTitle}
                      authorName={authorName}
                      format={selectedFormat}
                      size="normal"
                    />
                    <div className="mt-4 text-center">
                      <div className="font-medium text-ink">{bookTitle}</div>
                      <div className="text-sm text-warmgray capitalize">{selectedFormat}</div>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl p-5 border border-sepia/10">
                      <h4 className="font-medium text-ink mb-3">Order Summary</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-warmgray">Format</dt>
                          <dd className="text-ink font-medium capitalize">{selectedFormat}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-warmgray">Cover Style</dt>
                          <dd className="text-ink font-medium">{options?.coverStyles.find(s => s.id === selectedStyle)?.name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-warmgray">Pages</dt>
                          <dd className="text-ink font-medium">~{pageCount || 50} pages</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-sepia/10">
                      <h4 className="font-medium text-ink mb-3">Shipping To</h4>
                      <p className="text-sm text-ink">
                        {shipping.name}<br />
                        {shipping.street1}<br />
                        {shipping.city}, {shipping.postcode}
                      </p>
                    </div>

                    <div className="bg-sepia/10 rounded-xl p-5">
                      <div className="flex justify-between items-center">
                        <span className="text-ink font-medium">Total</span>
                        <span className="text-2xl font-semibold text-ink">
                          {options?.bookFormats.find(f => f.id === selectedFormat)?.price}
                        </span>
                      </div>
                      <p className="text-xs text-warmgray mt-1">Includes shipping</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-sepia/10 flex justify-between items-center bg-white/50">
          <div>
            {step === 1 && selectedFormat && (
              <span className="text-lg font-medium text-ink">
                {options?.bookFormats.find(f => f.id === selectedFormat)?.price}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-6 py-3 border border-sepia/30 text-sepia rounded-xl hover:bg-sepia/5 transition font-medium"
              >
                Back
              </button>
            )}
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
                className="px-8 py-3 bg-sepia text-white rounded-xl hover:bg-sepia/90 disabled:opacity-40 transition font-medium"
              >
                Continue to Cover
              </button>
            )}
            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedToStep3}
                className="px-8 py-3 bg-sepia text-white rounded-xl hover:bg-sepia/90 disabled:opacity-40 transition font-medium"
              >
                Continue to Shipping
              </button>
            )}
            {step === 3 && (
              <button
                onClick={() => setStep(4)}
                disabled={!canProceedToStep4}
                className="px-8 py-3 bg-sepia text-white rounded-xl hover:bg-sepia/90 disabled:opacity-40 transition font-medium"
              >
                Review Order
              </button>
            )}
            {step === 4 && (
              <button
                onClick={() => {
                  // TODO: Integrate with Stripe payment
                  alert('Payment integration coming soon!')
                }}
                className="px-8 py-3 bg-ink text-white rounded-xl hover:bg-ink/90 transition font-medium"
              >
                Complete Order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
