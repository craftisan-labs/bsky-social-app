/**
 * IAP Module Exports
 *
 * Amazon In-App Purchase integration for BlueFly.
 * Uses react-native-iap with server-side receipt validation.
 */

export {
  ALL_SUBSCRIPTION_SKUS,
  amazonIAP,
  type PurchaseResult,
  SUBSCRIPTION_SKUS,
  type SubscriptionProduct,
  type SubscriptionStatus,
  type SubscriptionTier,
} from './amazon'
export {IAP_VALIDATION_URL, IS_PRODUCTION, USE_SANDBOX} from './config'
export {
  IAPProvider,
  useIAP,
  useIsSubscribed,
  useIsTrialPeriod,
  useSubscriptionStatus,
  useSubscriptionTier,
} from './IAPContext'
export {PaywallProvider, usePaywall} from './PaywallProvider'
export {
  canDismissPaywall,
  getDismissCount,
  incrementDismissCount,
  isUserSubscribed,
  resetPaywallState,
  setSubscriptionStatus,
} from './PaywallState'
export {
  type ReceiptValidationResult,
  validateAmazonReceipt,
  verifySubscriptionActive,
} from './receiptValidation'
