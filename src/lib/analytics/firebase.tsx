/**
 * Firebase Analytics integration for BlueFly
 * Replaces Statsig analytics from the original Bluesky app
 */
import React from 'react'
import {Platform} from 'react-native'

import {logger} from '#/logger'
import {type MetricEvents} from '#/logger/metrics'
import {isNative} from '#/platform/detection'

// Firebase imports - will be available after running yarn install
let analytics: any = null
let crashlytics: any = null

// Initialize Firebase Analytics (native only)
if (isNative) {
  try {
    analytics = require('@react-native-firebase/analytics').default
    crashlytics = require('@react-native-firebase/crashlytics').default
  } catch (e) {
    // Firebase not available, will use no-op
    console.log('Firebase Analytics not available')
  }
}

export type {MetricEvents as LogEvents}

// Feature gates - returns false for all gates (no feature flagging without Statsig)
// You can implement your own feature flag system using Firebase Remote Config if needed
type Gate = string

type GateOptions = {
  dangerouslyDisableExposureLogging?: boolean
}

const GateCache = React.createContext<Map<string, boolean> | null>(null)
GateCache.displayName = 'GateCacheContext'

export function useGate(): (gateName: Gate, options?: GateOptions) => boolean {
  const cache = React.useContext(GateCache)
  if (!cache) {
    throw Error('useGate() cannot be called outside Provider.')
  }
  // Return false for all gates - no feature flagging
  // If you need feature flags, implement Firebase Remote Config here
  return React.useCallback((_gateName: Gate, _options?: GateOptions) => {
    return false
  }, [])
}

export function useDangerousSetGate(): (
  gateName: Gate,
  value: boolean,
) => void {
  const cache = React.useContext(GateCache)
  if (!cache) {
    throw Error('useDangerousSetGate() cannot be called outside Provider.')
  }
  return React.useCallback(
    (gateName: Gate, value: boolean) => {
      cache.set(gateName, value)
    },
    [cache],
  )
}

let getCurrentRouteName: () => string | null | undefined = () => null

export function attachRouteToLogEvents(
  getRouteName: () => string | null | undefined,
) {
  getCurrentRouteName = getRouteName
}

export function toClout(n: number | null | undefined): number | undefined {
  if (n == null) {
    return undefined
  } else {
    return Math.max(0, Math.round(Math.log(n)))
  }
}

type FlatJSONRecord = Record<
  string,
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
>

/**
 * Log an event to Firebase Analytics
 */
export function logEvent<E extends keyof MetricEvents>(
  eventName: E & string,
  rawMetadata: MetricEvents[E] & FlatJSONRecord,
  _options: {lake?: boolean} = {lake: false},
) {
  try {
    const metadata: Record<string, any> = {...rawMetadata}
    metadata.routeName = getCurrentRouteName() ?? '(Uninitialized)'
    metadata.platform = Platform.OS

    // Log to Firebase Analytics if available
    if (analytics && isNative) {
      // Firebase event names must be alphanumeric with underscores
      const firebaseEventName = eventName.replace(/[^a-zA-Z0-9_]/g, '_')
      analytics().logEvent(firebaseEventName, metadata).catch((e: any) => {
        console.warn('Firebase Analytics error:', e)
      })
    }

    // Also log to console in dev mode
    if (__DEV__) {
      logger.debug(`[Analytics] ${eventName}`, metadata)
    }
  } catch (e) {
    // A log should never interrupt the calling code
    logger.error('Failed to log an event', {message: e})
  }
}

/**
 * Initialize analytics - called on app start
 */
export async function initialize() {
  if (analytics && isNative) {
    try {
      await analytics().setAnalyticsCollectionEnabled(true)
      console.log('Firebase Analytics initialized')
    } catch (e) {
      console.warn('Firebase Analytics initialization failed:', e)
    }
  }
  return Promise.resolve()
}

export const initPromise = initialize()

/**
 * Fetch gates - no-op since we're not using Statsig
 */
export async function tryFetchGates(
  _did: string | undefined,
  _strategy: 'prefer-low-latency' | 'prefer-fresh-gates',
) {
  // No-op - gates always return false
  return Promise.resolve()
}

/**
 * Analytics Provider component
 */
export function Provider({children}: {children: React.ReactNode}) {
  const [gateCache] = React.useState(() => new Map<string, boolean>())

  return (
    <GateCache.Provider value={gateCache}>
      {children}
    </GateCache.Provider>
  )
}

/**
 * Set user ID for analytics
 */
export async function setUserId(userId: string | null) {
  if (analytics && isNative) {
    try {
      await analytics().setUserId(userId)
    } catch (e) {
      console.warn('Failed to set user ID:', e)
    }
  }
}

/**
 * Log error to Crashlytics
 */
export function logError(error: Error, context?: Record<string, any>) {
  if (crashlytics && isNative) {
    try {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          crashlytics().setAttribute(key, String(value))
        })
      }
      crashlytics().recordError(error)
    } catch (e) {
      console.warn('Failed to log error to Crashlytics:', e)
    }
  }
}

