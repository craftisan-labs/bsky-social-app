import {useEffect, useMemo, useReducer, useRef} from 'react'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import * as bcp47Match from 'bcp-47-match'

import {useAnalytics} from '#/lib/analytics'
import {useGate} from '#/lib/statsig/statsig'
import {useLanguagePrefs} from '#/state/preferences'
import {
  Layout,
  OnboardingControls,
  OnboardingHeaderSlot,
} from '#/screens/Onboarding/Layout'
import {Context, initialState, reducer} from '#/screens/Onboarding/state'
import {StepFinished} from '#/screens/Onboarding/StepFinished'
import {StepInterests} from '#/screens/Onboarding/StepInterests'
import {StepProfile} from '#/screens/Onboarding/StepProfile'
import {Portal} from '#/components/Portal'
import {ScreenTransition} from '#/components/ScreenTransition'
import {ENV} from '#/env'
import {StepSuggestedAccounts} from './StepSuggestedAccounts'
import {StepSuggestedStarterpacks} from './StepSuggestedStarterpacks'

export function Onboarding() {
  const {_} = useLingui()
  const gate = useGate()
  const {trackOnboarding} = useAnalytics()

  // Track onboarding start time and step times
  const onboardingStartTime = useRef<number>(Date.now())
  const stepStartTime = useRef<number>(Date.now())
  const previousStep = useRef<string | null>(null)
  const hasTrackedStart = useRef(false)

  const {contentLanguages} = useLanguagePrefs()
  const probablySpeaksEnglish = useMemo(() => {
    if (contentLanguages.length === 0) return true
    return bcp47Match.basicFilter('en', contentLanguages).length > 0
  }, [contentLanguages])

  // starter packs screen is currently geared towards english-speaking accounts
  const showSuggestedStarterpacks =
    ENV !== 'e2e' &&
    probablySpeaksEnglish &&
    gate('onboarding_suggested_starterpacks')

  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    totalSteps: 4 + (showSuggestedStarterpacks ? 1 : 0),
    experiments: {
      onboarding_suggested_accounts: true,
      onboarding_value_prop: true,
      onboarding_suggested_starterpacks: showSuggestedStarterpacks,
    },
  })

  // Track onboarding started
  useEffect(() => {
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true
      onboardingStartTime.current = Date.now()
      stepStartTime.current = Date.now()

      trackOnboarding('onboarding_started', {})
    }
  }, [trackOnboarding])

  // Track step views and completions
  useEffect(() => {
    const currentStep = state.activeStep

    // If step changed, track the previous step completion and new step view
    if (previousStep.current && previousStep.current !== currentStep) {
      const timeOnPrevStep = Date.now() - stepStartTime.current

      // Track previous step completion
      trackOnboarding('onboarding_step_completed', {
        step_name: previousStep.current,
        step_index: state.activeStepIndex - 1,
        time_on_step_ms: timeOnPrevStep,
      })

      // Reset step timer
      stepStartTime.current = Date.now()
    }

    // Track new step view
    if (currentStep !== previousStep.current) {
      trackOnboarding('onboarding_step_viewed', {
        step_name: currentStep,
        step_index: state.activeStepIndex,
      })

      previousStep.current = currentStep
    }
  }, [state.activeStep, state.activeStepIndex, trackOnboarding])

  const interestsDisplayNames = useMemo(() => {
    return {
      news: _(msg`News`),
      journalism: _(msg`Journalism`),
      nature: _(msg`Nature`),
      art: _(msg`Art`),
      comics: _(msg`Comics`),
      writers: _(msg`Writers`),
      culture: _(msg`Culture`),
      sports: _(msg`Sports`),
      pets: _(msg`Pets`),
      animals: _(msg`Animals`),
      books: _(msg`Books`),
      education: _(msg`Education`),
      climate: _(msg`Climate`),
      science: _(msg`Science`),
      politics: _(msg`Politics`),
      fitness: _(msg`Fitness`),
      tech: _(msg`Tech`),
      dev: _(msg`Software Dev`),
      comedy: _(msg`Comedy`),
      gaming: _(msg`Video Games`),
      food: _(msg`Food`),
      cooking: _(msg`Cooking`),
    }
  }, [_])

  return (
    <Portal>
      <OnboardingControls.Provider>
        <OnboardingHeaderSlot.Provider>
          <Context.Provider
            value={useMemo(
              () => ({state, dispatch, interestsDisplayNames}),
              [state, dispatch, interestsDisplayNames],
            )}>
            <Layout>
              <ScreenTransition
                key={state.activeStep}
                direction={state.stepTransitionDirection}>
                {state.activeStep === 'profile' && <StepProfile />}
                {state.activeStep === 'interests' && <StepInterests />}
                {state.activeStep === 'suggested-accounts' && (
                  <StepSuggestedAccounts />
                )}
                {state.activeStep === 'suggested-starterpacks' && (
                  <StepSuggestedStarterpacks />
                )}
                {state.activeStep === 'finished' && <StepFinished />}
              </ScreenTransition>
            </Layout>
          </Context.Provider>
        </OnboardingHeaderSlot.Provider>
      </OnboardingControls.Provider>
    </Portal>
  )
}
