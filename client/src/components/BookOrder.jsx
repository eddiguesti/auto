import { useState, useEffect } from 'react'

export default function BookOrder({ userName, pageCount, onClose }) {
  const [step, setStep] = useState(1) // 1: customize, 2: shipping, 3: review, 4: complete
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [options, setOptions] = useState(null)
  const [error, setError] = useState(null)
  const [cost, setCost] = useState(null)

  // Book configuration
  const [config, setConfig] = useState({
    trimSize: '0600X0900',
    color: 'FC',
    quality: 'STD',
    binding: 'PB',
    paper: '060UC',
    ppi: '444',
    finish: 'M',
    linen: 'X',
    foil: 'X',
    quantity: 1
  })

  // Shipping details
  const [shipping, setShipping] = useState({
    name: '',
    email: '',
    phone: '',
    street1: '',
    street2: '',
    city: '',
    stateCode: '',
    postcode: '',
    countryCode: 'US',
    shippingLevel: 'MAIL',
    bookTitle: `${userName}'s Life Story`
  })

  // Fetch options on mount
  useEffect(() => {
    fetchOptions()
  }, [])

  // Calculate cost when config changes
  useEffect(() => {
    if (options) {
      calculateCost()
    }
  }, [config, shipping.countryCode])

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/lulu/options')
      const data = await res.json()
      setOptions(data)
    } catch (err) {
      setError('Failed to load book options')
    } finally {
      setLoading(false)
    }
  }

  const calculateCost = async () => {
    setCalculating(true)
    try {
      const res = await fetch('/api/lulu/calculate-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: config,
          pageCount: pageCount || 50,
          quantity: config.quantity,
          shippingAddress: { countryCode: shipping.countryCode }
        })
      })
      const data = await res.json()
      if (data.error) {
        setCost(null)
      } else {
        setCost(data)
      }
    } catch (err) {
      setCost(null)
    } finally {
      setCalculating(false)
    }
  }

  const applyPreset = (preset) => {
    setConfig(prev => ({
      ...prev,
      ...preset
    }))
  }

  const handleOrder = async () => {
    // For now, just show success - in production, this would call /api/lulu/create-order
    // with actual PDF URLs generated from the story content
    setStep(4)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-sepia border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sepia">Loading book options...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 overflow-y-auto">
      <div className="bg-[#faf8f3] rounded-t-xl sm:rounded-lg w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-sepia/20">
        {/* Header */}
        <div className="p-4 border-b border-sepia/20 flex justify-between items-center flex-shrink-0 bg-sepia/5">
          <div>
            <h2 className="text-xl font-medium text-ink">Order Printed Book</h2>
            <p className="text-sm text-sepia/70">
              {step === 1 && 'Customize your book'}
              {step === 2 && 'Shipping details'}
              {step === 3 && 'Review your order'}
              {step === 4 && 'Order confirmed'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sepia/10 text-sepia/60 hover:text-sepia">
            <span className="text-xl">x</span>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-4 py-3 border-b border-sepia/10 flex-shrink-0">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`flex-1 h-1.5 rounded-full ${step >= s ? 'bg-sepia' : 'bg-sepia/20'}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Customize */}
          {step === 1 && options && (
            <div className="space-y-6">
              {/* Quick Presets */}
              <div>
                <h3 className="font-medium text-ink mb-3">Quick Start Presets</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(options.recommended).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(preset)}
                      className="p-3 text-left border border-sepia/20 rounded-lg hover:border-sepia/40 hover:bg-white/50 transition"
                    >
                      <div className="font-medium text-ink capitalize">{key}</div>
                      <div className="text-xs text-sepia/70 mt-1">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trim Size */}
              <div>
                <h3 className="font-medium text-ink mb-3">Book Size</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {options.trimSizes.map(size => (
                    <button
                      key={size.id}
                      onClick={() => setConfig(prev => ({ ...prev, trimSize: size.id }))}
                      className={`p-2 text-center border rounded-lg transition text-sm ${
                        config.trimSize === size.id
                          ? 'border-sepia bg-sepia/10'
                          : 'border-sepia/20 hover:border-sepia/40'
                      } ${size.popular ? 'ring-1 ring-sepia/30' : ''}`}
                    >
                      <div className="font-medium text-ink">{size.width}" x {size.height}"</div>
                      <div className="text-xs text-sepia/60">{size.name.split('(')[0]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Print Color */}
              <div>
                <h3 className="font-medium text-ink mb-3">Print Color</h3>
                <div className="grid grid-cols-2 gap-3">
                  {options.printColors.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setConfig(prev => ({ ...prev, color: color.id }))}
                      className={`p-3 border rounded-lg transition ${
                        config.color === color.id
                          ? 'border-sepia bg-sepia/10'
                          : 'border-sepia/20 hover:border-sepia/40'
                      }`}
                    >
                      <div className="font-medium text-ink">{color.name}</div>
                      <div className="text-xs text-sepia/60">{color.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Binding Type */}
              <div>
                <h3 className="font-medium text-ink mb-3">Binding</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {options.bindingTypes.map(binding => (
                    <button
                      key={binding.id}
                      onClick={() => setConfig(prev => ({ ...prev, binding: binding.id }))}
                      className={`p-3 border rounded-lg transition ${
                        config.binding === binding.id
                          ? 'border-sepia bg-sepia/10'
                          : 'border-sepia/20 hover:border-sepia/40'
                      }`}
                    >
                      <div className="font-medium text-ink text-sm">{binding.name}</div>
                      <div className="text-xs text-sepia/60">{binding.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Type */}
              <div>
                <h3 className="font-medium text-ink mb-3">Paper</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {options.paperTypes.map(paper => (
                    <button
                      key={paper.id}
                      onClick={() => setConfig(prev => ({ ...prev, paper: paper.id }))}
                      className={`p-3 border rounded-lg transition ${
                        config.paper === paper.id
                          ? 'border-sepia bg-sepia/10'
                          : 'border-sepia/20 hover:border-sepia/40'
                      }`}
                    >
                      <div className="font-medium text-ink text-sm">{paper.name}</div>
                      <div className="text-xs text-sepia/60">{paper.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover Finish */}
              <div>
                <h3 className="font-medium text-ink mb-3">Cover Finish</h3>
                <div className="grid grid-cols-3 gap-3">
                  {options.coverFinishes.map(finish => (
                    <button
                      key={finish.id}
                      onClick={() => setConfig(prev => ({ ...prev, finish: finish.id }))}
                      className={`p-3 border rounded-lg transition ${
                        config.finish === finish.id
                          ? 'border-sepia bg-sepia/10'
                          : 'border-sepia/20 hover:border-sepia/40'
                      }`}
                    >
                      <div className="font-medium text-ink">{finish.name}</div>
                      <div className="text-xs text-sepia/60">{finish.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Linen Colors (if linen wrap binding) */}
              {config.binding === 'LW' && (
                <div>
                  <h3 className="font-medium text-ink mb-3">Linen Color</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {options.linenColors.filter(l => l.id !== 'X').map(linen => (
                      <button
                        key={linen.id}
                        onClick={() => setConfig(prev => ({ ...prev, linen: linen.id }))}
                        className={`p-2 border rounded-lg transition ${
                          config.linen === linen.id
                            ? 'border-sepia bg-sepia/10'
                            : 'border-sepia/20 hover:border-sepia/40'
                        }`}
                      >
                        <div className="font-medium text-ink text-sm">{linen.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Foil Stamping (for hardcovers) */}
              {['CW', 'DJ', 'LW'].includes(config.binding) && (
                <div>
                  <h3 className="font-medium text-ink mb-3">Foil Stamping</h3>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {options.foilOptions.map(foil => (
                      <button
                        key={foil.id}
                        onClick={() => setConfig(prev => ({ ...prev, foil: foil.id }))}
                        className={`p-2 border rounded-lg transition ${
                          config.foil === foil.id
                            ? 'border-sepia bg-sepia/10'
                            : 'border-sepia/20 hover:border-sepia/40'
                        }`}
                      >
                        <div className="font-medium text-ink text-sm">{foil.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <h3 className="font-medium text-ink mb-3">Quantity</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                    className="w-10 h-10 border border-sepia/30 rounded-lg hover:bg-sepia/10"
                  >
                    -
                  </button>
                  <span className="text-xl font-medium text-ink w-12 text-center">{config.quantity}</span>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                    className="w-10 h-10 border border-sepia/30 rounded-lg hover:bg-sepia/10"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && options && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Book Title</label>
                <input
                  type="text"
                  value={shipping.bookTitle}
                  onChange={e => setShipping(prev => ({ ...prev, bookTitle: e.target.value }))}
                  className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sepia/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={shipping.name}
                    onChange={e => setShipping(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sepia/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Email *</label>
                  <input
                    type="email"
                    value={shipping.email}
                    onChange={e => setShipping(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sepia/30"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Phone</label>
                <input
                  type="tel"
                  value={shipping.phone}
                  onChange={e => setShipping(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sepia/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Street Address *</label>
                <input
                  type="text"
                  value={shipping.street1}
                  onChange={e => setShipping(prev => ({ ...prev, street1: e.target.value }))}
                  className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sepia/30"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={shipping.street2}
                  onChange={e => setShipping(prev => ({ ...prev, street2: e.target.value }))}
                  className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sepia/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">City *</label>
                  <input
                    type="text"
                    value={shipping.city}
                    onChange={e => setShipping(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sepia/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">State/Province</label>
                  <input
                    type="text"
                    value={shipping.stateCode}
                    onChange={e => setShipping(prev => ({ ...prev, stateCode: e.target.value }))}
                    className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sepia/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Postal Code *</label>
                  <input
                    type="text"
                    value={shipping.postcode}
                    onChange={e => setShipping(prev => ({ ...prev, postcode: e.target.value }))}
                    className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sepia/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Country *</label>
                  <select
                    value={shipping.countryCode}
                    onChange={e => setShipping(prev => ({ ...prev, countryCode: e.target.value }))}
                    className="w-full px-4 py-2 border border-sepia/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sepia/30 bg-white"
                  >
                    {options.countries.map(country => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Shipping Speed</label>
                <div className="grid grid-cols-2 gap-3">
                  {options.shippingLevels.map(level => (
                    <button
                      key={level.id}
                      onClick={() => setShipping(prev => ({ ...prev, shippingLevel: level.id }))}
                      className={`p-3 border rounded-lg transition text-left ${
                        shipping.shippingLevel === level.id
                          ? 'border-sepia bg-sepia/10'
                          : 'border-sepia/20 hover:border-sepia/40'
                      }`}
                    >
                      <div className="font-medium text-ink">{level.name}</div>
                      <div className="text-xs text-sepia/60">{level.days}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white/70 rounded-lg p-4 border border-sepia/10">
                <h3 className="font-medium text-ink mb-3">Book Configuration</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-sepia/70">Size:</dt>
                  <dd className="text-ink">{options?.trimSizes.find(s => s.id === config.trimSize)?.name}</dd>
                  <dt className="text-sepia/70">Color:</dt>
                  <dd className="text-ink">{options?.printColors.find(c => c.id === config.color)?.name}</dd>
                  <dt className="text-sepia/70">Binding:</dt>
                  <dd className="text-ink">{options?.bindingTypes.find(b => b.id === config.binding)?.name}</dd>
                  <dt className="text-sepia/70">Paper:</dt>
                  <dd className="text-ink">{options?.paperTypes.find(p => p.id === config.paper)?.name}</dd>
                  <dt className="text-sepia/70">Cover:</dt>
                  <dd className="text-ink">{options?.coverFinishes.find(f => f.id === config.finish)?.name}</dd>
                  <dt className="text-sepia/70">Quantity:</dt>
                  <dd className="text-ink">{config.quantity}</dd>
                </dl>
              </div>

              <div className="bg-white/70 rounded-lg p-4 border border-sepia/10">
                <h3 className="font-medium text-ink mb-3">Shipping To</h3>
                <p className="text-sm text-ink">
                  {shipping.name}<br />
                  {shipping.street1}<br />
                  {shipping.street2 && <>{shipping.street2}<br /></>}
                  {shipping.city}, {shipping.stateCode} {shipping.postcode}<br />
                  {options?.countries.find(c => c.code === shipping.countryCode)?.name}
                </p>
                <p className="text-sm text-sepia/70 mt-2">
                  {options?.shippingLevels.find(l => l.id === shipping.shippingLevel)?.name} -
                  {options?.shippingLevels.find(l => l.id === shipping.shippingLevel)?.days}
                </p>
              </div>

              {cost && (
                <div className="bg-sepia/5 rounded-lg p-4 border border-sepia/20">
                  <h3 className="font-medium text-ink mb-3">Order Total</h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-sepia/70">Printing:</dt>
                      <dd className="text-ink">${cost.breakdown.printing.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sepia/70">Shipping:</dt>
                      <dd className="text-ink">${cost.breakdown.shipping.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sepia/70">Tax:</dt>
                      <dd className="text-ink">${cost.breakdown.tax.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-sepia/20 font-medium">
                      <dt className="text-ink">Total:</dt>
                      <dd className="text-ink">${cost.breakdown.total.toFixed(2)}</dd>
                    </div>
                  </dl>
                </div>
              )}

              <p className="text-xs text-sepia/60 text-center">
                Note: This is a preview. PDF generation and payment integration coming soon.
              </p>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-medium text-ink mb-2">Order Preview Complete</h3>
              <p className="text-sepia/70 mb-6">
                Your book configuration has been saved. Full ordering will be available soon.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-ink text-white rounded-lg hover:bg-ink/90 transition"
              >
                Return to Export
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="p-4 border-t border-sepia/20 flex justify-between items-center flex-shrink-0 bg-sepia/5">
            <div>
              {calculating && <span className="text-sm text-sepia/60">Calculating...</span>}
              {!calculating && cost && (
                <div>
                  <span className="text-lg font-medium text-ink">${cost.breakdown.total.toFixed(2)}</span>
                  <span className="text-sm text-sepia/60 ml-2">estimated</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="px-4 py-2 border border-sepia/30 text-sepia rounded-lg hover:bg-white/50"
                >
                  Back
                </button>
              )}
              {step < 3 && (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 2 && (!shipping.name || !shipping.email || !shipping.street1 || !shipping.city || !shipping.postcode)}
                  className="px-6 py-2 bg-ink text-white rounded-lg hover:bg-ink/90 disabled:opacity-40"
                >
                  Continue
                </button>
              )}
              {step === 3 && (
                <button
                  onClick={handleOrder}
                  className="px-6 py-2 bg-sepia text-white rounded-lg hover:bg-sepia/90"
                >
                  Place Order Preview
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
