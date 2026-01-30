import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { COVER_TEMPLATES, TEMPLATE_CATEGORIES, AVAILABLE_FONTS, COLOR_PALETTES } from '../data/coverTemplates'
import {
  IconSparkles, IconDownload, IconArrowLeft, IconPhoto,
  IconTypography, IconLoader2, IconPalette, IconLayoutGrid,
  IconWand, IconRefresh, IconBook2, IconSquare, IconRectangle
} from '@tabler/icons-react'

// Load Google Fonts
const loadFont = (fontName) => {
  const existing = document.querySelector(`link[href*="${fontName.replace(' ', '+')}"]`)
  if (existing) return
  const link = document.createElement('link')
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(' ', '+')}:wght@400;500;600;700&display=swap`
  link.rel = 'stylesheet'
  document.head.appendChild(link)
}

// Book dimensions (in pixels at 72 DPI for preview)
const BOOK_CONFIG = {
  frontWidth: 600,
  frontHeight: 900,
  backWidth: 600,
  backHeight: 900,
  bleed: 9,
  getSpineWidth: (pageCount) => Math.max(20, Math.round(pageCount * 0.002252 * 72))
}

// Generation mode options
const GENERATION_MODES = [
  { id: 'full-front', name: 'Full Front Cover', icon: IconSquare, description: 'Generate art for entire front cover' },
  { id: 'full-book', name: 'Full Book', icon: IconBook2, description: 'Generate matching front & back covers' },
  { id: 'regions', name: 'Template Regions', icon: IconLayoutGrid, description: 'Generate art for specific template areas' }
]

// Section view component
function BookSection({
  section,
  width,
  height,
  backgroundColor,
  regions,
  regionData,
  imageData,
  fullCoverImage,
  selectedRegion,
  onSelectRegion,
  generatingRegion,
  onGenerateImage,
  scale,
  isActive,
  generationMode
}) {
  return (
    <div
      className={`relative transition-all ${isActive ? 'ring-2 ring-sepia shadow-lg' : ''}`}
      style={{
        width: width * scale,
        height: height * scale,
        backgroundColor,
        cursor: 'pointer',
        overflow: 'hidden'
      }}
    >
      {/* Section label */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-sepia/60 uppercase tracking-wide whitespace-nowrap">
        {section === 'front' ? 'Front Cover' : section === 'back' ? 'Back Cover' : 'Spine'}
      </div>

      {/* Full cover image (when using full-front or full-book mode) */}
      {fullCoverImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${fullCoverImage})` }}
        />
      )}

      {/* Render template regions (when using regions mode) */}
      {generationMode === 'regions' && regions?.map(region => {
        if (region.type === 'ai-image') {
          return (
            <ImageRegion
              key={region.id}
              region={region}
              imageUrl={imageData[region.id]}
              isGenerating={generatingRegion === region.id}
              onGenerate={() => onGenerateImage(region)}
              scale={scale}
            />
          )
        }
        if (region.type === 'text') {
          const data = regionData[region.id]
          return (
            <TextRegion
              key={region.id}
              region={{ ...region, ...data }}
              value={data?.text}
              isSelected={selectedRegion === region.id}
              onSelect={() => onSelectRegion(region.id)}
              scale={scale}
            />
          )
        }
        if (region.type === 'shape') {
          return <ShapeRegion key={region.id} region={region} scale={scale} />
        }
        return null
      })}

      {/* Text overlay for full cover modes */}
      {generationMode !== 'regions' && regions?.filter(r => r.type === 'text').map(region => {
        const data = regionData[region.id]
        return (
          <TextRegion
            key={region.id}
            region={{ ...region, ...data }}
            value={data?.text}
            isSelected={selectedRegion === region.id}
            onSelect={() => onSelectRegion(region.id)}
            scale={scale}
          />
        )
      })}
    </div>
  )
}

