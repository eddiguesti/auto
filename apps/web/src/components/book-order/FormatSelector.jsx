import { IconBook, IconStar, IconPhoto, IconGift, IconCheck } from '@tabler/icons-react'
import Badge from '../ui/Badge'

const PRESET_ICONS = {
  memoir: <IconBook size={40} stroke={1.5} />,
  premium: <IconStar size={40} stroke={1.5} />,
  photoBook: <IconPhoto size={40} stroke={1.5} />,
  gift: <IconGift size={40} stroke={1.5} />
}

/**
 * Step-1 sections: Quick Start presets, Book Size, Binding Type.
 */
export default function FormatSelector({ config, options, onConfigChange }) {
  return (
    <>
      <QuickStartPresets options={options} onConfigChange={onConfigChange} />
      <BookSizeSelector config={config} options={options} onConfigChange={onConfigChange} />
      <BindingSelector config={config} options={options} onConfigChange={onConfigChange} />
    </>
  )
}

/* ---------- Quick Start ---------- */

function QuickStartPresets({ options, onConfigChange }) {
  return (
    <div>
      <SectionHeading number={1} label="Quick Start" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {Object.entries(options.recommended).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => onConfigChange(prev => ({ ...prev, ...preset }))}
            className="p-4 text-center bg-surface border border-sepia-200 rounded-2xl hover:border-sepia-300 hover:shadow-soft transition-all duration-200 group"
          >
            <div className="flex justify-center mb-2 text-sepia-500 group-hover:text-ink group-hover:scale-110 transition-all">
              {PRESET_ICONS[key] || PRESET_ICONS.gift}
            </div>
            <div className="font-medium text-ink capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
            <div className="text-xs text-sepia-500 mt-1 line-clamp-2">{preset.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- Book Size ---------- */

function BookSizeSelector({ config, options, onConfigChange }) {
  return (
    <div>
      <SectionHeading number={2} label="Book Size" />
      <div className="flex flex-wrap gap-3">
        {options.trimSizes.map(size => (
          <button
            key={size.id}
            type="button"
            onClick={() => onConfigChange(prev => ({ ...prev, trimSize: size.id }))}
            className={`relative p-3 min-w-[44px] min-h-[44px] bg-surface border rounded-2xl transition-all duration-200 ${
              config.trimSize === size.id
                ? 'border-bronze-400 ring-4 ring-bronze-500/10 shadow-soft'
                : 'border-sepia-200 hover:border-sepia-300'
            }`}
          >
            {size.popular && (
              <Badge variant="bronze" className="absolute -top-2.5 -right-2">
                Popular
              </Badge>
            )}
            {config.trimSize === size.id && <SelectedCheck className="top-1.5 left-1.5" />}
            <div
              className="mx-auto mb-2 bg-sepia-200 rounded-sm"
              style={{
                width: size.width * 6,
                height: size.height * 6,
                maxWidth: 50,
                maxHeight: 70
              }}
            />
            <div className="text-xs font-medium text-ink">
              {size.width}" x {size.height}"
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- Binding ---------- */

function BindingSelector({ config, options, onConfigChange }) {
  return (
    <div>
      <SectionHeading number={3} label="Binding Type" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {options.bindingTypes.map(binding => (
          <OptionCard
            key={binding.id}
            selected={config.binding === binding.id}
            onClick={() =>
              onConfigChange(prev => ({
                ...prev,
                binding: binding.id,
                linen: 'X',
                foil: 'X'
              }))
            }
            title={binding.name}
            subtitle={binding.description}
            preview={<BindingIcon type={binding.id} />}
            popular={binding.popular}
          />
        ))}
      </div>
    </div>
  )
}

/* ---------- shared helpers ---------- */

function SectionHeading({ number, label }) {
  return (
    <h3 className="text-base sm:text-lg font-display text-ink mb-3 sm:mb-4 flex items-center gap-2">
      <span className="w-7 h-7 sm:w-8 sm:h-8 bg-sepia-100 text-sepia-600 rounded-full flex items-center justify-center text-sm font-sans">
        {number}
      </span>
      {label}
    </h3>
  )
}

function SelectedCheck({ className = 'top-2 right-2' }) {
  return (
    <span
      className={`absolute ${className} w-5 h-5 rounded-full bg-bronze-500 text-white flex items-center justify-center`}
      aria-hidden="true"
    >
      <IconCheck size={12} stroke={3} />
    </span>
  )
}

export function OptionCard({ selected, onClick, title, subtitle, icon, preview, popular }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-3 min-h-[44px] text-left bg-surface border rounded-2xl transition-all duration-200 ${
        selected
          ? 'border-bronze-400 ring-4 ring-bronze-500/10 shadow-soft'
          : 'border-sepia-200 hover:border-sepia-300 hover:shadow-soft'
      }`}
    >
      {popular && (
        <Badge variant="bronze" className="absolute -top-2.5 -right-2">
          Popular
        </Badge>
      )}
      {selected && <SelectedCheck className="bottom-2 right-2" />}
      <div className="flex items-start gap-3">
        {preview && <div className="flex-shrink-0">{preview}</div>}
        {icon && <div className="text-2xl flex-shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className="font-medium text-ink text-sm truncate">{title}</div>
          {subtitle && <div className="text-xs text-sepia-500 mt-0.5">{subtitle}</div>}
        </div>
      </div>
    </button>
  )
}

/* ---------- BindingIcon ---------- */

const LINEN_SVG =
  "url(\"data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23000' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E\")"

function BindingIcon({ type }) {
  const w = 'w-8 h-12 relative'
  const icons = {
    PB: (
      <div className={w}>
        <div className="absolute inset-0 bg-sepia-500/80 rounded-r" />
        <div className="absolute inset-y-0 left-0 w-1.5 bg-sepia-500/60" />
      </div>
    ),
    CW: (
      <div className={w}>
        <div className="absolute inset-0 bg-sepia-500 rounded-r border-2 border-sepia-500" />
        <div className="absolute inset-y-0 left-0 w-2 bg-sepia-500/80" />
      </div>
    ),
    DJ: (
      <div className={w}>
        <div className="absolute inset-0 bg-sepia-500 rounded-r" />
        <div className="absolute inset-1 bg-white/90 rounded-r" />
        <div className="absolute inset-y-0 left-0 w-2 bg-sepia-500/80" />
      </div>
    ),
    LW: (
      <div className={w}>
        <div
          className="absolute inset-0 bg-gradient-to-r from-bronze-700 to-bronze-600 rounded-r"
          style={{ backgroundImage: LINEN_SVG }}
        />
        <div className="absolute inset-y-0 left-0 w-2 bg-bronze-800/80" />
      </div>
    ),
    CO: (
      <div className="w-8 h-12 relative flex">
        <div className="w-2 flex flex-col justify-around py-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full border border-sepia-300" />
          ))}
        </div>
        <div className="flex-1 bg-sepia-500/80 rounded-r" />
      </div>
    ),
    SS: (
      <div className={w}>
        <div className="absolute inset-0 bg-sepia-500/80 rounded-r" />
        <div className="absolute left-1 top-1/3 w-1 h-1 bg-sepia-300 rounded-full" />
        <div className="absolute left-1 top-2/3 w-1 h-1 bg-sepia-300 rounded-full" />
      </div>
    ),
    WI: (
      <div className="w-8 h-12 relative flex">
        <div className="w-2 border-l-2 border-sepia-300" style={{ borderStyle: 'double' }} />
        <div className="flex-1 bg-sepia-500/80 rounded-r" />
      </div>
    )
  }
  return icons[type] || icons.PB
}
