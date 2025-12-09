/**
 * Paywall Provider
 *
 * Manages paywall visibility and timing logic:
 * - Shows on login/signup
 * - Shows 3 seconds after app becomes active
 * - Tracks dismiss count to determine if close button is available
 * - From 3rd time onwards, paywall is ALWAYS shown and cannot be dismissed
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {AppState, type AppStateStatus} from 'react-native'
import type React from 'react'

import {useAnalytics} from '#/lib/analytics'
import {logger} from '#/logger'
import {useSession} from '#/state/session'
import {PaywallModal} from '#/components/PaywallModal'
import {useIsSubscribed} from './IAPContext'
import {
  canDismissPaywall,
  getDismissCount,
  isUserSubscribed,
} from './PaywallState'

type PaywallSource = 'login' | 'app_foreground' | 'manual' | 'session_start'

// =============================================================================
// Types
// =============================================================================

interface PaywallContextType {
  showPaywall: () => void
  hidePaywall: () => void
  isVisible: boolean
}

const PaywallContext = createContext<PaywallContextType>({
  showPaywall: () => {},
  hidePaywall: () => {},
  isVisible: false,
})

// =============================================================================
// Provider
// =============================================================================

export function PaywallProvider({children}: {children: React.ReactNode}) {
  const [isVisible, setIsVisible] = useState(false)
  const [paywallSource, setPaywallSource] = useState<PaywallSource>('manual')
  const {hasSession} = useSession()
  const {trackPaywall} = useAnalytics()
  const isSubscribedFromContext = useIsSubscribed()
  const appState = useRef(AppState.currentState)
  const hasShownOnLaunch = useRef(false)
  const lastShownTimestamp = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Minimum time between paywall shows (prevents double-showing)
  const MIN_SHOW_INTERVAL = 5000 // 5 seconds

  // Check subscription from both IAPContext and PaywallState for redundancy
  const checkIsSubscribed = useCallback(() => {
    return isSubscribedFromContext || isUserSubscribed()
  }, [isSubscribedFromContext])

  const showPaywallWithSource = useCallback(
    (source: PaywallSource = 'manual') => {
      // Don't show if user is subscribed (check both sources)
      if (checkIsSubscribed()) {
        logger.info('Paywall skipped - user is subscribed')
        return
      }

      // Only show if user is logged in
      if (!hasSession) {
        logger.info('Paywall skipped - no session')
        return
      }

      // Don't show if already visible
      if (isVisible) {
        logger.info('Paywall skipped - already visible')
        return
      }

      // Don't show if shown recently (prevents double-show on dismiss)
      const now = Date.now()
      if (now - lastShownTimestamp.current < MIN_SHOW_INTERVAL) {
        logger.info('Paywall skipped - shown recently')
        return
      }

      const dismissCount = getDismissCount()
      const canDismiss = canDismissPaywall()

      // Track paywall triggered event
      trackPaywall('paywall_triggered', {
        source,
        dismiss_count: dismissCount,
        can_dismiss: canDismiss,
      })

      lastShownTimestamp.current = now
      setPaywallSource(source)
      setIsVisible(true)
      logger.info('Paywall shown', {dismissCount, canDismiss, source})
    },
    [hasSession, isVisible, trackPaywall, checkIsSubscribed],
  )

  // Wrapper for external use (without source parameter)
  const showPaywall = useCallback(() => {
    showPaywallWithSource('manual')
  }, [showPaywallWithSource])

  const hidePaywall = useCallback(() => {
    // The PaywallModal already checks canDismissPaywall() before calling onClose
    // So if we get here from a user dismiss, it was already validated
    // We just need to hide the modal
    setIsVisible(false)
    logger.info('Paywall hidden (user dismissed)')
  }, [])

  // Force hide for subscription success (bypasses canDismiss check)
  const forceHidePaywall = useCallback(() => {
    setIsVisible(false)
    logger.info('Paywall force hidden (subscription success)')
  }, [])

  // Show paywall 3 seconds after app becomes active (from background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // App coming to foreground from background
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        logger.info('App became active from background')

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Show paywall after 3 seconds if user is logged in and not subscribed
        if (hasSession && !checkIsSubscribed()) {
          timeoutRef.current = setTimeout(() => {
            showPaywallWithSource('app_foreground')
          }, 3000)
        }
      }

      appState.current = nextAppState
    }

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    )

    return () => {
      subscription.remove()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [hasSession, showPaywallWithSource, checkIsSubscribed])

  // Show paywall on initial login/session (first app open only)
  useEffect(() => {
    if (hasSession && !hasShownOnLaunch.current && !checkIsSubscribed()) {
      hasShownOnLaunch.current = true
      // Small delay to let the app render first
      const timer = setTimeout(() => {
        showPaywallWithSource('session_start')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [hasSession, showPaywallWithSource, checkIsSubscribed])

  const handleSubscribed = useCallback(() => {
    logger.info('User subscribed via paywall')
    forceHidePaywall() // Use force hide for subscription success
  }, [forceHidePaywall])

  const value: PaywallContextType = {
    showPaywall,
    hidePaywall,
    isVisible,
  }

  return (
    <PaywallContext.Provider value={value}>
      {children}
      <PaywallModal
        visible={isVisible}
        onClose={hidePaywall}
        onSubscribed={handleSubscribed}
        source={paywallSource}
      />
    </PaywallContext.Provider>
  )
}

// =============================================================================
// Hook
// =============================================================================

export function usePaywall() {
  return useContext(PaywallContext)
}
