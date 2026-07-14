import { IconMinus, IconPlus, IconCheck, IconInfoCircle, IconCoin } from '@tabler/icons-react'
import { QUANTITY_PRESETS, DISCOUNT_TIERS, getSavingsLabel } from '../../data/bookColors'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

/**
 * Step-1 section: Quantity selector with bulk-discount banner,
 * quick-select buttons, custom input, and tier info table.
 */
export default function QuantitySelector({ config, onConfigChange }) {
  return (
    <div>
      <h3 className="text-base sm:text-lg font-display text-ink mb-3 sm:mb-4 flex items-center gap-2">
        <span className="w-7 h-7 sm:w-8 sm:h-8 bg-sepia-100 text-sepia-600 rounded-full flex items-center justify-center text-sm font-sans">
          7
        </span>
        Quantity
      </h3>

      <BulkOfferBanner onConfigChange={onConfigChange} />
      <QuickSelectButtons config={config} onConfigChange={onConfigChange} />
      <CustomQuantityInput config={config} onConfigChange={onConfigChange} />
      <DiscountTiersTable quantity={config.quantity} />
    </div>
  )
}

/* ---------- Bulk offer banner ---------- */

function BulkOfferBanner({ onConfigChange }) {
  return (
    <div className="mb-4 sm:mb-6 p-4 sm:p-5 bg-bronze-50 border border-bronze-200/60 rounded-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex-shrink-0 w-11 h-11 bg-bronze-100 text-bronze-600 rounded-xl flex items-center justify-center">
            <IconCoin size={24} stroke={1.5} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ink font-medium text-base">Special Family Offer</span>
              <Badge variant="bronze">40% OFF</Badge>
            </div>
            <p className="text-sepia-600 text-sm mt-0.5">Order 10+ books and save 40%!</p>
          </div>
        </div>
        <Button
          variant="accent"
          size="sm"
          onClick={() => onConfigChange(prev => ({ ...prev, quantity: 10 }))}
          className="w-full sm:w-auto flex-shrink-0 whitespace-nowrap"
        >
          Get 10 Books
        </Button>
      </div>
    </div>
  )
}

/* ---------- Quick select buttons ---------- */

function QuickSelectButtons({ config, onConfigChange }) {
  return (
    <div className="mb-3 sm:mb-4">
      <span className="text-sm text-sepia-500 mb-2 block">Quick select:</span>
      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
        {QUANTITY_PRESETS.map(({ qty, label, discount, popular }) => (
          <button
            key={qty}
            type="button"
            onClick={() => onConfigChange(prev => ({ ...prev, quantity: qty }))}
            aria-pressed={config.quantity === qty}
            className={`relative px-2 sm:px-4 py-2.5 min-h-[44px] border rounded-xl font-medium bg-surface transition-all duration-200 ${
              config.quantity === qty
                ? 'border-bronze-400 ring-4 ring-bronze-500/10 shadow-soft text-ink'
                : popular
                  ? 'border-bronze-200 bg-bronze-50 text-bronze-700 hover:border-bronze-300'
                  : 'border-sepia-200 text-ink hover:border-sepia-300 hover:bg-sepia-50'
            }`}
          >
            {popular && config.quantity !== qty && (
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-bronze-500 text-white text-[10px] font-semibold rounded-full">
                BEST
              </span>
            )}
            {config.quantity === qty && (
              <span
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-bronze-500 text-white flex items-center justify-center"
                aria-hidden="true"
              >
                <IconCheck size={12} stroke={3} />
              </span>
            )}
            <span className="block text-xs sm:text-sm">{label}</span>
            {discount && (
              <span
                className={`block text-xs mt-0.5 ${
                  config.quantity === qty ? 'text-bronze-700' : 'text-success-strong font-semibold'
                }`}
              >
                Save {discount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- Custom quantity input ---------- */

function CustomQuantityInput({ config, onConfigChange }) {
  const savingsLabel = getSavingsLabel(config.quantity)

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-surface border border-sepia-200/70 rounded-2xl">
      <span className="text-sm text-sepia-500 w-full sm:w-auto">Custom quantity:</span>
      <button
        type="button"
        onClick={() =>
          onConfigChange(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))
        }
        aria-label="Decrease quantity"
        className="w-11 h-11 border border-sepia-200 bg-surface rounded-xl hover:bg-sepia-50 hover:border-sepia-300 text-sepia-600 flex items-center justify-center transition-colors"
      >
        <IconMinus size={20} stroke={1.75} />
      </button>
      <input
        type="number"
        min="1"
        max="999"
        aria-label="Quantity"
        value={config.quantity}
        onChange={e =>
          onConfigChange(prev => ({
            ...prev,
            quantity: Math.max(1, Math.min(999, parseInt(e.target.value) || 1))
          }))
        }
        className="w-20 text-2xl font-semibold text-ink text-center bg-surface border border-sepia-200 rounded-xl py-2 hover:border-sepia-300 focus:border-bronze-400 focus:ring-4 focus:ring-bronze-500/10 focus:outline-none transition-colors duration-150"
      />
      <button
        type="button"
        onClick={() => onConfigChange(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
        aria-label="Increase quantity"
        className="w-11 h-11 border border-sepia-200 bg-surface rounded-xl hover:bg-sepia-50 hover:border-sepia-300 text-sepia-600 flex items-center justify-center transition-colors"
      >
        <IconPlus size={20} stroke={1.75} />
      </button>

      {savingsLabel && (
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-success-soft rounded-xl">
          <IconCheck size={16} className="text-success" stroke={2} />
          <span className="text-sm font-medium text-success-strong">{savingsLabel}</span>
        </div>
      )}
    </div>
  )
}

/* ---------- Discount tiers info ---------- */

function DiscountTiersTable({ quantity }) {
  return (
    <div className="mt-4 p-4 bg-sepia-50 rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        <IconInfoCircle size={20} className="text-sepia-500" stroke={1.75} />
        <span className="text-sm font-medium text-ink">Bulk Discount Tiers</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
        {DISCOUNT_TIERS.map(tier => {
          const isActive = quantity >= tier.min && (tier.max === '+' || quantity <= tier.max)

          return (
            <div
              key={tier.min}
              className={`p-2 rounded-lg transition ${
                isActive
                  ? 'bg-bronze-500 text-white'
                  : tier.highlight
                    ? 'bg-bronze-100 text-bronze-700 border border-bronze-200'
                    : 'bg-surface text-sepia-600 border border-sepia-200/60'
              }`}
            >
              <div className="font-semibold">{tier.discount}</div>
              <div className="text-[10px] opacity-75">
                {tier.min}-{tier.max}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
