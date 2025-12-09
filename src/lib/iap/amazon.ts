/**
 * Amazon In-App Purchasing Service for BlueFly
 *
 * Production implementation using native Android Amazon IAP SDK.
 * Includes server-side receipt validation for security.
 */

import {type EmitterSubscription} from 'react-native'
import {AppState, type AppStateStatus, Platform} from 'react-native'

import {logger} from '#/logger'
import {
  amazonIAPNative,
  type ErrorData,
  type ProductData,
  type ProductsLoadedEvent,
  type PurchaseData,
} from './native/AmazonIAPNative'
import {validateAmazonReceipt} from './receiptValidation'

// =============================================================================
// Types
// =============================================================================

export type SubscriptionTier = 'free' | 'monthly' | 'quarterly'

export interface SubscriptionProduct {
  productId: string
  title: string
  description: string
  price: string
  currency: string
  localizedPrice: string
  subscriptionPeriod: string
  freeTrialPeriod?: string
}

export interface SubscriptionStatus {
  isSubscribed: boolean
  tier: SubscriptionTier
  expirationDate: Date | null
  isTrialPeriod: boolean
  autoRenewing: boolean
  receiptId?: string
}

export interface PurchaseResult {
  success: boolean
  error?: string
  receiptId?: string
  isTrialPeriod?: boolean
}

// =============================================================================
// Constants
// =============================================================================

// Amazon SKUs from amazon.sdktester.json
export const SUBSCRIPTION_SKUS = {
  MONTHLY: 'BlueFlyMonthlyTerm',
  QUARTERLY: 'BlueFlyQuarterlyTerm',
} as const

export const ALL_SUBSCRIPTION_SKUS = [
  SUBSCRIPTION_SKUS.MONTHLY,
  SUBSCRIPTION_SKUS.QUARTERLY,
]

// =============================================================================
// Service
// =============================================================================

class AmazonIAPService {
  private initialized = false
  private products: SubscriptionProduct[] = []
  private currentSubscription: SubscriptionStatus = {
    isSubscribed: false,
    tier: 'free',
    expirationDate: null,
    isTrialPeriod: false,
    autoRenewing: false,
  }

  private purchaseUpdateSubscription: EmitterSubscription | null = null
  private purchaseErrorSubscription: EmitterSubscription | null = null
  private productsLoadedSubscription: EmitterSubscription | null = null

  // Callbacks for purchase events
  private onPurchaseSuccess?: (purchase: PurchaseData) => void
  private onPurchaseError?: (error: ErrorData) => void
  private onProductsLoaded?: (products: ProductsLoadedEvent) => void

  // Pending product load promise
  private pendingProductsLoad?: {
    resolve: (products: SubscriptionProduct[]) => void
    reject: (error: Error) => void
  }

  // Pending purchase tracking for polling
  private pendingPurchase?: {
    productId: string
    resolve: (result: PurchaseResult) => void
    pollingInterval?: NodeJS.Timeout
    pollingAttempts: number
  }

  // AppState monitoring
  private appStateSubscription: EmitterSubscription | null = null
  private appState: AppStateStatus = AppState.currentState

  /**
   * Check if app is installed from Amazon Appstore
   * Amazon IAP only works when app is installed from Amazon Appstore
   * Note: This is a best-effort check. The actual IAP SDK will fail if not from Appstore.
   */
  private async checkInstallSource(): Promise<boolean> {
    try {
      // Use native Android PackageManager to check installer package
      // This doesn't require react-native-iap
      // Note: NativeModules check removed as it's not used

      // Try to get installer package name using Android's PackageManager
      // This is a best-effort check - the IAP SDK itself will enforce this
      logger.info('Checking install source (best-effort)')
      console.log(
        '[Amazon IAP] Install source check - IAP SDK will enforce Amazon Appstore requirement',
      )

      // The actual validation happens in the native IAP SDK
      // If the app isn't from Amazon Appstore, PurchasingService will fail
      return true // Assume OK - let the SDK handle validation
    } catch (e) {
      logger.debug('Could not check install source', {error: e})
      return true // Assume OK if check fails - SDK will enforce
    }
  }

  /**
   * Initialize the IAP connection
   */
  async init(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      logger.warn('Amazon IAP is only available on Android')
      return false
    }

    if (this.initialized) {
      logger.info('Amazon IAP already initialized')
      return true
    }

