/**
 * Sentry compatibility shim for BlueFly
 * 
 * Exports a Sentry-like interface that uses Firebase Crashlytics under the hood.
 */

import {isNative} from '#/platform/detection'

let crashlytics: any = null

if (isNative) {
  try {
    crashlytics = require('@react-native-firebase/crashlytics').default
  } catch (e) {
    // Firebase not available
  }
}

// Sentry-compatible interface using Firebase Crashlytics
export const Sentry = {
  captureException: (error: Error, context?: {tags?: Record<string, string>; extra?: Record<string, any>}) => {
    if (crashlytics && isNative) {
      try {
        if (context?.tags) {
          Object.entries(context.tags).forEach(([key, value]) => {
            crashlytics().setAttribute(key, String(value))
          })
        }
        if (context?.extra) {
          Object.entries(context.extra).forEach(([key, value]) => {
            crashlytics().setAttribute(key, JSON.stringify(value))
          })
        }
        crashlytics().recordError(error)
      } catch (e) {
        console.warn('Crashlytics error:', e)
      }
    }
    if (__DEV__) {
      console.error('[Error]', error, context)
    }
  },

  captureMessage: (message: string, captureContext?: {level?: string; tags?: Record<string, string>; extra?: Record<string, any>}) => {
    if (crashlytics && isNative) {
      try {
        const logMessage = `[${captureContext?.level || 'info'}] ${message}`
        crashlytics().log(logMessage)
      } catch (e) {
        console.warn('Crashlytics log error:', e)
      }
    }
    if (__DEV__) {
      console.log(`[${captureContext?.level || 'info'}]`, message)
    }
  },

  addBreadcrumb: (breadcrumb: {
    category?: string
    message?: string
    data?: Record<string, any>
    type?: string
    level?: string
    timestamp?: number
  }) => {
    if (crashlytics && isNative) {
      try {
        const msg = `[${breadcrumb.category || 'app'}] ${breadcrumb.message || ''}`
        crashlytics().log(msg)
      } catch (e) {
        console.warn('Crashlytics breadcrumb error:', e)
      }
    }
  },

  setUser: (user: {id?: string; email?: string; username?: string} | null) => {
    if (crashlytics && isNative && user) {
      try {
        if (user.id) crashlytics().setUserId(user.id)
      } catch (e) {
        console.warn('Crashlytics setUser error:', e)
      }
    }
  },

  // No-op functions for Sentry-specific features
  init: () => {},
  wrap: <T>(component: T): T => component,
  setTag: (_key: string, _value: string) => {},
  setTags: (_tags: Record<string, string>) => {},
  setExtra: (_key: string, _value: any) => {},
  setExtras: (_extras: Record<string, any>) => {},
  withScope: (callback: (scope: any) => void) => {
    callback({
      setTag: () => {},
      setExtra: () => {},
      setLevel: () => {},
    })
  },
}
