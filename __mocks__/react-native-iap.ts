/**
 * Mock for react-native-iap
 * Used for testing and web builds
 */

export const initConnection = jest.fn().mockResolvedValue(true)
export const endConnection = jest.fn().mockResolvedValue(true)

export const getSubscriptions = jest.fn().mockResolvedValue([
  {
    productId: 'BlueFlyMonthlyTerm',
    title: 'BlueFly Monthly',
    description: 'Monthly subscription with 7-day free trial',
    price: '2.99',
    currency: 'USD',
    localizedPrice: '$2.99',
  },
  {
    productId: 'BlueFlyQuarterlyTerm',
    title: 'BlueFly Quarterly',
    description: 'Quarterly subscription with 7-day free trial - Best value!',
    price: '6.99',
    currency: 'USD',
    localizedPrice: '$6.99',
  },
])

export const getAvailablePurchases = jest.fn().mockResolvedValue([])

export const requestSubscription = jest.fn().mockResolvedValue({
  productId: 'BlueFlyMonthlyTerm',
  transactionId: 'mock-transaction-id',
  transactionDate: Date.now(),
  transactionReceipt: 'mock-receipt',
  purchaseToken: 'mock-purchase-token',
})

export const flushFailedPurchasesCachedAsPendingAndroid = jest
  .fn()
  .mockResolvedValue(true)

export const purchaseUpdatedListener = jest.fn().mockReturnValue({
  remove: jest.fn(),
})

export const purchaseErrorListener = jest.fn().mockReturnValue({
  remove: jest.fn(),
})

export const finishTransaction = jest.fn().mockResolvedValue(true)
export const acknowledgePurchaseAndroid = jest.fn().mockResolvedValue(true)

export type ProductPurchase = {
  productId: string
  transactionId: string
  transactionDate: number
  transactionReceipt: string
  purchaseToken: string
}

export type PurchaseError = {
  message: string
  code: string
  productId?: string
}

export type Subscription = {
  productId: string
  title: string
  description: string
  price: string
  currency: string
  localizedPrice: string
}
