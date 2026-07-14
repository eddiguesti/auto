/** Public product and entitlement contract. Prices are integer GBP pence. */
export const PRODUCTS = Object.freeze({
  export_style: {
    name: 'Style Your Memoir',
    description: 'Transform your writing with a consistent narrative style',
    price: 499,
    currency: 'gbp',
    type: 'style'
  },
  export_ebook: {
    name: 'eBook Export',
    description: 'Download your memoir as an EPUB eBook',
    price: 799,
    currency: 'gbp',
    type: 'export'
  },
  export_audiobook: {
    name: 'Audiobook Export',
    description: 'Download your memoir as an MP3 audiobook',
    price: 1499,
    currency: 'gbp',
    type: 'audiobook'
  },
  printed_book: {
    name: 'Printed Book',
    description: 'Four colour royal hardcover books in cloth, delivered to your door',
    price: 29900,
    currency: 'gbp',
    type: 'book'
  },
  premium_monthly: {
    name: 'Premium Monthly',
    description: 'Unlimited AI interviews and priority support',
    price: 999,
    currency: 'gbp',
    type: 'subscription',
    interval: 'month'
  },
  premium_yearly: {
    name: 'Premium Yearly',
    description: 'Unlimited AI interviews and priority support (two months free)',
    price: 9999,
    currency: 'gbp',
    type: 'subscription',
    interval: 'year'
  },
  premium_bundle: {
    name: 'Premium Bundle — Full Memoir + 4 Printed Books + Audiobook',
    description:
      '12 months access to all chapters, four colour royal hardcover books, audiobook, and phone interviews',
    price: 29900,
    currency: 'gbp',
    type: 'premium_bundle'
  },
  onboarding_bundle: {
    name: 'Welcome Bundle — Full Memoir + 4 Printed Books + Audiobook',
    description:
      '12 months access to all chapters, four colour royal hardcover books, audiobook, and phone interviews',
    price: 29900,
    currency: 'gbp',
    type: 'premium_bundle'
  }
})

export const priceInPounds = productId => PRODUCTS[productId].price / 100
