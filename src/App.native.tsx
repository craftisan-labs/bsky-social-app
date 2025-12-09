import '#/logger/sentry/setup'
import '#/logger/bitdrift/setup'
import '#/view/icons'

import React, {useEffect, useRef, useState} from 'react'
import {AppState, type AppStateStatus} from 'react-native'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context'
import * as ScreenOrientation from 'expo-screen-orientation'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {firebaseAnalytics, logSessionEvent} from '#/lib/analytics'
import {KeyboardControllerProvider} from '#/lib/hooks/useEnableKeyboardController'
import {Provider as HideBottomBarBorderProvider} from '#/lib/hooks/useHideBottomBarBorder'
import {IAPProvider, PaywallProvider} from '#/lib/iap'
import {QueryProvider} from '#/lib/react-query'
import {Provider as StatsigProvider, tryFetchGates} from '#/lib/statsig/statsig'
import {s} from '#/lib/styles'
import {ThemeProvider} from '#/lib/ThemeContext'
import I18nProvider from '#/locale/i18nProvider'
import {logger} from '#/logger'
import {Sentry} from '#/logger/sentry/lib'
import {isAndroid, isIOS} from '#/platform/detection'
import {Provider as A11yProvider} from '#/state/a11y'
import {Provider as AgeAssuranceProvider} from '#/state/ageAssurance'
import {Provider as MutedThreadsProvider} from '#/state/cache/thread-mutes'
import {Provider as DialogStateProvider} from '#/state/dialogs'
import {Provider as EmailVerificationProvider} from '#/state/email-verification'
import {listenSessionDropped} from '#/state/events'
import {
  beginResolveGeolocationConfig,
  ensureGeolocationConfigIsResolved,
  Provider as GeolocationProvider,
} from '#/state/geolocation'
import {GlobalGestureEventsProvider} from '#/state/global-gesture-events'
import {Provider as HomeBadgeProvider} from '#/state/home-badge'
import {Provider as LightboxStateProvider} from '#/state/lightbox'
import {MessagesProvider} from '#/state/messages'
import {Provider as ModalStateProvider} from '#/state/modals'
import {init as initPersistedState} from '#/state/persisted'
import {Provider as PrefsStateProvider} from '#/state/preferences'
import {Provider as LabelDefsProvider} from '#/state/preferences/label-defs'
import {Provider as ModerationOptsProvider} from '#/state/preferences/moderation-opts'
import {Provider as UnreadNotifsProvider} from '#/state/queries/notifications/unread'
import {Provider as ServiceAccountManager} from '#/state/service-config'
import {
  Provider as SessionProvider,
  type SessionAccount,
  useSession,
  useSessionApi,
} from '#/state/session'
import {readLastActiveAccount} from '#/state/session/util'
import {Provider as ShellStateProvider} from '#/state/shell'
import {Provider as ComposerProvider} from '#/state/shell/composer'
import {Provider as LoggedOutViewProvider} from '#/state/shell/logged-out'
import {Provider as ProgressGuideProvider} from '#/state/shell/progress-guide'
import {Provider as SelectedFeedProvider} from '#/state/shell/selected-feed'
import {Provider as StarterPackProvider} from '#/state/shell/starter-pack'
import {Provider as HiddenRepliesProvider} from '#/state/threadgate-hidden-replies'
import {TestCtrls} from '#/view/com/testing/TestCtrls'
import * as Toast from '#/view/com/util/Toast'
import {Shell} from '#/view/shell'
import {ThemeProvider as Alf} from '#/alf'
import {useColorModeTheme} from '#/alf/util/useColorModeTheme'
import {Provider as ContextMenuProvider} from '#/components/ContextMenu'
import {NuxDialogs} from '#/components/dialogs/nuxs'
import {useStarterPackEntry} from '#/components/hooks/useStarterPackEntry'
import {Provider as IntentDialogProvider} from '#/components/intents/IntentDialogs'
import {Provider as PolicyUpdateOverlayProvider} from '#/components/PolicyUpdateOverlay'
import {Provider as PortalProvider} from '#/components/Portal'
import {Provider as VideoVolumeProvider} from '#/components/Post/Embed/VideoEmbed/VideoVolumeContext'
import {ToastOutlet} from '#/components/Toast'
import {Splash} from '#/Splash'
import {BottomSheetProvider} from '../modules/bottom-sheet'
import {BackgroundNotificationPreferencesProvider} from '../modules/expo-background-notification-handler/src/BackgroundNotificationHandlerProvider'

SplashScreen.preventAutoHideAsync()

// Initialize Firebase Analytics
firebaseAnalytics.init().then(() => {
  firebaseAnalytics.logAppOpen()
})

if (isIOS) {
  SystemUI.setBackgroundColorAsync('black')
}
if (isAndroid) {
  // iOS is handled by the config plugin -sfn
  ScreenOrientation.lockAsync(
    ScreenOrientation.OrientationLock.PORTRAIT_UP,
  ).catch(error =>
    logger.debug('Could not lock orientation', {safeMessage: error}),
  )
}

/**
 * Begin geolocation ASAP
 */
beginResolveGeolocationConfig()

