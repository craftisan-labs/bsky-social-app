/**
 * IAP Context Provider for BlueFly
 *
 * Provides subscription state and actions throughout the app
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {Platform} from 'react-native'
import {MMKV} from '@bsky.app/react-native-mmkv'

import {logger} from '#/logger'

import {
  amazonIAP,
  type SubscriptionProduct,
  type SubscriptionStatus,
  type SubscriptionTier,
} from './amazon'
import {setSubscriptionStatus as setPaywallSubscriptionStatus} from './PaywallState'

// MMKV storage for subscription data
const subscriptionStorage = new MMKV({id: 'bluefly-subscription'})

// =============================================================================
// Types
// =============================================================================

interface IAPContextType {
  // State
  isInitialized: boolean
  isLoading: boolean
  subscriptionStatus: SubscriptionStatus
  products: SubscriptionProduct[]
  error: string | null

  // Actions
  purchaseSubscription: (productId: string) => Promise<boolean>
  restorePurchases: () => Promise<boolean>
  refreshStatus: () => Promise<void>
}

const defaultSubscriptionStatus: SubscriptionStatus = {
  isSubscribed: false,
  tier: 'free',
  expirationDate: null,
  isTrialPeriod: false,
  autoRenewing: false,
}

const IAPContext = createContext<IAPContextType>({
  isInitialized: false,
  isLoading: false,
  subscriptionStatus: defaultSubscriptionStatus,
  products: [],
  error: null,
  purchaseSubscription: async () => false,
  restorePurchases: async () => false,
  refreshStatus: async () => {},
})

// =============================================================================
// Provider
// =============================================================================

export function IAPProvider({children}: {children: React.ReactNode}) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>(defaultSubscriptionStatus)
  const [products, setProducts] = useState<SubscriptionProduct[]>([])
  const [error, setError] = useState<string | null>(null)

  // Initialize IAP on mount
  useEffect(() => {
    if (Platform.OS !== 'android') {
      logger.info('IAP not available on this platform')
      return
    }

    const initIAP = async () => {
      setIsLoading(true)
      try {
        const success = await amazonIAP.init()
        if (success) {
          setIsInitialized(true)
          setProducts(amazonIAP.getProducts())
          setSubscriptionStatus(amazonIAP.getSubscriptionStatus())

          // Persist subscription status
          persistSubscriptionStatus(amazonIAP.getSubscriptionStatus())
        }
      } catch (e: any) {
        logger.error('Failed to initialize IAP', {error: e})
        setError(e.message || 'Failed to initialize purchases')
      } finally {
        setIsLoading(false)
      }
    }

    // Load cached subscription status first
    loadCachedSubscriptionStatus()

    // Then initialize IAP
    initIAP()

    // Cleanup on unmount
    return () => {
      amazonIAP.endConnection()
    }
  }, [])

  // Load cached subscription status from MMKV storage
  const loadCachedSubscriptionStatus = useCallback(() => {
    try {
      const cachedJson = subscriptionStorage.getString('status')
      if (cachedJson) {
        const cached = JSON.parse(cachedJson)
        setSubscriptionStatus({
          ...cached,
          expirationDate: cached.expirationDate
            ? new Date(cached.expirationDate)
            : null,
        })
      }
    } catch (e) {
      logger.debug('No cached subscription status found')
    }
  }, [])

  // Persist subscription status to MMKV
  const persistSubscriptionStatus = useCallback((status: SubscriptionStatus) => {
    try {
      const data = {
        ...status,
        expirationDate: status.expirationDate?.toISOString() || null,
      }
      subscriptionStorage.set('status', JSON.stringify(data))
      // Sync with paywall state
      setPaywallSubscriptionStatus(status.isSubscribed)
    } catch (e) {
      logger.error('Failed to persist subscription status', {error: e})
    }
  }, [])

  // Purchase a subscription
  const purchaseSubscription = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!isInitialized) {
        setError('Purchases not available')
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await amazonIAP.purchaseSubscription(productId)

        if (result.success) {
          const newStatus = amazonIAP.getSubscriptionStatus()
          setSubscriptionStatus(newStatus)
          persistSubscriptionStatus(newStatus)
          return true
        } else {
          setError(result.error || 'Purchase failed')
          return false
        }
      } catch (e: any) {
        logger.error('Purchase error', {error: e})
        setError(e.message || 'Purchase failed')
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [isInitialized, persistSubscriptionStatus],
  )

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!isInitialized) {
      setError('Purchases not available')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await amazonIAP.restorePurchases()

      const newStatus = amazonIAP.getSubscriptionStatus()
      setSubscriptionStatus(newStatus)
      persistSubscriptionStatus(newStatus)

      if (!result.success && result.error) {
        setError(result.error)
      }

      return result.success
    } catch (e: any) {
      logger.error('Restore error', {error: e})
      setError(e.message || 'Restore failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isInitialized, persistSubscriptionStatus])

  // Refresh subscription status
  const refreshStatus = useCallback(async () => {
    if (!isInitialized) return

    setIsLoading(true)
    try {
      await amazonIAP.checkSubscriptionStatus()
      const newStatus = amazonIAP.getSubscriptionStatus()
      setSubscriptionStatus(newStatus)
      persistSubscriptionStatus(newStatus)
    } catch (e: any) {
      logger.error('Failed to refresh status', {error: e})
    } finally {
      setIsLoading(false)
    }
  }, [isInitialized, persistSubscriptionStatus])

  const value: IAPContextType = {
    isInitialized,
    isLoading,
    subscriptionStatus,
    products,
    error,
    purchaseSubscription,
    restorePurchases,
    refreshStatus,
  }

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>
}

// =============================================================================
// Hooks
// =============================================================================

export function useIAP() {
  return useContext(IAPContext)
}

export function useSubscriptionStatus() {
  const {subscriptionStatus} = useContext(IAPContext)
  return subscriptionStatus
}

export function useIsSubscribed() {
  const {subscriptionStatus} = useContext(IAPContext)
  return subscriptionStatus.isSubscribed
}

export function useSubscriptionTier(): SubscriptionTier {
  const {subscriptionStatus} = useContext(IAPContext)
  return subscriptionStatus.tier
}

