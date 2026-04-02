// Linen color map — used by BookMockup and ColorSwatch
export const LINEN_COLOR_MAP = {
  N: '#1e3a5f',
  G: '#6b7280',
  R: '#991b1b',
  B: '#1f2937',
  T: '#a8896c',
  F: '#166534',
  W: '#f5f5f4',
  Y: '#7c2d12',
  P: '#581c87'
}

// Foil solid-color map — used by BookMockup
export const FOIL_COLOR_MAP = {
  G: '#d4af37',
  S: '#c0c0c0',
  B: '#1f2937',
  W: '#ffffff',
  C: '#b87333',
  R: '#e8b4b8'
}

// Foil gradient map — used by ColorSwatch (some entries are CSS gradients)
export const FOIL_SWATCH_MAP = {
  X: 'transparent',
  G: 'linear-gradient(135deg, #d4af37, #f4e4a3, #d4af37)',
  S: 'linear-gradient(135deg, #c0c0c0, #f0f0f0, #c0c0c0)',
  B: '#1f2937',
  W: '#ffffff',
  C: 'linear-gradient(135deg, #b87333, #daa06d, #b87333)',
  R: 'linear-gradient(135deg, #e8b4b8, #f5d4d7, #e8b4b8)'
}

// Hardcover binding IDs
export const HARDCOVER_BINDINGS = ['CW', 'DJ', 'LW']

// Bulk-discount quick-select presets
export const QUANTITY_PRESETS = [
  { qty: 1, label: '1 Book', discount: null },
  { qty: 3, label: '3 Books', discount: '5%' },
  { qty: 5, label: '5 Books', discount: '15%' },
  { qty: 10, label: '10 Books', discount: '40%', popular: true },
  { qty: 25, label: '25 Books', discount: '45%' },
  { qty: 50, label: '50 Books', discount: '50%' }
]

// Discount tier table (used in QuantitySelector info panel)
export const DISCOUNT_TIERS = [
  { min: 1, max: 2, discount: '0%' },
  { min: 3, max: 4, discount: '5%' },
  { min: 5, max: 9, discount: '15%' },
  { min: 10, max: 24, discount: '40%', highlight: true },
  { min: 25, max: 49, discount: '45%' },
  { min: 50, max: '+', discount: '50%' }
]

// Default book configuration
export const DEFAULT_CONFIG = {
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
}

// Preset icons mapping key
export const PRESET_ICON_KEYS = ['memoir', 'premium', 'photoBook', 'gift']

/**
 * Returns a human-readable savings label for the given quantity.
 * Returns an empty string when no discount applies.
 */
export function getSavingsLabel(quantity) {
  if (quantity >= 50) return '50% savings!'
  if (quantity >= 25) return '45% savings!'
  if (quantity >= 10) return '40% savings!'
  if (quantity >= 5) return '15% savings!'
  if (quantity >= 3) return '5% savings!'
  return ''
}