// Text region component with drag support
function TextRegion({ region, value, isSelected, onSelect, scale, onPositionChange }) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [position, setPosition] = useState({ x: region.x, y: region.y })
  const elementRef = useRef(null)

  // Update position when region changes (template switch)
  useEffect(() => {
    setPosition({ x: region.x, y: region.y })
  }, [region.x, region.y])

  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Only left click
    e.stopPropagation()
    onSelect()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x * scale,
      y: e.clientY - position.y * scale
    })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const newX = (e.clientX - dragStart.x) / scale
    const newY = (e.clientY - dragStart.y) / scale
    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    if (isDragging && onPositionChange) {
      onPositionChange(region.id, position)
    }
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])

  const style = {
    position: 'absolute',
    left: (position.x - (region.width / 2)) * scale,
    top: position.y * scale,
    width: region.width * scale,
    textAlign: region.align || 'center',
    fontFamily: `"${region.font || region.defaultFont}", serif`,
    fontSize: (region.size || region.defaultSize || 24) * scale,
    fontWeight: region.fontWeight || '400',
    fontStyle: region.fontStyle || 'normal',
    color: region.color || region.defaultColor || '#000000',
    cursor: isDragging ? 'grabbing' : (isSelected ? 'grab' : 'pointer'),
    padding: '4px',
    border: isSelected ? '2px dashed #8b6914' : '2px dashed transparent',
    borderRadius: '4px',
    transition: isDragging ? 'none' : 'border-color 0.2s',
    lineHeight: 1.2,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    zIndex: isDragging ? 100 : (region.zIndex || 10),
    textShadow: region.textShadow || 'none',
    userSelect: 'none'
  }

  return (
    <div
      ref={elementRef}
      style={style}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {value || region.defaultText}
      {isSelected && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-sepia text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
          Drag to move
        </div>
      )}
    </div>
  )
}

// AI Image region component
function ImageRegion({ region, imageUrl, isGenerating, onGenerate, scale }) {
  const style = {
    position: 'absolute',
    left: region.x * scale,
    top: region.y * scale,
    width: region.width * scale,
    height: region.height * scale,
    backgroundColor: imageUrl ? 'transparent' : 'rgba(0,0,0,0.05)',
    backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed rgba(0,0,0,0.15)',
    cursor: 'pointer',
    opacity: region.opacity || 1,
    zIndex: region.zIndex || 0
  }

  return (
    <div style={style} onClick={(e) => { e.stopPropagation(); onGenerate(); }}>
      {isGenerating ? (
        <div className="flex flex-col items-center gap-2 text-sepia/60 bg-white/80 rounded-lg p-3">
          <IconLoader2 size={24} className="animate-spin" />
          <span className="text-xs">Generating...</span>
        </div>
      ) : !imageUrl ? (
        <div className="flex flex-col items-center gap-1 text-sepia/40 hover:text-sepia/60 transition bg-white/50 rounded-lg p-2">
          <IconSparkles size={20} />
          <span className="text-[10px]">Click to generate</span>
        </div>
      ) : null}
    </div>
  )
}

// Shape region component
function ShapeRegion({ region, scale }) {
  if (region.shape === 'line') {
    return (
      <div
        style={{
          position: 'absolute',
          left: region.x * scale,
          top: region.y * scale,
          width: region.width * scale,
          height: (region.height || 2) * scale,
          backgroundColor: region.color,
          zIndex: region.zIndex || 1
        }}
      />
    )
  }
  if (region.shape === 'ornament') {
    return (
      <div
        style={{
          position: 'absolute',
          left: region.x * scale,
          top: region.y * scale,
          width: region.width * scale,
          textAlign: 'center',
          color: region.color,
          fontSize: 20 * scale,
          zIndex: region.zIndex || 1
        }}
      >
        ❧
      </div>
    )
  }
  if (region.shape === 'rect') {
    return (
      <div
        style={{
          position: 'absolute',
          left: region.x * scale,
          top: region.y * scale,
          width: region.width * scale,
          height: region.height * scale,
          backgroundColor: region.color,
          border: region.border,
          zIndex: region.zIndex || 1
        }}
      />
    )
  }
  return null
}

