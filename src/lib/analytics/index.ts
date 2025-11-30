/**
 * Analytics module for BlueFly
 *
 * Platform-specific implementations:
 * - Native: Uses @react-native-firebase/analytics
 * - Web: No-op (can be extended with Firebase Web SDK if needed)
 */

export {
  firebaseAnalytics,
  logScreenView,
  logUserJourney,
  logInteraction,
  logButtonTap,
  logEvent,
  type ScreenName,
  type UserJourneyEvent,
  type InteractionEvent,
  type ButtonEvent,
  type EventParams,
} from './firebase'

