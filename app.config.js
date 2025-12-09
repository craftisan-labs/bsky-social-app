const pkg = require('./package.json')

module.exports = function (_config) {
  /**
   * App version number. Should be incremented as part of a release cycle.
   */
  const VERSION = pkg.version

  /**
   * Uses built-in Expo env vars
   *
   * @see https://docs.expo.dev/build-reference/variables/#built-in-environment-variables
   */
  const PLATFORM = process.env.EAS_BUILD_PLATFORM ?? 'web'

  const IS_TESTFLIGHT = process.env.EXPO_PUBLIC_ENV === 'testflight'
  const IS_PRODUCTION = process.env.EXPO_PUBLIC_ENV === 'production'
  const IS_DEV = !IS_TESTFLIGHT || !IS_PRODUCTION

  // BlueFly by CraftisanLabs - Associated domains for deep linking
  const ASSOCIATED_DOMAINS = [
    'applinks:bluefly.craftisanlabs.com',
    // When testing local services, enter an ngrok (et al) domain here. It must use a standard HTTP/HTTPS port.
    ...(IS_DEV || IS_TESTFLIGHT ? [] : []),
  ]

  const _UPDATES_ENABLED = IS_TESTFLIGHT || IS_PRODUCTION

  // Sentry error tracking - set SENTRY_AUTH_TOKEN env var to enable
  // TODO: Set up your own Sentry project at https://sentry.io
  const _USE_SENTRY = Boolean(process.env.SENTRY_AUTH_TOKEN)

  return {
    expo: {
      version: VERSION,
      name: 'BlueFly',
      slug: 'bluefly',
      scheme: 'bluefly',
      owner: 'craftisanlabs',
      runtimeVersion: {
        policy: 'appVersion',
      },
      icon: './assets/app-icons/bluefly-logo-lg.png',
      userInterfaceStyle: 'automatic',
      primaryColor: '#1083fe',
      newArchEnabled: false,
      ios: {
        supportsTablet: true, // Support Fire tablets
        bundleIdentifier: 'com.craftisanlabs.bluefly',
        config: {
          usesNonExemptEncryption: false,
        },
        icon:
          PLATFORM === 'web' // web build doesn't like .icon files
            ? './assets/app-icons/bluefly-logo-lg.png'
            : './assets/app-icons/bluefly-logo-lg.png',
        infoPlist: {
          UIBackgroundModes: ['remote-notification'],
          NSCameraUsageDescription:
            'Used for profile pictures, posts, and other kinds of content.',
          NSMicrophoneUsageDescription:
            'Used for posts and other kinds of content.',
          NSPhotoLibraryAddUsageDescription:
            'Used to save images to your library.',
          NSPhotoLibraryUsageDescription:
            'Used for profile pictures, posts, and other kinds of content',
          CFBundleSpokenName: 'Blue Fly',
          CFBundleLocalizations: [
            'en',
            'an',
            'ast',
            'ca',
            'cy',
            'da',
            'de',
            'el',
            'eo',
            'es',
            'eu',
            'fi',
            'fr',
            'fy',
            'ga',
            'gd',
            'gl',
            'hi',
            'hu',
            'ia',
            'id',
            'it',
            'ja',
            'km',
            'ko',
            'ne',
            'nl',
            'pl',
            'pt-BR',
            'pt-PT',
            'ro',
            'ru',
            'sv',
            'th',
            'tr',
            'uk',
            'vi',
            'yue',
            'zh-Hans',
            'zh-Hant',
          ],
          UIDesignRequiresCompatibility: true,
        },
        associatedDomains: ASSOCIATED_DOMAINS,
        entitlements: {
          'com.apple.developer.kernel.increased-memory-limit': true,
          'com.apple.developer.kernel.extended-virtual-addressing': true,
          'com.apple.security.application-groups':
            'group.com.craftisanlabs.bluefly',
        },
        privacyManifests: {
          NSPrivacyCollectedDataTypes: [
            {
              NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCrashData',
              NSPrivacyCollectedDataTypeLinked: false,
              NSPrivacyCollectedDataTypeTracking: false,
              NSPrivacyCollectedDataTypePurposes: [
                'NSPrivacyCollectedDataTypePurposeAppFunctionality',
              ],
            },
            {
              NSPrivacyCollectedDataType:
                'NSPrivacyCollectedDataTypePerformanceData',
              NSPrivacyCollectedDataTypeLinked: false,
              NSPrivacyCollectedDataTypeTracking: false,
              NSPrivacyCollectedDataTypePurposes: [
                'NSPrivacyCollectedDataTypePurposeAppFunctionality',
              ],
            },
            {
              NSPrivacyCollectedDataType:
                'NSPrivacyCollectedDataTypeOtherDiagnosticData',
              NSPrivacyCollectedDataTypeLinked: false,
              NSPrivacyCollectedDataTypeTracking: false,
              NSPrivacyCollectedDataTypePurposes: [
                'NSPrivacyCollectedDataTypePurposeAppFunctionality',
              ],
            },
          ],
          NSPrivacyAccessedAPITypes: [
            {
              NSPrivacyAccessedAPIType:
                'NSPrivacyAccessedAPICategoryFileTimestamp',
              NSPrivacyAccessedAPITypeReasons: ['C617.1', '3B52.1', '0A2A.1'],
            },
            {
              NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
              NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
            },
            {
              NSPrivacyAccessedAPIType:
                'NSPrivacyAccessedAPICategorySystemBootTime',
              NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
            },
            {
              NSPrivacyAccessedAPIType:
                'NSPrivacyAccessedAPICategoryUserDefaults',
              NSPrivacyAccessedAPITypeReasons: ['CA92.1', '1C8F.1'],
            },
          ],
        },
      },
      androidStatusBar: {
        barStyle: 'light-content',
      },
      // Dark nav bar in light mode is better than light nav bar in dark mode
      androidNavigationBar: {
        barStyle: 'light-content',
      },
      android: {
        icon: './assets/app-icons/bluefly-logo-lg.png',
        adaptiveIcon: {
          foregroundImage: './assets/app-icons/bluefly-logo-lg.png',
          monochromeImage: './assets/app-icons/bluefly-logo-lg.png',
          backgroundColor: '#0085FF',
        },
        // Firebase configuration file
        googleServicesFile: './google-services.json',
        package: 'com.craftisanlabs.bluefly',
        // TV banner for Fire TV launcher (512x320px)
        // Note: Create this asset and place it in assets/app-icons/
        // tvBanner: './assets/app-icons/tv-banner.png',
        intentFilters: [
          {
            action: 'VIEW',
            autoVerify: true,
            data: [
              {
                scheme: 'https',
                host: 'bluefly.craftisanlabs.com',
              },
              IS_DEV && {
                scheme: 'http',
                host: 'localhost:19006',
              },
            ],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
      },
      web: {
        favicon: './assets/favicon.png',
      },
      // Expo Updates - disabled for Amazon Appstore (use store updates instead)
      updates: {
        enabled: false,
        checkAutomatically: 'NEVER',
      },
      plugins: [
        'expo-video',
        'expo-localization',
        'expo-web-browser',
        './plugins/withDisableFirebaseCrashlytics.js',
        './plugins/withExcludeFirebaseCrashlytics.js',
        [
          'react-native-edge-to-edge',
          {android: {enforceNavigationBarContrast: false}},
        ],
        // Firebase is configured via google-services.json (already included)
        // The @react-native-firebase/* packages handle their own native setup
        [
          'expo-build-properties',
          {
            ios: {
              deploymentTarget: '15.1',
              buildReactNativeFromSource: true,
            },
            android: {
              compileSdkVersion: 35,
              targetSdkVersion: 35,
              buildToolsVersion: '35.0.0',
              minSdkVersion: 24, // Support Android 7.0+ (API 24) - required by Hermes and native libraries
            },
          },
        ],
        [
          'expo-notifications',
          {
            icon: './assets/app-icons/bluefly-logo-lg.png',
            color: '#0085FF',
            sounds: PLATFORM === 'ios' ? ['assets/dm.aiff'] : ['assets/dm.mp3'],
          },
        ],
        'react-native-compressor',
        './plugins/starterPackAppClipExtension/withStarterPackAppClip.js',
        './plugins/withGradleJVMHeapSizeIncrease.js',
        './plugins/withAndroidManifestLargeHeapPlugin.js',
        './plugins/withAndroidManifestFCMIconPlugin.js',
        './plugins/withAndroidManifestIntentQueriesPlugin.js',
        './plugins/withAndroidStylesAccentColorPlugin.js',
        './plugins/withAndroidDayNightThemePlugin.js',
        './plugins/withAndroidNoJitpackPlugin.js',
        './plugins/withAmazonIAP.js', // Amazon In-App Purchasing
        './plugins/withAndroidTVSupport.js', // Android TV / Fire TV Support
        './plugins/shareExtension/withShareExtensions.js',
        './plugins/notificationsExtension/withNotificationsExtension.js',
        [
          'expo-font',
          {
            fonts: [
              './assets/fonts/inter/InterVariable.woff2',
              './assets/fonts/inter/InterVariable-Italic.woff2',
              // Android only
              './assets/fonts/inter/Inter-Regular.otf',
              './assets/fonts/inter/Inter-Italic.otf',
              './assets/fonts/inter/Inter-Medium.otf',
              './assets/fonts/inter/Inter-MediumItalic.otf',
              './assets/fonts/inter/Inter-SemiBold.otf',
              './assets/fonts/inter/Inter-SemiBoldItalic.otf',
              './assets/fonts/inter/Inter-Bold.otf',
              './assets/fonts/inter/Inter-BoldItalic.otf',
            ],
          },
        ],
        [
          'expo-splash-screen',
          {
            ios: {
              enableFullScreenImage_legacy: true,
              backgroundColor: '#ffffff',
              image: './assets/splash.png',
              resizeMode: 'cover',
              dark: {
                enableFullScreenImage_legacy: true,
                backgroundColor: '#001429',
                image: './assets/splash-dark.png',
                resizeMode: 'cover',
              },
            },
            android: {
              backgroundColor: '#0c7cff',
              image: './assets/splash-android-icon.png',
              imageWidth: 150,
              dark: {
                backgroundColor: '#0c2a49',
                image: './assets/splash-android-icon-dark.png',
                imageWidth: 150,
              },
            },
          },
        ],
        [
          '@mozzius/expo-dynamic-app-icon',
          {
            /**
             * BlueFly default icon
             */
            bluefly_default: {
              ios: './assets/app-icons/bluefly-logo-lg.png',
              android: './assets/app-icons/bluefly-logo-lg.png',
              prerendered: true,
            },
          },
        ],
        ['expo-screen-orientation', {initialOrientation: 'PORTRAIT_UP'}],
        // expo-location removed - not needed for core functionality
      ].filter(Boolean),
      extra: {
        eas: {
          build: {
            experimental: {
              ios: {
                appExtensions: [
                  {
                    targetName: 'Share-with-BlueFly',
                    bundleIdentifier:
                      'com.craftisanlabs.bluefly.Share-with-BlueFly',
                    entitlements: {
                      'com.apple.security.application-groups': [
                        'group.com.craftisanlabs.bluefly',
                      ],
                    },
                  },
                  {
                    targetName: 'BlueFlyNSE',
                    bundleIdentifier: 'com.craftisanlabs.bluefly.BlueFlyNSE',
                    entitlements: {
                      'com.apple.security.application-groups': [
                        'group.com.craftisanlabs.bluefly',
                      ],
                    },
                  },
                  {
                    targetName: 'BlueFlyClip',
                    bundleIdentifier: 'com.craftisanlabs.bluefly.AppClip',
                  },
                ],
              },
            },
          },
          // TODO: Create your own EAS project at https://expo.dev and update this ID
          projectId: 'YOUR_EAS_PROJECT_ID',
        },
      },
    },
  }
}
