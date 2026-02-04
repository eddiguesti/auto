import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  COVER_TEMPLATES,
  TEMPLATE_CATEGORIES,
  AVAILABLE_FONTS,
  COLOR_PALETTES
} from '../data/coverTemplates'
import {
  IconSparkles,
  IconDownload,
  IconArrowLeft,
  IconPhoto,
  IconTypography,
  IconLoader2,
  IconPalette,
  IconLayoutGrid,
  IconWand,
  IconRefresh,
  IconBook2,
  IconSquare,
  IconRectangle,
  IconTrash,
  IconPlus,
  IconTextPlus,
  IconUpload,
  IconCopy,
  IconArrowUp,
  IconArrowDown,
  IconZoomIn,
  IconZoomOut,
  IconDropletHalf,
  IconShadow
} from '@tabler/icons-react'

// Load Google Fonts
const loadFont = fontName => {
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
  getSpineWidth: pageCount => Math.max(20, Math.round(pageCount * 0.002252 * 72))
}

// Generation mode options - Full Book first as most users want this
const GENERATION_MODES = [
  {
    id: 'full-book',
    name: 'Full Book',
    icon: IconBook2,
    description: 'Generate matching art for front & back covers together'
  },
  {
    id: 'full-front',
    name: 'Front Only',
    icon: IconSquare,
    description: 'Generate art for front cover only'
  },
  {
    id: 'regions',
    name: 'Template Regions',
    icon: IconLayoutGrid,
    description: 'Use template with specific image areas'
  }
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
  generationMode,
  onPositionChange,
  onDeleteRegion
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
      {generationMode === 'regions' &&
        regions?.map(region => {
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
                onPositionChange={onPositionChange}
                onDelete={onDeleteRegion}
              />
            )
          }
          if (region.type === 'shape') {
            return <ShapeRegion key={region.id} region={region} scale={scale} />
          }
          return null
        })}

      {/* Text overlay for full cover modes */}
      {generationMode !== 'regions' &&
        regions
          ?.filter(r => r.type === 'text')
          .map(region => {
            const data = regionData[region.id]
            return (
              <TextRegion
                key={region.id}
                region={{ ...region, ...data }}
                value={data?.text}
                isSelected={selectedRegion === region.id}
                onSelect={() => onSelectRegion(region.id)}
                scale={scale}
                onPositionChange={onPositionChange}
                onDelete={onDeleteRegion}
              />
            )
          })}
    </div>
  )
}

