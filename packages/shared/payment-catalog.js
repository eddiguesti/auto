// Product prices (in pence for Stripe GBP)
const definitions = {
  export_style: {
    name: 'Style Your Memoir',
    description: 'Transform your writing in the style of famous authors',
    price: 499, // £4.99
    currency: 'gbp',
    type: 'style'
  },
  export_ebook: {
    name: 'eBook Export',
    description: 'Download your memoir as an EPUB eBook',
    price: 799, // £7.99
    currency: 'gbp',
    type: 'export'
  },
  export_audiobook: {
    name: 'Audiobook Export',
    description: 'Download your memoir as an MP3 audiobook',
    price: 1499, // £14.99
    currency: 'gbp',
    type: 'audiobook'
  },
  printed_book: {
    name: '10 Hardback Memoirs',
    description:
      'The complete memoir package: 12 months of access, audiobook and phone interviews, plus 10 A5 matte hardbacks. Up to 200 pages with 8 colour photo pages; UK or France delivery included.',
    price: 25000,
    currency: 'gbp',
    type: 'premium_bundle'
  },
  premium_monthly: {
    name: 'Premium Monthly',
    description: 'Unlimited AI interviews, priority support',
    price: 999, // £9.99/month
    currency: 'gbp',
    type: 'subscription',
    interval: 'month'
  },
  premium_yearly: {
    name: 'Premium Yearly',
    description: 'Unlimited AI interviews, priority support (2 months free)',
    price: 9999, // £99.99/year
    currency: 'gbp',
    type: 'subscription',
    interval: 'year'
  },
  premium_bundle: {
    name: 'Complete Memoir — 10 Hardbacks + Audiobook',
    description:
      '12 months access to all chapters, audiobook and phone interviews, plus 10 A5 matte hardbacks. Up to 200 pages with 8 colour photo pages; delivery to one UK or French address included.',
    price: 25000,
    currency: 'gbp',
    type: 'premium_bundle'
  },
  onboarding_bundle: {
    name: 'Welcome Bundle — 10 Hardbacks + Audiobook',
    description:
      '12 months access to all chapters, audiobook and phone interviews, plus 10 A5 matte hardbacks. Up to 200 pages with 8 colour photo pages; delivery to one UK or French address included.',
    price: 25000,
    currency: 'gbp',
    type: 'premium_bundle' // Same type so webhook activates premium identically
  }
}

export const PRINT_PACKAGE = Object.freeze({
  version: 'hardback-10-250-v1',
  quantity: 10,
  price: 25000,
  currency: 'gbp',
  maxPages: 200,
  maxPhotos: 8,
  width: 148,
  height: 210,
  paperWeight: 115,
  binding: 'CasePPC',
  lamination: 'Matte'
})

export const isPrintProduct = id =>
  ['printed_book', 'premium_bundle', 'onboarding_bundle'].includes(id)

// Freeze authoritative purchase definitions; each public response gets fresh rows.
export const PRODUCTS = Object.freeze(
  Object.fromEntries(
    Object.entries(definitions).map(([id, product]) => [id, Object.freeze(product)])
  )
)

export function getPublicProducts() {
  return Object.entries(PRODUCTS).map(([id, product]) => ({
    id,
    ...product,
    checkoutAvailable: product.type !== 'subscription',
    displayPrice: (product.price / 100).toFixed(2)
  }))
}
