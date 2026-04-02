import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { IconCheck, IconX } from '@tabler/icons-react'
import { DEFAULT_CONFIG } from '../data/bookColors'
import BookMockup from './book-order/BookMockup'
import FormatSelector from './book-order/FormatSelector'
import ColorSelector from './book-order/ColorSelector'
import QuantitySelector from './book-order/QuantitySelector'

const makeShippingState = userName => ({
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

function useBookWizard(authFetch, pageCount, userName) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [options, setOptions] = useState(null)
  const [error, setError] = useState(null)
  const [cost, setCost] = useState(null)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [shipping, setShipping] = useState(makeShippingState(userName))

  useEffect(() => {
    fetchOptions()
  }, [])
  useEffect(() => {
    if (options) calculateCost()
  }, [options, config, shipping.countryCode, calculateCost])

  const fetchOptions = async () => {
    try {
      const res = await authFetch('/api/lulu/options')
      setOptions(await res.json())
    } catch (err) {
      setError('Failed to load book options')
    } finally {
      setLoading(false)
    }
  }

  const calculateCost = useCallback(async () => {
    setCalculating(true)
    try {
      const res = await authFetch('/api/lulu/calculate-cost', {
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
      setCost(data.error ? null : data)
    } catch (err) {
      setCost(null)
    } finally {
      setCalculating(false)
    }
  }, [authFetch, config, shipping.countryCode, pageCount])

  const shippingValid =
    shipping.name && shipping.email && shipping.street1 && shipping.city && shipping.postcode

  return {
    step,
    setStep,
    loading,
    calculating,
    options,
    error,
    cost,
    config,
    setConfig,
    shipping,
    setShipping,
    shippingValid
  }
}

export default function BookOrder({ userName, pageCount, onClose }) {
  const { authFetch } = useAuth()
  const wiz = useBookWizard(authFetch, pageCount, userName)
  const {
    step,
    setStep,
    loading,
    calculating,
    options,
    cost,
    config,
    setConfig,
    shipping,
    setShipping,
    shippingValid
  } = wiz

  if (loading) return <LoadingOverlay />

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-gradient-to-b from-[#fdfcf9] to-[#f8f5ef] rounded-t-2xl sm:rounded-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <WizardHeader step={step} onClose={onClose} />
        <div className="flex-1 overflow-hidden flex">
          {step === 1 && options && (
            <StepDesign
              config={config}
              options={options}
              shipping={shipping}
              cost={cost}
              onConfigChange={setConfig}
            />
          )}
          {step === 2 && options && (
            <StepShipping options={options} shipping={shipping} onShippingChange={setShipping} />
          )}
          {step === 3 && (
            <StepReview config={config} options={options} shipping={shipping} cost={cost} />
          )}
          {step === 4 && <StepComplete onClose={onClose} />}
        </div>
        {step < 4 && (
          <WizardFooter
            step={step}
            cost={cost}
            calculating={calculating}
            shippingValid={shippingValid}
            onBack={() => setStep(s => s - 1)}
            onNext={() => setStep(s => s + 1)}
            onOrder={() => setStep(4)}
          />
        )}
      </div>
    </div>
  )
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
        <div className="animate-spin w-10 h-10 border-3 border-sepia border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sepia">Preparing your book studio...</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Wizard chrome                                                      */
/* ------------------------------------------------------------------ */

function WizardHeader({ step, onClose }) {
  const labels = ['Design', 'Shipping', 'Review', 'Done']

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-sepia/10 flex justify-between items-center bg-white/50">
      <div className="min-w-0 flex-1">
        <h2 className="text-xl sm:text-2xl font-serif text-ink">Create Your Book</h2>
        <div className="flex items-center gap-1 sm:gap-2 mt-1 overflow-x-auto">
          {labels.map((label, i) => (
            <div key={i} className="flex items-center flex-shrink-0">
              <div
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium ${
                  step > i + 1
                    ? 'bg-green-500 text-white'
                    : step === i + 1
                      ? 'bg-sepia text-white'
                      : 'bg-sepia/20 text-sepia/60'
                }`}
              >
                {step > i + 1 ? '\u2713' : i + 1}
              </div>
              <span
                className={`ml-1 text-[10px] sm:text-xs hidden xs:inline ${
                  step === i + 1 ? 'text-ink font-medium' : 'text-sepia/60'
                }`}
              >
                {label}
              </span>
              {i < 3 && <div className="w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 bg-sepia/20" />}
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-sepia/10 text-sepia/60 hover:text-sepia transition ml-2"
      >
        <IconX size={22} stroke={2} />
      </button>
    </div>
  )
}

function WizardFooter({ step, cost, calculating, shippingValid, onBack, onNext, onOrder }) {
  const priceEl = calculating ? (
    <span className="hidden sm:block text-sm text-sepia/60 animate-pulse">
      Calculating price...
    </span>
  ) : cost ? (
    <div className="hidden sm:block">
      <span className="text-2xl font-medium text-ink">${cost.breakdown.total.toFixed(2)}</span>
      <span className="text-sm text-sepia/60 ml-2">estimated total</span>
    </div>
  ) : (
    <div className="hidden sm:block" />
  )

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-sepia/10 bg-white/50">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        {priceEl}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {step > 1 && (
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-3 border border-sepia/30 text-sepia rounded-xl hover:bg-sepia/5 transition font-medium order-2 sm:order-1"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={onNext}
              disabled={step === 2 && !shippingValid}
              className="w-full sm:w-auto px-8 py-3.5 sm:py-3 bg-sepia text-white rounded-xl hover:bg-sepia/90 disabled:opacity-40 transition font-medium order-1 sm:order-2"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={onOrder}
              className="w-full sm:w-auto px-8 py-3.5 sm:py-3 bg-ink text-white rounded-xl hover:bg-ink/90 transition font-medium order-1 sm:order-2"
            >
              Complete Order Preview
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step views                                                         */
/* ------------------------------------------------------------------ */

function StepDesign({ config, options, shipping, cost, onConfigChange }) {
  return (
    <>
      <div className="hidden lg:flex w-80 bg-gradient-to-br from-sepia/5 to-sepia/10 flex-col items-center justify-center p-8 border-r border-sepia/10">
        <BookMockup config={config} options={options} title={shipping.bookTitle} />
        <div className="mt-8 text-center">
          <div className="text-2xl font-serif text-ink">{shipping.bookTitle}</div>
          <div className="text-sm text-sepia/60 mt-1">
            {options.trimSizes.find(s => s.id === config.trimSize)?.width}" x{' '}
            {options.trimSizes.find(s => s.id === config.trimSize)?.height}"
          </div>
          <div className="text-sm text-sepia/60">
            {options.bindingTypes.find(b => b.id === config.binding)?.name}
          </div>
          {cost && (
            <div className="mt-4 text-3xl font-medium text-ink">
              ${cost.breakdown.total.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        <FormatSelector config={config} options={options} onConfigChange={onConfigChange} />
        <ColorSelector config={config} options={options} onConfigChange={onConfigChange} />
        <QuantitySelector config={config} onConfigChange={onConfigChange} />
      </div>
    </>
  )
}

function StepShipping({ options, shipping, onShippingChange }) {
  const field = (key, value) => onShippingChange(prev => ({ ...prev, [key]: value }))

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <ShippingField
          label="Book Title"
          value={shipping.bookTitle}
          onChange={v => field('bookTitle', v)}
          className="text-lg"
        />
        <div className="grid grid-cols-2 gap-4">
          <ShippingField
            label="Full Name *"
            value={shipping.name}
            onChange={v => field('name', v)}
          />
          <ShippingField
            label="Email *"
            type="email"
            value={shipping.email}
            onChange={v => field('email', v)}
          />
        </div>
        <ShippingField
          label="Street Address *"
          value={shipping.street1}
          onChange={v => field('street1', v)}
        />
        <div className="grid grid-cols-3 gap-4">
          <ShippingField label="City *" value={shipping.city} onChange={v => field('city', v)} />
          <ShippingField
            label="State"
            value={shipping.stateCode}
            onChange={v => field('stateCode', v)}
          />
          <ShippingField
            label="Postal Code *"
            value={shipping.postcode}
            onChange={v => field('postcode', v)}
          />
        </div>
        <CountrySelect
          countries={options.countries}
          value={shipping.countryCode}
          onChange={v => field('countryCode', v)}
        />
        <ShippingSpeedPicker
          levels={options.shippingLevels}
          selected={shipping.shippingLevel}
          onSelect={id => field('shippingLevel', id)}
        />
      </div>
    </div>
  )
}

function CountrySelect({ countries, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-2">Country *</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-sepia/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sepia/30 bg-white"
      >
        {countries.map(c => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function ShippingSpeedPicker({ levels, selected, onSelect }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-3">Shipping Speed</label>
      <div className="grid grid-cols-2 gap-4">
        {levels.map(level => (
          <button
            key={level.id}
            onClick={() => onSelect(level.id)}
            className={`p-4 border rounded-xl transition text-left ${
              selected === level.id
                ? 'border-sepia bg-sepia/10 shadow-md'
                : 'border-sepia/20 hover:border-sepia/40'
            }`}
          >
            <div className="font-medium text-ink">{level.name}</div>
            <div className="text-sm text-sepia/60">{level.days}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ShippingField({ label, value, onChange, type = 'text', className = '' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-4 py-3 border border-sepia/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sepia/30 ${className}`}
      />
    </div>
  )
}

function StepReview({ config, options, shipping, cost }) {
  const find = (list, id) => list?.find(item => item.id === id)
  const countryName = options?.countries.find(c => c.code === shipping.countryCode)?.name
  const shLevel = find(options?.shippingLevels, shipping.shippingLevel)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-medium text-ink mb-4 text-lg">Your Book</h3>
          <div className="flex justify-center mb-6">
            <BookMockup config={config} options={options} title={shipping.bookTitle} />
          </div>
          <dl className="space-y-2 text-sm">
            <DLRow label="Size" value={find(options?.trimSizes, config.trimSize)?.name} />
            <DLRow label="Binding" value={find(options?.bindingTypes, config.binding)?.name} />
            <DLRow label="Paper" value={find(options?.paperTypes, config.paper)?.name} />
            <DLRow label="Color" value={find(options?.printColors, config.color)?.name} />
            <DLRow label="Cover" value={find(options?.coverFinishes, config.finish)?.name} />
            <DLRow label="Quantity" value={config.quantity} />
          </dl>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-medium text-ink mb-4 text-lg">Shipping To</h3>
            <p className="text-ink">
              {shipping.name}
              <br />
              {shipping.street1}
              <br />
              {shipping.city}, {shipping.stateCode} {shipping.postcode}
              <br />
              {countryName}
            </p>
            <p className="text-sm text-sepia/70 mt-3">
              {shLevel?.name} - {shLevel?.days}
            </p>
          </div>
          {cost && <CostSummary cost={cost} />}
        </div>
      </div>
    </div>
  )
}

function DLRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sepia/70">{label}</dt>
      <dd className="text-ink font-medium">{value}</dd>
    </div>
  )
}

function CostSummary({ cost }) {
  const { printing, shipping, tax, total } = cost.breakdown
  return (
    <div className="bg-gradient-to-br from-sepia/5 to-sepia/10 rounded-2xl p-6 border border-sepia/20">
      <h3 className="font-medium text-ink mb-4 text-lg">Order Total</h3>
      <dl className="space-y-2">
        <DLRow label="Printing" value={`$${printing.toFixed(2)}`} />
        <DLRow label="Shipping" value={`$${shipping.toFixed(2)}`} />
        <DLRow label="Tax" value={`$${tax.toFixed(2)}`} />
        <div className="flex justify-between pt-3 border-t border-sepia/20 text-xl font-medium">
          <dt className="text-ink">Total</dt>
          <dd className="text-ink">${total.toFixed(2)}</dd>
        </div>
      </dl>
    </div>
  )
}

function StepComplete({ onClose }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconCheck size={48} className="text-green-600" stroke={2} />
        </div>
        <h3 className="text-3xl font-serif text-ink mb-4">Configuration Saved!</h3>
        <p className="text-sepia/70 mb-8">
          Your book configuration has been saved. Full PDF generation and payment processing coming
          soon.
        </p>
        <button
          onClick={onClose}
          className="px-8 py-4 bg-ink text-white rounded-xl hover:bg-ink/90 transition text-lg font-medium"
        >
          Return to Export
        </button>
      </div>
    </div>
  )
}
