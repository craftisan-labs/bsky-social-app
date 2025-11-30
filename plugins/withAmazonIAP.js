/**
 * Expo Config Plugin for Amazon In-App Purchasing
 * Configures the Android app for Amazon Appstore IAP
 */
const {withAppBuildGradle, withAndroidManifest} = require('@expo/config-plugins')

function withAmazonIAPBuildGradle(config) {
  return withAppBuildGradle(config, config => {
    const buildGradle = config.modResults.contents

    // Add Amazon store flavor dimension if not present
    if (!buildGradle.includes("missingDimensionStrategy 'store'")) {
      const defaultConfigRegex = /defaultConfig\s*\{/
      if (defaultConfigRegex.test(buildGradle)) {
        config.modResults.contents = buildGradle.replace(
          defaultConfigRegex,
          `defaultConfig {
        missingDimensionStrategy 'store', 'amazon'`
        )
      }
    }

    return config
  })
}

function withAmazonIAPManifest(config) {
  return withAndroidManifest(config, config => {
    const mainApplication = config.modResults.manifest.application?.[0]
    if (mainApplication) {
      // Add Amazon ResponseReceiver for IAP
      if (!mainApplication.receiver) {
        mainApplication.receiver = []
      }

      // Check if Amazon receiver already exists
      const hasAmazonReceiver = mainApplication.receiver.some(
        r => r.$?.['android:name'] === 'com.amazon.device.iap.ResponseReceiver'
      )

      if (!hasAmazonReceiver) {
        mainApplication.receiver.push({
          $: {
            'android:name': 'com.amazon.device.iap.ResponseReceiver',
            'android:exported': 'false',
            'android:permission': 'com.amazon.inapp.purchasing.Permission.NOTIFY',
          },
          'intent-filter': [
            {
              action: [
                {
                  $: {
                    'android:name': 'com.amazon.inapp.purchasing.NOTIFY',
                  },
                },
              ],
            },
          ],
        })
      }
    }

    return config
  })
}

module.exports = function withAmazonIAP(config) {
  config = withAmazonIAPBuildGradle(config)
  config = withAmazonIAPManifest(config)
  return config
}

