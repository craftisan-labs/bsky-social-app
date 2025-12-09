/**
 * IAP Configuration for BlueFly
 *
 * Production configuration for Amazon IAP receipt validation.
 *
 * IMPORTANT: For production builds, fill in your actual values below.
 * These values should match your Amazon Developer Console and Firebase setup.
 */

// =============================================================================
// PRODUCTION CONFIGURATION - Fill these in before production build
// =============================================================================

/**
 * Firebase Cloud Function URL for receipt validation
 * Get this from: Firebase Console → Functions → validateAmazonReceipt
 * Format: https://<region>-<project-id>.cloudfunctions.net/validateAmazonReceipt
 */
export const IAP_VALIDATION_URL =
  'https://us-central1-bluefly-firestore.cloudfunctions.net/validateAmazonReceipt'

/**
 * Amazon Developer ID
 * Get this from: Amazon Developer Console → Settings → Identity
 * Only needed if doing direct RVS validation (fallback)
 */
export const AMAZON_DEVELOPER_ID = ''

/**
 * Amazon Shared Secret
 * Get this from: Amazon Developer Console → Settings → Identity
 *
 * WARNING: For production, this should be kept server-side only!
 * The Firebase function handles this securely. Leave empty here.
 */
export const AMAZON_SHARED_SECRET = ''

// =============================================================================
// Environment Detection
// =============================================================================

/**
 * Check if we're in production mode
 * In React Native, __DEV__ is true for development builds
 */
export const IS_PRODUCTION = !__DEV__

/**
 * Use sandbox for development, production for release builds
 */
export const USE_SANDBOX = __DEV__

// =============================================================================
// Validation Configuration
// =============================================================================

/**
 * How often to re-validate subscriptions (in milliseconds)
 * Default: 24 hours
 */
export const VALIDATION_INTERVAL = 24 * 60 * 60 * 1000

/**
 * Timeout for validation requests (in milliseconds)
 * Default: 30 seconds
 */
export const VALIDATION_TIMEOUT = 30 * 1000
