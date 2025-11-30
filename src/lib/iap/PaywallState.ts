/**
 * Paywall State Management
 * 
 * Tracks how many times the user has dismissed the paywall popup
 * to implement the progressive paywall blocking strategy.
 */

import {MMKV} from '@bsky.app/react-native-mmkv'

import {logger} from '#/logger'

// MMKV storage for paywall state
const paywallStorage = new MMKV({id: 'bluefly-paywall'})

const KEYS = {
  DISMISS_COUNT: 'dismissCount',
  LAST_SHOWN: 'lastShown',
  IS_SUBSCRIBED: 'isSubscribed',
} as const

/**
 * Get the number of times the paywall has been dismissed
 */
export function getDismissCount(): number {
  try {
    return paywallStorage.getNumber(KEYS.DISMISS_COUNT) ?? 0
  } catch (e) {
    logger.error('Failed to get paywall dismiss count', {error: e})
    return 0
  }
}

/**
 * Increment the dismiss count when user closes the paywall
 */
export function incrementDismissCount(): number {
  try {
    const current = getDismissCount()
    const newCount = current + 1
    paywallStorage.set(KEYS.DISMISS_COUNT, newCount)
    logger.info('Paywall dismiss count incremented', {count: newCount})
    return newCount
  } catch (e) {
    logger.error('Failed to increment paywall dismiss count', {error: e})
    return 0
  }
}

/**
 * Check if the paywall can be dismissed
 * - First 2 times: Can be dismissed (count 0 and 1)
 * - Third time onwards: Cannot be dismissed (count >= 2)
 */
export function canDismissPaywall(): boolean {
  const count = getDismissCount()
  // First time (count=0) and second time (count=1) can dismiss
  // Third time (count=2) and onwards cannot dismiss
  return count < 2
}

/**
 * Record when the paywall was last shown
 */
export function setLastShownTime(): void {
  try {
    paywallStorage.set(KEYS.LAST_SHOWN, Date.now())
  } catch (e) {
    logger.error('Failed to set paywall last shown time', {error: e})
  }
}

/**
 * Get the last time the paywall was shown
 */
export function getLastShownTime(): number | null {
  try {
    const time = paywallStorage.getNumber(KEYS.LAST_SHOWN)
    return time ?? null
  } catch (e) {
    logger.error('Failed to get paywall last shown time', {error: e})
    return null
  }
}

/**
 * Check if the user is subscribed (bypass paywall)
 */
export function isUserSubscribed(): boolean {
  try {
    return paywallStorage.getBoolean(KEYS.IS_SUBSCRIBED) ?? false
  } catch (e) {
    logger.error('Failed to check subscription status', {error: e})
    return false
  }
}

/**
 * Set subscription status
 */
export function setSubscriptionStatus(subscribed: boolean): void {
  try {
    paywallStorage.set(KEYS.IS_SUBSCRIBED, subscribed)
    logger.info('Subscription status updated', {subscribed})
  } catch (e) {
    logger.error('Failed to set subscription status', {error: e})
  }
}

/**
 * Reset paywall state (for testing or after subscription)
 */
export function resetPaywallState(): void {
  try {
    paywallStorage.delete(KEYS.DISMISS_COUNT)
    paywallStorage.delete(KEYS.LAST_SHOWN)
    logger.info('Paywall state reset')
  } catch (e) {
    logger.error('Failed to reset paywall state', {error: e})
  }
}

