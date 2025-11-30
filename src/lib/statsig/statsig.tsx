/**
 * Analytics module for BlueFly
 * 
 * This file provides compatibility with the original Statsig API.
 * BlueFly uses Firebase Analytics instead of Statsig.
 */

import React from 'react'
import {AppState, type AppStateStatus} from 'react-native'

import {logger} from '#/logger'
import {type MetricEvents} from '#/logger/metrics'
import {firebaseAnalytics} from '#/lib/analytics/firebase'
import {type Gate} from './gates'

export type {MetricEvents as LogEvents}

// =============================================================================
// Statsig Compatibility Layer
// =============================================================================

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
 * @deprecated use `logger.metric()` instead
 */
export function logEvent<E extends keyof MetricEvents>(
  eventName: E & string,
  rawMetadata: MetricEvents[E] & FlatJSONRecord,
  _options: {
    lake?: boolean
  } = {lake: false},
) {
  try {
    const fullMetadata = toStringRecord(rawMetadata)
    fullMetadata.routeName = getCurrentRouteName() ?? '(Uninitialized)'
    // Log to Firebase Analytics
    firebaseAnalytics.logEvent(eventName, fullMetadata)
    logger.info(eventName, fullMetadata)
  } catch (e) {
    logger.error('Failed to log an event', {message: e})
  }
}

function toStringRecord<E extends keyof MetricEvents>(
  metadata: MetricEvents[E] & FlatJSONRecord,
): Record<string, string> {
  const record: Record<string, string> = {}
  for (let key in metadata) {
    if (metadata.hasOwnProperty(key)) {
      if (typeof metadata[key] === 'string') {
        record[key] = metadata[key] as string
      } else {
        record[key] = JSON.stringify(metadata[key])
      }
    }
  }
  return record
}

// Gate functionality - returns a function that always returns false since we don't use Statsig gates
export function useGate(): (gate: Gate) => boolean {
  return (_gate: Gate) => false
}

export function useDangerousSetGate(): (gate: Gate, value: boolean) => void {
  return (_gate: Gate, _value: boolean) => {}
}

// App state tracking
let lastState: AppStateStatus = AppState.currentState
let lastActive = lastState === 'active' ? performance.now() : null
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === lastState) {
    return
  }
  lastState = state
  if (state === 'active') {
    lastActive = performance.now()
    logEvent('state:foreground', {})
  } else {
    let secondsActive = 0
    if (lastActive != null) {
      secondsActive = Math.round((performance.now() - lastActive) / 1e3)
      lastActive = null
      logEvent('state:background', {
        secondsActive,
      })
    }
  }
})

// Initialization - no-op for Firebase (auto-initialized)
export const initPromise = Promise.resolve()

export function initialize() {
  return Promise.resolve()
}

export async function tryFetchGates(
  _did: string | undefined,
  _strategy: 'prefer-low-latency' | 'prefer-fresh-gates',
) {
  return Promise.resolve()
}

export function setUserId(userId: string | null) {
  firebaseAnalytics.setUserId(userId)
}

export function logError(error: Error, context?: string) {
  logger.error(context || 'Error', {error: error.message})
}

// Provider component - just passes through children
export function Provider({children}: {children: React.ReactNode}) {
  return <>{children}</>
}
