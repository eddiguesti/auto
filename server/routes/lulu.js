import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = Router()

// Lulu API configuration
const LULU_API_URL = process.env.LULU_SANDBOX === 'true'
  ? 'https://api.sandbox.lulu.com'
  : 'https://api.lulu.com'
const TOKEN_URL = 'https://api.lulu.com/auth/realms/glasstree/protocol/openid-connect/token'

// Cache for access token
let accessToken = null
let tokenExpiry = null

// Get Lulu access token using OAuth2 client credentials
async function getAccessToken() {
  // Return cached token if still valid (with 60s buffer)
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return accessToken
  }

  const clientKey = process.env.LULU_CLIENT_KEY
  const clientSecret = process.env.LULU_CLIENT_SECRET

  if (!clientKey || !clientSecret) {
    throw new Error('LULU_CLIENT_KEY and LULU_CLIENT_SECRET must be set')
  }

  const credentials = Buffer.from(`${clientKey}:${clientSecret}`).toString('base64')

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: 'grant_type=client_credentials'
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Lulu access token: ${error}`)
  }

  const data = await response.json()
  accessToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in * 1000)

  return accessToken
}

// Make authenticated request to Lulu API
async function luluRequest(endpoint, options = {}) {
  const token = await getAccessToken()

  const response = await fetch(`${LULU_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Lulu API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// ============================================
// BOOK CUSTOMIZATION OPTIONS (50+ options)
// ============================================

// All available trim sizes
const TRIM_SIZES = [
  { id: '0425X0687', name: 'Pocket (4.25" x 6.87")', width: 4.25, height: 6.87 },
  { id: '0500X0800', name: 'Digest (5" x 8")', width: 5, height: 8 },
  { id: '0550X0850', name: 'US Trade (5.5" x 8.5")', width: 5.5, height: 8.5 },
  { id: '0600X0900', name: 'US Trade (6" x 9")', width: 6, height: 9, popular: true },
  { id: '0700X1000', name: 'Crown Quarto (7" x 10")', width: 7, height: 10 },
  { id: '0750X0925', name: 'Royal (7.5" x 9.25")', width: 7.5, height: 9.25 },
  { id: '0825X1075', name: 'Executive (8.25" x 10.75")', width: 8.25, height: 10.75 },
  { id: '0850X0850', name: 'Square (8.5" x 8.5")', width: 8.5, height: 8.5 },
  { id: '0850X1100', name: 'US Letter (8.5" x 11")', width: 8.5, height: 11, popular: true },
  { id: '0827X1169', name: 'A4 (8.27" x 11.69")', width: 8.27, height: 11.69 },
  { id: '1100X0850', name: 'US Letter Landscape (11" x 8.5")', width: 11, height: 8.5 },
  { id: '1200X1200', name: 'Large Square (12" x 12")', width: 12, height: 12 },
  { id: '0500X0700', name: 'Small Digest (5" x 7")', width: 5, height: 7 },
  { id: '0585X0827', name: 'A5 (5.85" x 8.27")', width: 5.85, height: 8.27 },
  { id: '0650X0650', name: 'Small Square (6.5" x 6.5")', width: 6.5, height: 6.5 }
]

// Print color options
const PRINT_COLORS = [
  { id: 'BW', name: 'Black & White', description: 'Economical for text-heavy books' },
  { id: 'FC', name: 'Full Color', description: 'Vivid colors for photos and illustrations', popular: true }
]

// Print quality options
const PRINT_QUALITY = [
  { id: 'STD', name: 'Standard', description: 'Great quality at the best price', popular: true },
  { id: 'PRE', name: 'Premium', description: 'Enhanced quality for special projects' }
]

// Binding types
const BINDING_TYPES = [
  { id: 'PB', name: 'Perfect Bound (Paperback)', description: 'Classic softcover with glued spine', popular: true },
  { id: 'CW', name: 'Case Wrap (Hardcover)', description: 'Premium hardcover with printed cover' },
  { id: 'DJ', name: 'Dust Jacket (Hardcover)', description: 'Hardcover with removable printed jacket' },
  { id: 'LW', name: 'Linen Wrap (Hardcover)', description: 'Elegant cloth-covered hardcover' },
  { id: 'CO', name: 'Coil Bound', description: 'Spiral binding, lays flat' },
  { id: 'SS', name: 'Saddle Stitch', description: 'Stapled binding for booklets' },
  { id: 'WI', name: 'Wire-O', description: 'Wire binding, lays flat' }
]

// Paper types
const PAPER_TYPES = [
  { id: '060UW', name: '60# Uncoated White', weight: 60, coated: false, color: 'white', description: 'Standard book paper', popular: true },
  { id: '070UW', name: '70# Uncoated White', weight: 70, coated: false, color: 'white', description: 'Slightly heavier' },
  { id: '080UW', name: '80# Uncoated White', weight: 80, coated: false, color: 'white', description: 'Premium weight' },
  { id: '050UC', name: '50# Uncoated Cream', weight: 50, coated: false, color: 'cream', description: 'Classic cream tone' },
  { id: '060UC', name: '60# Uncoated Cream', weight: 60, coated: false, color: 'cream', description: 'Warm classic feel', popular: true },
  { id: '070UC', name: '70# Uncoated Cream', weight: 70, coated: false, color: 'cream', description: 'Premium cream' },
  { id: '080CW', name: '80# Coated White', weight: 80, coated: true, color: 'white', description: 'Glossy photo paper' },
  { id: '100CW', name: '100# Coated White', weight: 100, coated: true, color: 'white', description: 'Heavy glossy paper' },
  { id: '070CW', name: '70# Coated White', weight: 70, coated: true, color: 'white', description: 'Standard glossy' },
  { id: '060CW', name: '60# Coated White', weight: 60, coated: true, color: 'white', description: 'Light glossy' }
]

// Pages per inch (PPI) - affects book thickness
const PPI_OPTIONS = [
  { id: '444', name: 'Standard (444 PPI)', description: 'Standard bulk' },
  { id: '382', name: 'Thick (382 PPI)', description: 'Fuller, thicker book' },
  { id: '504', name: 'Thin (504 PPI)', description: 'Compact, thinner book' }
]

// Cover finishes
const COVER_FINISHES = [
  { id: 'M', name: 'Matte', description: 'Smooth, non-reflective finish', popular: true },
  { id: 'G', name: 'Gloss', description: 'Shiny, vibrant finish' },
  { id: 'U', name: 'Uncoated', description: 'Natural paper texture' }
]

// Linen colors (for linen wrap hardcovers)
const LINEN_COLORS = [
  { id: 'X', name: 'None', description: 'No linen (for non-linen bindings)' },
  { id: 'N', name: 'Navy', description: 'Classic navy blue' },
  { id: 'G', name: 'Gray', description: 'Elegant gray' },
  { id: 'R', name: 'Red', description: 'Bold red' },
  { id: 'B', name: 'Black', description: 'Classic black' },
  { id: 'T', name: 'Tan', description: 'Warm tan' },
  { id: 'F', name: 'Forest', description: 'Forest green' },
  { id: 'W', name: 'White', description: 'Clean white' },
  { id: 'Y', name: 'Burgundy', description: 'Rich burgundy' },
  { id: 'P', name: 'Purple', description: 'Royal purple' }
]

// Foil stamping options (for hardcovers)
const FOIL_OPTIONS = [
  { id: 'X', name: 'None', description: 'No foil stamping' },
  { id: 'G', name: 'Gold', description: 'Gold foil', popular: true },
  { id: 'S', name: 'Silver', description: 'Silver foil' },
  { id: 'B', name: 'Black', description: 'Black foil' },
  { id: 'W', name: 'White', description: 'White foil' },
  { id: 'C', name: 'Copper', description: 'Copper foil' },
  { id: 'R', name: 'Rose Gold', description: 'Rose gold foil' }
]

// Shipping levels
const SHIPPING_LEVELS = [
  { id: 'MAIL', name: 'Standard Mail', description: 'Most economical', days: '10-15 business days' },
  { id: 'GROUND', name: 'Ground', description: 'Reliable ground shipping', days: '5-10 business days' },
  { id: 'EXPEDITED', name: 'Expedited', description: 'Faster delivery', days: '3-5 business days' },
  { id: 'EXPRESS', name: 'Express', description: 'Fastest option', days: '1-3 business days' }
]

// Countries for shipping
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ZA', name: 'South Africa' }
]

