import { IconBook, IconStar, IconPhoto, IconGift } from '@tabler/icons-react'

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
            onClick={() => onConfigChange(prev => ({ ...prev, ...preset }))}
            className="p-4 text-center border border-sepia/20 rounded-xl hover:border-sepia/40 hover:bg-white/50 transition group"
          >
            <div className="flex justify-center mb-2 text-sepia group-hover:text-ink group-hover:scale-110 transition-all">
              {PRESET_ICONS[key] || PRESET_ICONS.gift}
            </div>
            <div className="font-medium text-ink capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
            <div className="text-[10px] text-sepia/60 mt-1 line-clamp-2">{preset.description}</div>
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
            onClick={() => onConfigChange(prev => ({ ...prev, trimSize: size.id }))}
            className={`relative p-3 border rounded-xl transition group ${
              config.trimSize === size.id
                ? 'border-sepia bg-sepia/10 shadow-md'
                : 'border-sepia/20 hover:border-sepia/40'
            } ${size.popular ? 'ring-2 ring-amber-400/50' : ''}`}
          >
            {size.popular && (
              <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-[9px] px-1.5 py-0.5 rounded-full">
                Popular
              </span>
            )}
            <div
              className="mx-auto mb-2 bg-sepia/20 rounded-sm"
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
    <h3 className="text-base sm:text-lg font-medium text-ink mb-3 sm:mb-4 flex items-center gap-2">
      <span className="w-7 h-7 sm:w-8 sm:h-8 bg-sepia/10 rounded-full flex items-center justify-center text-sepia text-sm">
        {number}
      </span>
      {label}
    </h3>
  )
}

export function OptionCard({ selected, onClick, title, subtitle, icon, preview, popular }) {
  return (
    <button
      onClick={onClick}
      className={`relative p-3 text-left border rounded-xl transition-all duration-200 ${
        selected
          ? 'border-sepia bg-sepia/10 shadow-md scale-[1.02]'
          : 'border-sepia/20 hover:border-sepia/40 hover:shadow-sm'
      } ${popular ? 'ring-2 ring-amber-400/50' : ''}`}
    >
      {popular && (
        <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-medium">
          Popular
        </span>
      )}
      <div className="flex items-start gap-3">
        {preview && <div className="flex-shrink-0">{preview}</div>}
        {icon && <div className="text-2xl flex-shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className="font-medium text-ink text-sm truncate">{title}</div>
          {subtitle && <div className="text-xs text-sepia/60 mt-0.5">{subtitle}</div>}
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
        <div className="absolute inset-0 bg-sepia/80 rounded-r" />
        <div className="absolute inset-y-0 left-0 w-1.5 bg-sepia/60" />
      </div>
    ),
    CW: (
      <div className={w}>
        <div className="absolute inset-0 bg-sepia rounded-r border-2 border-sepia" />
        <div className="absolute inset-y-0 left-0 w-2 bg-sepia/80" />
      </div>
    ),
    DJ: (
      <div className={w}>
        <div className="absolute inset-0 bg-sepia rounded-r" />
        <div className="absolute inset-1 bg-white/90 rounded-r" />
        <div className="absolute inset-y-0 left-0 w-2 bg-sepia/80" />
      </div>
    ),
    LW: (
      <div className={w}>
        <div
          className="absolute inset-0 bg-gradient-to-r from-amber-700 to-amber-600 rounded-r"
          style={{ backgroundImage: LINEN_SVG }}
        />
        <div className="absolute inset-y-0 left-0 w-2 bg-amber-800/80" />
      </div>
    ),
    CO: (
      <div className="w-8 h-12 relative flex">
        <div className="w-2 flex flex-col justify-around py-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full border border-gray-400" />
          ))}
        </div>
        <div className="flex-1 bg-sepia/80 rounded-r" />
      </div>
    ),
    SS: (
      <div className={w}>
        <div className="absolute inset-0 bg-sepia/80 rounded-r" />
        <div className="absolute left-1 top-1/3 w-1 h-1 bg-gray-400 rounded-full" />
        <div className="absolute left-1 top-2/3 w-1 h-1 bg-gray-400 rounded-full" />
      </div>
    ),
    WI: (
      <div className="w-8 h-12 relative flex">
        <div className="w-2 border-l-2 border-gray-400" style={{ borderStyle: 'double' }} />
        <div className="flex-1 bg-sepia/80 rounded-r" />
      </div>
    )
  }
  return icons[type] || icons.PB
}
