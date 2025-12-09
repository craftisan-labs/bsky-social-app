/**
 * Amazon Receipt Validation Service
 *
 * Validates Amazon IAP receipts using Firebase Cloud Functions
 * which call Amazon's Receipt Verification Service (RVS).
 *
 * For production security:
 * - Receipts are validated server-side via Firebase Functions
 * - Amazon shared secret is stored securely in Firebase config
 * - Client only sends receipt ID and product ID
 *
 * Amazon RVS Documentation:
 * https://developer.amazon.com/docs/in-app-purchasing/iap-rvs-for-android-apps.html
 */

import {logger} from '#/logger'
import {
  AMAZON_DEVELOPER_ID,
  AMAZON_SHARED_SECRET,
  IAP_VALIDATION_URL,
  USE_SANDBOX,
  VALIDATION_TIMEOUT,
} from './config'

// =============================================================================
// Types
// =============================================================================

export interface ReceiptValidationResult {
  isValid: boolean
  receiptId?: string
  productId?: string
  purchaseDate?: string
  expirationDate?: string
  cancelDate?: string
  isTrialPeriod?: boolean
  autoRenewing?: boolean
  renewalDate?: string
  error?: string
}

interface AmazonRVSResponse {
  receiptId: string
  productType: string
  productId: string
  purchaseDate: number
  cancelDate?: number
  testTransaction?: boolean
  // Subscription specific fields
  renewalDate?: number
  term?: string
  termSku?: string
  freeTrialPeriod?: string
  betaProduct?: boolean
}

// =============================================================================
// Configuration
// =============================================================================

// Amazon RVS endpoints (used as fallback if Firebase validation fails)
const AMAZON_RVS_PRODUCTION =
  'https://appstore-sdk.amazon.com/version/1.0/verifyReceiptId'
const AMAZON_RVS_SANDBOX =
  'https://appstore-sdk.amazon.com/sandbox/version/1.0/verifyReceiptId'

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate an Amazon IAP receipt
 *
 * This function will:
 * 1. First try to validate with your backend server (recommended for production)
 * 2. Fall back to direct Amazon RVS call (for development/testing)
 *
 * @param receiptId - The purchase token/receipt ID from the purchase
 * @param productId - The product SKU that was purchased
 * @param userId - Optional user ID for your backend
 */
export async function validateAmazonReceipt(
  receiptId: string,
  productId: string,
  userId?: string,
): Promise<ReceiptValidationResult> {
  if (!receiptId) {
    return {
      isValid: false,
      error: 'No receipt ID provided',
    }
  }

  logger.info('Validating Amazon receipt', {
    receiptIdLength: receiptId.length,
    productId,
    useSandbox: USE_SANDBOX,
    hasValidationUrl: Boolean(
      IAP_VALIDATION_URL && !IAP_VALIDATION_URL.includes('YOUR-PROJECT-ID'),
    ),
  })

  // Try Firebase backend validation first (recommended for production)
  const hasValidUrl =
    IAP_VALIDATION_URL && !IAP_VALIDATION_URL.includes('YOUR-PROJECT-ID')

  if (hasValidUrl) {
    try {
      const result = await validateWithBackend(receiptId, productId, userId)
      if (result.isValid || !result.error?.includes('server')) {
        return result
      }
      // Fall back to direct validation if server is unavailable
      logger.warn('Backend validation failed, falling back to direct RVS')
    } catch (error) {
      logger.warn('Backend validation error, falling back to direct RVS', {
        error,
      })
    }
  }

  // Direct Amazon RVS validation (for development or fallback)
  return validateWithAmazonRVS(receiptId, productId)
}

/**
 * Validate receipt with your backend server
 *
 * Your backend should:
 * 1. Receive the receipt
 * 2. Call Amazon RVS with your developer shared secret
 * 3. Store the subscription status in your database
 * 4. Return validation result
 */
async function validateWithBackend(
  receiptId: string,
  productId: string,
  userId?: string,
): Promise<ReceiptValidationResult> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT)

    const response = await fetch(IAP_VALIDATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiptId,
        productId,
        userId,
        platform: 'amazon',
        isSandbox: USE_SANDBOX,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Backend validation failed', {
        status: response.status,
        error: errorText,
      })
      return {
        isValid: false,
        error: `Validation server error: ${response.status}`,
      }
    }

    const result = await response.json()

    logger.info('Backend validation result', {
      isValid: result.isValid,
      productId: result.productId,
    })

    return {
      isValid: result.isValid,
      receiptId: result.receiptId,
      productId: result.productId,
      purchaseDate: result.purchaseDate,
      expirationDate: result.expirationDate,
      isTrialPeriod: result.isTrialPeriod,
      autoRenewing: result.autoRenewing,
      renewalDate: result.renewalDate,
      error: result.error,
    }
  } catch (error: any) {
    logger.error('Backend validation request failed', {error: error.message})
    return {
      isValid: false,
      error: `Failed to connect to validation server: ${error.message}`,
    }
  }
}

