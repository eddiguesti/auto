import { LINEN_COLOR_MAP, FOIL_COLOR_MAP } from '../../data/bookColors'

/**
 * 3-D CSS-perspective book mockup.
 * Renders front cover, spine, back cover, and pages
 * using the current configuration.
 */
export default function BookMockup({ config, options, title }) {
  const size = options?.trimSizes.find(s => s.id === config.trimSize)
  const isHardcover = ['CW', 'DJ', 'LW'].includes(config.binding)
  const isCoil = config.binding === 'CO'

  const baseHeight = 200
  const aspectRatio = size ? size.width / size.height : 0.67
  const bookWidth = baseHeight * aspectRatio
  const spineWidth = isHardcover ? 25 : 15

  const coverColor =
    config.binding === 'LW' && config.linen !== 'X'
      ? LINEN_COLOR_MAP[config.linen] || '#2d3748'
      : '#2d3748'

  const foilColor = config.foil !== 'X' ? FOIL_COLOR_MAP[config.foil] : null

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
        <BookShadow width={bookWidth + spineWidth} />
        <BackCover
          width={bookWidth}
          height={baseHeight}
          color={coverColor}
          spineWidth={spineWidth}
        />
        <Spine
          width={spineWidth}
          height={baseHeight}
          color={coverColor}
          foilColor={foilColor}
          bookWidth={bookWidth}
          title={title}
        />
        <Pages width={bookWidth} height={baseHeight} spineWidth={spineWidth} paper={config.paper} />
        <FrontCover
          width={bookWidth}
          height={baseHeight}
          spineWidth={spineWidth}
          coverColor={coverColor}
          foilColor={foilColor}
          finish={config.finish}
          isCoil={isCoil}
          title={title}
        />
      </div>
    </div>
  )
}

/* ---------- internal sub-pieces ---------- */

function BookShadow({ width }) {
  return (
    <div
      className="absolute bottom-0 left-4 bg-black/20 rounded-full blur-xl"
      style={{ width, height: 20 }}
    />
  )
}

function BackCover({ width, height, color, spineWidth }) {
  return (
    <div
      className="absolute rounded-r"
      style={{
        width,
        height,
        backgroundColor: color,
        transform: `translateZ(-${spineWidth}px)`,
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3)'
      }}
    />
  )
}

function Spine({ width, height, color, foilColor, bookWidth, title }) {
  return (
    <div
      className="absolute left-0 flex items-center justify-center"
      style={{
        width,
        height,
        backgroundColor: color,
        transform: `rotateY(90deg) translateZ(${bookWidth / 2 - width / 2}px) translateX(-${width / 2}px)`,
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
  )
}

function Pages({ width, height, spineWidth, paper }) {
  return (
    <div
      className="absolute"
      style={{
        width: width - 4,
        height: height - 4,
        top: 2,
        left: spineWidth + 2,
        background: paper?.includes('C') ? '#f5f5f0' : '#faf8f2',
        transform: `translateZ(-${spineWidth - 2}px)`,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
      }}
    >
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-b border-sepia/10"
          style={{ top: `${(i + 1) * 11}%` }}
        />
      ))}
    </div>
  )
}

function FrontCover({ width, height, spineWidth, coverColor, foilColor, finish, isCoil, title }) {
  return (
    <div
      className="absolute rounded-r overflow-hidden"
      style={{
        width,
        height,
        left: spineWidth,
        backgroundColor: coverColor,
        boxShadow: `
          inset 0 0 30px rgba(0,0,0,0.2),
          5px 5px 20px rgba(0,0,0,0.3)
        `,
        transform: 'translateZ(0)'
      }}
    >
      <CoverFinishOverlay finish={finish} />
      <TitleArea foilColor={foilColor} title={title} />
      {isCoil && <CoilRings />}
    </div>
  )
}

function CoverFinishOverlay({ finish }) {
  const bg =
    finish === 'G'
      ? 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)'
      : finish === 'M'
        ? 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)'
        : 'none'

  return <div className="absolute inset-0" style={{ background: bg }} />
}

function TitleArea({ foilColor, title }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
      <div
        className="text-white/90 font-serif text-sm leading-tight"
        style={{
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          color: foilColor || 'rgba(255,255,255,0.9)'
        }}
      >
        {title || 'My Life Story'}
      </div>
      <div className="w-12 h-0.5 bg-white/30 my-2" />
      <div className="text-white/60 text-xs">An Autobiography</div>
    </div>
  )
}

function CoilRings() {
  return (
    <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-around py-2">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="w-3 h-3 rounded-full border-2 border-gray-400 bg-white" />
      ))}
    </div>
  )
}