// Build pod_package_id from selected options
function buildPodPackageId(options) {
  const {
    trimSize = '0600X0900',
    color = 'FC',
    quality = 'STD',
    binding = 'PB',
    paper = '060UW',
    ppi = '444',
    finish = 'M',
    linen = 'X',
    foil = 'X'
  } = options

  return `${trimSize}${color}${quality}${binding}${paper}${ppi}${finish}${linen}${foil}`
}

// ============================================
// API ENDPOINTS
// ============================================

// Get all available options for book customization
router.get('/options', (req, res) => {
  res.json({
    trimSizes: TRIM_SIZES,
    printColors: PRINT_COLORS,
    printQuality: PRINT_QUALITY,
    bindingTypes: BINDING_TYPES,
    paperTypes: PAPER_TYPES,
    ppiOptions: PPI_OPTIONS,
    coverFinishes: COVER_FINISHES,
    linenColors: LINEN_COLORS,
    foilOptions: FOIL_OPTIONS,
    shippingLevels: SHIPPING_LEVELS,
    countries: COUNTRIES,
    // Recommended combinations for autobiographies
    recommended: {
      memoir: {
        trimSize: '0600X0900',
        color: 'FC',
        quality: 'STD',
        binding: 'PB',
        paper: '060UC',
        ppi: '444',
        finish: 'M',
        linen: 'X',
        foil: 'X',
        description: 'Classic 6x9 paperback on cream paper - perfect for memoirs'
      },
      premium: {
        trimSize: '0600X0900',
        color: 'FC',
        quality: 'STD',
        binding: 'CW',
        paper: '080CW',
        ppi: '444',
        finish: 'G',
        linen: 'X',
        foil: 'X',
        description: 'Hardcover with glossy photo paper - premium keepsake'
      },
      photoBook: {
        trimSize: '0850X1100',
        color: 'FC',
        quality: 'STD',
        binding: 'CW',
        paper: '100CW',
        ppi: '444',
        finish: 'G',
        linen: 'X',
        foil: 'X',
        description: 'Large format hardcover - ideal for photo-heavy stories'
      },
      heirloom: {
        trimSize: '0600X0900',
        color: 'FC',
        quality: 'PRE',
        binding: 'LW',
        paper: '080CW',
        ppi: '444',
        finish: 'M',
        linen: 'N',
        foil: 'G',
        description: 'Navy linen with gold foil - elegant family heirloom'
      }
    }
  })
})