/**
 * Direct validation with Amazon RVS
 *
 * Note: For production, this should be done server-side with your shared secret.
 * This client-side implementation is primarily for development and testing.
 *
 * Amazon RVS requires:
 * - Developer ID (from Amazon Developer Console)
 * - Shared Secret (should be kept server-side in production)
 * - Receipt ID (purchase token)
 * - User ID (Amazon user ID)
 */
async function validateWithAmazonRVS(
  receiptId: string,
  productId: string,
): Promise<ReceiptValidationResult> {
  try {
    // Get Amazon developer credentials from config
    const developerSecret = AMAZON_SHARED_SECRET
    const developerId = AMAZON_DEVELOPER_ID

    if (!developerSecret || !developerId) {
      logger.warn(
        'Amazon credentials not configured - using optimistic validation for development',
      )

      // For development without credentials, do optimistic validation
      // In production, Firebase Functions handle validation securely
      if (__DEV__) {
        return {
          isValid: true,
          receiptId,
          productId,
          purchaseDate: new Date().toISOString(),
          expirationDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days from now
          isTrialPeriod: true, // Assume trial for development
          autoRenewing: true,
        }
      }

      // In production, if we get here it means Firebase validation failed
      // and we don't have fallback credentials - this is expected
      // The Firebase function should handle all validation
      return {
        isValid: false,
        error: 'Validation service unavailable. Please try again.',
      }
    }

    const rvsUrl = USE_SANDBOX ? AMAZON_RVS_SANDBOX : AMAZON_RVS_PRODUCTION

    // Amazon RVS endpoint format:
    // GET /version/1.0/verifyReceiptId/developer/{developerId}/user/{userId}/receiptId/{receiptId}
    // Note: For subscriptions, userId can be extracted from the receipt
    const url = `${rvsUrl}/developer/${developerId}/user/unknown/receiptId/${receiptId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-amz-access-token': developerSecret,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Amazon RVS validation failed', {
        status: response.status,
        error: errorText,
      })

      // Check for specific error codes
      if (response.status === 400) {
        return {
          isValid: false,
          error: 'Invalid receipt format',
        }
      } else if (response.status === 496) {
        // Receipt expired/cancelled
        return {
          isValid: false,
          error: 'Subscription cancelled or expired',
        }
      } else if (response.status === 497) {
        // Receipt invalid
        return {
          isValid: false,
          error: 'Invalid receipt - purchase not found',
        }
      } else if (response.status === 500) {
        return {
          isValid: false,
          error: 'Amazon server error - please try again',
        }
      }

      return {
        isValid: false,
        error: `Amazon RVS error: ${response.status}`,
      }
    }

    const data: AmazonRVSResponse = await response.json()

    logger.info('Amazon RVS validation result', {
      receiptId: data.receiptId,
      productType: data.productType,
      productId: data.productId,
      isTest: data.testTransaction,
    })

    // Check if receipt is cancelled
    if (data.cancelDate) {
      return {
        isValid: false,
        cancelDate: new Date(data.cancelDate).toISOString(),
        error: 'Subscription has been cancelled',
      }
    }

    // Determine trial period from the response
    const isTrialPeriod = Boolean(data.freeTrialPeriod)

    // Calculate expiration date for subscriptions
    let expirationDate: string | undefined
    if (data.renewalDate) {
      expirationDate = new Date(data.renewalDate).toISOString()
    }

    return {
      isValid: true,
      receiptId: data.receiptId,
      productId: data.productId,
      purchaseDate: new Date(data.purchaseDate).toISOString(),
      expirationDate,
      isTrialPeriod,
      autoRenewing: !data.cancelDate,
      renewalDate: data.renewalDate
        ? new Date(data.renewalDate).toISOString()
        : undefined,
    }
  } catch (error: any) {
    logger.error('Amazon RVS validation request failed', {error: error.message})
    return {
      isValid: false,
      error: `Validation request failed: ${error.message}`,
    }
  }
}

/**
 * Verify if a subscription is still active
 * Call this periodically to ensure the subscription hasn't been cancelled
 */
export async function verifySubscriptionActive(
  receiptId: string,
  productId: string,
): Promise<boolean> {
  const result = await validateAmazonReceipt(receiptId, productId)

  if (!result.isValid) {
    logger.info('Subscription no longer active', {error: result.error})
    return false
  }

  // Check expiration
  if (result.expirationDate) {
    const expirationTime = new Date(result.expirationDate).getTime()
    if (expirationTime < Date.now()) {
      logger.info('Subscription expired', {
        expirationDate: result.expirationDate,
      })
      return false
    }
  }

  return true
}
