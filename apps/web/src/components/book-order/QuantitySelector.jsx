import { IconMinus, IconPlus, IconCheck, IconInfoCircle, IconCoin } from '@tabler/icons-react'
import { QUANTITY_PRESETS, DISCOUNT_TIERS, getSavingsLabel } from '../../data/bookColors'

/**
 * Step-1 section: Quantity selector with bulk-discount banner,
 * quick-select buttons, custom input, and tier info table.
 */
export default function QuantitySelector({ config, onConfigChange }) {
  return (
    <div>
      <h3 className="text-base sm:text-lg font-medium text-ink mb-3 sm:mb-4 flex items-center gap-2">
        <span className="w-7 h-7 sm:w-8 sm:h-8 bg-sepia/10 rounded-full flex items-center justify-center text-sepia text-sm">
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
    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl sm:rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-amber-400/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-16 sm:w-24 h-16 sm:h-24 bg-orange-400/10 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <IconCoin size={24} className="text-white sm:hidden" stroke={2} />
            <IconCoin size={28} className="text-white hidden sm:block" stroke={2} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-amber-800 font-bold text-base sm:text-lg">
                Special Family Offer
              </span>
              <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] sm:text-xs font-bold rounded-full">
                40% OFF
              </span>
            </div>
            <p className="text-amber-700 text-xs sm:text-sm mt-0.5">
              Order 10+ books and save 40%!
            </p>
          </div>
        </div>
        <button
          onClick={() => onConfigChange(prev => ({ ...prev, quantity: 10 }))}
          className="w-full sm:w-auto flex-shrink-0 px-4 py-2.5 sm:py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition shadow-md hover:shadow-lg text-sm"
        >
          Get 10 Books
        </button>
      </div>
    </div>
  )
}

/* ---------- Quick select buttons ---------- */

function QuickSelectButtons({ config, onConfigChange }) {
  return (
    <div className="mb-3 sm:mb-4">
      <span className="text-xs sm:text-sm text-sepia/60 mb-2 block">Quick select:</span>
      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
        {QUANTITY_PRESETS.map(({ qty, label, discount, popular }) => (
          <button
            key={qty}
            onClick={() => onConfigChange(prev => ({ ...prev, quantity: qty }))}
            className={`relative px-2 sm:px-4 py-2 sm:py-2.5 border-2 rounded-lg sm:rounded-xl font-medium transition-all ${
              config.quantity === qty
                ? 'border-sepia bg-sepia text-white shadow-md scale-105'
                : popular
                  ? 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  : 'border-sepia/20 bg-white text-ink hover:border-sepia/40 hover:bg-sepia/5'
            }`}
          >
            {popular && config.quantity !== qty && (
              <span className="absolute -top-2 -right-2 px-1 sm:px-1.5 py-0.5 bg-amber-500 text-white text-[8px] sm:text-[10px] font-bold rounded-full">
                BEST
              </span>
            )}
            <span className="block text-xs sm:text-sm">{label}</span>
            {discount && (
              <span
                className={`block text-[10px] sm:text-xs mt-0.5 ${
                  config.quantity === qty ? 'text-white/80' : 'text-green-600 font-semibold'
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
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white border border-sepia/10 rounded-xl">
      <span className="text-xs sm:text-sm text-sepia/60 w-full sm:w-auto">Custom quantity:</span>
      <button
        onClick={() =>
          onConfigChange(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))
        }
        className="w-10 h-10 border-2 border-sepia/20 rounded-lg hover:bg-sepia/10 hover:border-sepia/40 text-lg font-medium text-sepia flex items-center justify-center transition"
      >
        <IconMinus size={16} stroke={2.5} />
      </button>
      <input
        type="number"
        min="1"
        max="999"
        value={config.quantity}
        onChange={e =>
          onConfigChange(prev => ({
            ...prev,
            quantity: Math.max(1, Math.min(999, parseInt(e.target.value) || 1))
          }))
        }
        className="w-20 text-2xl font-semibold text-ink text-center border-2 border-sepia/20 rounded-lg py-2 focus:outline-none focus:border-sepia/40"
      />
      <button
        onClick={() => onConfigChange(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
        className="w-10 h-10 border-2 border-sepia/20 rounded-lg hover:bg-sepia/10 hover:border-sepia/40 text-lg font-medium text-sepia flex items-center justify-center transition"
      >
        <IconPlus size={16} stroke={2.5} />
      </button>

      {savingsLabel && (
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
          <IconCheck size={16} className="text-green-600" stroke={2} />
          <span className="text-sm font-medium text-green-700">{savingsLabel}</span>
        </div>
      )}
    </div>
  )
}

/* ---------- Discount tiers info ---------- */

function DiscountTiersTable({ quantity }) {
  return (
    <div className="mt-4 p-4 bg-sepia/5 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <IconInfoCircle size={20} className="text-sepia" stroke={2} />
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
                  ? 'bg-sepia text-white'
                  : tier.highlight
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-white text-sepia/70 border border-sepia/10'
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
