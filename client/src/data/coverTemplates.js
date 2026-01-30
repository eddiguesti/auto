// Cover templates with editable regions
// Each template defines: layout, text regions, and AI artwork regions
// Dimensions based on 6x9 book with spine (full wrap: back + spine + front)

// Spine width calculation: approximately 0.002252" per page
// For 200 pages: ~0.45" spine, scaled to our preview
const SPINE_WIDTH = 40 // pixels at preview scale

export const COVER_TEMPLATES = {
  // === CLASSIC STYLES ===
  classic: {
    id: 'classic',
    name: 'Classic Memoir',
    category: 'Classic',
    description: 'Elegant centered layout with artwork background',
    width: 600,
    height: 900,
    backgroundColor: '#f5f0e8',
    regions: [
      {
        id: 'background',
        type: 'ai-image',
        x: 0,
        y: 0,
        width: 600,
        height: 500,
        prompt: 'serene landscape at golden hour, soft watercolor style, muted warm colors, peaceful meadow with distant hills',
        zIndex: 0
      },
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 580,
        width: 500,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Playfair Display',
        defaultSize: 48,
        defaultColor: '#2d3748',
        editable: true,
        zIndex: 2
      },
      {
        id: 'divider',
        type: 'shape',
        shape: 'line',
        x: 200,
        y: 640,
        width: 200,
        height: 2,
        color: '#d4a574',
        zIndex: 1
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 680,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Lora',
        defaultSize: 22,
        defaultColor: '#4a5568',
        editable: true,
        zIndex: 2
      }
    ]
  },

  elegantPortrait: {
    id: 'elegantPortrait',
    name: 'Elegant Portrait',
    category: 'Classic',
    description: 'Oval frame with decorative border',
    width: 600,
    height: 900,
    backgroundColor: '#1a1a2e',
    regions: [
      {
        id: 'frame',
        type: 'ai-image',
        x: 150,
        y: 150,
        width: 300,
        height: 350,
        prompt: 'ornate golden oval picture frame with baroque flourishes on dark background, elegant vintage style',
        zIndex: 1
      },
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 580,
        width: 500,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Cinzel',
        defaultSize: 42,
        defaultColor: '#d4a574',
        editable: true,
        zIndex: 2
      },
      {
        id: 'subtitle',
        type: 'text',
        x: 300,
        y: 640,
        width: 400,
        align: 'center',
        defaultText: 'A Memoir',
        defaultFont: 'Cormorant Garamond',
        defaultSize: 24,
        defaultColor: '#a39080',
        fontStyle: 'italic',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 820,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Cinzel',
        defaultSize: 18,
        defaultColor: '#d4a574',
        editable: true,
        zIndex: 2
      }
    ]
  },

  // === MODERN STYLES ===
  modern: {
    id: 'modern',
    name: 'Modern Minimal',
    category: 'Modern',
    description: 'Bold typography with accent shape',
    width: 600,
    height: 900,
    backgroundColor: '#ffffff',
    regions: [
      {
        id: 'shape',
        type: 'ai-image',
        x: 0,
        y: 0,
        width: 250,
        height: 900,
        prompt: 'bold abstract geometric shape, solid black, single large curved form, minimalist brutalist design',
        zIndex: 0
      },
      {
        id: 'title',
        type: 'text',
        x: 430,
        y: 320,
        width: 300,
        align: 'left',
        defaultText: 'MY LIFE',
        defaultFont: 'Inter',
        defaultSize: 52,
        defaultColor: '#1a1a1a',
        fontWeight: '700',
        editable: true,
        zIndex: 2
      },
      {
        id: 'subtitle',
        type: 'text',
        x: 430,
        y: 385,
        width: 300,
        align: 'left',
        defaultText: 'STORY',
        defaultFont: 'Inter',
        defaultSize: 52,
        defaultColor: '#1a1a1a',
        fontWeight: '700',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 430,
        y: 800,
        width: 280,
        align: 'left',
        defaultText: 'Author Name',
        defaultFont: 'Inter',
        defaultSize: 18,
        defaultColor: '#666666',
        editable: true,
        zIndex: 2
      }
    ]
  },

  splitDesign: {
    id: 'splitDesign',
    name: 'Split Design',
    category: 'Modern',
    description: 'Half image, half solid color',
    width: 600,
    height: 900,
    backgroundColor: '#f8f5f2',
    regions: [
      {
        id: 'leftImage',
        type: 'ai-image',
        x: 0,
        y: 0,
        width: 300,
        height: 900,
        prompt: 'abstract flowing shapes in terracotta and rust colors, organic curves, contemporary art style',
        zIndex: 0
      },
      {
        id: 'title',
        type: 'text',
        x: 450,
        y: 380,
        width: 280,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Montserrat',
        defaultSize: 36,
        defaultColor: '#2d3748',
        fontWeight: '600',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 450,
        y: 480,
        width: 280,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Montserrat',
        defaultSize: 16,
        defaultColor: '#718096',
        editable: true,
        zIndex: 2
      }
    ]
  },

  geometricGrid: {
    id: 'geometricGrid',
    name: 'Geometric Grid',
    category: 'Modern',
    description: 'Abstract geometric pattern',
    width: 600,
    height: 900,
    backgroundColor: '#0f172a',
    regions: [
      {
        id: 'pattern',
        type: 'ai-image',
        x: 0,
        y: 0,
        width: 600,
        height: 900,
        prompt: 'geometric grid pattern with circles and lines, navy blue and gold accent, art deco inspired, clean modern design',
        opacity: 0.6,
        zIndex: 0
      },
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 400,
        width: 500,
        align: 'center',
        defaultText: 'MY LIFE STORY',
        defaultFont: 'Bebas Neue',
        defaultSize: 64,
        defaultColor: '#ffffff',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 500,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Inter',
        defaultSize: 20,
        defaultColor: '#fbbf24',
        editable: true,
        zIndex: 2
      }
    ]
  },

  // === NATURE STYLES ===
  nature: {
    id: 'nature',
    name: 'Nature Frame',
    category: 'Nature',
    description: 'Botanical illustrations framing your title',
    width: 600,
    height: 900,
    backgroundColor: '#faf9f7',
    regions: [
      {
        id: 'top-flora',
        type: 'ai-image',
        x: 0,
        y: 0,
        width: 600,
        height: 280,
        prompt: 'delicate botanical illustration, eucalyptus leaves and small flowers hanging down from top, watercolor style, sage green and dusty blue',
        zIndex: 1
      },
      {
        id: 'bottom-flora',
        type: 'ai-image',
        x: 0,
        y: 650,
        width: 600,
        height: 250,
        prompt: 'delicate botanical illustration, wildflowers and ferns growing up from bottom, watercolor style, sage green and lavender',
        zIndex: 1
      },
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 400,
        width: 500,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Cormorant Garamond',
        defaultSize: 52,
        defaultColor: '#2d5a4a',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 500,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Lora',
        defaultSize: 22,
        defaultColor: '#4a7c59',
        editable: true,
        zIndex: 2
      }
    ]
  },

  forestPath: {
    id: 'forestPath',
    name: 'Forest Path',
    category: 'Nature',
    description: 'Misty forest scene',
    width: 600,
    height: 900,
    backgroundColor: '#1a2f1a',
    regions: [
      {
        id: 'forest',
        type: 'ai-image',
        x: 0,
        y: 0,
        width: 600,
        height: 900,
        prompt: 'misty forest path with tall trees, morning light filtering through, ethereal atmosphere, soft green and gold tones',
        opacity: 0.8,
        zIndex: 0
      },
      {
        id: 'overlay',
        type: 'shape',
        shape: 'gradient',
        x: 0,
        y: 500,
        width: 600,
        height: 400,
        color: 'linear-gradient(to bottom, transparent, rgba(26,47,26,0.9))',
        zIndex: 1
      },
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 700,
        width: 500,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Cormorant Garamond',
        defaultSize: 48,
        defaultColor: '#ffffff',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 780,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Lora',
        defaultSize: 20,
        defaultColor: '#a3b18a',
        editable: true,
        zIndex: 2
      }
    ]
  },

  // === WARM STYLES ===
  warmth: {
    id: 'warmth',
    name: 'Warm Memories',
    category: 'Warm',
    description: 'Sunset tones with nostalgic feel',
    width: 600,
    height: 900,
    backgroundColor: '#fef7ed',
    regions: [
      {
        id: 'background',
        type: 'ai-image',
        x: 0,
        y: 0,
        width: 600,
        height: 900,
        prompt: 'warm golden sunset sky gradient, soft clouds, dreamy atmosphere with floating light particles, amber and peach tones',
        opacity: 0.5,
        zIndex: 0
      },
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 380,
        width: 500,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Playfair Display',
        defaultSize: 54,
        defaultColor: '#92400e',
        editable: true,
        zIndex: 2
      },
      {
        id: 'subtitle',
        type: 'text',
        x: 300,
        y: 460,
        width: 400,
        align: 'center',
        defaultText: 'Memories of a Lifetime',
        defaultFont: 'Lora',
        defaultSize: 22,
        defaultColor: '#b45309',
        fontStyle: 'italic',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 780,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Lora',
        defaultSize: 20,
        defaultColor: '#78350f',
        editable: true,
        zIndex: 2
      }
    ]
  },

  vintagePhoto: {
    id: 'vintagePhoto',
    name: 'Vintage Photo',
    category: 'Warm',
    description: 'Old photograph style with sepia tones',
    width: 600,
    height: 900,
    backgroundColor: '#f5e6d3',
    regions: [
      {
        id: 'photoFrame',
        type: 'ai-image',
        x: 100,
        y: 100,
        width: 400,
        height: 450,
        prompt: 'vintage photograph of an old farmhouse with trees, sepia toned, weathered edges, nostalgic family home feel',
        zIndex: 1
      },
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 620,
        width: 500,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Playfair Display',
        defaultSize: 44,
        defaultColor: '#44403c',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 700,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Lora',
        defaultSize: 20,
        defaultColor: '#78716c',
        editable: true,
        zIndex: 2
      }
    ]
  },

  // === ARTISTIC STYLES ===
  artistic: {
    id: 'artistic',
    name: 'Artistic Expression',
    category: 'Artistic',
    description: 'Bold colors and creative brushwork',
    width: 600,
    height: 900,
    backgroundColor: '#1a1a2e',
    regions: [
      {
        id: 'artwork',
        type: 'ai-image',
        x: 50,
        y: 80,
        width: 500,
        height: 450,
        prompt: 'abstract expressionist painting, bold sweeping brushstrokes, vibrant magenta cyan and purple, energetic emotional art',
        zIndex: 1
      },
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 600,
        width: 500,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Bebas Neue',
        defaultSize: 64,
        defaultColor: '#ffffff',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 700,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Inter',
        defaultSize: 18,
        defaultColor: '#a78bfa',
        editable: true,
        zIndex: 2
      }
    ]
  },

  watercolorDream: {
    id: 'watercolorDream',
    name: 'Watercolor Dream',
    category: 'Artistic',
    description: 'Soft watercolor washes',
    width: 600,
    height: 900,
    backgroundColor: '#fefefe',
    regions: [
      {
        id: 'watercolor',
        type: 'ai-image',
        x: 0,
        y: 0,
        width: 600,
        height: 900,
        prompt: 'soft watercolor washes in blush pink, soft blue and lavender, abstract dreamy clouds, gentle bleeding edges',
        opacity: 0.7,
        zIndex: 0
      },
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 400,
        width: 500,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Cormorant Garamond',
        defaultSize: 52,
        defaultColor: '#4a5568',
        fontStyle: 'italic',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 500,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Lora',
        defaultSize: 20,
        defaultColor: '#718096',
        editable: true,
        zIndex: 2
      }
    ]
  },

  // === HERITAGE STYLES ===
  heritage: {
    id: 'heritage',
    name: 'Heritage Classic',
    category: 'Heritage',
    description: 'Vintage ornate border design',
    width: 600,
    height: 900,
    backgroundColor: '#1c1917',
    regions: [
      {
        id: 'border',
        type: 'ai-image',
        x: 20,
        y: 20,
        width: 560,
        height: 860,
        prompt: 'ornate vintage decorative border frame, victorian flourishes and scrollwork, antique gold filigree on dark background, elegant classical design',
        zIndex: 1
      },
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 380,
        width: 450,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Cinzel',
        defaultSize: 44,
        defaultColor: '#d4a574',
        editable: true,
        zIndex: 2
      },
      {
        id: 'divider',
        type: 'shape',
        shape: 'ornament',
        x: 250,
        y: 450,
        width: 100,
        color: '#d4a574',
        zIndex: 2
      },
      {
        id: 'subtitle',
        type: 'text',
        x: 300,
        y: 500,
        width: 400,
        align: 'center',
        defaultText: 'A Family History',
        defaultFont: 'Cormorant Garamond',
        defaultSize: 24,
        defaultColor: '#a39080',
        fontStyle: 'italic',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 780,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Cinzel',
        defaultSize: 18,
        defaultColor: '#d4a574',
        editable: true,
        zIndex: 2
      }
    ]
  },

  antiqueBook: {
    id: 'antiqueBook',
    name: 'Antique Book',
    category: 'Heritage',
    description: 'Old leather book aesthetic',
    width: 600,
    height: 900,
    backgroundColor: '#3d2914',
    regions: [
      {
        id: 'texture',
        type: 'ai-image',
        x: 0,
        y: 0,
        width: 600,
        height: 900,
        prompt: 'old leather book texture, rich brown with gold tooling and embossed patterns, antique library aesthetic',
        opacity: 0.8,
        zIndex: 0
      },
      {
        id: 'centerPanel',
        type: 'shape',
        shape: 'rect',
        x: 80,
        y: 200,
        width: 440,
        height: 500,
        color: '#2a1f14',
        border: '2px solid #d4a574',
        zIndex: 1
      },
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 400,
        width: 400,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Cinzel',
        defaultSize: 42,
        defaultColor: '#d4a574',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 550,
        width: 380,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Cormorant Garamond',
        defaultSize: 22,
        defaultColor: '#c9a86c',
        editable: true,
        zIndex: 2
      }
    ]
  },

  // === MINIMAL STYLES ===
  pureText: {
    id: 'pureText',
    name: 'Pure Typography',
    category: 'Minimal',
    description: 'Text-only elegant design',
    width: 600,
    height: 900,
    backgroundColor: '#fafafa',
    regions: [
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 380,
        width: 500,
        align: 'center',
        defaultText: 'My Life Story',
        defaultFont: 'Playfair Display',
        defaultSize: 56,
        defaultColor: '#1a1a1a',
        editable: true,
        zIndex: 2
      },
      {
        id: 'line1',
        type: 'shape',
        shape: 'line',
        x: 150,
        y: 340,
        width: 300,
        height: 1,
        color: '#1a1a1a',
        zIndex: 1
      },
      {
        id: 'line2',
        type: 'shape',
        shape: 'line',
        x: 150,
        y: 470,
        width: 300,
        height: 1,
        color: '#1a1a1a',
        zIndex: 1
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 510,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Lora',
        defaultSize: 20,
        defaultColor: '#4a4a4a',
        editable: true,
        zIndex: 2
      }
    ]
  },

  colorBlock: {
    id: 'colorBlock',
    name: 'Color Block',
    category: 'Minimal',
    description: 'Bold solid color with minimal text',
    width: 600,
    height: 900,
    backgroundColor: '#0ea5e9',
    regions: [
      {
        id: 'title',
        type: 'text',
        x: 300,
        y: 400,
        width: 500,
        align: 'center',
        defaultText: 'MY LIFE STORY',
        defaultFont: 'Montserrat',
        defaultSize: 48,
        defaultColor: '#ffffff',
        fontWeight: '700',
        editable: true,
        zIndex: 2
      },
      {
        id: 'author',
        type: 'text',
        x: 300,
        y: 500,
        width: 400,
        align: 'center',
        defaultText: 'Author Name',
        defaultFont: 'Montserrat',
        defaultSize: 18,
        defaultColor: '#ffffff',
        editable: true,
        zIndex: 2
      }
    ],
    customizable: {
      backgroundColor: true,
      colorOptions: ['#0ea5e9', '#8b5cf6', '#ef4444', '#22c55e', '#f59e0b', '#ec4899', '#1a1a1a']
    }
  }
}

