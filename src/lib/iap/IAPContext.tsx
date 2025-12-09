/**
 * IAP Context Provider for BlueFly
 *
 * Provides subscription state and actions throughout the app.
 * Uses react-native-iap for Amazon Appstore integration.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {AppState, type AppStateStatus, Platform} from 'react-native'
import {MMKV} from '@bsky.app/react-native-mmkv'
import type React from 'react'

import {logger} from '#/logger'
import {
  amazonIAP,
  type PurchaseResult,
  type SubscriptionProduct,
  type SubscriptionStatus,
  type SubscriptionTier,
} from './amazon'
import {setSubscriptionStatus as setPaywallSubscriptionStatus} from './PaywallState'
import {verifySubscriptionActive} from './receiptValidation'

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
  clearError: () => void
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
  clearError: () => {},
})

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE_KEYS = {
  STATUS: 'status',
  RECEIPT_ID: 'receiptId',
  LAST_VERIFIED: 'lastVerified',
} as const

// Verification interval (24 hours)
const VERIFICATION_INTERVAL = 24 * 60 * 60 * 1000

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

  const appState = useRef(AppState.currentState)
  const verificationTimer = useRef<NodeJS.Timeout | null>(null)

  // Load cached subscription status from MMKV storage
  const loadCachedSubscriptionStatus = useCallback(() => {
    try {
      const cachedJson = subscriptionStorage.getString(STORAGE_KEYS.STATUS)
      if (cachedJson) {
        const cached = JSON.parse(cachedJson)
        const status: SubscriptionStatus = {
          ...cached,
          expirationDate: cached.expirationDate
            ? new Date(cached.expirationDate)
            : null,
        }
        setSubscriptionStatus(status)
        setPaywallSubscriptionStatus(status.isSubscribed)
        logger.info('Loaded cached subscription status', {
          isSubscribed: status.isSubscribed,
          tier: status.tier,
        })
        return status
      }
    } catch (e) {
      logger.debug('No cached subscription status found')
    }
    return null
  }, [])

  // Persist subscription status to MMKV
  const persistSubscriptionStatus = useCallback(
    (status: SubscriptionStatus, receiptId?: string) => {
      try {
        const data = {
          ...status,
          expirationDate: status.expirationDate?.toISOString() || null,
        }
        subscriptionStorage.set(STORAGE_KEYS.STATUS, JSON.stringify(data))

        if (receiptId) {
          subscriptionStorage.set(STORAGE_KEYS.RECEIPT_ID, receiptId)
        }

        subscriptionStorage.set(STORAGE_KEYS.LAST_VERIFIED, Date.now())

        // Sync with paywall state
        setPaywallSubscriptionStatus(status.isSubscribed)

        logger.info('Persisted subscription status', {
          isSubscribed: status.isSubscribed,
          tier: status.tier,
        })
      } catch (e) {
        logger.error('Failed to persist subscription status', {error: e})
      }
    },
    [],
  )

  // Verify subscription is still active (periodic check)
  const verifySubscription = useCallback(async () => {
    const receiptId = subscriptionStorage.getString(STORAGE_KEYS.RECEIPT_ID)
    const lastVerified = subscriptionStorage.getNumber(
      STORAGE_KEYS.LAST_VERIFIED,
    )

    // Skip if no receipt or recently verified
    if (!receiptId) {
      return
    }

    if (lastVerified && Date.now() - lastVerified < VERIFICATION_INTERVAL) {
      logger.debug('Skipping verification - recently verified')
      return
    }

    try {
      logger.info('Verifying subscription status...')

      const productId =
        subscriptionStatus.tier === 'quarterly'
          ? 'BlueFlyQuarterlyTerm'
          : 'BlueFlyMonthlyTerm'

      const isActive = await verifySubscriptionActive(receiptId, productId)

      if (!isActive && subscriptionStatus.isSubscribed) {
        // Subscription no longer active
        logger.info('Subscription no longer active')
        const newStatus: SubscriptionStatus = {
          isSubscribed: false,
          tier: 'free',
          expirationDate: null,
          isTrialPeriod: false,
          autoRenewing: false,
        }
        setSubscriptionStatus(newStatus)
        persistSubscriptionStatus(newStatus)
      }
    } catch (e) {
      logger.error('Failed to verify subscription', {error: e})
    }
  }, [
    subscriptionStatus.isSubscribed,
    subscriptionStatus.tier,
    persistSubscriptionStatus,
  ])

  // Initialize IAP on mount
  useEffect(() => {
    if (Platform.OS !== 'android') {
      logger.info('IAP not available on this platform')
      setIsInitialized(true)
      return
    }

    const initIAP = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Load cached status first
        const cachedStatus = loadCachedSubscriptionStatus()

        // Initialize IAP
        const success = await amazonIAP.init()

        if (success) {
          // Get products after initialization
          const loadedProducts = amazonIAP.getProducts()
          setProducts(loadedProducts)

          const status = amazonIAP.getSubscriptionStatus()
          // Only update subscription status if we have a positive confirmation from Amazon IAP
          // Don't overwrite cached subscribed status with false if Amazon IAP hasn't received notification yet
          // This prevents the modal from showing again after subscription if ResponseReceiver didn't work
          if (status.isSubscribed || !cachedStatus?.isSubscribed) {
            setSubscriptionStatus(status)
            persistSubscriptionStatus(status, status.receiptId)
          } else {
            // Keep cached subscribed status if Amazon IAP doesn't know about it yet
            // This can happen if ResponseReceiver didn't receive the purchase notification
            logger.info(
              'Keeping cached subscribed status - Amazon IAP may not have received purchase notification yet',
              {
                cachedIsSubscribed: cachedStatus.isSubscribed,
                iapIsSubscribed: status.isSubscribed,
              },
            )
          }

          // Only mark as initialized if we have products or if initialization succeeded
          if (loadedProducts.length > 0) {
            setIsInitialized(true)
            logger.info('IAP initialized successfully with products', {
              productsCount: loadedProducts.length,
              isSubscribed: status.isSubscribed,
            })
          } else {
            // Initialization succeeded but no products loaded - this might be a temporary issue
            setIsInitialized(true)
            setError(
              'Products not available. Please check your connection and try again.',
            )
            logger.warn('IAP initialized but no products loaded', {
              productsCount: 0,
            })
          }
        } else {
          // Initialization failed - don't mark as initialized
          setIsInitialized(false)
          // Provide a more helpful error message
          const errorMsg =
            'Failed to initialize purchases. This may occur if the app was not installed from Amazon Appstore. For testing, please use Live App Testing (LAT) or install from Amazon Appstore.'
          setError(errorMsg)
          logger.error(
            'IAP initialization returned false - app may not be installed from Amazon Appstore',
          )
        }
      } catch (e: any) {
        logger.error('Failed to initialize IAP', {
          error: e.message,
          errorStack: e.stack,
        })
        setError(e.message || 'Failed to initialize purchases')
        setIsInitialized(false) // Don't mark as initialized if there was an error
      } finally {
        setIsLoading(false)
      }
    }

    initIAP()

    // Cleanup on unmount
    return () => {
      amazonIAP.endConnection()
      if (verificationTimer.current) {
        clearInterval(verificationTimer.current)
      }
    }
  }, [loadCachedSubscriptionStatus, persistSubscriptionStatus])

  // Verify subscription on app foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - verify subscription
        verifySubscription()
      }
      appState.current = nextAppState
    }

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    )

    // Also set up periodic verification
    verificationTimer.current = setInterval(
      verifySubscription,
      VERIFICATION_INTERVAL,
    )

    return () => {
      subscription.remove()
      if (verificationTimer.current) {
        clearInterval(verificationTimer.current)
      }
    }
  }, [verifySubscription])

  // Purchase a subscription
  const purchaseSubscription = useCallback(
    async (productId: string): Promise<boolean> => {
      // Check both IAPContext state and Amazon IAP service state
      if (!isInitialized) {
        const errorMsg =
          'IAP not initialized. Please wait for initialization to complete.'
        setError(errorMsg)
        logger.warn('Purchase attempted before IAP initialization', {productId})
        return false
      }

      // Double-check that Amazon IAP service is actually initialized
      // This handles the case where IAPContext thinks it's initialized but Amazon IAP isn't
      if (!amazonIAP.isInitialized()) {
        const errorMsg =
          'IAP service not initialized. Please wait for initialization to complete.'
        setError(errorMsg)
        setIsInitialized(false) // Update state to reflect actual status
        logger.error(
          'Purchase attempted but Amazon IAP service is not initialized',
          {productId},
        )
        return false
      }

      const availableProducts = amazonIAP.getProducts()
      if (availableProducts.length === 0) {
        // Try to reload products if they're not available
        logger.warn('No products available, attempting to reload...', {
          productId,
        })
        try {
          const reloaded = await amazonIAP.loadProducts()
          if (reloaded.length === 0) {
            const errorMsg =
              'Products not available. Please check your connection and try again.'
            setError(errorMsg)
            logger.error('Products still not available after reload attempt', {
              productId,
            })
            return false
          }
          setProducts(reloaded)
          logger.info('Products reloaded successfully', {
            count: reloaded.length,
          })
        } catch (e: any) {
          const errorMsg =
            'Failed to load products. Please check your connection and try again.'
          setError(errorMsg)
          logger.error('Failed to reload products', {
            productId,
            error: e.message,
          })
          return false
        }
      }

      setIsLoading(true)
      setError(null)

      try {
        logger.info('Starting purchase', {
          productId,
          availableProducts: availableProducts.length,
        })

        const result: PurchaseResult =
          await amazonIAP.purchaseSubscription(productId)

        if (result.success) {
          const newStatus = amazonIAP.getSubscriptionStatus()
          setSubscriptionStatus(newStatus)
          persistSubscriptionStatus(newStatus, result.receiptId)

          logger.info('Purchase successful', {
            tier: newStatus.tier,
            isTrialPeriod: newStatus.isTrialPeriod,
          })

          return true
        } else {
          // Log detailed error information
          const errorDetails = {
            error: result.error,
            productId,
            timestamp: new Date().toISOString(),
          }
          logger.error('Purchase failed with details', errorDetails)

          // Also log to console for debugging (will show in React Native debugger)
          console.error(
            '[IAP] Purchase failed:',
            JSON.stringify(errorDetails, null, 2),
          )

          setError(result.error || 'Purchase failed')
          return false
        }
      } catch (e: any) {
        logger.error('Purchase error', {error: e.message})
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
      logger.info('Restoring purchases...')

      const result: PurchaseResult = await amazonIAP.restorePurchases()

      const newStatus = amazonIAP.getSubscriptionStatus()
      setSubscriptionStatus(newStatus)
      persistSubscriptionStatus(newStatus, result.receiptId)

      if (result.success) {
        logger.info('Restore successful', {
          tier: newStatus.tier,
          isTrialPeriod: newStatus.isTrialPeriod,
        })
        return true
      } else {
        logger.info('Restore failed - no subscription found')
        setError(result.error || 'No active subscription found')
        return false
      }
    } catch (e: any) {
      logger.error('Restore error', {error: e.message})
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
      persistSubscriptionStatus(newStatus, newStatus.receiptId)
    } catch (e: any) {
      logger.error('Failed to refresh status', {error: e.message})
    } finally {
      setIsLoading(false)
    }
  }, [isInitialized, persistSubscriptionStatus])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: IAPContextType = useMemo(
    () => ({
      isInitialized,
      isLoading,
      subscriptionStatus,
      products,
      error,
      purchaseSubscription,
      restorePurchases,
      refreshStatus,
      clearError,
    }),
    [
      isInitialized,
      isLoading,
      subscriptionStatus,
      products,
      error,
      purchaseSubscription,
      restorePurchases,
      refreshStatus,
      clearError,
    ],
  )

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

export function useIsTrialPeriod(): boolean {
  const {subscriptionStatus} = useContext(IAPContext)
  return subscriptionStatus.isTrialPeriod
}
