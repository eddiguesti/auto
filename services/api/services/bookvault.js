import { PRINT_PACKAGE } from '../../../packages/shared/payment-catalog.js'
import { ServiceUnavailableError, ValidationError } from '../utils/errors.js'
import { isR2Available } from '../utils/r2.js'

// v4 schemas checked against https://api.bookvault.app/swagger/docs/v4.
const API = 'https://api.bookvault.app/v4'
export function printConfigurationReady(env = process.env) {
  return Boolean(
    env.BOOKVAULT_API_KEY &&
    /^https:\/\//.test(env.PRINT_PUBLIC_API_URL || '') &&
    env.PRINT_FILE_SIGNING_SECRET?.length >= 32 &&
    Number(env.BOOKVAULT_TEXT_STOCK_ID) > 0 &&
    Number(env.BOOKVAULT_COVER_STOCK_ID) > 0 &&
    Number(env.BOOKVAULT_FR_DECLARED_VALUE_GBP) > 0 &&
    env.PRINT_FULFILMENT_ENABLED === 'true' &&
    isR2Available()
  )
}

export function requirePrintConfiguration() {
  if (!printConfigurationReady()) throw new ServiceUnavailableError('Book printing')
}

export function validateShipping(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new ValidationError('Please enter your delivery address.')
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
      [...value].some(character => character.charCodeAt(0) < 32)
    )
      throw new ValidationError('Please check your delivery address.')
    address[field] = value.trim()
  }
  address.countryCode = input.countryCode
  if (!['GB', 'FR'].includes(address.countryCode))
    throw new ValidationError('Delivery is included to the UK and France only.')
  if (
    !address.addressee ||
    !address.address1 ||
    !address.town ||
    !address.postCode ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)
  )
    throw new ValidationError('Name, address, town, postcode and email are required.')
  if (address.countryCode === 'FR' && !/^\d{5}$/.test(address.postCode))
    throw new ValidationError('Enter a five-digit French postcode.')
  return address
}

export function createBookvaultClient({ fetcher = fetch, env = process.env } = {}) {
  async function request(path, body) {
    if (!env.BOOKVAULT_API_KEY) throw new ServiceUnavailableError('Book printing')
    const response = await fetcher(`${API}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'x-bookvault-api-key': env.BOOKVAULT_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000)
    })
    if (response.status === 404 && !body) return null
    if (!response.ok) {
      const error = new Error(`Bookvault request failed (${response.status})`)
      error.providerStatus = response.status
      throw error
    }
    return response.json()
  }
  return {
    async specification(pageCount, colourPages) {
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
      const sizing = product?.specifications?.coverSizing
      if (
        !sku?.sku ||
        !sizing ||
        sizing.expectedWidth < 296 ||
        sizing.expectedHeight < 210 ||
        sizing.expectedWidth > 600 ||
        sizing.expectedHeight > 400
      )
        throw new Error('Bookvault returned an invalid cover specification')
      return { sku: sku.sku, coverSizing: sizing, spine: product.specifications.spine }
    },
    async find(reference) {
      const result = await request(`/order?type=DocRef&value=${encodeURIComponent(reference)}`)
      if (result && (!result.identification?.podRef || result.identification.docRef !== reference))
        throw new Error('Bookvault returned an invalid order lookup')
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
      // DDP makes the seller responsible for import charges; customer total stays £250.
      // Declared physical shipment value must be configured by the merchant, not guessed.
      if (order.shipping_address.countryCode === 'FR') {
        const declaredValue = Number(env.BOOKVAULT_FR_DECLARED_VALUE_GBP)
        if (!(declaredValue > 0)) throw new Error('French shipment customs value is not configured')
        payload.customsDeclaration = {
          declaredValue,
          hsCode: env.BOOKVAULT_HS_CODE || '49019900',
          useIOSS: false,
          incoTerms: 'DDP'
        }
      }
      const result = await request('/order', payload)
      if (!result.podRef) throw new Error('Bookvault did not return an order reference')
      return String(result.podRef)
    }
  }
}

export const bookvault = createBookvaultClient()
