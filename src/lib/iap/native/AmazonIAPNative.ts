/**
 * Native Amazon IAP Module Interface
 *
 * TypeScript interface for the native Android Amazon IAP module.
 * This provides direct access to Amazon IAP SDK functionality.
 */

import {
  type EmitterSubscription,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native'

// Get the native module with existence check (lazy loading)
const getAmazonIAPModule = (): any => {
  if (Platform.OS !== 'android') {
    return null
  }

  const AmazonIAP = NativeModules.AmazonIAP

  // Log all available native modules for debugging
  if (__DEV__) {
    console.log(
      '[Amazon IAP] Available native modules:',
      Object.keys(NativeModules),
    )
    console.log(
      '[Amazon IAP] AmazonIAP module:',
      AmazonIAP ? 'FOUND' : 'NOT FOUND',
    )
  }

  if (!AmazonIAP) {
    const error = new Error(
      'AmazonIAP native module not found. ' +
        'Make sure the module is properly registered in MainApplication.kt. ' +
        `Available modules: ${Object.keys(NativeModules).join(', ')}`,
    )
    console.error('[Amazon IAP] CRITICAL ERROR:', error.message)
    throw error
  }

  return AmazonIAP
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AmazonIAPNativeModule {
  initConnection(): Promise<string>
  getSubscriptions(skus: string[]): Promise<void>
  requestSubscription(sku: string): Promise<void>
  getAvailablePurchases(): Promise<void>
  endConnection(): Promise<void>
}

interface ProductData {
  productId: string
  title: string
  description: string
  price: string
  currencyCode: string
  smallIconUrl?: string
}

interface PurchaseData {
  productId: string
  transactionId: string
  purchaseToken: string
  transactionDate: number
  transactionReceipt: string
}

interface ErrorData {
  code: string
  message: string
}

interface ProductsLoadedEvent {
  products: Record<string, ProductData>
  unavailableSkus: string[]
}

class AmazonIAPNative {
  private eventEmitter: NativeEventEmitter | null = null
  private subscriptions: EmitterSubscription[] = []
  private moduleAvailable: boolean = false
  private amazonIAPModule: any = null

  constructor() {
    // Don't load module at construction time - load lazily when needed
    // This prevents crashes if module isn't ready yet
  }

  private getModule(): any {
    if (!this.amazonIAPModule) {
      try {
        this.amazonIAPModule = getAmazonIAPModule()
        this.moduleAvailable = true

        // Create event emitter once module is available
        if (this.amazonIAPModule && !this.eventEmitter) {
          try {
            this.eventEmitter = new NativeEventEmitter(this.amazonIAPModule)
            console.log('[Amazon IAP] Native module initialized successfully')
          } catch (e: any) {
            console.error(
              '[Amazon IAP] Failed to create event emitter:',
              e.message,
            )
            this.moduleAvailable = false
          }
        }
      } catch (e: any) {
        console.error('[Amazon IAP] Failed to get native module:', e.message)
        this.moduleAvailable = false
        throw e
      }
    }
    return this.amazonIAPModule
  }

  private ensureModuleAvailable(): void {
    if (!this.moduleAvailable) {
      // Try to load module if not already loaded
      this.getModule()
    }
    if (!this.moduleAvailable || !this.amazonIAPModule) {
      throw new Error('AmazonIAP native module is not available')
    }
  }

  /**
   * Initialize Amazon IAP connection
   */
  async initConnection(): Promise<string> {
    const module = this.getModule()
    try {
      console.log('[Amazon IAP] Calling native initConnection()...')
      const result = await module.initConnection()
      console.log('[Amazon IAP] initConnection() result:', result)
      return result
    } catch (e: any) {
      console.error('[Amazon IAP] initConnection() failed:', e.message, e.stack)
      throw new Error(`Failed to initialize Amazon IAP: ${e.message}`)
    }
  }

  /**
   * Load subscription products
   */
  async getSubscriptions(skus: string[]): Promise<void> {
    const module = this.getModule()
    try {
      console.log(
        '[Amazon IAP] Calling native getSubscriptions() with SKUs:',
        skus,
      )
      await module.getSubscriptions(skus)
      console.log('[Amazon IAP] getSubscriptions() call completed')
    } catch (e: any) {
      console.error(
        '[Amazon IAP] getSubscriptions() failed:',
        e.message,
        e.stack,
      )
      throw new Error(`Failed to get subscriptions: ${e.message}`)
    }
  }

  /**
   * Request a subscription purchase
   */
  async requestSubscription(sku: string): Promise<void> {
    const module = this.getModule()
    try {
      console.log(
        '[Amazon IAP] Calling native requestSubscription() with SKU:',
        sku,
      )
      await module.requestSubscription(sku)
      console.log('[Amazon IAP] requestSubscription() call completed')
    } catch (e: any) {
      console.error(
        '[Amazon IAP] requestSubscription() failed:',
        e.message,
        e.stack,
      )
      throw new Error(`Failed to request subscription: ${e.message}`)
    }
  }

  /**
   * Get available purchases (active subscriptions)
   */
  async getAvailablePurchases(): Promise<void> {
    const module = this.getModule()
    try {
      console.log('[Amazon IAP] Calling native getAvailablePurchases()...')
      await module.getAvailablePurchases()
      console.log('[Amazon IAP] getAvailablePurchases() call completed')
    } catch (e: any) {
      console.error(
        '[Amazon IAP] getAvailablePurchases() failed:',
        e.message,
        e.stack,
      )
      throw new Error(`Failed to get available purchases: ${e.message}`)
    }
  }

  /**
   * End IAP connection
   */
  async endConnection(): Promise<void> {
    if (!this.moduleAvailable || !this.amazonIAPModule) return
    try {
      console.log('[Amazon IAP] Calling native endConnection()...')
      await this.amazonIAPModule.endConnection()
      console.log('[Amazon IAP] endConnection() completed')
    } catch (e: any) {
      console.error('[Amazon IAP] endConnection() failed:', e.message)
      // Don't throw - this is cleanup
    }
  }

  /**
   * Add listener for purchase updates
   */
  addPurchaseUpdateListener(
    callback: (purchase: PurchaseData) => void,
  ): EmitterSubscription {
    if (!this.eventEmitter) {
      throw new Error(
        'Event emitter not available. Native module may not be initialized.',
      )
    }
    const subscription = this.eventEmitter.addListener(
      'purchaseUpdated',
      callback,
    )
    this.subscriptions.push(subscription)
    console.log('[Amazon IAP] Purchase update listener added')
    return subscription
  }

  /**
   * Add listener for purchase errors
   */
  addPurchaseErrorListener(
    callback: (error: ErrorData) => void,
  ): EmitterSubscription {
    if (!this.eventEmitter) {
      throw new Error(
        'Event emitter not available. Native module may not be initialized.',
      )
    }
    const subscription = this.eventEmitter.addListener(
      'purchaseError',
      callback,
    )
    this.subscriptions.push(subscription)
    console.log('[Amazon IAP] Purchase error listener added')
    return subscription
  }

  /**
   * Add listener for products loaded
   */
  addProductsLoadedListener(
    callback: (data: ProductsLoadedEvent) => void,
  ): EmitterSubscription {
    if (!this.eventEmitter) {
      throw new Error(
        'Event emitter not available. Native module may not be initialized.',
      )
    }
    const subscription = this.eventEmitter.addListener(
      'productsLoaded',
      callback,
    )
    this.subscriptions.push(subscription)
    console.log('[Amazon IAP] Products loaded listener added')
    return subscription
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.subscriptions.forEach(sub => sub.remove())
    this.subscriptions = []
  }
}

export const amazonIAPNative = new AmazonIAPNative()
export type {ErrorData, ProductData, ProductsLoadedEvent, PurchaseData}
