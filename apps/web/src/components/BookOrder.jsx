import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { IconCheck, IconX } from '@tabler/icons-react'
import { DEFAULT_CONFIG } from '../data/bookColors'
import BookMockup from './book-order/BookMockup'
import FormatSelector from './book-order/FormatSelector'
import ColorSelector from './book-order/ColorSelector'
import QuantitySelector from './book-order/QuantitySelector'
import { Button, Card, Field, Input, ProgressBar, Skeleton } from './ui'

const SELECT_CLASSES = [
  'w-full px-4 py-3 rounded-xl text-base text-ink bg-surface',
  'border border-sepia-200 hover:border-sepia-300',
  'focus:border-bronze-400 focus:ring-4 focus:ring-bronze-500/10 focus:outline-none',
  'transition-colors duration-150'
].join(' ')

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
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-parchment rounded-t-3xl sm:rounded-3xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-modal overflow-hidden">
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
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <Card className="w-full max-w-sm">
        <p className="text-sepia-600 text-sm mb-4">Preparing your book studio...</p>
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Wizard chrome                                                      */
/* ------------------------------------------------------------------ */

function WizardHeader({ step, onClose }) {
  const labels = ['Design', 'Shipping', 'Review', 'Done']

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-sepia-100 flex justify-between items-start gap-4 bg-surface/60">
      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-1">
          Step {step} of {labels.length} &middot; {labels[step - 1]}
        </p>
        <h2 className="text-xl sm:text-2xl font-display text-ink">Create Your Book</h2>
        <ProgressBar
          value={(step / labels.length) * 100}
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
  )
}

function WizardFooter({ step, cost, calculating, shippingValid, onBack, onNext, onOrder }) {
  const priceEl = calculating ? (
    <span className="hidden sm:block text-sm text-sepia-500 animate-pulse">
      Calculating price...
    </span>
  ) : cost ? (
    <div className="hidden sm:block">
      <span className="text-2xl font-display text-ink">${cost.breakdown.total.toFixed(2)}</span>
      <span className="text-sm text-sepia-500 ml-2">estimated total</span>
    </div>
  ) : (
    <div className="hidden sm:block" />
  )

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-sepia-100 bg-surface/60">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        {priceEl}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {step > 1 && (
            <Button
              variant="ghost"
              size="lg"
              onClick={onBack}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              size="lg"
              onClick={onNext}
              disabled={step === 2 && !shippingValid}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Continue
            </Button>
          ) : (
            <Button size="lg" onClick={onOrder} className="w-full sm:w-auto order-1 sm:order-2">
              Complete Order Preview
            </Button>
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
      <div className="hidden lg:flex w-80 bg-sepia-50 flex-col items-center justify-center p-8 border-r border-sepia-100">
        <BookMockup config={config} options={options} title={shipping.bookTitle} />
        <div className="mt-8 text-center">
          <div className="text-2xl font-display text-ink">{shipping.bookTitle}</div>
          <div className="text-sm text-sepia-500 mt-1">
            {options.trimSizes.find(s => s.id === config.trimSize)?.width}" x{' '}
            {options.trimSizes.find(s => s.id === config.trimSize)?.height}"
          </div>
          <div className="text-sm text-sepia-500">
            {options.bindingTypes.find(b => b.id === config.binding)?.name}
          </div>
          {cost && (
            <div className="mt-4 text-3xl font-display text-ink">
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
    <Field label="Country *">
      {id => (
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={SELECT_CLASSES}
        >
          {countries.map(c => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

function ShippingSpeedPicker({ levels, selected, onSelect }) {
  return (
    <Field label="Shipping Speed">
      {() => (
        <div className="grid grid-cols-2 gap-4">
          {levels.map(level => (
            <button
              key={level.id}
              type="button"
              onClick={() => onSelect(level.id)}
              className={`relative p-4 min-h-[44px] border rounded-2xl text-left transition-all duration-200 bg-surface ${
                selected === level.id
                  ? 'border-bronze-400 ring-4 ring-bronze-500/10'
                  : 'border-sepia-200 hover:border-sepia-300'
              }`}
            >
              {selected === level.id && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-bronze-500 text-white flex items-center justify-center">
                  <IconCheck size={12} stroke={3} />
                </span>
              )}
              <div className="font-medium text-ink">{level.name}</div>
              <div className="text-sm text-sepia-600">{level.days}</div>
            </button>
          ))}
        </div>
      )}
    </Field>
  )
}

function ShippingField({ label, value, onChange, type = 'text', className = '' }) {
  return (
    <Field label={label}>
      {(id, describedBy) => (
        <Input
          id={id}
          aria-describedby={describedBy}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={className}
        />
      )}
    </Field>
  )
}

function StepReview({ config, options, shipping, cost }) {
  const find = (list, id) => list?.find(item => item.id === id)
  const countryName = options?.countries.find(c => c.code === shipping.countryCode)?.name
  const shLevel = find(options?.shippingLevels, shipping.shippingLevel)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-display text-ink mb-4 text-lg">Your Book</h3>
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
        </Card>
        <div className="space-y-6">
          <Card>
            <h3 className="font-display text-ink mb-4 text-lg">Shipping To</h3>
            <p className="text-ink">
              {shipping.name}
              <br />
              {shipping.street1}
              <br />
              {shipping.city}, {shipping.stateCode} {shipping.postcode}
              <br />
              {countryName}
            </p>
            <p className="text-sm text-sepia-600 mt-3">
              {shLevel?.name} - {shLevel?.days}
            </p>
          </Card>
          {cost && <CostSummary cost={cost} />}
        </div>
      </div>
    </div>
  )
}

function DLRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sepia-600">{label}</dt>
      <dd className="text-ink font-medium">{value}</dd>
    </div>
  )
}

function CostSummary({ cost }) {
  const { printing, shipping, tax, total } = cost.breakdown
  return (
    <Card>
      <h3 className="font-display text-ink mb-4 text-lg">Order Total</h3>
      <dl className="space-y-2">
        <DLRow label="Printing" value={`$${printing.toFixed(2)}`} />
        <DLRow label="Shipping" value={`$${shipping.toFixed(2)}`} />
        <DLRow label="Tax" value={`$${tax.toFixed(2)}`} />
        <div className="flex justify-between items-baseline pt-3 border-t border-sepia-200/70">
          <dt className="text-ink font-medium">Total</dt>
          <dd className="text-2xl font-display text-ink">${total.toFixed(2)}</dd>
        </div>
      </dl>
    </Card>
  )
}

function StepComplete({ onClose }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-success-soft text-success rounded-full flex items-center justify-center mx-auto mb-6">
          <IconCheck size={32} stroke={1.5} />
        </div>
        <h3 className="text-3xl font-display text-ink mb-4">Configuration Saved!</h3>
        <p className="text-sepia-600 mb-8">
          Your book configuration has been saved. Full PDF generation and payment processing coming
          soon.
        </p>
        <Button size="lg" onClick={onClose}>
          Return to Export
        </Button>
      </div>
    </div>
  )
}
