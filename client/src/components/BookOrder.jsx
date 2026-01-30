import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  IconBook, IconStar, IconPhoto, IconGift, IconMinus, IconPlus,
  IconCheck, IconInfoCircle, IconCoin, IconX
} from '@tabler/icons-react'

// 3D Book Mockup Component
function BookMockup({ config, options, title }) {
  const size = options?.trimSizes.find(s => s.id === config.trimSize)
  const binding = options?.bindingTypes.find(b => b.id === config.binding)
  const isHardcover = ['CW', 'DJ', 'LW'].includes(config.binding)
  const isCoil = config.binding === 'CO'

  // Calculate visual proportions (scaled for display)
  const baseHeight = 200
  const aspectRatio = size ? size.width / size.height : 0.67
  const bookWidth = baseHeight * aspectRatio
  const spineWidth = isHardcover ? 25 : 15

  // Color mappings
  const linenColorMap = {
    N: '#1e3a5f', G: '#6b7280', R: '#991b1b', B: '#1f2937',
    T: '#a8896c', F: '#166534', W: '#f5f5f4', Y: '#7c2d12', P: '#581c87'
  }

  const foilColorMap = {
    G: '#d4af37', S: '#c0c0c0', B: '#1f2937', W: '#ffffff',
    C: '#b87333', R: '#e8b4b8'
  }

  const coverColor = config.binding === 'LW' && config.linen !== 'X'
    ? linenColorMap[config.linen] || '#2d3748'
    : '#2d3748'

  const foilColor = config.foil !== 'X' ? foilColorMap[config.foil] : null

  return (
    <div className="relative" style={{ perspective: '1000px' }}>
      <div
        className="relative transition-all duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateY(-25deg) rotateX(5deg)',
          width: bookWidth + spineWidth + 20,
          height: baseHeight + 20
        }}
      >
        {/* Shadow */}
        <div
          className="absolute bottom-0 left-4 bg-black/20 rounded-full blur-xl"
          style={{ width: bookWidth + spineWidth, height: 20 }}
        />

        {/* Back Cover */}
        <div
          className="absolute rounded-r"
          style={{
            width: bookWidth,
            height: baseHeight,
            backgroundColor: coverColor,
            transform: `translateZ(-${spineWidth}px)`,
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3)'
          }}
        />

        {/* Spine */}
        <div
          className="absolute left-0 flex items-center justify-center"
          style={{
            width: spineWidth,
            height: baseHeight,
            backgroundColor: coverColor,
            transform: `rotateY(90deg) translateZ(${bookWidth/2 - spineWidth/2}px) translateX(-${spineWidth/2}px)`,
            boxShadow: 'inset -5px 0 15px rgba(0,0,0,0.3)',
            transformOrigin: 'left center'
          }}
        >
          {foilColor && (
            <span
              className="text-xs font-serif writing-vertical-lr transform rotate-180"
              style={{ color: foilColor, textShadow: '0 0 2px rgba(0,0,0,0.5)' }}
            >
              {title?.substring(0, 20)}
            </span>
          )}
        </div>

        {/* Pages */}
        <div
          className="absolute"
          style={{
            width: bookWidth - 4,
            height: baseHeight - 4,
            top: 2,
            left: spineWidth + 2,
            background: config.paper?.includes('C') ? '#f5f5f0' : '#faf8f2',
            transform: `translateZ(-${spineWidth - 2}px)`,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
          }}
        >
          {/* Page lines */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-b border-sepia/10"
              style={{ top: `${(i + 1) * 11}%` }}
            />
          ))}
        </div>

        {/* Front Cover */}
        <div
          className="absolute rounded-r overflow-hidden"
          style={{
            width: bookWidth,
            height: baseHeight,
            left: spineWidth,
            backgroundColor: coverColor,
            boxShadow: `
              inset 0 0 30px rgba(0,0,0,0.2),
              5px 5px 20px rgba(0,0,0,0.3)
            `,
            transform: 'translateZ(0)'
          }}
        >
          {/* Cover texture/finish */}
          <div
            className="absolute inset-0"
            style={{
              background: config.finish === 'G'
                ? 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)'
                : config.finish === 'M'
                ? 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)'
                : 'none'
            }}
          />

          {/* Title area */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <div
              className="text-white/90 font-serif text-sm leading-tight"
              style={{
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                color: foilColor || 'rgba(255,255,255,0.9)'
              }}
            >
              {title || "My Life Story"}
            </div>
            <div className="w-12 h-0.5 bg-white/30 my-2" />
            <div className="text-white/60 text-xs">An Autobiography</div>
          </div>

          {/* Coil binding visual */}
          {isCoil && (
            <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-around py-2">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full border-2 border-gray-400 bg-white" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Visual option card with icon/preview
function OptionCard({ selected, onClick, title, subtitle, icon, preview, popular }) {
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

// Color swatch component
function ColorSwatch({ color, selected, onClick, name }) {
  const colorMap = {
    N: '#1e3a5f', G: '#6b7280', R: '#991b1b', B: '#1f2937',
    T: '#a8896c', F: '#166534', W: '#f5f5f4', Y: '#7c2d12', P: '#581c87'
  }
  const foilMap = {
    X: 'transparent', G: 'linear-gradient(135deg, #d4af37, #f4e4a3, #d4af37)',
    S: 'linear-gradient(135deg, #c0c0c0, #f0f0f0, #c0c0c0)',
    B: '#1f2937', W: '#ffffff', C: 'linear-gradient(135deg, #b87333, #daa06d, #b87333)',
    R: 'linear-gradient(135deg, #e8b4b8, #f5d4d7, #e8b4b8)'
  }
  const bg = foilMap[color] || colorMap[color] || '#gray'

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
          <div className="absolute inset-0 flex items-center justify-center text-sepia/40 text-lg">/</div>
        )}
      </div>
      <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap ${
        selected ? 'text-sepia font-medium' : 'text-sepia/60'
      }`}>
        {name}
      </div>
    </button>
  )
}

// Paper preview
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

// Binding icon
function BindingIcon({ type }) {
  const icons = {
    PB: (
      <div className="w-8 h-12 relative">
        <div className="absolute inset-0 bg-sepia/80 rounded-r" />
        <div className="absolute inset-y-0 left-0 w-1.5 bg-sepia/60" />
      </div>
    ),
    CW: (
      <div className="w-8 h-12 relative">
        <div className="absolute inset-0 bg-sepia rounded-r border-2 border-sepia" />
        <div className="absolute inset-y-0 left-0 w-2 bg-sepia/80" />
      </div>
    ),
    DJ: (
      <div className="w-8 h-12 relative">
        <div className="absolute inset-0 bg-sepia rounded-r" />
        <div className="absolute inset-1 bg-white/90 rounded-r" />
        <div className="absolute inset-y-0 left-0 w-2 bg-sepia/80" />
      </div>
    ),
    LW: (
      <div className="w-8 h-12 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-700 to-amber-600 rounded-r" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\' fill=\'%23000\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }} />
        <div className="absolute inset-y-0 left-0 w-2 bg-amber-800/80" />
      </div>
    ),
    CO: (
      <div className="w-8 h-12 relative flex">
        <div className="w-2 flex flex-col justify-around py-1">
          {[...Array(5)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full border border-gray-400" />)}
        </div>
        <div className="flex-1 bg-sepia/80 rounded-r" />
      </div>
    ),
    SS: (
      <div className="w-8 h-12 relative">
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

export default function BookOrder({ userName, pageCount, onClose }) {
  const { authFetch } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [options, setOptions] = useState(null)
  const [error, setError] = useState(null)
  const [cost, setCost] = useState(null)

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

  useEffect(() => { fetchOptions() }, [])
  useEffect(() => { if (options) calculateCost() }, [config, shipping.countryCode])

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

  const calculateCost = async () => {
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
  }

  const handleOrder = () => setStep(4)

  if (loading) {
    return (
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
          <div className="animate-spin w-10 h-10 border-3 border-sepia border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sepia">Preparing your book studio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-gradient-to-b from-[#fdfcf9] to-[#f8f5ef] rounded-t-2xl sm:rounded-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-sepia/10 flex justify-between items-center bg-white/50">
          <div>
            <h2 className="text-2xl font-serif text-ink">Create Your Book</h2>
            <div className="flex items-center gap-2 mt-1">
              {['Design', 'Shipping', 'Review', 'Done'].map((label, i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step > i + 1 ? 'bg-green-500 text-white' :
                    step === i + 1 ? 'bg-sepia text-white' : 'bg-sepia/20 text-sepia/60'
                  }`}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span className={`ml-1 text-xs ${step === i + 1 ? 'text-ink font-medium' : 'text-sepia/60'}`}>
                    {label}
                  </span>
                  {i < 3 && <div className="w-8 h-0.5 mx-2 bg-sepia/20" />}
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
        <div className="flex-1 overflow-hidden flex">
          {/* Step 1: Design */}
          {step === 1 && options && (
            <>
              {/* Book Preview Sidebar */}
              <div className="hidden lg:flex w-80 bg-gradient-to-br from-sepia/5 to-sepia/10 flex-col items-center justify-center p-8 border-r border-sepia/10">
                <BookMockup config={config} options={options} title={shipping.bookTitle} />
                <div className="mt-8 text-center">
                  <div className="text-2xl font-serif text-ink">{shipping.bookTitle}</div>
                  <div className="text-sm text-sepia/60 mt-1">
                    {options.trimSizes.find(s => s.id === config.trimSize)?.width}" x {options.trimSizes.find(s => s.id === config.trimSize)?.height}"
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

              {/* Options */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Quick Presets */}
                <div>
                  <h3 className="text-lg font-medium text-ink mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-sepia/10 rounded-full flex items-center justify-center text-sepia">1</span>
                    Quick Start
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(options.recommended).map(([key, preset]) => {
                      const icons = {
                        memoir: <IconBook size={40} stroke={1.5} />,
                        premium: <IconStar size={40} stroke={1.5} />,
                        photoBook: <IconPhoto size={40} stroke={1.5} />,
                        gift: <IconGift size={40} stroke={1.5} />
                      }
                      return (
                        <button
                          key={key}
                          onClick={() => setConfig(prev => ({ ...prev, ...preset }))}
                          className="p-4 text-center border border-sepia/20 rounded-xl hover:border-sepia/40 hover:bg-white/50 transition group"
                        >
                          <div className="flex justify-center mb-2 text-sepia group-hover:text-ink group-hover:scale-110 transition-all">
                            {icons[key] || icons.gift}
                          </div>
                          <div className="font-medium text-ink capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                          <div className="text-[10px] text-sepia/60 mt-1 line-clamp-2">{preset.description}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Book Size */}
                <div>
                  <h3 className="text-lg font-medium text-ink mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-sepia/10 rounded-full flex items-center justify-center text-sepia">2</span>
                    Book Size
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {options.trimSizes.map(size => (
                      <button
                        key={size.id}
                        onClick={() => setConfig(prev => ({ ...prev, trimSize: size.id }))}
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
                        <div className="text-xs font-medium text-ink">{size.width}" x {size.height}"</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Binding */}
                <div>
                  <h3 className="text-lg font-medium text-ink mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-sepia/10 rounded-full flex items-center justify-center text-sepia">3</span>
                    Binding Type
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {options.bindingTypes.map(binding => (
                      <OptionCard
                        key={binding.id}
                        selected={config.binding === binding.id}
                        onClick={() => setConfig(prev => ({ ...prev, binding: binding.id, linen: 'X', foil: 'X' }))}
                        title={binding.name}
                        subtitle={binding.description}
                        preview={<BindingIcon type={binding.id} />}
                        popular={binding.popular}
                      />
                    ))}
                  </div>
                </div>

                {/* Linen Color (for linen wrap) */}
                {config.binding === 'LW' && (
                  <div>
                    <h3 className="text-lg font-medium text-ink mb-4">Linen Color</h3>
                    <div className="flex flex-wrap gap-4 pb-6">
                      {options.linenColors.filter(l => l.id !== 'X').map(linen => (
                        <ColorSwatch
                          key={linen.id}
                          color={linen.id}
                          name={linen.name}
                          selected={config.linen === linen.id}
                          onClick={() => setConfig(prev => ({ ...prev, linen: linen.id }))}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Foil Stamping (for hardcovers) */}
                {['CW', 'DJ', 'LW'].includes(config.binding) && (
                  <div>
                    <h3 className="text-lg font-medium text-ink mb-4">Foil Stamping</h3>
                    <div className="flex flex-wrap gap-4 pb-6">
                      {options.foilOptions.map(foil => (
                        <ColorSwatch
                          key={foil.id}
                          color={foil.id}
                          name={foil.name}
                          selected={config.foil === foil.id}
                          onClick={() => setConfig(prev => ({ ...prev, foil: foil.id }))}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Paper */}
                <div>
                  <h3 className="text-lg font-medium text-ink mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-sepia/10 rounded-full flex items-center justify-center text-sepia">4</span>
                    Paper Type
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {options.paperTypes.map(paper => (
                      <OptionCard
                        key={paper.id}
                        selected={config.paper === paper.id}
                        onClick={() => setConfig(prev => ({ ...prev, paper: paper.id }))}
                        title={paper.name}
                        subtitle={paper.description}
                        preview={<PaperPreview paper={paper} />}
                        popular={paper.popular}
                      />
                    ))}
                  </div>
                </div>

                {/* Print Color */}
                <div>
                  <h3 className="text-lg font-medium text-ink mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-sepia/10 rounded-full flex items-center justify-center text-sepia">5</span>
                    Print Color
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {options.printColors.map(color => (
                      <button
                        key={color.id}
                        onClick={() => setConfig(prev => ({ ...prev, color: color.id }))}
                        className={`relative p-6 border rounded-xl transition ${
                          config.color === color.id
                            ? 'border-sepia bg-sepia/10 shadow-md'
                            : 'border-sepia/20 hover:border-sepia/40'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-20 rounded border ${
                            color.id === 'FC'
                              ? 'bg-gradient-to-br from-red-200 via-yellow-200 to-blue-200'
                              : 'bg-gradient-to-b from-gray-100 to-gray-300'
                          }`} />
                          <div className="text-left">
                            <div className="font-medium text-ink text-lg">{color.name}</div>
                            <div className="text-sm text-sepia/60">{color.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cover Finish */}
                <div>
                  <h3 className="text-lg font-medium text-ink mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-sepia/10 rounded-full flex items-center justify-center text-sepia">6</span>
                    Cover Finish
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {options.coverFinishes.map(finish => (
                      <button
                        key={finish.id}
                        onClick={() => setConfig(prev => ({ ...prev, finish: finish.id }))}
                        className={`p-4 border rounded-xl transition ${
                          config.finish === finish.id
                            ? 'border-sepia bg-sepia/10 shadow-md'
                            : 'border-sepia/20 hover:border-sepia/40'
                        }`}
                      >
                        <div
                          className="w-full h-16 rounded-lg mb-3"
                          style={{
                            background: finish.id === 'G'
                              ? 'linear-gradient(135deg, #fff 0%, #e0e0e0 50%, #fff 100%)'
                              : finish.id === 'M'
                              ? '#f5f5f5'
                              : '#faf8f5',
                            boxShadow: finish.id === 'G' ? 'inset 0 0 20px rgba(255,255,255,0.8)' : 'none'
                          }}
                        />
                        <div className="font-medium text-ink">{finish.name}</div>
                        <div className="text-xs text-sepia/60">{finish.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <h3 className="text-lg font-medium text-ink mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-sepia/10 rounded-full flex items-center justify-center text-sepia">7</span>
                    Quantity
                  </h3>

                  {/* Special Bulk Offer Banner */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-400/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <IconCoin size={28} className="text-white" stroke={2} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-800 font-bold text-lg">Special Family Offer</span>
                          <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">40% OFF</span>
                        </div>
                        <p className="text-amber-700 text-sm mt-0.5">Order 10+ books and save 40% – perfect for family gifts!</p>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, quantity: 10 }))}
                        className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition shadow-md hover:shadow-lg"
                      >
                        Get 10 Books
                      </button>
                    </div>
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="mb-4">
                    <span className="text-sm text-sepia/60 mb-2 block">Quick select:</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { qty: 1, label: '1 Book', discount: null },
                        { qty: 3, label: '3 Books', discount: '5%' },
                        { qty: 5, label: '5 Books', discount: '15%' },
                        { qty: 10, label: '10 Books', discount: '40%', popular: true },
                        { qty: 25, label: '25 Books', discount: '45%' },
                        { qty: 50, label: '50 Books', discount: '50%' }
                      ].map(({ qty, label, discount, popular }) => (
                        <button
                          key={qty}
                          onClick={() => setConfig(prev => ({ ...prev, quantity: qty }))}
                          className={`relative px-4 py-2.5 border-2 rounded-xl font-medium transition-all ${
                            config.quantity === qty
                              ? 'border-sepia bg-sepia text-white shadow-md scale-105'
                              : popular
                              ? 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'border-sepia/20 bg-white text-ink hover:border-sepia/40 hover:bg-sepia/5'
                          }`}
                        >
                          {popular && config.quantity !== qty && (
                            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                              BEST
                            </span>
                          )}
                          <span className="block text-sm">{label}</span>
                          {discount && (
                            <span className={`block text-xs mt-0.5 ${
                              config.quantity === qty ? 'text-white/80' : 'text-green-600 font-semibold'
                            }`}>
                              Save {discount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Quantity Input */}
                  <div className="flex items-center gap-4 p-4 bg-white border border-sepia/10 rounded-xl">
                    <span className="text-sm text-sepia/60">Custom quantity:</span>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                      className="w-10 h-10 border-2 border-sepia/20 rounded-lg hover:bg-sepia/10 hover:border-sepia/40 text-lg font-medium text-sepia flex items-center justify-center transition"
                    >
                      <IconMinus size={16} stroke={2.5} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={config.quantity}
                      onChange={e => setConfig(prev => ({ ...prev, quantity: Math.max(1, Math.min(999, parseInt(e.target.value) || 1)) }))}
                      className="w-20 text-2xl font-semibold text-ink text-center border-2 border-sepia/20 rounded-lg py-2 focus:outline-none focus:border-sepia/40"
                    />
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                      className="w-10 h-10 border-2 border-sepia/20 rounded-lg hover:bg-sepia/10 hover:border-sepia/40 text-lg font-medium text-sepia flex items-center justify-center transition"
                    >
                      <IconPlus size={16} stroke={2.5} />
                    </button>

                    {/* Savings Badge */}
                    {config.quantity >= 3 && (
                      <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                        <IconCheck size={16} className="text-green-600" stroke={2} />
                        <span className="text-sm font-medium text-green-700">
                          {config.quantity >= 50 ? '50% savings!' :
                           config.quantity >= 25 ? '45% savings!' :
                           config.quantity >= 10 ? '40% savings!' :
                           config.quantity >= 5 ? '15% savings!' :
                           config.quantity >= 3 ? '5% savings!' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Discount Tiers Info */}
                  <div className="mt-4 p-4 bg-sepia/5 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <IconInfoCircle size={20} className="text-sepia" stroke={2} />
                      <span className="text-sm font-medium text-ink">Bulk Discount Tiers</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                      {[
                        { min: 1, max: 2, discount: '0%' },
                        { min: 3, max: 4, discount: '5%' },
                        { min: 5, max: 9, discount: '15%' },
                        { min: 10, max: 24, discount: '40%', highlight: true },
                        { min: 25, max: 49, discount: '45%' },
                        { min: 50, max: '+', discount: '50%' }
                      ].map(tier => {
                        const isActive = config.quantity >= tier.min && (tier.max === '+' || config.quantity <= tier.max)
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
                            <div className="text-[10px] opacity-75">{tier.min}-{tier.max}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && options && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Book Title</label>
                  <input
                    type="text"
                    value={shipping.bookTitle}
                    onChange={e => setShipping(prev => ({ ...prev, bookTitle: e.target.value }))}
                    className="w-full px-4 py-3 border border-sepia/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sepia/30 text-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Street Address *</label>
                  <input
                    type="text"
                    value={shipping.street1}
                    onChange={e => setShipping(prev => ({ ...prev, street1: e.target.value }))}
                    className="w-full px-4 py-3 border border-sepia/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sepia/30"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                    <label className="block text-sm font-medium text-ink mb-2">State</label>
                    <input
                      type="text"
                      value={shipping.stateCode}
                      onChange={e => setShipping(prev => ({ ...prev, stateCode: e.target.value }))}
                      className="w-full px-4 py-3 border border-sepia/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-sepia/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Postal Code *</label>
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
                    {options.countries.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-3">Shipping Speed</label>
                  <div className="grid grid-cols-2 gap-4">
                    {options.shippingLevels.map(level => (
                      <button
                        key={level.id}
                        onClick={() => setShipping(prev => ({ ...prev, shippingLevel: level.id }))}
                        className={`p-4 border rounded-xl transition text-left ${
                          shipping.shippingLevel === level.id
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
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="font-medium text-ink mb-4 text-lg">Your Book</h3>
                  <div className="flex justify-center mb-6">
                    <BookMockup config={config} options={options} title={shipping.bookTitle} />
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-sepia/70">Size</dt><dd className="text-ink font-medium">{options?.trimSizes.find(s => s.id === config.trimSize)?.name}</dd></div>
                    <div className="flex justify-between"><dt className="text-sepia/70">Binding</dt><dd className="text-ink font-medium">{options?.bindingTypes.find(b => b.id === config.binding)?.name}</dd></div>
                    <div className="flex justify-between"><dt className="text-sepia/70">Paper</dt><dd className="text-ink font-medium">{options?.paperTypes.find(p => p.id === config.paper)?.name}</dd></div>
                    <div className="flex justify-between"><dt className="text-sepia/70">Color</dt><dd className="text-ink font-medium">{options?.printColors.find(c => c.id === config.color)?.name}</dd></div>
                    <div className="flex justify-between"><dt className="text-sepia/70">Cover</dt><dd className="text-ink font-medium">{options?.coverFinishes.find(f => f.id === config.finish)?.name}</dd></div>
                    <div className="flex justify-between"><dt className="text-sepia/70">Quantity</dt><dd className="text-ink font-medium">{config.quantity}</dd></div>
                  </dl>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="font-medium text-ink mb-4 text-lg">Shipping To</h3>
                    <p className="text-ink">
                      {shipping.name}<br />
                      {shipping.street1}<br />
                      {shipping.city}, {shipping.stateCode} {shipping.postcode}<br />
                      {options?.countries.find(c => c.code === shipping.countryCode)?.name}
                    </p>
                    <p className="text-sm text-sepia/70 mt-3">
                      {options?.shippingLevels.find(l => l.id === shipping.shippingLevel)?.name} - {options?.shippingLevels.find(l => l.id === shipping.shippingLevel)?.days}
                    </p>
                  </div>

                  {cost && (
                    <div className="bg-gradient-to-br from-sepia/5 to-sepia/10 rounded-2xl p-6 border border-sepia/20">
                      <h3 className="font-medium text-ink mb-4 text-lg">Order Total</h3>
                      <dl className="space-y-2">
                        <div className="flex justify-between text-sm"><dt className="text-sepia/70">Printing</dt><dd className="text-ink">${cost.breakdown.printing.toFixed(2)}</dd></div>
                        <div className="flex justify-between text-sm"><dt className="text-sepia/70">Shipping</dt><dd className="text-ink">${cost.breakdown.shipping.toFixed(2)}</dd></div>
                        <div className="flex justify-between text-sm"><dt className="text-sepia/70">Tax</dt><dd className="text-ink">${cost.breakdown.tax.toFixed(2)}</dd></div>
                        <div className="flex justify-between pt-3 border-t border-sepia/20 text-xl font-medium">
                          <dt className="text-ink">Total</dt>
                          <dd className="text-ink">${cost.breakdown.total.toFixed(2)}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <IconCheck size={48} className="text-green-600" stroke={2} />
                </div>
                <h3 className="text-3xl font-serif text-ink mb-4">Configuration Saved!</h3>
                <p className="text-sepia/70 mb-8">
                  Your book configuration has been saved. Full PDF generation and payment processing coming soon.
                </p>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-ink text-white rounded-xl hover:bg-ink/90 transition text-lg font-medium"
                >
                  Return to Export
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="px-6 py-4 border-t border-sepia/10 flex justify-between items-center bg-white/50">
            <div>
              {calculating ? (
                <span className="text-sm text-sepia/60 animate-pulse">Calculating price...</span>
              ) : cost ? (
                <div>
                  <span className="text-2xl font-medium text-ink">${cost.breakdown.total.toFixed(2)}</span>
                  <span className="text-sm text-sepia/60 ml-2">estimated total</span>
                </div>
              ) : null}
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
              {step < 3 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 2 && (!shipping.name || !shipping.email || !shipping.street1 || !shipping.city || !shipping.postcode)}
                  className="px-8 py-3 bg-sepia text-white rounded-xl hover:bg-sepia/90 disabled:opacity-40 transition font-medium"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleOrder}
                  className="px-8 py-3 bg-ink text-white rounded-xl hover:bg-ink/90 transition font-medium"
                >
                  Complete Order Preview
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