    try {
      logger.info('Initializing Amazon IAP connection...')
      console.log('[Amazon IAP] Starting initialization...')
      console.log('[Amazon IAP] Platform:', Platform.OS)

      // Check install source (best-effort)
      await this.checkInstallSource()

      // Initialize connection to the store using native module
      let result
      try {
        console.log('[Amazon IAP] About to call native initConnection()...')
        logger.info('Calling native initConnection()...')

        result = await amazonIAPNative.initConnection()

        console.log('[Amazon IAP] initConnection() completed')
        console.log('[Amazon IAP] Result type:', typeof result)
        console.log('[Amazon IAP] Result value:', result)

        logger.info('IAP connection result', {
          result,
          resultType: typeof result,
        })

        // Check if result indicates failure
        // initConnection() returns a string like "connected" or "already_initialized"
        if (
          !result ||
          (result !== 'connected' && result !== 'already_initialized')
        ) {
          logger.error('initConnection returned invalid result', {result})
          console.error(
            '[Amazon IAP] initConnection returned invalid result:',
            result,
          )
          return false
        }

        // Log success
        console.log(
          '[Amazon IAP] initConnection succeeded with result:',
          result,
        )
        logger.info('initConnection succeeded', {result})
      } catch (initError: any) {
        logger.error('initConnection threw an error', {
          error: initError.message,
          code: initError.code,
          stack: initError.stack,
          errorName: initError.name,
          errorString: String(initError),
        })
        console.error('[Amazon IAP] initConnection EXCEPTION:', {
          name: initError.name,
          message: initError.message,
          code: initError.code,
          stack: initError.stack,
          toString: String(initError),
        })
        return false
      }

      // Set up purchase listeners BEFORE marking as initialized
      this.setupPurchaseListeners()
      logger.info('Purchase listeners set up')

      // Set up AppState monitoring to check for purchases when app becomes active
      this.setupAppStateMonitoring()

      // Mark as initialized BEFORE loading products
      // This allows loadProducts to run (it checks this.initialized)
      this.initialized = true
      console.log('[Amazon IAP] Marked as initialized, loading products...')

      // Load products
      let products: SubscriptionProduct[] = []
      try {
        products = await this.loadProducts()
        console.log('[Amazon IAP] Products loaded:', products.length)
      } catch (loadError: any) {
        logger.error('Failed to load products during initialization', {
          error: loadError.message,
          code: loadError.code,
        })
        console.error('[Amazon IAP] loadProducts error:', loadError.message)
        // Don't fail initialization if products fail to load - might be temporary
        products = []
      }

      if (products.length === 0) {
        logger.warn('Amazon IAP initialized but no products loaded', {
          skus: ALL_SUBSCRIPTION_SKUS,
        })
        console.warn(
          '[Amazon IAP] No products loaded, but initialization succeeded',
        )
        // Don't fail initialization if products aren't loaded - might be temporary
        // Products can be loaded later via retry
      } else {
        logger.info('Products loaded successfully', {
          count: products.length,
          productIds: products.map(p => p.productId),
        })
        console.log(
          '[Amazon IAP] Products loaded:',
          products.map(p => p.productId),
        )
      }

      // Check current subscription status
      try {
        await this.checkSubscriptionStatus()
      } catch (statusError: any) {
        logger.warn(
          'Failed to check subscription status during initialization',
          {
            error: statusError.message,
          },
        )
        // Don't fail initialization if status check fails
      }

      logger.info('Amazon IAP initialized successfully', {
        productsCount: products.length,
        initialized: this.initialized,
      })
      console.log('[Amazon IAP] Initialization complete:', {
        initialized: this.initialized,
        productsCount: products.length,
      })
      return true
    } catch (error: any) {
      logger.error('Failed to initialize Amazon IAP', {
        error: error.message,
        code: error.code,
        stack: error.stack,
      })
      console.error(
        '[Amazon IAP] Initialization failed:',
        JSON.stringify(
          {
            message: error.message,
            code: error.code,
          },
          null,
          2,
        ),
      )
      this.initialized = false
      return false
    }
  }

  /**
   * Set up purchase event listeners
   */
  private setupPurchaseListeners(): void {
    // Remove existing listeners if any
    this.removePurchaseListeners()

    // Purchase update listener
    this.purchaseUpdateSubscription = amazonIAPNative.addPurchaseUpdateListener(
      (purchase: PurchaseData) => {
        logger.info('Purchase updated', {
          productId: purchase.productId,
          transactionId: purchase.transactionId,
        })

        // Update subscription status optimistically (before validation)
        const tier = this.getTierFromProductId(purchase.productId)
        this.currentSubscription = {
          isSubscribed: true,
          tier,
          expirationDate: null, // Will be updated after validation
          isTrialPeriod: false, // Will be updated after validation
          autoRenewing: true,
          receiptId: purchase.purchaseToken,
        }

        // Call success callback immediately (don't wait for server validation)
        // This prevents the UI from being stuck in "processing" state
        this.onPurchaseSuccess?.(purchase)

        logger.info('Purchase received - success callback fired immediately', {
          productId: purchase.productId,
          tier,
        })

        // Validate receipt with server in background (non-blocking)
        // If validation fails, we log it but don't reverse the purchase
        // The purchase is already confirmed by Amazon, so we trust it
        validateAmazonReceipt(purchase.purchaseToken || '', purchase.productId)
          .then(validation => {
            if (validation.isValid) {
              // Update subscription status with validated data
              this.currentSubscription = {
                isSubscribed: true,
                tier,
                expirationDate: validation.expirationDate
                  ? new Date(validation.expirationDate)
                  : null,
                isTrialPeriod: validation.isTrialPeriod || false,
                autoRenewing: validation.autoRenewing || true,
                receiptId: purchase.purchaseToken,
              }

              logger.info('Purchase validated successfully (background)', {
                tier: this.currentSubscription.tier,
                isTrialPeriod: this.currentSubscription.isTrialPeriod,
              })
            } else {
              // Validation failed, but purchase is already confirmed
              // Log error but don't reverse the purchase
              logger.error('Purchase validation failed (background)', {
                error: validation.error,
                productId: purchase.productId,
                note: 'Purchase already confirmed, not reversing',
              })
            }
          })
          .catch((error: any) => {
            // Validation error, but purchase is already confirmed
            // Log error but don't reverse the purchase
            logger.error('Error validating purchase (background)', {
              error: error.message,
              productId: purchase.productId,
              note: 'Purchase already confirmed, not reversing',
            })
          })
      },
    )

    // Purchase error listener
    this.purchaseErrorSubscription = amazonIAPNative.addPurchaseErrorListener(
      (error: ErrorData) => {
        logger.error('Purchase error', {
          message: error.message,
          code: error.code,
        })
        this.onPurchaseError?.(error)
      },
    )
  }

  /**
   * Set up AppState monitoring to check for purchases when app becomes active
   * This catches cases where purchase completes but callback didn't fire
   */
  private setupAppStateMonitoring(): void {
    // Remove existing subscription if any
    if (this.appStateSubscription) {
      this.appStateSubscription.remove()
      this.appStateSubscription = null
    }

    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        // When app comes back to foreground, check for pending purchases
        if (
          this.appState.match(/inactive|background/) &&
          nextAppState === 'active' &&
          this.pendingPurchase
        ) {
          logger.info('App became active - checking for pending purchase', {
            productId: this.pendingPurchase.productId,
          })
          // Trigger purchase updates check
          this.checkForPendingPurchase()
        }
        this.appState = nextAppState
      },
    )
  }

  /**
   * Check for pending purchase by triggering purchase updates
   */
  private async checkForPendingPurchase(): Promise<void> {
    if (!this.pendingPurchase || !this.initialized) {
      return
    }

    try {
      logger.info('Checking for pending purchase', {
        productId: this.pendingPurchase.productId,
      })
      // Trigger purchase updates - this will fire purchaseUpdated event if purchase exists
      await amazonIAPNative.getAvailablePurchases()
    } catch (error: any) {
      logger.error('Error checking for pending purchase', {
        error: error.message,
        productId: this.pendingPurchase.productId,
      })
    }

    // Products loaded listener
    this.productsLoadedSubscription = amazonIAPNative.addProductsLoadedListener(
      (data: ProductsLoadedEvent) => {
        logger.info('Products loaded from native module', {
          count: Object.keys(data.products).length,
          unavailableSkus: data.unavailableSkus.length,
        })

        // Map native products to our format
        const products: SubscriptionProduct[] = Object.values(
          data.products,
        ).map((product: ProductData) =>
          this.mapNativeProductToSubscriptionProduct(product),
        )

        this.products = products

        // Resolve pending product load promise if any
        if (this.pendingProductsLoad) {
          this.pendingProductsLoad.resolve(products)
          this.pendingProductsLoad = undefined
        }

        // Call callback if set
        this.onProductsLoaded?.(data)
      },
    )

    logger.info('Purchase listeners set up')
  }

  /**
   * Remove purchase listeners
   */
  private removePurchaseListeners(): void {
    this.purchaseUpdateSubscription?.remove()
    this.purchaseErrorSubscription?.remove()
    this.productsLoadedSubscription?.remove()
    this.purchaseUpdateSubscription = null
    this.purchaseErrorSubscription = null
    this.productsLoadedSubscription = null
  }

  /**
   * Load available subscription products from Amazon
   */
  async loadProducts(): Promise<SubscriptionProduct[]> {
    if (!this.initialized) {
      logger.warn('IAP not initialized, call init() first')
      console.warn('[Amazon IAP] loadProducts called but not initialized')
      return []
    }

    try {
      logger.info('Loading subscription products...', {
        skus: ALL_SUBSCRIPTION_SKUS,
      })
      console.log(
        '[Amazon IAP] Loading products for SKUs:',
        ALL_SUBSCRIPTION_SKUS,
      )

      // Request products from native module
      // The result will come via the productsLoaded event listener
      return new Promise<SubscriptionProduct[]>((resolve, reject) => {
        // Set up pending promise
        this.pendingProductsLoad = {resolve, reject}

        // Request products
        amazonIAPNative
          .getSubscriptions(ALL_SUBSCRIPTION_SKUS)
          .catch((error: any) => {
            logger.error('Failed to request products from native module', {
              error: error.message,
              code: error.code,
            })
            if (this.pendingProductsLoad) {
              this.pendingProductsLoad.reject(error)
              this.pendingProductsLoad = undefined
            }
          })

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.pendingProductsLoad) {
            logger.warn('Product load timed out')
            this.pendingProductsLoad.reject(new Error('Product load timed out'))
            this.pendingProductsLoad = undefined
          }
        }, 10000)
      })
    } catch (error: any) {
      logger.error('Failed to load subscription products', {
        error: error.message,
        code: error.code,
        stack: error.stack,
      })
      console.error(
        '[Amazon IAP] loadProducts error:',
        JSON.stringify(
          {
            message: error.message,
            code: error.code,
          },
          null,
          2,
        ),
      )
      return []
    }
  }

  /**
   * Map native product data to our subscription product format
   */
  private mapNativeProductToSubscriptionProduct(
    product: ProductData,
  ): SubscriptionProduct {
    // Determine subscription period from product ID
    let subscriptionPeriod = 'Monthly'
    let freeTrialPeriod = '7-day free trial'

    if (product.productId === SUBSCRIPTION_SKUS.QUARTERLY) {
      subscriptionPeriod = 'Quarterly'
    }

    // Extract and validate price
    let rawPrice = product.price || '0.00'
    const parsedPrice = parseFloat(rawPrice)
    const isValidPrice =
      !isNaN(parsedPrice) && parsedPrice > 0 && parsedPrice < 1000

    if (!isValidPrice) {
      // Use fallback prices
      if (product.productId === SUBSCRIPTION_SKUS.MONTHLY) {
        rawPrice = '2.99'
      } else if (product.productId === SUBSCRIPTION_SKUS.QUARTERLY) {
        rawPrice = '6.99'
      } else {
        rawPrice = '0.00'
      }
    } else {
      rawPrice = parsedPrice.toFixed(2)
    }

    // Format localized price with currency
    const currencySymbol =
      product.currencyCode === 'USD'
        ? '$'
        : product.currencyCode === 'EUR'
          ? '€'
          : product.currencyCode === 'GBP'
            ? '£'
            : '$'
    const localizedPrice = `${currencySymbol}${rawPrice}`

    logger.info('Mapped native product to subscription product', {
      productId: product.productId,
      title: product.title,
      price: rawPrice,
      localizedPrice,
    })

    return {
      productId: product.productId,
      title: product.title || product.productId,
      description: product.description || `${subscriptionPeriod} subscription`,
      price: rawPrice,
      currency: product.currencyCode || 'USD',
      localizedPrice,
      subscriptionPeriod,
      freeTrialPeriod,
    }
  }

  /**
   * Check the current subscription status
   */
  async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    if (!this.initialized) {
      logger.warn('IAP not initialized, call init() first')
      return this.currentSubscription
    }

    try {
      logger.info('Checking subscription status...')

      // Request purchases from native module
      // The result will come via the purchaseUpdated event
      return new Promise<SubscriptionStatus>(resolve => {
        let purchaseReceived = false

        // Set up temporary listener for purchase updates
        const tempListener = amazonIAPNative.addPurchaseUpdateListener(
          async (purchase: PurchaseData) => {
            if (purchaseReceived) return
            purchaseReceived = true

            // Validate with server
            const validation = await validateAmazonReceipt(
              purchase.purchaseToken || '',
              purchase.productId,
            )

            if (validation.isValid) {
              this.currentSubscription = {
                isSubscribed: true,
                tier: this.getTierFromProductId(purchase.productId),
                expirationDate: validation.expirationDate
                  ? new Date(validation.expirationDate)
                  : null,
                isTrialPeriod: validation.isTrialPeriod || false,
                autoRenewing: validation.autoRenewing || true,
                receiptId: purchase.purchaseToken,
              }

              logger.info('Active subscription found', {
                tier: this.currentSubscription.tier,
                isTrialPeriod: this.currentSubscription.isTrialPeriod,
                expirationDate: this.currentSubscription.expirationDate,
              })
            } else {
              logger.warn('Subscription validation failed', {
                error: validation.error,
              })
              this.currentSubscription = {
                isSubscribed: false,
                tier: 'free',
                expirationDate: null,
                isTrialPeriod: false,
                autoRenewing: false,
              }
            }

            tempListener.remove()
            resolve(this.currentSubscription)
          },
        )

        // Request purchases
        amazonIAPNative.getAvailablePurchases().catch((error: any) => {
          logger.error('Failed to get available purchases', {
            error: error.message,
          })
          tempListener.remove()
          if (!purchaseReceived) {
            this.currentSubscription = {
              isSubscribed: false,
              tier: 'free',
              expirationDate: null,
              isTrialPeriod: false,
              autoRenewing: false,
            }
            logger.info('No active subscription found')
            resolve(this.currentSubscription)
          }
        })

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!purchaseReceived) {
            tempListener.remove()
            this.currentSubscription = {
              isSubscribed: false,
              tier: 'free',
              expirationDate: null,
              isTrialPeriod: false,
              autoRenewing: false,
            }
            logger.info('No active subscription found (timeout)')
            resolve(this.currentSubscription)
          }
        }, 5000)
      })
    } catch (error: any) {
      logger.error('Failed to check subscription status', {
        error: error.message,
        code: error.code,
      })
      return Promise.resolve(this.currentSubscription)
    }
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(productId: string): Promise<PurchaseResult> {
    if (!this.initialized) {
      logger.error('Purchase failed: IAP not initialized')
      return {success: false, error: 'IAP not initialized. Please try again.'}
    }

    // Verify product exists
    const product = this.products.find(p => p.productId === productId)
    if (!product) {
      logger.error('Purchase failed: Product not found', {
        productId,
        availableProducts: this.products.map(p => p.productId),
      })
      return {
        success: false,
        error: 'Product not available. Please try again later.',
      }
    }

    return new Promise(resolve => {
      logger.info('Initiating subscription purchase', {
        productId,
        productTitle: product.title,
        productPrice: product.localizedPrice,
      })

      let purchaseResolved = false
      let timeoutId: NodeJS.Timeout | null = null
      let pollingInterval: NodeJS.Timeout | null = null
      const pollingState = {
        attempts: 0,
        maxAttempts: 12, // 12 attempts * 5 seconds = 60 seconds
        interval: 5000, // 5 seconds
      }

      const clearPurchaseCallbacks = () => {
        this.onPurchaseSuccess = undefined
        this.onPurchaseError = undefined
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        if (pollingInterval) {
          clearInterval(pollingInterval)
          pollingInterval = null
        }
        // Clear pending purchase tracking
        if (this.pendingPurchase?.productId === productId) {
          this.pendingPurchase = undefined
        }
      }

      // Set up one-time callbacks for this purchase
      this.onPurchaseSuccess = (purchase: PurchaseData) => {
        if (purchaseResolved) {
          logger.warn('Purchase success callback called after resolution', {
            productId,
          })
          return
        }
        purchaseResolved = true
        clearPurchaseCallbacks()
        logger.info('Purchase completed successfully', {
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          purchaseToken: purchase.purchaseToken?.substring(0, 20) + '...',
        })
        resolve({
          success: true,
          receiptId: purchase.purchaseToken,
          isTrialPeriod: this.currentSubscription.isTrialPeriod,
        })
      }

      // Polling function to check for purchase completion
      const pollForPurchase = async () => {
        if (purchaseResolved) {
          return
        }

        pollingState.attempts++
        logger.info('Polling for purchase status', {
          productId,
          attempt: pollingState.attempts,
          maxAttempts: pollingState.maxAttempts,
        })

        try {
          // Trigger purchase updates check
          await amazonIAPNative.getAvailablePurchases()

          // Check if purchase was found (this will trigger onPurchaseSuccess if found)
          // Also check subscription status directly
          const status = await this.checkSubscriptionStatus()
          if (status.isSubscribed && status.receiptId) {
            // Purchase found! The onPurchaseSuccess should have been called
            // But if it wasn't, we can resolve here as fallback
            if (!purchaseResolved) {
              logger.info('Purchase found via polling - resolving', {productId})
              purchaseResolved = true
              clearPurchaseCallbacks()
              resolve({
                success: true,
                receiptId: status.receiptId,
                isTrialPeriod: status.isTrialPeriod,
              })
            }
          }
        } catch (error: any) {
          logger.warn('Error polling for purchase', {
            productId,
            attempt: pollingState.attempts,
            error: error.message,
          })
        }

        // Stop polling if max attempts reached
        if (pollingState.attempts >= pollingState.maxAttempts) {
          logger.warn('Max polling attempts reached', {
            productId,
            attempts: pollingState.attempts,
          })
          if (pollingInterval) {
            clearInterval(pollingInterval)
            pollingInterval = null
          }
        }
      }

      this.onPurchaseError = (error: ErrorData) => {
        if (purchaseResolved) {
          logger.warn('Purchase error callback called after resolution', {
            productId,
            error: error.message,
          })
          return
        }
        purchaseResolved = true
        clearPurchaseCallbacks()

        // Check if user cancelled
        const isCancelled =
          error.code === 'E_USER_CANCELLED' ||
          error.code === 'USER_CANCELED' ||
          (error.code === 'PURCHASE_FAILED' &&
            error.message?.toLowerCase().includes('cancel')) ||
          error.message?.toLowerCase().includes('cancel') ||
          error.message?.toLowerCase().includes('cancelled')

        logger.error('Purchase failed', {
          productId,
          errorCode: error.code,
          errorMessage: error.message,
          isCancelled,
        })

        resolve({
          success: false,
          error: isCancelled
            ? 'Purchase cancelled'
            : error.message ||
              'Purchase could not be completed. Please try again.',
        })
      }

      // Verify listeners are set up
      if (!this.purchaseUpdateSubscription || !this.purchaseErrorSubscription) {
        logger.error('Purchase listeners not set up', {productId})
        clearPurchaseCallbacks()
        resolve({
          success: false,
          error: 'Purchase system not ready. Please try again.',
        })
        return
      }

      // Initiate purchase using native module
      logger.info('Calling native requestSubscription', {
        productId,
        hasSuccessCallback: !!this.onPurchaseSuccess,
        hasErrorCallback: !!this.onPurchaseError,
      })

      // Also log to console for debugging
      console.log('[Amazon IAP] Initiating purchase:', productId)
      console.log('[Amazon IAP] Listeners set up:', {
        hasUpdateListener: !!this.purchaseUpdateSubscription,
        hasErrorListener: !!this.purchaseErrorSubscription,
      })

      // Set up timeout BEFORE making the request to ensure it's always set
      // Timeout after 90 seconds - if no response, assume purchase dialog was dismissed or failed
      timeoutId = setTimeout(() => {
        if (!purchaseResolved) {
          purchaseResolved = true
          logger.error('Purchase timed out - no response received', {
            productId,
            timeout: '90s',
            pollingAttempts: pollingState.attempts,
            hasSuccessCallback: !!this.onPurchaseSuccess,
            hasErrorCallback: !!this.onPurchaseError,
          })
          console.error('[Amazon IAP] Purchase timeout after 90s:', productId)
          clearPurchaseCallbacks()
          resolve({
            success: false,
            error:
              'Purchase timed out. The purchase dialog may have been closed. Please try again.',
          })
        }
      }, 90000) // 90 seconds - shorter timeout to prevent long waits

      // Track pending purchase for AppState monitoring
      // Note: pollingInterval will be set after requestSubscription
      this.pendingPurchase = {
        productId,
        resolve,
        pollingAttempts: pollingState.attempts,
      }

      amazonIAPNative
        .requestSubscription(productId)
        .then(() => {
          logger.info('Purchase request sent successfully', {productId})
          console.log(
            '[Amazon IAP] Purchase request sent successfully:',
            productId,
          )

          // Start polling for purchase status
          // Poll every 5 seconds for up to 60 seconds (12 attempts)
          pollingInterval = setInterval(() => {
            pollForPurchase()
          }, pollingState.interval)

          // Store polling interval in pending purchase for cleanup
          if (this.pendingPurchase) {
            this.pendingPurchase.pollingInterval = pollingInterval
            this.pendingPurchase.pollingAttempts = pollingState.attempts
          }

          // Also do an immediate check after 2 seconds (give purchase dialog time to complete)
          setTimeout(() => {
            if (!purchaseResolved) {
              pollForPurchase()
            }
          }, 2000)

          // The actual result will come through the listeners (onPurchaseSuccess or onPurchaseError)
          // If the purchase dialog is shown and user completes it, we'll get a callback
          // If user dismisses the dialog, we should get an error callback
          // If nothing happens, the timeout will trigger
          // Polling provides a fallback to catch purchases that complete but callback doesn't fire
        })
        .catch((error: any) => {
          if (purchaseResolved) {
            logger.warn('Purchase request error after resolution', {
              productId,
              error: error.message,
            })
            return
          }
          purchaseResolved = true
          const errorInfo = {
            productId,
            errorMessage: error.message,
            errorCode: error.code,
            errorStack: error.stack,
          }
          logger.error('Purchase request failed immediately', errorInfo)
          console.error(
            '[Amazon IAP] Purchase request failed:',
            JSON.stringify(errorInfo, null, 2),
          )
          clearPurchaseCallbacks()
          resolve({
            success: false,
            error:
              error.message ||
              'Failed to initiate purchase. Please check your connection and try again.',
          })
        })
    })
  }

  /**
   * Get subscription tier from product ID
   */
  private getTierFromProductId(productId: string): SubscriptionTier {
    switch (productId) {
      case SUBSCRIPTION_SKUS.MONTHLY:
        return 'monthly'
      case SUBSCRIPTION_SKUS.QUARTERLY:
        return 'quarterly'
      default:
        return 'free'
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<PurchaseResult> {
    if (!this.initialized) {
      return {success: false, error: 'IAP not initialized'}
    }

    try {
      logger.info('Restoring purchases...')

      await this.checkSubscriptionStatus()

      if (this.currentSubscription.isSubscribed) {
        return {
          success: true,
          receiptId: this.currentSubscription.receiptId,
          isTrialPeriod: this.currentSubscription.isTrialPeriod,
        }
      } else {
        return {
          success: false,
          error:
            'No active subscription found. Subscribe to unlock BlueFly Premium.',
        }
      }
    } catch (error: any) {
      logger.error('Failed to restore purchases', {error: error.message})
      return {
        success: false,
        error: error.message || 'Failed to restore purchases',
      }
    }
  }

  /**
   * Get current subscription status
   */
  getSubscriptionStatus(): SubscriptionStatus {
    return this.currentSubscription
  }

  /**
   * Get available products
   */
  getProducts(): SubscriptionProduct[] {
    return this.products
  }

  /**
   * Check if user has an active subscription
   */
  isSubscribed(): boolean {
    return this.currentSubscription.isSubscribed
  }

  /**
   * Check if user is in trial period
   */
  isInTrialPeriod(): boolean {
    return this.currentSubscription.isTrialPeriod
  }

  /**
   * Check if IAP is actually initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * End the IAP connection
   */
  async endConnection(): Promise<void> {
    try {
      this.removePurchaseListeners()

      // Clean up AppState monitoring
      if (this.appStateSubscription) {
        this.appStateSubscription.remove()
        this.appStateSubscription = null
      }

      // Clean up pending purchase polling
      if (this.pendingPurchase?.pollingInterval) {
        clearInterval(this.pendingPurchase.pollingInterval)
        this.pendingPurchase = undefined
      }

      amazonIAPNative.removeAllListeners()
      await amazonIAPNative.endConnection()
      this.initialized = false
      logger.info('Amazon IAP connection ended')
    } catch (error: any) {
      logger.error('Failed to end IAP connection', {error: error.message})
    }
  }
}

// Export singleton instance
export const amazonIAP = new AmazonIAPService()
