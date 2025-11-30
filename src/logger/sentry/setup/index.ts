/**
 * Error tracking setup for BlueFly
 * 
 * Uses Firebase Crashlytics instead of Sentry.
 * This is a compatibility shim that maintains the same interface.
 */

import {isNative} from '#/platform/detection'

let crashlytics: any = null

if (isNative) {
  try {
    crashlytics = require('@react-native-firebase/crashlytics').default
  } catch (e) {
    console.log('Firebase Crashlytics not available')
  }
}

// Initialize Crashlytics
if (crashlytics && isNative) {
  crashlytics()
    .setCrashlyticsCollectionEnabled(true)
    .catch((e: any) => {
      console.warn('Failed to enable Crashlytics:', e)
    })
}

// Export a Sentry-like interface for compatibility
export const Sentry = {
  captureException: (error: Error, context?: any) => {
    if (crashlytics && isNative) {
      try {
        if (context) {
          Object.entries(context).forEach(([key, value]) => {
            crashlytics().setAttribute(key, String(value))
          })
        }
        crashlytics().recordError(error)
      } catch (e) {
        console.warn('Failed to record error:', e)
      }
    }
    console.error('[Crashlytics]', error, context)
  },
  captureMessage: (message: string, level?: string) => {
    if (crashlytics && isNative) {
      try {
        crashlytics().log(message)
      } catch (e) {
        console.warn('Failed to log message:', e)
      }
    }
    console.log(`[Crashlytics ${level || 'info'}]`, message)
  },
  setUser: (user: {id?: string; email?: string; username?: string} | null) => {
    if (crashlytics && isNative && user) {
      try {
        if (user.id) crashlytics().setUserId(user.id)
        if (user.email) crashlytics().setAttribute('email', user.email)
        if (user.username) crashlytics().setAttribute('username', user.username)
      } catch (e) {
        console.warn('Failed to set user:', e)
      }
    }
  },
  addBreadcrumb: (breadcrumb: {category?: string; message?: string; data?: any}) => {
    if (crashlytics && isNative) {
      try {
        const msg = `[${breadcrumb.category || 'app'}] ${breadcrumb.message || ''}`
        crashlytics().log(msg)
      } catch (e) {
        console.warn('Failed to add breadcrumb:', e)
      }
    }
  },
  // No-op for Sentry-specific functions
  init: () => {},
  wrap: <T>(component: T): T => component,
}

export default Sentry
