import { IconCheck } from '@tabler/icons-react'
import { LINEN_COLOR_MAP, FOIL_SWATCH_MAP, HARDCOVER_BINDINGS } from '../../data/bookColors'
import { OptionCard } from './FormatSelector'

/**
 * Step-1 sections: Linen Color, Foil Stamping, Paper Type,
 * Print Color, and Cover Finish.
 */
export default function ColorSelector({ config, options, onConfigChange }) {
  return (
    <>
      {config.binding === 'LW' && (
        <LinenColorPicker config={config} options={options} onConfigChange={onConfigChange} />
      )}

      {HARDCOVER_BINDINGS.includes(config.binding) && (
        <FoilPicker config={config} options={options} onConfigChange={onConfigChange} />
      )}

      <PaperTypePicker config={config} options={options} onConfigChange={onConfigChange} />
      <PrintColorPicker config={config} options={options} onConfigChange={onConfigChange} />
      <CoverFinishPicker config={config} options={options} onConfigChange={onConfigChange} />
    </>
  )
}

/* ---------- Linen Color ---------- */

function LinenColorPicker({ config, options, onConfigChange }) {
  return (
    <div>
      <h3 className="text-lg font-display text-ink mb-4">Linen Color</h3>
      <div className="flex flex-wrap gap-4 pb-6">
        {options.linenColors
          .filter(l => l.id !== 'X')
          .map(linen => (
            <ColorSwatch
              key={linen.id}
              color={linen.id}
              name={linen.name}
              selected={config.linen === linen.id}
              onClick={() => onConfigChange(prev => ({ ...prev, linen: linen.id }))}
            />
          ))}
      </div>
    </div>
  )
}

/* ---------- Foil Stamping ---------- */

function FoilPicker({ config, options, onConfigChange }) {
  return (
    <div>
      <h3 className="text-lg font-display text-ink mb-4">Foil Stamping</h3>
      <div className="flex flex-wrap gap-4 pb-6">
        {options.foilOptions.map(foil => (
          <ColorSwatch
            key={foil.id}
            color={foil.id}
            name={foil.name}
            selected={config.foil === foil.id}
            onClick={() => onConfigChange(prev => ({ ...prev, foil: foil.id }))}
          />
        ))}
      </div>
    </div>
  )
}

/* ---------- Paper Type ---------- */

function PaperTypePicker({ config, options, onConfigChange }) {
  return (
    <div>
      <SectionHeading number={4} label="Paper Type" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {options.paperTypes.map(paper => (
          <OptionCard
            key={paper.id}
            selected={config.paper === paper.id}
            onClick={() => onConfigChange(prev => ({ ...prev, paper: paper.id }))}
            title={paper.name}
            subtitle={paper.description}
            preview={<PaperPreview paper={paper} />}
            popular={paper.popular}
          />
        ))}
      </div>
    </div>
  )
}

/* ---------- Print Color ---------- */

function PrintColorPicker({ config, options, onConfigChange }) {
  return (
    <div>
      <SectionHeading number={5} label="Print Color" />
      <div className="grid grid-cols-2 gap-4">
        {options.printColors.map(color => (
          <button
            key={color.id}
            type="button"
            onClick={() => onConfigChange(prev => ({ ...prev, color: color.id }))}
            className={`relative p-6 bg-surface border rounded-2xl transition-all duration-200 ${
              config.color === color.id
                ? 'border-bronze-400 ring-4 ring-bronze-500/10 shadow-soft'
                : 'border-sepia-200 hover:border-sepia-300'
            }`}
          >
            {config.color === color.id && <SelectedCheck />}
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-20 rounded border border-sepia-200/70 ${
                  color.id === 'FC'
                    ? 'bg-gradient-to-br from-bronze-200 via-bronze-300 to-bronze-500'
                    : 'bg-gradient-to-b from-sepia-50 to-sepia-300'
                }`}
              />
              <div className="text-left">
                <div className="font-medium text-ink text-lg">{color.name}</div>
                <div className="text-sm text-sepia-600">{color.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- Cover Finish ---------- */

function CoverFinishPicker({ config, options, onConfigChange }) {
  return (
    <div>
      <SectionHeading number={6} label="Cover Finish" />
      <div className="grid grid-cols-3 gap-4">
        {options.coverFinishes.map(finish => (
          <button
            key={finish.id}
            type="button"
            onClick={() => onConfigChange(prev => ({ ...prev, finish: finish.id }))}
            className={`relative p-4 bg-surface border rounded-2xl transition-all duration-200 ${
              config.finish === finish.id
                ? 'border-bronze-400 ring-4 ring-bronze-500/10 shadow-soft'
                : 'border-sepia-200 hover:border-sepia-300'
            }`}
          >
            {config.finish === finish.id && <SelectedCheck />}
            <FinishPreview finishId={finish.id} />
            <div className="font-medium text-ink">{finish.name}</div>
            <div className="text-xs text-sepia-500">{finish.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- shared helpers ---------- */

function SectionHeading({ number, label }) {
  return (
    <h3 className="text-lg font-display text-ink mb-4 flex items-center gap-2">
      <span className="w-8 h-8 bg-sepia-100 text-sepia-600 rounded-full flex items-center justify-center text-sm font-sans">
        {number}
      </span>
      {label}
    </h3>
  )
}

function SelectedCheck() {
  return (
    <span
      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-bronze-500 text-white flex items-center justify-center"
      aria-hidden="true"
    >
      <IconCheck size={12} stroke={3} />
    </span>
  )
}

function ColorSwatch({ color, selected, onClick, name }) {
  // Fallback swatch tone: system sepia hex (#9C7E5D)
  const bg = FOIL_SWATCH_MAP[color] || LINEN_COLOR_MAP[color] || '#9C7E5D'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative group ${selected ? 'scale-110 z-10' : 'hover:scale-105'} transition-transform`}
      aria-pressed={selected}
    >
      <div
        className={`w-11 h-11 rounded-full border-2 ${
          selected ? 'border-bronze-400 ring-4 ring-bronze-500/10' : 'border-sepia-200'
        } ${color === 'X' ? 'bg-sepia-50' : ''}`}
        style={{ background: color === 'X' ? undefined : bg }}
      >
        {color === 'X' && (
          <div className="absolute inset-0 flex items-center justify-center text-sepia-400 text-lg">
            /
          </div>
        )}
      </div>
      <div
        className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap ${
          selected ? 'text-bronze-700 font-medium' : 'text-sepia-500'
        }`}
      >
        {name}
      </div>
    </button>
  )
}

function PaperPreview({ paper }) {
  const isCoated = paper.coated
  const isCream = paper.color === 'cream'

  return (
    <div
      className={`w-12 h-16 rounded border border-sepia-200/70 shadow-xs ${
        isCream ? 'bg-cream' : 'bg-surface'
      } ${isCoated ? 'bg-gradient-to-br from-surface to-sepia-50 shadow-inner' : ''}`}
    >
      <div className="h-full flex flex-col justify-center px-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-0.5 bg-sepia-200/50 mb-1 last:mb-0" />
        ))}
      </div>
    </div>
  )
}

function FinishPreview({ finishId }) {
  const finishClasses =
    finishId === 'G'
      ? 'bg-gradient-to-br from-surface via-sepia-100 to-surface shadow-inner'
      : finishId === 'M'
        ? 'bg-sepia-50'
        : 'bg-parchment'

  return (
    <div className={`w-full h-16 rounded-lg mb-3 border border-sepia-200/50 ${finishClasses}`} />
  )
}