// Calculate print job cost
router.post('/calculate-cost', asyncHandler(async (req, res) => {
  const { options, pageCount, quantity = 1, shippingAddress } = req.body

  const podPackageId = buildPodPackageId(options)

  const payload = {
    line_items: [{
      page_count: pageCount,
      pod_package_id: podPackageId,
      quantity: quantity
    }]
  }

  // Add shipping info if provided for accurate shipping cost
  if (shippingAddress) {
    payload.shipping_address = {
      country_code: shippingAddress.countryCode || 'US'
    }
  }

  const result = await luluRequest('/print-job-cost-calculations/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  res.json({
    podPackageId,
    costs: result,
    breakdown: {
      printing: result.line_item_costs?.[0]?.cost_excl_tax || 0,
      shipping: result.shipping_cost?.cost_excl_tax || 0,
      tax: result.total_tax || 0,
      total: result.total_cost_incl_tax || 0
    }
  })
}))

// Create print job order
router.post('/create-order', asyncHandler(async (req, res) => {
  const {
    options,
    pageCount,
    quantity = 1,
    interiorPdfUrl,
    coverPdfUrl,
    shippingAddress,
    shippingLevel = 'MAIL',
    externalId
  } = req.body

  const podPackageId = buildPodPackageId(options)

  const payload = {
    contact_email: shippingAddress.email,
    external_id: externalId || `lifestory-${Date.now()}`,
    line_items: [{
      external_id: `book-${Date.now()}`,
      printable_normalization: {
        cover: { source_url: coverPdfUrl },
        interior: { source_url: interiorPdfUrl }
      },
      page_count: pageCount,
      pod_package_id: podPackageId,
      quantity: quantity,
      title: shippingAddress.bookTitle || 'My Life Story'
    }],
    production_delay: 120, // 2 minutes delay to allow cancellation
    shipping_address: {
      city: shippingAddress.city,
      country_code: shippingAddress.countryCode,
      name: shippingAddress.name,
      phone_number: shippingAddress.phone || '',
      postcode: shippingAddress.postcode,
      state_code: shippingAddress.stateCode || '',
      street1: shippingAddress.street1,
      street2: shippingAddress.street2 || ''
    },
    shipping_level: shippingLevel
  }

  const result = await luluRequest('/print-jobs/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  res.json({
    success: true,
    orderId: result.id,
    status: result.status,
    trackingUrl: result.status?.messages?.tracking_url,
    order: result
  })
}))

// Get order status
router.get('/order/:orderId', asyncHandler(async (req, res) => {
  const { orderId } = req.params

  const result = await luluRequest(`/print-jobs/${orderId}/`)

  res.json({
    orderId: result.id,
    status: result.status?.name,
    statusMessage: result.status?.message,
    trackingUrl: result.status?.messages?.tracking_url,
    estimatedShipDate: result.estimated_shipping_dates?.arrival_min,
    order: result
  })
}))

// Get list of orders
router.get('/orders', asyncHandler(async (req, res) => {
  const result = await luluRequest('/print-jobs/')
  res.json(result)
}))

// Cancel order (only within production delay window)
router.post('/order/:orderId/cancel', asyncHandler(async (req, res) => {
  const { orderId } = req.params

  await luluRequest(`/print-jobs/${orderId}/`, {
    method: 'DELETE'
  })

  res.json({ success: true, message: 'Order cancelled' })
}))

// Validate interior PDF
router.post('/validate-interior', asyncHandler(async (req, res) => {
  const { pdfUrl, podPackageId } = req.body

  const result = await luluRequest('/print-job-normalized-files/', {
    method: 'POST',
    body: JSON.stringify({
      pod_package_id: podPackageId,
      source_files: [{ type: 'INTERIOR', url: pdfUrl }]
    })
  })

  res.json(result)
}))

// Validate cover PDF
router.post('/validate-cover', asyncHandler(async (req, res) => {
  const { pdfUrl, podPackageId, pageCount } = req.body

  const result = await luluRequest('/print-job-normalized-files/', {
    method: 'POST',
    body: JSON.stringify({
      pod_package_id: podPackageId,
      page_count: pageCount,
      source_files: [{ type: 'COVER', url: pdfUrl }]
    })
  })

  res.json(result)
}))

// Health check for Lulu integration
router.get('/health', asyncHandler(async (req, res) => {
  await getAccessToken()
  res.json({ status: 'ok', message: 'Lulu API connection successful' })
}))

export default router
