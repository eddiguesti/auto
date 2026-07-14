export interface Product {
  name: string
  description: string
  price: number
  currency: 'gbp'
  type: string
  interval?: 'month' | 'year'
}

export const PRODUCTS: Readonly<Record<string, Product>>
export function priceInPounds(productId: string): number
