/**
 * Paywall Provider
 * 
 * Manages paywall visibility and timing logic:
 * - Shows on login/signup
 * - Shows 3 seconds after app becomes active
 * - Tracks dismiss count to determine if close button is available
 * - From 3rd time onwards, paywall is ALWAYS shown and cannot be dismissed
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {AppState, type AppStateStatus} from 'react-native'

import {logger} from '#/logger'
import {useSession} from '#/state/session'
import {PaywallModal} from '#/components/PaywallModal'

import {isUserSubscribed, canDismissPaywall, getDismissCount} from './PaywallState'

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
  const {hasSession} = useSession()
  const appState = useRef(AppState.currentState)
  const hasShownOnLaunch = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showPaywall = useCallback(() => {
    // Don't show if user is subscribed
    if (isUserSubscribed()) {
      logger.info('Paywall skipped - user is subscribed')
      return
    }
    
    // Only show if user is logged in
    if (!hasSession) {
      logger.info('Paywall skipped - no session')
      return
    }

    setIsVisible(true)
    const dismissCount = getDismissCount()
    const canDismiss = canDismissPaywall()
    logger.info('Paywall shown', {dismissCount, canDismiss})
  }, [hasSession])

  const hidePaywall = useCallback(() => {
    // Only allow hiding if user CAN dismiss (not hard paywall)
    // The actual check is in PaywallModal, but we double-check here
    if (canDismissPaywall()) {
      setIsVisible(false)
      logger.info('Paywall hidden (user dismissed)')
    } else {
      // Hard paywall - don't hide unless subscribed
      logger.info('Paywall hide blocked - hard paywall active')
    }
  }, [])

  // Force hide for subscription success (bypasses canDismiss check)
  const forceHidePaywall = useCallback(() => {
    setIsVisible(false)
    logger.info('Paywall force hidden (subscription success)')
  }, [])

  // Show paywall 3 seconds after app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // App coming to foreground from background
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        logger.info('App became active')
        
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Show paywall after 3 seconds if user is logged in and not subscribed
        if (hasSession && !isUserSubscribed()) {
          timeoutRef.current = setTimeout(() => {
            showPaywall()
          }, 3000)
        }
      }

      appState.current = nextAppState
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      subscription.remove()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [hasSession, showPaywall])

  // Show paywall on initial login/session
  useEffect(() => {
    if (hasSession && !hasShownOnLaunch.current && !isUserSubscribed()) {
      hasShownOnLaunch.current = true
      // Small delay to let the app render first
      const timer = setTimeout(() => {
        showPaywall()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [hasSession, showPaywall])

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
