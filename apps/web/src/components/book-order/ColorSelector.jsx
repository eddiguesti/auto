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
      <h3 className="text-lg font-medium text-ink mb-4">Linen Color</h3>
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
      <h3 className="text-lg font-medium text-ink mb-4">Foil Stamping</h3>
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
            onClick={() => onConfigChange(prev => ({ ...prev, color: color.id }))}
            className={`relative p-6 border rounded-xl transition ${
              config.color === color.id
                ? 'border-sepia bg-sepia/10 shadow-md'
                : 'border-sepia/20 hover:border-sepia/40'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-20 rounded border ${
                  color.id === 'FC'
                    ? 'bg-gradient-to-br from-red-200 via-yellow-200 to-blue-200'
                    : 'bg-gradient-to-b from-gray-100 to-gray-300'
                }`}
              />
              <div className="text-left">
                <div className="font-medium text-ink text-lg">{color.name}</div>
                <div className="text-sm text-sepia/60">{color.description}</div>
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
            onClick={() => onConfigChange(prev => ({ ...prev, finish: finish.id }))}
            className={`p-4 border rounded-xl transition ${
              config.finish === finish.id
                ? 'border-sepia bg-sepia/10 shadow-md'
                : 'border-sepia/20 hover:border-sepia/40'
            }`}
          >
            <FinishPreview finishId={finish.id} />
            <div className="font-medium text-ink">{finish.name}</div>
            <div className="text-xs text-sepia/60">{finish.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- shared helpers ---------- */

function SectionHeading({ number, label }) {
  return (
    <h3 className="text-lg font-medium text-ink mb-4 flex items-center gap-2">
      <span className="w-8 h-8 bg-sepia/10 rounded-full flex items-center justify-center text-sepia">
        {number}
      </span>
      {label}
    </h3>
  )
}

function ColorSwatch({ color, selected, onClick, name }) {
  const bg = FOIL_SWATCH_MAP[color] || LINEN_COLOR_MAP[color] || '#gray'

  return (
    <button
      onClick={onClick}
      className={`relative group ${selected ? 'scale-110 z-10' : 'hover:scale-105'} transition-transform`}
    >
      <div
        className={`w-10 h-10 rounded-full border-2 ${
          selected ? 'border-sepia shadow-lg' : 'border-sepia/20'
        } ${color === 'X' ? 'bg-gray-100' : ''}`}
        style={{ background: color === 'X' ? undefined : bg }}
      >
        {color === 'X' && (
          <div className="absolute inset-0 flex items-center justify-center text-sepia/40 text-lg">
            /
          </div>
        )}
      </div>
      <div
        className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap ${
          selected ? 'text-sepia font-medium' : 'text-sepia/60'
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
      className={`w-12 h-16 rounded border shadow-sm ${
        isCoated ? 'bg-gradient-to-br from-white to-gray-50' : ''
      }`}
      style={{
        backgroundColor: isCream ? '#faf5e8' : '#ffffff',
        boxShadow: isCoated ? 'inset 0 0 10px rgba(255,255,255,0.8)' : 'none'
      }}
    >
      <div className="h-full flex flex-col justify-center px-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-0.5 bg-sepia/10 mb-1 last:mb-0" />
        ))}
      </div>
    </div>
  )
}

function FinishPreview({ finishId }) {
  return (
    <div
      className="w-full h-16 rounded-lg mb-3"
      style={{
        background:
          finishId === 'G'
            ? 'linear-gradient(135deg, #fff 0%, #e0e0e0 50%, #fff 100%)'
            : finishId === 'M'
              ? '#f5f5f5'
              : '#faf8f5',
        boxShadow: finishId === 'G' ? 'inset 0 0 20px rgba(255,255,255,0.8)' : 'none'
      }}
    />
  )
}