// Template categories for filtering
export const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates' },
  { id: 'Classic', name: 'Classic' },
  { id: 'Modern', name: 'Modern' },
  { id: 'Nature', name: 'Nature' },
  { id: 'Warm', name: 'Warm' },
  { id: 'Artistic', name: 'Artistic' },
  { id: 'Heritage', name: 'Heritage' },
  { id: 'Minimal', name: 'Minimal' }
]

// Available fonts for the editor
export const AVAILABLE_FONTS = [
  { name: 'Playfair Display', category: 'serif', weights: ['400', '500', '600', '700'] },
  { name: 'Lora', category: 'serif', weights: ['400', '500', '600', '700'] },
  { name: 'Cormorant Garamond', category: 'serif', weights: ['400', '500', '600', '700'] },
  { name: 'Cinzel', category: 'serif', weights: ['400', '500', '600', '700'] },
  { name: 'EB Garamond', category: 'serif', weights: ['400', '500', '600', '700'] },
  { name: 'Libre Baskerville', category: 'serif', weights: ['400', '700'] },
  { name: 'Inter', category: 'sans-serif', weights: ['400', '500', '600', '700'] },
  { name: 'Montserrat', category: 'sans-serif', weights: ['400', '500', '600', '700'] },
  { name: 'Poppins', category: 'sans-serif', weights: ['400', '500', '600', '700'] },
  { name: 'Bebas Neue', category: 'display', weights: ['400'] },
  { name: 'Oswald', category: 'display', weights: ['400', '500', '600', '700'] },
  { name: 'Dancing Script', category: 'script', weights: ['400', '500', '600', '700'] },
  { name: 'Great Vibes', category: 'script', weights: ['400'] }
]

// Color palettes for different moods
export const COLOR_PALETTES = {
  neutral: ['#1a1a1a', '#4a4a4a', '#717171', '#a3a3a3', '#ffffff'],
  warm: ['#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b'],
  cool: ['#0c4a6e', '#0369a1', '#0ea5e9', '#38bdf8', '#7dd3fc'],
  nature: ['#14532d', '#166534', '#22c55e', '#4ade80', '#86efac'],
  elegant: ['#1c1917', '#44403c', '#78716c', '#d4a574', '#f5e6d3'],
  vibrant: ['#7c3aed', '#ec4899', '#06b6d4', '#fbbf24', '#10b981'],
  heritage: ['#1c1917', '#7c2d12', '#b91c1c', '#d4a574', '#f5e6d3']
}

export default COVER_TEMPLATES