// Art style presets for full cover generation
const ART_STYLES = [
  { id: 'watercolor', name: 'Watercolor', prompt: 'soft watercolor painting style, gentle flowing colors, artistic brushstrokes' },
  { id: 'oil', name: 'Oil Painting', prompt: 'classical oil painting style, rich textures, masterful brushwork' },
  { id: 'minimalist', name: 'Minimalist', prompt: 'minimalist design, clean shapes, elegant simplicity, modern aesthetic' },
  { id: 'vintage', name: 'Vintage', prompt: 'vintage illustration style, sepia tones, nostalgic antique feel' },
  { id: 'botanical', name: 'Botanical', prompt: 'botanical illustration, delicate florals and nature elements, elegant' },
  { id: 'abstract', name: 'Abstract', prompt: 'abstract expressionist art, bold colors, dynamic shapes and movement' },
  { id: 'photographic', name: 'Photographic', prompt: 'cinematic photography style, dramatic lighting, high quality' },
  { id: 'geometric', name: 'Geometric', prompt: 'geometric patterns, art deco inspired, sophisticated shapes' }
]

export default function CoverEditor({ onSave, initialTitle, initialAuthor, pageCount = 200 }) {
  const { authFetch } = useAuth()
  const [selectedTemplate, setSelectedTemplate] = useState('classic')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeSection, setActiveSection] = useState('full') // 'front', 'back', 'spine', 'full'
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [generatingRegion, setGeneratingRegion] = useState(null)
  const [error, setError] = useState(null)

  // Generation mode
  const [generationMode, setGenerationMode] = useState('full-front')
  const [selectedArtStyle, setSelectedArtStyle] = useState('watercolor')
  const [customPrompt, setCustomPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Cover images for full modes
  const [frontCoverImage, setFrontCoverImage] = useState(null)
  const [backCoverImage, setBackCoverImage] = useState(null)

  // Track edits for each region
  const [regionData, setRegionData] = useState({})
  const [imageData, setImageData] = useState({})
  const [bgColor, setBgColor] = useState(null)

  const template = COVER_TEMPLATES[selectedTemplate]
  const spineWidth = BOOK_CONFIG.getSpineWidth(pageCount)

  // Calculate scale based on view
  const getScale = () => {
    if (activeSection === 'full') return 0.38
    return 0.55
  }
  const scale = getScale()

  // Load fonts on mount
  useEffect(() => {
    AVAILABLE_FONTS.forEach(font => loadFont(font.name))
  }, [])

  // Initialize region data when template changes
  useEffect(() => {
    const initialData = {}
    template?.regions?.forEach(region => {
      if (region.type === 'text') {
        initialData[region.id] = {
          text: region.id === 'title' ? (initialTitle || region.defaultText) :
                region.id === 'author' ? (initialAuthor || region.defaultText) :
                region.defaultText,
          font: region.defaultFont,
          size: region.defaultSize,
          color: region.defaultColor,
          fontWeight: region.fontWeight || '400',
          fontStyle: region.fontStyle || 'normal'
        }
      }
    })
    setRegionData(initialData)
    setImageData({})
    setBgColor(template?.backgroundColor)
    setSelectedRegion(null)
    setFrontCoverImage(null)
    setBackCoverImage(null)
  }, [selectedTemplate, initialTitle, initialAuthor])

  // Filter templates by category
  const filteredTemplates = Object.values(COVER_TEMPLATES).filter(
    t => selectedCategory === 'all' || t.category === selectedCategory
  )

  // Get current region being edited
  const currentRegionConfig = template?.regions?.find(r => r.id === selectedRegion)
  const currentRegionData = regionData[selectedRegion]

  // Update region data
  const updateRegion = (regionId, updates) => {
    setRegionData(prev => ({
      ...prev,
      [regionId]: { ...prev[regionId], ...updates }
    }))
  }

  // Build prompt for full cover generation
  const buildFullCoverPrompt = (isBack = false) => {
    const title = regionData.title?.text || initialTitle || 'My Life Story'
    const style = ART_STYLES.find(s => s.id === selectedArtStyle)
    const basePrompt = customPrompt || `A beautiful memoir book cover illustration inspired by "${title}". Evocative imagery representing life's journey, memories, and personal history.`

    if (isBack) {
      return `${basePrompt} ${style?.prompt}. Design suitable for back cover, subtle and complementary, space for text at center. No text or words in image.`
    }
    return `${basePrompt} ${style?.prompt}. Composition suitable for book cover with space for title text. No text or words in image.`
  }

  // Generate full cover image
  const generateFullCover = async (target = 'front') => {
    setIsGenerating(true)
    setError(null)

    try {
      const isBack = target === 'back'
      const prompt = buildFullCoverPrompt(isBack)

      const res = await authFetch('/api/covers/generate-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          width: BOOK_CONFIG.frontWidth,
          height: BOOK_CONFIG.frontHeight,
          templateId: selectedTemplate
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to generate cover')
      }

      const data = await res.json()

      if (target === 'front') {
        setFrontCoverImage(data.imageUrl)
      } else {
        setBackCoverImage(data.imageUrl)
      }

      // If full-book mode and generating front, also generate back
      if (generationMode === 'full-book' && target === 'front') {
        await generateFullCover('back')
      }
    } catch (err) {
      console.error('Generation error:', err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate image for a specific region
  const generateRegionImage = async (region) => {
    setGeneratingRegion(region.id)
    setError(null)

    try {
      const res = await authFetch('/api/covers/generate-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: region.prompt,
          width: region.width,
          height: region.height,
          templateId: selectedTemplate
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to generate image')
      }

      const data = await res.json()
      setImageData(prev => ({
        ...prev,
        [region.id]: data.imageUrl
      }))
    } catch (err) {
      console.error('Generation error:', err)
      setError(err.message)
    } finally {
      setGeneratingRegion(null)
    }
  }

  // Generate all AI images in template
  const generateAllRegions = async () => {
    const aiRegions = template?.regions?.filter(r => r.type === 'ai-image') || []
    for (const region of aiRegions) {
      await generateRegionImage(region)
    }
  }

  return (
    <div className="flex flex-col h-[70vh]">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sepia/10 bg-white/80 gap-4">
        {/* Generation Mode Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-sepia/60 uppercase tracking-wide">Generate:</span>
          <div className="flex rounded-lg border border-sepia/20 overflow-hidden">
            {GENERATION_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setGenerationMode(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                  generationMode === mode.id
                    ? 'bg-sepia text-white'
                    : 'bg-white text-sepia hover:bg-sepia/10'
                }`}
                title={mode.description}
              >
                <mode.icon size={14} />
                <span className="hidden sm:inline">{mode.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-sepia/20 overflow-hidden">
            {['full', 'front', 'spine', 'back'].map(view => (
              <button
                key={view}
                onClick={() => setActiveSection(view)}
                className={`px-3 py-1.5 text-xs font-medium capitalize ${
                  activeSection === view
                    ? 'bg-sepia text-white'
                    : 'bg-white text-sepia hover:bg-sepia/10'
                }`}
              >
                {view === 'full' ? 'Full Book' : view}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Templates & Generation */}
        <div className="w-64 border-r border-sepia/10 overflow-y-auto bg-white/50 flex flex-col">
          {/* Generation Controls */}
          <div className="p-4 border-b border-sepia/10 bg-gradient-to-b from-sepia/5 to-transparent">
            <h3 className="text-xs font-medium text-sepia/60 uppercase tracking-wide mb-3">
              {generationMode === 'regions' ? 'Template Regions' : 'Art Generation'}
            </h3>

            {generationMode !== 'regions' ? (
              <div className="space-y-3">
                {/* Art Style */}
                <div>
                  <label className="block text-xs text-warmgray mb-1.5">Art Style</label>
                  <select
                    value={selectedArtStyle}
                    onChange={e => setSelectedArtStyle(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-sepia/20 rounded-lg bg-white"
                  >
                    {ART_STYLES.map(style => (
                      <option key={style.id} value={style.id}>{style.name}</option>
                    ))}
                  </select>
                </div>

                {/* Custom prompt */}
                <div>
                  <label className="block text-xs text-warmgray mb-1.5">Custom Description (optional)</label>
                  <textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="Describe the imagery you want..."
                    rows={2}
                    className="w-full px-2 py-1.5 text-sm border border-sepia/20 rounded-lg resize-none"
                  />
                </div>

                {/* Generate buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => generateFullCover('front')}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-sepia text-white rounded-lg text-sm font-medium hover:bg-sepia/90 disabled:opacity-50 transition"
                  >
                    {isGenerating ? (
                      <>
                        <IconLoader2 size={16} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <IconWand size={16} />
                        {generationMode === 'full-book' ? 'Generate Full Book' : 'Generate Front Cover'}
                      </>
                    )}
                  </button>

                  {generationMode === 'full-front' && frontCoverImage && (
                    <button
                      onClick={() => generateFullCover('back')}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-sepia/30 text-sepia rounded-lg text-sm hover:bg-sepia/10 disabled:opacity-50 transition"
                    >
                      <IconPhoto size={16} />
                      Also Generate Back Cover
                    </button>
                  )}

                  {(frontCoverImage || backCoverImage) && (
                    <button
                      onClick={() => { setFrontCoverImage(null); setBackCoverImage(null); }}
                      className="flex items-center justify-center gap-2 w-full px-3 py-1.5 text-sepia/60 text-xs hover:text-sepia transition"
                    >
                      <IconRefresh size={14} />
                      Clear & Start Over
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={generateAllRegions}
                  disabled={generatingRegion}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-sepia text-white rounded-lg text-sm font-medium hover:bg-sepia/90 disabled:opacity-50"
                >
                  {generatingRegion ? (
                    <>
                      <IconLoader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <IconSparkles size={16} />
                      Generate All Regions
                    </>
                  )}
                </button>
                <p className="text-[10px] text-warmgray text-center">
                  Or click individual regions on the cover
                </p>
              </div>
            )}
          </div>

          {/* Templates */}
          <div className="p-3 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-sepia/60 uppercase tracking-wide">Templates</h3>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="text-xs px-2 py-1 border border-sepia/20 rounded bg-white"
              >
                {TEMPLATE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`aspect-[2/3] rounded-lg border-2 overflow-hidden transition-all ${
                    selectedTemplate === t.id
                      ? 'border-sepia shadow-md scale-105'
                      : 'border-transparent hover:border-sepia/30'
                  }`}
                  style={{ backgroundColor: t.backgroundColor }}
                >
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <span className="text-[8px] text-center font-medium" style={{ color: t.regions?.find(r => r.id === 'title')?.defaultColor || '#333' }}>
                      {t.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Book preview */}
        <div className="flex-1 overflow-auto bg-gradient-to-b from-gray-100 to-gray-200 p-6">
          <div className="flex items-center justify-center min-h-full">
            {/* Full book view */}
            {activeSection === 'full' ? (
              <div className="flex items-stretch gap-0 shadow-2xl rounded-sm overflow-hidden">
                {/* Back cover */}
                <div
                  className="cursor-pointer hover:brightness-105 transition"
                  onClick={() => setActiveSection('back')}
                >
                  <BookSection
                    section="back"
                    width={BOOK_CONFIG.backWidth}
                    height={BOOK_CONFIG.backHeight}
                    backgroundColor={bgColor || template?.backgroundColor}
                    regions={[]}
                    regionData={{}}
                    imageData={{}}
                    fullCoverImage={backCoverImage}
                    selectedRegion={null}
                    onSelectRegion={() => {}}
                    generatingRegion={null}
                    onGenerateImage={() => {}}
                    scale={scale}
                    isActive={false}
                    generationMode={generationMode}
                  />
                </div>

                {/* Spine */}
                <div
                  className="cursor-pointer hover:brightness-105 transition flex items-center justify-center"
                  onClick={() => setActiveSection('spine')}
                  style={{
                    width: spineWidth * scale,
                    height: BOOK_CONFIG.frontHeight * scale,
                    backgroundColor: bgColor || template?.backgroundColor,
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed'
                  }}
                >
                  <span
                    className="text-[10px] font-medium tracking-wider"
                    style={{ color: template?.regions?.find(r => r.id === 'title')?.defaultColor || '#333' }}
                  >
                    {regionData.title?.text || initialTitle || 'My Life Story'}
                  </span>
                </div>

                {/* Front cover */}
                <div
                  className="cursor-pointer hover:brightness-105 transition"
                  onClick={() => setActiveSection('front')}
                >
                  <BookSection
                    section="front"
                    width={BOOK_CONFIG.frontWidth}
                    height={BOOK_CONFIG.frontHeight}
                    backgroundColor={bgColor || template?.backgroundColor}
                    regions={template?.regions}
                    regionData={regionData}
                    imageData={imageData}
                    fullCoverImage={frontCoverImage}
                    selectedRegion={selectedRegion}
                    onSelectRegion={setSelectedRegion}
                    generatingRegion={generatingRegion}
                    onGenerateImage={generateRegionImage}
                    scale={scale}
                    isActive={false}
                    generationMode={generationMode}
                  />
                </div>
              </div>
            ) : (
              /* Single section view */
              <div className="relative">
                <button
                  onClick={() => setActiveSection('full')}
                  className="absolute -top-10 left-0 flex items-center gap-1 text-sm text-sepia/60 hover:text-sepia"
                >
                  <IconArrowLeft size={16} />
                  Back to full view
                </button>

                {activeSection === 'front' && (
                  <BookSection
                    section="front"
                    width={BOOK_CONFIG.frontWidth}
                    height={BOOK_CONFIG.frontHeight}
                    backgroundColor={bgColor || template?.backgroundColor}
                    regions={template?.regions}
                    regionData={regionData}
                    imageData={imageData}
                    fullCoverImage={frontCoverImage}
                    selectedRegion={selectedRegion}
                    onSelectRegion={setSelectedRegion}
                    generatingRegion={generatingRegion}
                    onGenerateImage={generateRegionImage}
                    scale={0.55}
                    isActive={true}
                    generationMode={generationMode}
                  />
                )}

                {activeSection === 'spine' && (
                  <div
                    className="shadow-xl ring-2 ring-sepia"
                    style={{
                      width: Math.max(80, spineWidth * 3),
                      height: BOOK_CONFIG.frontHeight * 0.55,
                      backgroundColor: bgColor || template?.backgroundColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed'
                    }}
                  >
                    <input
                      type="text"
                      value={regionData.title?.text || initialTitle || 'My Life Story'}
                      onChange={e => updateRegion('title', { text: e.target.value })}
                      className="bg-transparent text-center font-medium outline-none"
                      style={{
                        writingMode: 'vertical-rl',
                        color: template?.regions?.find(r => r.id === 'title')?.defaultColor || '#333',
                        fontSize: '18px'
                      }}
                    />
                  </div>
                )}

                {activeSection === 'back' && (
                  <div
                    className="shadow-xl ring-2 ring-sepia relative overflow-hidden"
                    style={{
                      width: BOOK_CONFIG.backWidth * 0.55,
                      height: BOOK_CONFIG.backHeight * 0.55,
                      backgroundColor: bgColor || template?.backgroundColor
                    }}
                  >
                    {backCoverImage ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${backCoverImage})` }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-8">
                        <p className="text-sm text-center opacity-60 max-w-xs mb-4">
                          Back cover - add synopsis and author bio
                        </p>
                        {generationMode !== 'regions' && (
                          <button
                            onClick={() => generateFullCover('back')}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-4 py-2 bg-sepia/10 hover:bg-sepia/20 text-sepia rounded-lg text-sm transition"
                          >
                            <IconWand size={16} />
                            Generate Back Cover Art
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm text-center max-w-md mx-auto">
              {error}
            </div>
          )}
        </div>

        {/* Right panel - Edit controls */}
        <div className="w-64 border-l border-sepia/10 overflow-y-auto bg-white p-4">
          <h3 className="text-sm font-medium text-ink mb-4">
            {selectedRegion ? `Edit: ${selectedRegion}` : 'Text & Colors'}
          </h3>

          {/* Background color */}
          <div className="mb-6 pb-4 border-b border-sepia/10">
            <label className="block text-xs text-warmgray mb-2">Background Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="color"
                value={bgColor || template?.backgroundColor || '#ffffff'}
                onChange={e => setBgColor(e.target.value)}
                className="w-8 h-8 rounded border border-sepia/20 cursor-pointer"
              />
              {COLOR_PALETTES.elegant.map((color, i) => (
                <button
                  key={i}
                  onClick={() => setBgColor(color)}
                  className={`w-6 h-6 rounded border ${bgColor === color ? 'ring-2 ring-sepia' : 'border-black/10'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Quick text edit */}
          <div className="space-y-4 mb-6 pb-4 border-b border-sepia/10">
            <div>
              <label className="block text-xs text-warmgray mb-1">Book Title</label>
              <input
                type="text"
                value={regionData.title?.text || ''}
                onChange={e => updateRegion('title', { text: e.target.value })}
                className="w-full px-3 py-2 border border-sepia/20 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-warmgray mb-1">Author Name</label>
              <input
                type="text"
                value={regionData.author?.text || ''}
                onChange={e => updateRegion('author', { text: e.target.value })}
                className="w-full px-3 py-2 border border-sepia/20 rounded-lg text-sm"
              />
            </div>
          </div>

          {currentRegionConfig?.type === 'text' && currentRegionData && (
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-sepia/60 uppercase tracking-wide">Selected Element</h4>

              {/* Font selector */}
              <div>
                <label className="block text-xs text-warmgray mb-1">Font</label>
                <select
                  value={currentRegionData.font}
                  onChange={e => updateRegion(selectedRegion, { font: e.target.value })}
                  className="w-full px-3 py-2 border border-sepia/20 rounded-lg text-sm bg-white"
                >
                  {AVAILABLE_FONTS.map(font => (
                    <option key={font.name} value={font.name}>{font.name}</option>
                  ))}
                </select>
              </div>

              {/* Font size */}
              <div>
                <label className="block text-xs text-warmgray mb-1">Size: {currentRegionData.size}px</label>
                <input
                  type="range"
                  min="12"
                  max="80"
                  value={currentRegionData.size}
                  onChange={e => updateRegion(selectedRegion, { size: parseInt(e.target.value) })}
                  className="w-full accent-sepia"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-xs text-warmgray mb-1">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="color"
                    value={currentRegionData.color}
                    onChange={e => updateRegion(selectedRegion, { color: e.target.value })}
                    className="w-8 h-8 rounded border border-sepia/20 cursor-pointer"
                  />
                  {COLOR_PALETTES.neutral.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => updateRegion(selectedRegion, { color })}
                      className="w-6 h-6 rounded border border-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Font weight */}
              <div>
                <label className="block text-xs text-warmgray mb-1">Weight</label>
                <div className="flex gap-1 flex-wrap">
                  {['400', '500', '600', '700'].map(weight => (
                    <button
                      key={weight}
                      onClick={() => updateRegion(selectedRegion, { fontWeight: weight })}
                      className={`px-2 py-1 text-xs rounded ${
                        currentRegionData.fontWeight === weight
                          ? 'bg-sepia text-white'
                          : 'bg-sepia/10 text-sepia hover:bg-sepia/20'
                      }`}
                    >
                      {weight === '400' ? 'Regular' : weight === '500' ? 'Medium' : weight === '600' ? 'Semi' : 'Bold'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!selectedRegion && (
            <div className="text-sm text-warmgray space-y-3">
              <p className="text-xs">Click on text elements to edit styling.</p>
              <div className="pt-4 border-t border-sepia/10">
                <p className="text-xs font-medium text-ink mb-1">Book Details</p>
                <p className="text-xs text-warmgray">Pages: {pageCount}</p>
                <p className="text-xs text-warmgray">Spine: {(spineWidth / 72).toFixed(2)}" ({spineWidth}px)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
