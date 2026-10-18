import { useQuery } from '@tanstack/react-query'
import { API_URL } from '../../../config'

export async function fetchProductCatalog({ signal } = {}) {
  const response = await fetch(`${API_URL}/api/payments/products`, { signal })
  if (!response.ok) throw new Error('The available plans could not be loaded. Please try again.')
  const products = await response.json()
  if (!Array.isArray(products))
    throw new Error('The pricing information is unavailable. Please try again.')
  return products.filter(
    product =>
      typeof product.id === 'string' &&
      typeof product.name === 'string' &&
      Number.isSafeInteger(product.price) &&
      product.price >= 0 &&
      /^[a-z]{3}$/i.test(product.currency)
  )
}

export function useProductCatalog() {
  return useQuery({
    queryKey: ['payments', 'products'],
    queryFn: fetchProductCatalog,
    staleTime: 5 * 60 * 1000
  })
}

export function formatProductPrice(product) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: product.currency.toUpperCase(),
    minimumFractionDigits: product.price % 100 ? 2 : 0
  }).format(product.price / 100)
}
