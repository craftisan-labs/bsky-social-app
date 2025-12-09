/**
 * Expo Config Plugin for Android TV Support
 * Configures the Android app to support Fire TV devices
 */
const {withAndroidManifest} = require('@expo/config-plugins')

function withAndroidTVManifest(config) {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest

    // Add uses-feature for leanback (Android TV support)
    if (!manifest['uses-feature']) {
      manifest['uses-feature'] = []
    }

    // Check if leanback feature already exists
    const hasLeanback = manifest['uses-feature'].some(
      feature => feature.$?.['android:name'] === 'android.software.leanback',
    )

    if (!hasLeanback) {
      manifest['uses-feature'].push({
        $: {
          'android:name': 'android.software.leanback',
          'android:required': 'false',
        },
      })
    }

    // Add uses-feature to indicate touchscreen is optional (TVs don't have touch)
    const hasTouchscreen = manifest['uses-feature'].some(
      feature => feature.$?.['android:name'] === 'android.hardware.touchscreen',
    )

    if (!hasTouchscreen) {
      manifest['uses-feature'].push({
        $: {
          'android:name': 'android.hardware.touchscreen',
          'android:required': 'false',
        },
      })
    }

    // Add GPS as optional (not all devices have GPS, especially TVs)
    const hasGps = manifest['uses-feature'].some(
      feature =>
        feature.$?.['android:name'] === 'android.hardware.location.gps',
    )

    if (!hasGps) {
      manifest['uses-feature'].push({
        $: {
          'android:name': 'android.hardware.location.gps',
          'android:required': 'false',
        },
      })
    }

    // Add camera autofocus as optional (not all devices have autofocus cameras)
    const hasCameraAutofocus = manifest['uses-feature'].some(
      feature =>
        feature.$?.['android:name'] === 'android.hardware.camera.autofocus',
    )

    if (!hasCameraAutofocus) {
      manifest['uses-feature'].push({
        $: {
          'android:name': 'android.hardware.camera.autofocus',
          'android:required': 'false',
        },
      })
    }

    // Add supports-screens to explicitly declare device support for Amazon Appstore
    // This is required for Amazon Appstore to recognize device compatibility
    // Note: We do NOT set width limit DPs (requiresSmallestWidthDp, compatibleWidthLimitDp, largestWidthLimitDp)
    // as setting them to "0" can cause Amazon Appstore to think no devices are supported
    if (!manifest['supports-screens']) {
      manifest['supports-screens'] = [
        {
          $: {
            'android:smallScreens': 'true',
            'android:normalScreens': 'true',
            'android:largeScreens': 'true',
            'android:xlargeScreens': 'true',
            'android:anyDensity': 'true',
            // Do NOT set width limit DPs - let Android use defaults for maximum compatibility
          },
        },
      ]
    }

    // Add TV launcher category to main activity
    const mainApplication = manifest.application?.[0]
    if (mainApplication && mainApplication.activity) {
      // Find the activity with LAUNCHER intent filter (main launcher activity)
      const launcherActivity = mainApplication.activity.find(activity => {
        const intentFilters = activity['intent-filter'] || []
        return intentFilters.some(filter => {
          const categories = filter.category || []
          return categories.some(
            cat =>
              cat.$?.['android:name'] === 'android.intent.category.LAUNCHER',
          )
        })
      })

      if (launcherActivity) {
        // Find the intent-filter with LAUNCHER category
        const launcherIntentFilter = launcherActivity['intent-filter']?.find(
          filter => {
            const categories = filter.category || []
            return categories.some(
              cat =>
                cat.$?.['android:name'] === 'android.intent.category.LAUNCHER',
            )
          },
        )

        if (launcherIntentFilter) {
          // Check if LEANBACK_LAUNCHER category already exists
          const hasLeanbackLauncher = launcherIntentFilter.category?.some(
            cat =>
              cat.$?.['android:name'] ===
              'android.intent.category.LEANBACK_LAUNCHER',
          )

          if (!hasLeanbackLauncher) {
            // Add LEANBACK_LAUNCHER category
            if (!launcherIntentFilter.category) {
              launcherIntentFilter.category = []
            }
            launcherIntentFilter.category.push({
              $: {
                'android:name': 'android.intent.category.LEANBACK_LAUNCHER',
              },
            })
          }
        }
      }
    }

    return config
  })
}

module.exports = function withAndroidTVSupport(config) {
  config = withAndroidTVManifest(config)
  return config
}
