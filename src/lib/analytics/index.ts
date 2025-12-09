/**
 * Analytics module for BlueFly
 *
 * Platform-specific implementations:
 * - Native: Uses @react-native-firebase/analytics
 * - Web: No-op (can be extended with Firebase Web SDK if needed)
 */

export {
  type ButtonEvent,
  type EventParams,
  firebaseAnalytics,
  type InteractionEvent,
  logButtonTap,
  logEvent,
  logInteraction,
  logOnboardingEvent,
  logPaywallEvent,
  logScreenView,
  logSessionEvent,
  logSubscriptionEvent,
  logUserJourney,
  type OnboardingEvent,
  type OnboardingEventParams,
  type PaywallEvent,
  type PaywallEventParams,
  type ScreenName,
  type SessionEvent,
  type SessionEventParams,
  type SubscriptionEvent,
  type UserJourneyEvent,
} from './firebase'
export {useAnalytics} from './useAnalytics'