function InnerApp() {
  const [isReady, setIsReady] = React.useState(false)
  const {currentAccount} = useSession()
  const {resumeSession} = useSessionApi()
  const theme = useColorModeTheme()
  const {_} = useLingui()
  const hasCheckedReferrer = useStarterPackEntry()

  // Track app state for analytics
  const appState = useRef(AppState.currentState)
  const sessionStartTime = useRef<number>(Date.now())
  const hasTrackedSessionStart = useRef(false)

  // init
  useEffect(() => {
    async function onLaunch(account?: SessionAccount) {
      try {
        if (account) {
          await resumeSession(account)
        } else {
          await tryFetchGates(undefined, 'prefer-fresh-gates')
        }
      } catch (e) {
        logger.error(`session: resume failed`, {message: e})
      } finally {
        setIsReady(true)
      }
    }
    const account = readLastActiveAccount()
    onLaunch(account)
  }, [resumeSession])

  // Track session started/resumed events
  useEffect(() => {
    if (currentAccount?.did && !hasTrackedSessionStart.current) {
      hasTrackedSessionStart.current = true
      sessionStartTime.current = Date.now()

      // Track session started
      logSessionEvent('session_started', {
        user_did: currentAccount.did,
        login_method: 'resume', // Could be enhanced to track actual method
      })

      // Set user ID for analytics
      firebaseAnalytics.setUserId(currentAccount.did)
    } else if (!currentAccount?.did) {
      hasTrackedSessionStart.current = false
    }
  }, [currentAccount?.did])

  // Track app foreground/background events
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground
        sessionStartTime.current = Date.now()
        if (currentAccount?.did) {
          logSessionEvent('app_foregrounded', {
            user_did: currentAccount.did,
          })
        }
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background
        const sessionDuration = Date.now() - sessionStartTime.current
        if (currentAccount?.did) {
          logSessionEvent('app_backgrounded', {
            user_did: currentAccount.did,
            session_duration_ms: sessionDuration,
          })
        }
      }

      appState.current = nextAppState
    }

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    )
    return () => subscription.remove()
  }, [currentAccount?.did])

  useEffect(() => {
    return listenSessionDropped(() => {
      Toast.show(
        _(msg`Sorry! Your session expired. Please sign in again.`),
        'info',
      )
    })
  }, [_])

  return (
    <Alf theme={theme}>
      <ThemeProvider theme={theme}>
        <ContextMenuProvider>
          <Splash isReady={isReady && hasCheckedReferrer}>
            <VideoVolumeProvider>
              <React.Fragment
                // Resets the entire tree below when it changes:
                key={currentAccount?.did}>
                <QueryProvider currentDid={currentAccount?.did}>
                  <PolicyUpdateOverlayProvider>
                    <StatsigProvider>
                      <AgeAssuranceProvider>
                        <ComposerProvider>
                          <MessagesProvider>
                            {/* LabelDefsProvider MUST come before ModerationOptsProvider */}
                            <LabelDefsProvider>
                              <ModerationOptsProvider>
                                <LoggedOutViewProvider>
                                  <SelectedFeedProvider>
                                    <HiddenRepliesProvider>
                                      <HomeBadgeProvider>
                                        <UnreadNotifsProvider>
                                          <BackgroundNotificationPreferencesProvider>
                                            <MutedThreadsProvider>
                                              <ProgressGuideProvider>
                                                <ServiceAccountManager>
                                                  <EmailVerificationProvider>
                                                    <HideBottomBarBorderProvider>
                                                      <GestureHandlerRootView
                                                        style={s.h100pct}>
                                                        <GlobalGestureEventsProvider>
                                                          <IntentDialogProvider>
                                                            <TestCtrls />
                                                            <Shell />
                                                            <NuxDialogs />
                                                            <ToastOutlet />
                                                          </IntentDialogProvider>
                                                        </GlobalGestureEventsProvider>
                                                      </GestureHandlerRootView>
                                                    </HideBottomBarBorderProvider>
                                                  </EmailVerificationProvider>
                                                </ServiceAccountManager>
                                              </ProgressGuideProvider>
                                            </MutedThreadsProvider>
                                          </BackgroundNotificationPreferencesProvider>
                                        </UnreadNotifsProvider>
                                      </HomeBadgeProvider>
                                    </HiddenRepliesProvider>
                                  </SelectedFeedProvider>
                                </LoggedOutViewProvider>
                              </ModerationOptsProvider>
                            </LabelDefsProvider>
                          </MessagesProvider>
                        </ComposerProvider>
                      </AgeAssuranceProvider>
                    </StatsigProvider>
                  </PolicyUpdateOverlayProvider>
                </QueryProvider>
              </React.Fragment>
            </VideoVolumeProvider>
          </Splash>
        </ContextMenuProvider>
      </ThemeProvider>
    </Alf>
  )
}

function App() {
  const [isReady, setReady] = useState(false)

  React.useEffect(() => {
    Promise.all([
      initPersistedState(),
      ensureGeolocationConfigIsResolved(),
    ]).then(() => setReady(true))
  }, [])

  if (!isReady) {
    return null
  }

  /*
   * NOTE: only nothing here can depend on other data or session state, since
   * that is set up in the InnerApp component above.
   */
  return (
    <GeolocationProvider>
      <A11yProvider>
        <KeyboardControllerProvider>
          <SessionProvider>
            <PrefsStateProvider>
              <I18nProvider>
                <ShellStateProvider>
                  <ModalStateProvider>
                    <DialogStateProvider>
                      <LightboxStateProvider>
                        <PortalProvider>
                          <BottomSheetProvider>
                            <StarterPackProvider>
                              <IAPProvider>
                                <PaywallProvider>
                                  <SafeAreaProvider
                                    initialMetrics={initialWindowMetrics}>
                                    <InnerApp />
                                  </SafeAreaProvider>
                                </PaywallProvider>
                              </IAPProvider>
                            </StarterPackProvider>
                          </BottomSheetProvider>
                        </PortalProvider>
                      </LightboxStateProvider>
                    </DialogStateProvider>
                  </ModalStateProvider>
                </ShellStateProvider>
              </I18nProvider>
            </PrefsStateProvider>
          </SessionProvider>
        </KeyboardControllerProvider>
      </A11yProvider>
    </GeolocationProvider>
  )
}

export default Sentry.wrap(App)
