const {withAppBuildGradle} = require('@expo/config-plugins')

/**
 * Expo config plugin to exclude Firebase Crashlytics from dependencies
 * This prevents the Crashlytics build ID error
 */
const withExcludeFirebaseCrashlytics = config => {
  return withAppBuildGradle(config, config => {
    let buildGradle = config.modResults.contents

    // Add configuration to exclude crashlytics
    const excludeConfig = `
configurations.all {
    exclude group: 'com.google.firebase', module: 'firebase-crashlytics'
    exclude group: 'com.google.firebase', module: 'firebase-crashlytics-ktx'
    exclude group: 'com.google.firebase', module: 'firebase-crashlytics-ndk'
}
`

    // Add the exclusion before the dependencies block if not already present
    if (!buildGradle.includes("exclude group: 'com.google.firebase', module: 'firebase-crashlytics'")) {
      // Find the dependencies block and add before it
      const dependenciesIndex = buildGradle.indexOf('dependencies {')
      if (dependenciesIndex !== -1) {
        buildGradle =
          buildGradle.slice(0, dependenciesIndex) +
          excludeConfig +
          '\n' +
          buildGradle.slice(dependenciesIndex)
      }
    }

    config.modResults.contents = buildGradle
    return config
  })
}

module.exports = withExcludeFirebaseCrashlytics

