/**
 * Sentry compatibility shim for BlueFly (Web)
 * 
 * Firebase Crashlytics doesn't work on web, so this is a no-op.
 * Errors are logged to the console instead.
 */

export const Sentry = {
  captureException: (error: Error, context?: any) => {
    console.error('[Error]', error, context)
  },
  captureMessage: (message: string, captureContext?: any) => {
    console.log(`[${captureContext?.level || 'info'}]`, message)
  },
  addBreadcrumb: (breadcrumb: any) => {
    if (__DEV__) {
      console.log(`[Breadcrumb] ${breadcrumb.category}: ${breadcrumb.message}`)
    }
  },
  setUser: (_user: any) => {},
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