// Text region component with drag support
function TextRegion({ region, value, isSelected, onSelect, scale, onPositionChange, onDelete }) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [position, setPosition] = useState({ x: region.x, y: region.y })
  const elementRef = useRef(null)

  // Update position when region changes (template switch)
  useEffect(() => {
    setPosition({ x: region.x, y: region.y })
  }, [region.x, region.y])

  // Handle keyboard delete
  useEffect(() => {
    if (!isSelected) return

    const handleKeyDown = e => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
        // Don't delete if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
        e.preventDefault()
        onDelete(region.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelected, onDelete, region.id])

  const handleMouseDown = e => {
    if (e.button !== 0) return // Only left click
    e.stopPropagation()
    onSelect()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x * scale,
      y: e.clientY - position.y * scale
    })
  }

  const handleMouseMove = e => {
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
    left: (position.x - region.width / 2) * scale,
    top: position.y * scale,
    width: region.width * scale,
    textAlign: region.align || 'center',
    fontFamily: `"${region.font || region.defaultFont}", serif`,
    fontSize: (region.size || region.defaultSize || 24) * scale,
    fontWeight: region.fontWeight || '400',
    fontStyle: region.fontStyle || 'normal',
    color: region.color || region.defaultColor || '#000000',
    cursor: isDragging ? 'grabbing' : isSelected ? 'grab' : 'pointer',
    padding: '4px',
    border: isSelected ? '2px dashed #8b6914' : '2px dashed transparent',
    borderRadius: '4px',
    transition: isDragging ? 'none' : 'border-color 0.2s',
    lineHeight: 1.2,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    zIndex: isDragging ? 100 : region.zIndex || 10,
    textShadow: region.textShadow || 'none',
    userSelect: 'none'
  }

  return (
    <div
      ref={elementRef}
      style={style}
      onMouseDown={handleMouseDown}
      onClick={e => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {value || region.defaultText}
      {isSelected && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-sepia text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap flex items-center gap-2">
          <span>Drag to move</span>
          <span className="opacity-60">|</span>
          <span className="opacity-80">Del to remove</span>
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
    <div
      style={style}
      onClick={e => {
        e.stopPropagation()
        onGenerate()
      }}
    >
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
  {
    id: 'watercolor',
    name: 'Watercolor',
    prompt: 'soft watercolor painting style, gentle flowing colors, artistic brushstrokes'
  },
  {
    id: 'oil',
    name: 'Oil Painting',
    prompt: 'classical oil painting style, rich textures, masterful brushwork'
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    prompt: 'minimalist design, clean shapes, elegant simplicity, modern aesthetic'
  },
  {
    id: 'vintage',
    name: 'Vintage',
    prompt: 'vintage illustration style, sepia tones, nostalgic antique feel'
  },
  {
    id: 'botanical',
    name: 'Botanical',
    prompt: 'botanical illustration, delicate florals and nature elements, elegant'
  },
  {
    id: 'abstract',
    name: 'Abstract',
    prompt: 'abstract expressionist art, bold colors, dynamic shapes and movement'
  },
  {
    id: 'photographic',
    name: 'Photographic',
    prompt: 'cinematic photography style, dramatic lighting, high quality'
  },
  {
    id: 'geometric',
    name: 'Geometric',
    prompt: 'geometric patterns, art deco inspired, sophisticated shapes'
  }
]

export default function CoverEditor({ onSave, initialTitle, initialAuthor, pageCount = 200 }) {
  const { authFetch } = useAuth()
  const [selectedTemplate, setSelectedTemplate] = useState('classic')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeSection, setActiveSection] = useState('full') // 'front', 'back', 'spine', 'full'
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [generatingRegion, setGeneratingRegion] = useState(null)
  const [error, setError] = useState(null)

  // Generation mode - default to full-book for easiest experience
  const [generationMode, setGenerationMode] = useState('full-book')
  const [selectedArtStyle, setSelectedArtStyle] = useState('watercolor')
  const [customPrompt, setCustomPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('') // Track which cover is being generated

  // Cover images for full modes
  const [frontCoverImage, setFrontCoverImage] = useState(null)
  const [backCoverImage, setBackCoverImage] = useState(null)

  // Track edits for each region
  const [regionData, setRegionData] = useState({})
  const [imageData, setImageData] = useState({})
  const [bgColor, setBgColor] = useState(null)
  const [customTextElements, setCustomTextElements] = useState([]) // User-added text elements
  const [deletedRegions, setDeletedRegions] = useState([]) // Track deleted template regions

  // Additional controls
  const [zoomLevel, setZoomLevel] = useState(1) // 0.5 to 2
  const fileInputRef = useRef(null)
  const [uploadTarget, setUploadTarget] = useState('front') // 'front' or 'back'

  // Auto-save state
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef(null)

  const template = COVER_TEMPLATES[selectedTemplate]
  const spineWidth = BOOK_CONFIG.getSpineWidth(pageCount)

  // Load saved cover on mount
  useEffect(() => {
    const loadSavedCover = async () => {
      try {
        const res = await authFetch('/api/covers/saved')
        if (res.ok) {
          const data = await res.json()
          if (data.cover) {
            // Restore saved state
            if (data.cover.template_id) setSelectedTemplate(data.cover.template_id)
            if (data.cover.front_cover_url) setFrontCoverImage(data.cover.front_cover_url)
            if (data.cover.back_cover_url) setBackCoverImage(data.cover.back_cover_url)
            if (data.cover.color_scheme?.bgColor) setBgColor(data.cover.color_scheme.bgColor)
            if (data.cover.custom_settings) {
              const settings = data.cover.custom_settings
              if (settings.regionData) setRegionData(settings.regionData)
              if (settings.customTextElements) setCustomTextElements(settings.customTextElements)
              if (settings.deletedRegions) setDeletedRegions(settings.deletedRegions)
              if (settings.generationMode) setGenerationMode(settings.generationMode)
              if (settings.selectedArtStyle) setSelectedArtStyle(settings.selectedArtStyle)
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load saved cover:', err)
      } finally {
        setIsLoaded(true)
      }
    }
    loadSavedCover()
  }, [])

  // Auto-save cover when state changes (debounced)
  useEffect(() => {
    if (!isLoaded) return // Don't save until initial load completes

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await authFetch('/api/covers/save', {
          method: 'POST',
          body: JSON.stringify({
            templateId: selectedTemplate,
            title: regionData.title?.text || initialTitle,
            author: regionData.author?.text || initialAuthor,
            frontCoverUrl: frontCoverImage,
            backCoverUrl: backCoverImage,
            spineText: regionData.title?.text || initialTitle,
            colorScheme: { bgColor },
            customSettings: {
              regionData,
              customTextElements,
              deletedRegions,
              generationMode,
              selectedArtStyle
            }
          })
        })
        // Notify parent about save if callback provided
        if (onSave) {
          onSave({ frontCoverImage, backCoverImage, selectedTemplate })
        }
      } catch (err) {
        console.warn('Failed to auto-save cover:', err)
      } finally {
        setIsSaving(false)
      }
    }, 1000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [
    selectedTemplate,
    frontCoverImage,
    backCoverImage,
    regionData,
    bgColor,
    customTextElements,
    deletedRegions,
    generationMode,
    selectedArtStyle,
    isLoaded
  ])

  // Calculate scale based on view and zoom
  const getBaseScale = () => {
    if (activeSection === 'full') return 0.38
    return 0.55
  }
  const scale = getBaseScale() * zoomLevel

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
          text:
            region.id === 'title'
              ? initialTitle || region.defaultText
              : region.id === 'author'
                ? initialAuthor || region.defaultText
                : region.defaultText,
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
    setCustomTextElements([])
    setDeletedRegions([])
  }, [selectedTemplate, initialTitle, initialAuthor])

  // Get all text regions (template + custom, minus deleted)
  const getAllTextRegions = () => {
    const templateTextRegions = (template?.regions || []).filter(
      r => r.type === 'text' && !deletedRegions.includes(r.id)
    )
    return [...templateTextRegions, ...customTextElements]
  }

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

  // Handle text position change from drag
  const handlePositionChange = (regionId, position) => {
    setRegionData(prev => ({
      ...prev,
      [regionId]: { ...prev[regionId], x: position.x, y: position.y }
    }))
  }

  // Add new text element
  const addTextElement = () => {
    const newId = `custom-text-${Date.now()}`
    const newElement = {
      id: newId,
      type: 'text',
      x: 300, // Center of cover
      y: 450,
      width: 400,
      align: 'center',
      defaultText: 'New Text',
      defaultFont: 'Playfair Display',
      defaultSize: 28,
      defaultColor: '#333333',
      editable: true,
      zIndex: 20,
      isCustom: true
    }
    setCustomTextElements(prev => [...prev, newElement])
    setRegionData(prev => ({
      ...prev,
      [newId]: {
        text: 'New Text',
        font: 'Playfair Display',
        size: 28,
        color: '#333333',
        fontWeight: '400',
        fontStyle: 'normal',
        x: 300,
        y: 450
      }
    }))
    setSelectedRegion(newId)
  }

  // Delete text element
  const deleteTextElement = regionId => {
    // Check if it's a custom element
    const isCustom = customTextElements.some(el => el.id === regionId)

    if (isCustom) {
      setCustomTextElements(prev => prev.filter(el => el.id !== regionId))
    } else {
      // Mark template region as deleted
      setDeletedRegions(prev => [...prev, regionId])
    }

    // Remove from regionData
    setRegionData(prev => {
      const newData = { ...prev }
      delete newData[regionId]
      return newData
    })

    setSelectedRegion(null)
  }

  // Duplicate text element
  const duplicateTextElement = regionId => {
    const sourceData = regionData[regionId]
    if (!sourceData) return

    const newId = `custom-text-${Date.now()}`
    const newElement = {
      id: newId,
      type: 'text',
      x: (sourceData.x || 300) + 20,
      y: (sourceData.y || 450) + 20,
      width: 400,
      align: 'center',
      defaultText: sourceData.text || 'Copy',
      defaultFont: sourceData.font || 'Playfair Display',
      defaultSize: sourceData.size || 28,
      defaultColor: sourceData.color || '#333333',
      editable: true,
      zIndex: 25,
      isCustom: true
    }
    setCustomTextElements(prev => [...prev, newElement])
    setRegionData(prev => ({
      ...prev,
      [newId]: {
        ...sourceData,
        x: newElement.x,
        y: newElement.y
      }
    }))
    setSelectedRegion(newId)
  }

  // Handle image upload
  const handleImageUpload = e => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
      const imageUrl = event.target?.result
      if (uploadTarget === 'front') {
        setFrontCoverImage(imageUrl)
      } else {
        setBackCoverImage(imageUrl)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = '' // Reset input
  }

  // Trigger file upload
  const triggerUpload = target => {
    setUploadTarget(target)
    fileInputRef.current?.click()
  }

  // Reset to template defaults
  const resetToDefaults = () => {
    const initialData = {}
    template?.regions?.forEach(region => {
      if (region.type === 'text') {
        initialData[region.id] = {
          text:
            region.id === 'title'
              ? initialTitle || region.defaultText
              : region.id === 'author'
                ? initialAuthor || region.defaultText
                : region.defaultText,
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
    setCustomTextElements([])
    setDeletedRegions([])
  }

  // Update text shadow
  const updateTextShadow = (regionId, hasShadow) => {
    const shadow = hasShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none'
    updateRegion(regionId, { textShadow: shadow })
  }

  // Build prompt for full cover generation
  const buildFullCoverPrompt = (isBack = false) => {
    const title = regionData.title?.text || initialTitle || 'My Life Story'
    const style = ART_STYLES.find(s => s.id === selectedArtStyle)
    const basePrompt =
      customPrompt ||
      `A beautiful memoir book cover illustration inspired by "${title}". Evocative imagery representing life's journey, memories, and personal history.`

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
      // For full-book mode, generate both covers
      if (generationMode === 'full-book' && target === 'front') {
        // Generate front cover first
        setGenerationProgress('Generating front cover...')
        const frontPrompt = buildFullCoverPrompt(false)

        const frontRes = await authFetch('/api/covers/generate-region', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: frontPrompt,
            width: BOOK_CONFIG.frontWidth,
            height: BOOK_CONFIG.frontHeight,
            templateId: selectedTemplate
          })
        })

        if (!frontRes.ok) {
          const data = await frontRes.json()
          throw new Error(data.message || 'Failed to generate front cover')
        }

        const frontData = await frontRes.json()
        setFrontCoverImage(frontData.imageUrl)

        // Now generate back cover
        setGenerationProgress('Generating back cover...')
        const backPrompt = buildFullCoverPrompt(true)

        const backRes = await authFetch('/api/covers/generate-region', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: backPrompt,
            width: BOOK_CONFIG.backWidth,
            height: BOOK_CONFIG.backHeight,
            templateId: selectedTemplate
          })
        })

        if (!backRes.ok) {
          const data = await backRes.json()
          throw new Error(data.message || 'Failed to generate back cover')
        }

        const backData = await backRes.json()
        setBackCoverImage(backData.imageUrl)
        setGenerationProgress('')
      } else {
        // Single cover generation
        const isBack = target === 'back'
        setGenerationProgress(isBack ? 'Generating back cover...' : 'Generating front cover...')
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
        setGenerationProgress('')
      }
    } catch (err) {
      console.error('Generation error:', err)
      setError(err.message)
      setGenerationProgress('')
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate image for a specific region
  const generateRegionImage = async region => {
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
        {/* Saving indicator */}
        <div className="flex items-center gap-2 text-xs text-sepia/60">
          {isSaving ? (
            <>
              <IconLoader2 size={12} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : isLoaded ? (
            <span className="text-green-600">✓ Saved</span>
          ) : null}
        </div>

        {/* Generation Mode Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-sepia/60 uppercase tracking-wide">
            Generate:
          </span>
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

        {/* View toggle and zoom */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border border-sepia/20 rounded-lg overflow-hidden">
            <button
              onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))}
              className="p-1.5 hover:bg-sepia/10 text-sepia"
              title="Zoom out"
            >
              <IconZoomOut size={16} />
            </button>
            <span className="text-xs text-sepia/70 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))}
              className="p-1.5 hover:bg-sepia/10 text-sepia"
              title="Zoom in"
            >
              <IconZoomIn size={16} />
            </button>
          </div>

          {/* View toggle */}
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

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

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
                      <option key={style.id} value={style.id}>
                        {style.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom prompt */}
                <div>
                  <label className="block text-xs text-warmgray mb-1.5">
                    Custom Description (optional)
                  </label>
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
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-sepia text-white rounded-lg text-sm font-medium hover:bg-sepia/90 disabled:opacity-50 transition"
                  >
                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                          <IconLoader2 size={16} className="animate-spin" />
                          <span>{generationProgress || 'Generating...'}</span>
                        </div>
                        {generationMode === 'full-book' && (
                          <span className="text-[10px] opacity-70">
                            Creating front & back covers
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        <IconWand size={16} />
                        {generationMode === 'full-book'
                          ? 'Generate Front & Back Covers'
                          : 'Generate Front Cover'}
                      </>
                    )}
                  </button>

                  {generationMode === 'full-book' && !isGenerating && (
                    <p className="text-[10px] text-warmgray text-center">
                      Creates matching artwork for both covers
                    </p>
                  )}

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

                  {(frontCoverImage || backCoverImage) && !isGenerating && (
                    <button
                      onClick={() => {
                        setFrontCoverImage(null)
                        setBackCoverImage(null)
                      }}
                      className="flex items-center justify-center gap-2 w-full px-3 py-1.5 text-sepia/60 text-xs hover:text-sepia transition"
                    >
                      <IconRefresh size={14} />
                      Clear & Regenerate
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-sepia/10 my-3" />

                {/* Upload your own images */}
                <div className="space-y-2">
                  <p className="text-[10px] text-warmgray text-center uppercase tracking-wide">
                    Or upload your own
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerUpload('front')}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 border border-sepia/20 text-sepia rounded-lg text-xs hover:bg-sepia/5 transition"
                    >
                      <IconUpload size={14} />
                      Front
                    </button>
                    <button
                      onClick={() => triggerUpload('back')}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 border border-sepia/20 text-sepia rounded-lg text-xs hover:bg-sepia/5 transition"
                    >
                      <IconUpload size={14} />
                      Back
                    </button>
                  </div>
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
              <h3 className="text-xs font-medium text-sepia/60 uppercase tracking-wide">
                Templates
              </h3>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="text-xs px-2 py-1 border border-sepia/20 rounded bg-white"
              >
                {TEMPLATE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
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
                    <span
                      className="text-[8px] text-center font-medium"
                      style={{
                        color: t.regions?.find(r => r.id === 'title')?.defaultColor || '#333'
                      }}
                    >
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
                    style={{
                      color: template?.regions?.find(r => r.id === 'title')?.defaultColor || '#333'
                    }}
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
                    regions={[
                      ...(template?.regions || []).filter(r => !deletedRegions.includes(r.id)),
                      ...customTextElements
                    ]}
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
                    onPositionChange={handlePositionChange}
                    onDeleteRegion={deleteTextElement}
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
                  <div className="relative">
                    <BookSection
                      section="front"
                      width={BOOK_CONFIG.frontWidth}
                      height={BOOK_CONFIG.frontHeight}
                      backgroundColor={bgColor || template?.backgroundColor}
                      regions={[
                        ...(template?.regions || []).filter(r => !deletedRegions.includes(r.id)),
                        ...customTextElements
                      ]}
                      regionData={regionData}
                      imageData={imageData}
                      fullCoverImage={frontCoverImage}
                      selectedRegion={selectedRegion}
                      onSelectRegion={setSelectedRegion}
                      generatingRegion={generatingRegion}
                      onGenerateImage={generateRegionImage}
                      scale={0.55 * zoomLevel}
                      isActive={true}
                      generationMode={generationMode}
                      onPositionChange={handlePositionChange}
                      onDeleteRegion={deleteTextElement}
                    />
                    {/* Image controls overlay */}
                    {frontCoverImage && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                        <button
                          onClick={() => setFrontCoverImage(null)}
                          className="px-3 py-1.5 bg-white/90 hover:bg-white text-sepia rounded text-xs shadow transition"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => triggerUpload('front')}
                          className="px-3 py-1.5 bg-white/90 hover:bg-white text-sepia rounded text-xs shadow transition"
                        >
                          Change
                        </button>
                        <button
                          onClick={() => generateFullCover('front')}
                          disabled={isGenerating}
                          className="px-3 py-1.5 bg-sepia/90 hover:bg-sepia text-white rounded text-xs shadow transition disabled:opacity-50"
                        >
                          Regenerate
                        </button>
                      </div>
                    )}
                  </div>
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
                        color:
                          template?.regions?.find(r => r.id === 'title')?.defaultColor || '#333',
                        fontSize: '18px'
                      }}
                    />
                  </div>
                )}

                {activeSection === 'back' && (
                  <div
                    className="shadow-xl ring-2 ring-sepia relative overflow-hidden"
                    style={{
                      width: BOOK_CONFIG.backWidth * 0.55 * zoomLevel,
                      height: BOOK_CONFIG.backHeight * 0.55 * zoomLevel,
                      backgroundColor: bgColor || template?.backgroundColor
                    }}
                  >
                    {backCoverImage ? (
                      <>
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${backCoverImage})` }}
                        />
                        {/* Remove/change image overlay */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                          <button
                            onClick={() => setBackCoverImage(null)}
                            className="px-3 py-1.5 bg-white/90 hover:bg-white text-sepia rounded text-xs shadow transition"
                          >
                            Remove Image
                          </button>
                          <button
                            onClick={() => triggerUpload('back')}
                            className="px-3 py-1.5 bg-white/90 hover:bg-white text-sepia rounded text-xs shadow transition"
                          >
                            Change
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-6 gap-3">
                        <IconPhoto size={32} className="text-sepia/30" />
                        <p className="text-sm text-center opacity-60 max-w-xs">
                          Back cover artwork
                        </p>
                        <div className="flex flex-col gap-2">
                          {generationMode !== 'regions' && (
                            <button
                              onClick={() => generateFullCover('back')}
                              disabled={isGenerating}
                              className="flex items-center gap-2 px-4 py-2 bg-sepia text-white hover:bg-sepia/90 rounded-lg text-sm transition"
                            >
                              <IconWand size={16} />
                              Generate with AI
                            </button>
                          )}
                          <button
                            onClick={() => triggerUpload('back')}
                            className="flex items-center gap-2 px-4 py-2 border border-sepia/30 text-sepia hover:bg-sepia/5 rounded-lg text-sm transition"
                          >
                            <IconUpload size={16} />
                            Upload Image
                          </button>
                        </div>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-ink">
              {selectedRegion
                ? `Edit: ${selectedRegion.replace('custom-text-', 'Text ')}`
                : 'Text & Colors'}
            </h3>
            {selectedRegion && (
              <button
                onClick={() => deleteTextElement(selectedRegion)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                title="Delete element"
              >
                <IconTrash size={16} />
              </button>
            )}
          </div>

          {/* Add Text & Actions */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={addTextElement}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border-2 border-dashed border-sepia/30 text-sepia hover:border-sepia hover:bg-sepia/5 rounded-lg text-xs transition"
            >
              <IconTextPlus size={14} />
              Add Text
            </button>
            {selectedRegion && (
              <button
                onClick={() => duplicateTextElement(selectedRegion)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-sepia/20 text-sepia hover:bg-sepia/5 rounded-lg text-xs transition"
                title="Duplicate selected"
              >
                <IconCopy size={14} />
              </button>
            )}
          </div>

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
              <h4 className="text-xs font-medium text-sepia/60 uppercase tracking-wide">
                Selected Element
              </h4>

              {/* Font selector */}
              <div>
                <label className="block text-xs text-warmgray mb-1">Font</label>
                <select
                  value={currentRegionData.font}
                  onChange={e => updateRegion(selectedRegion, { font: e.target.value })}
                  className="w-full px-3 py-2 border border-sepia/20 rounded-lg text-sm bg-white"
                >
                  {AVAILABLE_FONTS.map(font => (
                    <option key={font.name} value={font.name}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font size */}
              <div>
                <label className="block text-xs text-warmgray mb-1">
                  Size: {currentRegionData.size}px
                </label>
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
                      {weight === '400'
                        ? 'Regular'
                        : weight === '500'
                          ? 'Medium'
                          : weight === '600'
                            ? 'Semi'
                            : 'Bold'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Shadow Toggle */}
              <div>
                <label className="block text-xs text-warmgray mb-1">Text Shadow</label>
                <button
                  onClick={() =>
                    updateTextShadow(
                      selectedRegion,
                      !currentRegionData.textShadow || currentRegionData.textShadow === 'none'
                    )
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition ${
                    currentRegionData.textShadow && currentRegionData.textShadow !== 'none'
                      ? 'bg-sepia text-white'
                      : 'bg-sepia/10 text-sepia hover:bg-sepia/20'
                  }`}
                >
                  <IconShadow size={14} />
                  {currentRegionData.textShadow && currentRegionData.textShadow !== 'none'
                    ? 'Shadow On'
                    : 'Add Shadow'}
                </button>
                <p className="text-[10px] text-warmgray mt-1">Helps text stand out on images</p>
              </div>
            </div>
          )}

          {!selectedRegion && (
            <div className="text-sm text-warmgray space-y-3">
              <p className="text-xs">Click on text elements to edit styling.</p>
              <div className="pt-4 border-t border-sepia/10">
                <p className="text-xs font-medium text-ink mb-1">Book Details</p>
                <p className="text-xs text-warmgray">Pages: {pageCount}</p>
                <p className="text-xs text-warmgray">
                  Spine: {(spineWidth / 72).toFixed(2)}" ({spineWidth}px)
                </p>
              </div>
            </div>
          )}

          {/* Reset button */}
          <div className="mt-6 pt-4 border-t border-sepia/10">
            <button
              onClick={resetToDefaults}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs transition"
            >
              <IconRefresh size={14} />
              Reset All to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
