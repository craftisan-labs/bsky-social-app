/**
 * Analytics Hook for BlueFly
 *
 * Provides convenient methods for logging analytics events with
 * automatic user identification injection.
 */

import {useCallback, useMemo} from 'react'
import {Platform} from 'react-native'

import {useSession} from '#/state/session'
import {
  type EventParams,
  firebaseAnalytics,
  type OnboardingEvent,
  type OnboardingEventParams,
  type PaywallEvent,
  type PaywallEventParams,
  type SessionEvent,
  type SessionEventParams,
  type SubscriptionEvent,
} from './firebase'

/**
 * Hook that provides analytics methods with automatic user_did injection
 */
export function useAnalytics() {
  const {currentAccount} = useSession()
  const userDid = currentAccount?.did

  /**
   * Track a paywall event with user identification
   */
  const trackPaywall = useCallback(
    (event: PaywallEvent, params?: Omit<PaywallEventParams, 'user_did'>) => {
      firebaseAnalytics.logPaywallEvent(event, {
        ...params,
        user_did: userDid,
      })
    },
    [userDid],
  )

  /**
   * Track a subscription event with user identification
   */
  const trackSubscription = useCallback(
    (event: SubscriptionEvent, params?: Omit<EventParams, 'user_did'>) => {
      firebaseAnalytics.logSubscriptionEvent(event, {
        ...params,
        user_did: userDid,
      })
    },
    [userDid],
  )

  /**
   * Track an onboarding event with user identification
   */
  const trackOnboarding = useCallback(
    (
      event: OnboardingEvent,
      params?: Omit<OnboardingEventParams, 'user_did'>,
    ) => {
      firebaseAnalytics.logOnboardingEvent(event, {
        ...params,
        user_did: userDid,
      })
    },
    [userDid],
  )

  /**
   * Track a session event with user identification
   */
  const trackSession = useCallback(
    (event: SessionEvent, params?: Omit<SessionEventParams, 'user_did'>) => {
      firebaseAnalytics.logSessionEvent(event, {
        ...params,
        user_did: userDid,
      })
    },
    [userDid],
  )

  /**
   * Track a custom event with user identification
   */
  const trackEvent = useCallback(
    (eventName: string, params?: EventParams) => {
      firebaseAnalytics.logEvent(eventName, {
        ...params,
        user_did: userDid,
      })
    },
    [userDid],
  )

  /**
   * Set user properties for segmentation
   */
  const setUserProperties = useCallback(
    (properties: Record<string, string | null>) => {
      firebaseAnalytics.setUserProperties({
        ...properties,
        platform: Platform.OS,
      })
    },
    [],
  )

  /**
   * Set user ID for analytics
   */
  const setUserId = useCallback((userId: string | null) => {
    firebaseAnalytics.setUserId(userId)
  }, [])

  return useMemo(
    () => ({
      trackPaywall,
      trackSubscription,
      trackOnboarding,
      trackSession,
      trackEvent,
      setUserProperties,
      setUserId,
      userDid,
    }),
    [
      trackPaywall,
      trackSubscription,
      trackOnboarding,
      trackSession,
      trackEvent,
      setUserProperties,
      setUserId,
      userDid,
    ],
  )
}
