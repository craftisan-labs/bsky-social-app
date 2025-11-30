const {withAndroidManifest} = require('@expo/config-plugins')

/**
 * Expo config plugin to disable Firebase Crashlytics
 * This adds meta-data tags to AndroidManifest.xml to disable Crashlytics auto-initialization
 */
const withDisableFirebaseCrashlytics = config => {
  return withAndroidManifest(config, async config => {
    const mainApplication = config.modResults.manifest.application?.[0]

    if (mainApplication) {
      // Ensure 'meta-data' array exists
      if (!mainApplication['meta-data']) {
        mainApplication['meta-data'] = []
      }

      // Add Firebase Crashlytics disable flags
      const crashlyticsMetaData = [
        {
          $: {
            'android:name': 'firebase_crashlytics_collection_enabled',
            'android:value': 'false',
          },
        },
        {
          $: {
            'android:name': 'firebase_analytics_collection_deactivated',
            'android:value': 'false',
          },
        },
      ]

      // Remove any existing crashlytics meta-data to avoid duplicates
      mainApplication['meta-data'] = mainApplication['meta-data'].filter(
        item =>
          item.$['android:name'] !== 'firebase_crashlytics_collection_enabled' &&
          item.$['android:name'] !== 'firebase_analytics_collection_deactivated'
      )

      // Add the new meta-data
      mainApplication['meta-data'].push(...crashlyticsMetaData)
    }

    return config
  })
}

module.exports = withDisableFirebaseCrashlytics

