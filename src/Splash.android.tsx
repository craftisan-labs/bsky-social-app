import React, {useCallback, useEffect} from 'react'
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {Image} from 'expo-image'
import * as SplashScreen from 'expo-splash-screen'

type Props = {
  isReady: boolean
}

export function Splash({isReady, children}: React.PropsWithChildren<Props>) {
  const insets = useSafeAreaInsets()
  const intro = useSharedValue(0)
  const outro = useSharedValue(0)
  const [isAnimationComplete, setIsAnimationComplete] = React.useState(false)
  const [isLayoutReady, setIsLayoutReady] = React.useState(false)
  const [reduceMotion, setReduceMotion] = React.useState<boolean | undefined>(
    undefined,
  )

  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === 'dark'

  // Background colors matching app.config.js
  const backgroundColor = isDarkMode ? '#0c2a49' : '#0c7cff'

  const canStart = isReady && isLayoutReady && reduceMotion !== undefined

  const contentAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(outro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })

  const splashAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(outro.get(), [0, 0.5, 1], [1, 1, 0], 'clamp'),
    }
  })

  const logoAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
      transform: [
        {
          scale: interpolate(intro.get(), [0, 1], [0.8, 1], 'clamp'),
        },
      ],
    }
  })

  const textAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })

  const onFinish = useCallback(() => setIsAnimationComplete(true), [])
  const onLayout = useCallback(() => setIsLayoutReady(true), [])

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
  }, [])

  const startOutroAnimation = useCallback(() => {
    outro.set(() =>
      withTiming(1, {duration: 600, easing: Easing.inOut(Easing.cubic)}, () => {
        runOnJS(onFinish)()
      }),
    )
  }, [outro, onFinish])

  const scheduleOutro = useCallback(() => {
    // Hold the splash for 2 seconds so disclaimer is readable
    setTimeout(() => {
      startOutroAnimation()
    }, 2000)
  }, [startOutroAnimation])

  useEffect(() => {
    if (canStart) {
      SplashScreen.hideAsync()
        .then(() => {
          // Intro animation - fade in logo and text
          intro.set(() =>
            withTiming(
              1,
              {duration: 500, easing: Easing.out(Easing.cubic)},
              () => {
                runOnJS(scheduleOutro)()
              },
            ),
          )
        })
        .catch(() => {})
    }
  }, [canStart, intro, scheduleOutro])

  // If animation is complete, just render children
  if (isAnimationComplete) {
    return <>{children}</>
  }

  return (
    <View style={{flex: 1, backgroundColor}} onLayout={onLayout}>
      {/* App content fading in */}
      {canStart && (
        <Animated.View style={[StyleSheet.absoluteFill, contentAnimation]}>
          {children}
        </Animated.View>
      )}

      {/* Splash overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          splashAnimation,
          {
            backgroundColor,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
        pointerEvents={canStart ? 'none' : 'auto'}>
        {/* Logo in center */}
        <Animated.View style={logoAnimation}>
          <Image
            source={require('../assets/logo-no-bg.png')}
            style={{width: 120, height: 120}}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        </Animated.View>

        {/* Disclaimer text at bottom */}
        <Animated.View
          style={[
            textAnimation,
            {
              position: 'absolute',
              bottom: insets.bottom + 60,
              left: 24,
              right: 24,
              alignItems: 'center',
            },
          ]}>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 10,
              textAlign: 'center',
              lineHeight: 15,
              fontStyle: 'italic',
            }}>
            Disclaimer: This app uses the official BlueSky AT Protocol but is
            not endorsed or certified by BlueSky PBLLC.
          </Text>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: 11,
              textAlign: 'center',
              marginTop: 10,
              fontWeight: '500',
            }}>
            Social data powered by BlueSky®.
          </Text>
        </Animated.View>

        {/* App name/logotype at very bottom */}
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 20,
            alignItems: 'center',
          }}>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 16,
              fontWeight: '600',
              letterSpacing: 1,
            }}>
            BlueFly
          </Text>
        </View>
      </Animated.View>
    </View>
  )
}
