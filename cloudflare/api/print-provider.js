import { PRINT_PACKAGE } from '../../packages/shared/payment-catalog.js'
import { ApiError } from './errors.js'

export function printConfigurationReady(env) {
  let origin
  try {
    origin = new URL(env.PRINT_PUBLIC_API_URL)
  } catch {
    /* invalid below */
  }
  return Boolean(
    env.PRINT_CONFIGURATION_READY === 'true' &&
    env.PRINT_FULFILMENT_ENABLED === 'true' &&
    env.BOOKVAULT_API_KEY &&
    env.MEDIA &&
    env.PRINT_QUEUE?.send &&
    origin?.protocol === 'https:' &&
    !origin.username &&
    !origin.password &&
    origin.pathname === '/' &&
    !origin.search &&
    !origin.hash &&
    env.PRINT_FILE_SIGNING_SECRET?.length >= 32 &&
    Number.isInteger(Number(env.BOOKVAULT_TEXT_STOCK_ID)) &&
    Number(env.BOOKVAULT_TEXT_STOCK_ID) > 0 &&
    Number.isInteger(Number(env.BOOKVAULT_COVER_STOCK_ID)) &&
    Number(env.BOOKVAULT_COVER_STOCK_ID) > 0 &&
    Number(env.BOOKVAULT_FR_DECLARED_VALUE_GBP) > 0
  )
}
export function requirePrintConfiguration(env) {
  if (!printConfigurationReady(env))
    throw new ApiError(503, {
      error: 'Book printing is not configured for orders yet.',
      code: 'PRINT_UNAVAILABLE'
    })
}

export function validatePrintShipping(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new ApiError(400, { error: 'Please enter your delivery address.' })
  const address = {}
  for (const [field, limit] of Object.entries({
    addressee: 200,
    address1: 200,
    address2: 250,
    town: 99,
    county: 200,
    postCode: 99,
    email: 120,
    telNumber: 35
  })) {
    const value = input[field] ?? ''
    if (
      typeof value !== 'string' ||
      value.length > limit ||
      [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
    )
      throw new ApiError(400, { error: 'Please check your delivery address.' })
    address[field] = value.trim()
  }
  address.countryCode = input.countryCode
  if (!['GB', 'FR'].includes(address.countryCode))
    throw new ApiError(400, { error: 'Delivery is included to the UK and France only.' })
  if (
    !address.addressee ||
    !address.address1 ||
    !address.town ||
    !address.postCode ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)
  )
    throw new ApiError(400, { error: 'Name, address, town, postcode and email are required.' })
  if (address.countryCode === 'FR' && !/^\d{5}$/.test(address.postCode))
    throw new ApiError(400, { error: 'Enter a five-digit French postcode.' })
  return address
}

export async function boundedProviderJson(response, limit = 1024 * 1024) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Empty provider response')
  const chunks = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw new Error('Provider response too large')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

export function nativeBookvault(env) {
  async function request(path, body) {
    try {
      if (!env.BOOKVAULT_API_KEY) throw new Error('Missing key')
      const provider = env.BOOKVAULT_FETCH || { fetch }
      const response = await provider.fetch(`https://api.bookvault.app/v4${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          'x-bookvault-api-key': env.BOOKVAULT_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(30000),
        redirect: 'manual'
      })
      if (response.status === 404 && !body) return null
      if (!response.ok) throw new Error('Provider response failed')
      return await boundedProviderJson(response)
    } catch {
      throw new ApiError(502, {
        error: 'The printer could not confirm this request.',
        code: 'PRINT_PROVIDER_FAILED'
      })
    }
  }
  return {
    async specification(pageCount, colourPages) {
      if (
        !Number.isInteger(pageCount) ||
        pageCount < 32 ||
        pageCount > 200 ||
        pageCount % 4 ||
        !Number.isInteger(colourPages) ||
        colourPages < 0 ||
        colourPages > 8
      )
        throw new ApiError(400, { error: 'This proof does not fit the purchased print package.' })
      const spec = PRINT_PACKAGE
      const [product, sku] = await Promise.all([
        request('/title/calculate?calculationType=Full', {
          specifications: {
            monoPages: pageCount - colourPages,
            colourPages,
            binding: spec.binding,
            dimensions: { height: spec.height, width: spec.width, unit: 'Millimeter' },
            stocks: {
              textStock: Number(env.BOOKVAULT_TEXT_STOCK_ID),
              coverStock: Number(env.BOOKVAULT_COVER_STOCK_ID)
            },
            lamination: spec.lamination,
            premium: false
          }
        }),
        request('/order/transientsku', {
          stockWeight: spec.paperWeight,
          coated: true,
          creamy: false,
          lamination: spec.lamination,
          binding: spec.binding,
          height: spec.height,
          width: spec.width
        })
      ])
      const sizing = product?.specifications?.coverSizing,
        spine = Number(product?.specifications?.spine)
      if (
        !sizing ||
        !Number.isFinite(sizing.expectedWidth) ||
        !Number.isFinite(sizing.expectedHeight) ||
        sizing.expectedWidth < 296 ||
        sizing.expectedWidth > 600 ||
        sizing.expectedHeight < 210 ||
        sizing.expectedHeight > 400 ||
        !Number.isFinite(spine) ||
        spine < 0 ||
        spine > 80 ||
        typeof sku?.sku !== 'string' ||
        !sku.sku ||
        sku.sku.length > 250
      )
        throw new ApiError(502, {
          error: 'The printer returned an invalid book specification.',
          code: 'INVALID_PRINT_SPECIFICATION'
        })
      return { sku: sku.sku, coverSizing: sizing, spine }
    },
    async find(reference) {
      const result = await request(`/order?type=DocRef&value=${encodeURIComponent(reference)}`)
      if (result && (result.identification?.docRef !== reference || !result.identification?.podRef))
        throw new ApiError(502, {
          error: 'The printer returned a mismatched order.',
          code: 'INVALID_PRINT_ORDER'
        })
      return result
    },
    async submit(order, urls) {
      const payload = {
        docRef: `EM-${order.id}`,
        address: order.shipping_address,
        productionLevel: 'Standard',
        partner: 'Bookvault_UK',
        dispatchRequest: { requestedService: 'CheapestTracked' },
        orderLines: [
          {
            lineNumber: 1,
            quantity: PRINT_PACKAGE.quantity,
            transient: {
              productSku: order.product_sku,
              monoPages: order.page_count - order.colour_pages,
              colourPages: order.colour_pages,
              lineTitle: order.title,
              files: { cover: urls.cover, text: urls.text }
            }
          }
        ]
      }
      if (order.shipping_address.countryCode === 'FR') {
        const declaredValue = Number(env.BOOKVAULT_FR_DECLARED_VALUE_GBP)
        if (!(declaredValue > 0))
          throw new ApiError(503, {
            error: 'French shipment customs configuration is unavailable.'
          })
        payload.customsDeclaration = {
          declaredValue,
          hsCode: env.BOOKVAULT_HS_CODE || '49019900',
          useIOSS: false,
          incoTerms: 'DDP'
        }
      }
      const result = await request('/order', payload)
      if (!result?.podRef || String(result.podRef).length > 200)
        throw new ApiError(502, {
          error: 'The printer did not confirm an order reference.',
          code: 'INVALID_PRINT_ORDER'
        })
      return String(result.podRef)
    }
  }
}
