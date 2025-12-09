/**
 * Paywall Modal Component
 *
 * Shows subscription options with conditional close button based on
 * how many times the user has dismissed the paywall.
 */

import {useCallback, useEffect, useRef, useState} from 'react'
import {Modal, Pressable, ScrollView, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {firebaseAnalytics, useAnalytics} from '#/lib/analytics'
import {SUBSCRIPTION_SKUS, useIAP, useIsSubscribed} from '#/lib/iap'
import {
  canDismissPaywall,
  getDismissCount,
  incrementDismissCount,
  isUserSubscribed,
  setLastShownTime,
  setSubscriptionStatus,
} from '#/lib/iap/PaywallState'
import {logger} from '#/logger'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

interface PaywallModalProps {
  visible: boolean
  onClose: () => void
  onSubscribed?: () => void
  source?: 'login' | 'app_foreground' | 'manual' | 'session_start'
}

export function PaywallModal({
  visible,
  onClose,
  onSubscribed,
  source = 'manual',
}: PaywallModalProps) {
  const {_} = useLingui()
  const t = useTheme()
  const {trackPaywall} = useAnalytics()
  const {
    isInitialized,
    isLoading,
    products,
    error,
    purchaseSubscription,
    restorePurchases,
  } = useIAP()
  const isSubscribedFromContext = useIsSubscribed()

  const [canClose, setCanClose] = useState(true)
  const [dismissCount, setDismissCount] = useState(0)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<
    'monthly' | 'quarterly' | null
  >(null)
  const [purchaseStatus, setPurchaseStatus] = useState<
    'idle' | 'processing' | 'checking' | 'completed'
  >('idle')

  // Track time spent on paywall
  const viewStartTime = useRef<number>(0)

  // Check if user is subscribed (from both sources)
  const checkIsSubscribed = useCallback(() => {
    return isSubscribedFromContext || isUserSubscribed()
  }, [isSubscribedFromContext])

  // Watch for subscription status changes and close modal if user becomes subscribed
  useEffect(() => {
    if (visible && checkIsSubscribed()) {
      logger.info('PaywallModal: User subscription detected, closing modal')
      setSubscriptionStatus(true)
      onSubscribed?.()
      onClose()
    }
  }, [
    visible,
    isSubscribedFromContext,
    onSubscribed,
    onClose,
    checkIsSubscribed,
  ])

  useEffect(() => {
    if (visible) {
      // First check: If user is already subscribed, close the modal immediately
      if (checkIsSubscribed()) {
        logger.info('PaywallModal: User is already subscribed, closing modal')
        onClose()
        return
      }

      // Check if user can dismiss this time
      const canDismiss = canDismissPaywall()
      const currentDismissCount = getDismissCount()
      setCanClose(canDismiss)
      setDismissCount(currentDismissCount)
      setLastShownTime()
      setPurchaseError(null) // Clear any previous errors
      setSelectedPlan(null) // Reset selected plan
      setIsPurchasing(false) // Reset purchasing state
      setPurchaseStatus('idle') // Reset purchase status

      // Track paywall view start time
      viewStartTime.current = Date.now()

      // Track paywall viewed event
      trackPaywall('paywall_viewed', {
        dismiss_count: currentDismissCount,
        can_dismiss: canDismiss,
        source,
      })
    }
  }, [
    visible,
    source,
    trackPaywall,
    isSubscribedFromContext,
    onClose,
    checkIsSubscribed,
  ])

  const handleClose = useCallback(() => {
    if (canClose) {
      const timeOnScreen = Date.now() - viewStartTime.current

      // Track paywall dismissed event
      trackPaywall('paywall_dismissed', {
        dismiss_count: dismissCount,
        time_on_screen_ms: timeOnScreen,
      })

      incrementDismissCount()
      onClose()
    }
    // If canClose is false (hard paywall), do nothing - user must subscribe
  }, [canClose, onClose, dismissCount, trackPaywall])

  const handlePlanSelect = useCallback(
    (planType: 'monthly' | 'quarterly', productId: string, price: string) => {
      setSelectedPlan(planType)

      // Track plan selection
      trackPaywall('paywall_plan_selected', {
        plan_type: planType,
        product_id: productId,
        price,
      })
    },
    [trackPaywall],
  )

  const handlePurchase = useCallback(
    async (
      productId: string,
      planType: 'monthly' | 'quarterly',
      price: string,
    ) => {
      setIsPurchasing(true)
      setPurchaseError(null)

      // Track purchase started
      trackPaywall('paywall_purchase_started', {
        plan_type: planType,
        product_id: productId,
        price,
      })

      // Set up a timeout to prevent infinite "processing" state
      // This is a backup timeout in case the IAP timeout doesn't work
      const purchaseTimeout = setTimeout(() => {
        logger.warn('Paywall: Purchase timeout - resetting state', {productId})
        setIsPurchasing(false)
        setPurchaseError(
          'Purchase is taking longer than expected. Please check your connection and try again.',
        )
      }, 100000) // 100 seconds - slightly longer than IAP timeout

      try {
        // Check if user is already subscribed before attempting purchase
        if (checkIsSubscribed()) {
          clearTimeout(purchaseTimeout)
          logger.info('Paywall: User already subscribed, closing modal')
          setSubscriptionStatus(true)
          setIsPurchasing(false) // Reset purchasing state
          setTimeout(() => {
            onSubscribed?.()
            onClose()
          }, 100)
          return
        }

        logger.info('Paywall: Starting purchase', {productId, planType, price})
        setPurchaseStatus('processing')

        // After 3 seconds, show "checking" status (purchase dialog likely completed, checking status)
        const statusUpdateTimeout = setTimeout(() => {
          setPurchaseStatus(prev => (prev === 'processing' ? 'checking' : prev))
        }, 3000)

        const result = await purchaseSubscription(productId)
        clearTimeout(purchaseTimeout) // Clear timeout on completion
        clearTimeout(statusUpdateTimeout)
        logger.info('Paywall: Purchase result received', {
          success: result,
          productId,
        })

        if (result) {
          // Track purchase success
          trackPaywall('paywall_purchase_success', {
            plan_type: planType,
            product_id: productId,
            price,
          })

          // Update user property for segmentation
          firebaseAnalytics.setUserProperties({
            subscription_status: 'subscribed',
          })

          setSubscriptionStatus(true)
          setIsPurchasing(false) // Reset purchasing state
          setPurchaseStatus('completed')

          // Close modal immediately after successful subscription
          // Use setTimeout to ensure state updates are processed
          setTimeout(() => {
            onSubscribed?.()
            onClose()
          }, 100)
        } else {
          // Check if error indicates user is already subscribed
          const iapError = error || 'Unknown error'
          const isAlreadySubscribed =
            iapError.toLowerCase().includes('already') ||
            iapError.toLowerCase().includes('purchased') ||
            iapError.toLowerCase().includes('subscription')

          if (isAlreadySubscribed || checkIsSubscribed()) {
            // User is already subscribed - close modal
            logger.info(
              'Paywall: User already subscribed (detected from error or status check)',
            )
            setSubscriptionStatus(true)
            setIsPurchasing(false) // Reset purchasing state
            setTimeout(() => {
              onSubscribed?.()
              onClose()
            }, 100)
            return
          }

          logger.warn('Paywall: Purchase returned false', {
            productId,
            planType,
            error: iapError,
          })
          trackPaywall('paywall_purchase_failed', {
            plan_type: planType,
            product_id: productId,
            error_message: iapError,
          })
          // Show the actual error message if available, otherwise show generic message
          setIsPurchasing(false) // Reset purchasing state
          setPurchaseStatus('idle')
          setPurchaseError(
            iapError && iapError !== 'Unknown error'
              ? iapError
              : 'Purchase could not be completed. Please try again.',
          )
        }
      } catch (e: any) {
        // Track purchase failed
        logger.error('Paywall: Purchase exception', {
          productId,
          planType,
          error: e.message,
          errorStack: e.stack,
        })
        trackPaywall('paywall_purchase_failed', {
          plan_type: planType,
          product_id: productId,
          error_message: e.message || 'Unknown error',
        })
        setIsPurchasing(false)
        setPurchaseStatus('idle')
        setPurchaseError(e.message || 'Purchase failed. Please try again.')
      } finally {
        clearTimeout(purchaseTimeout)
        // Use functional update to avoid dependency on purchaseStatus
        setPurchaseStatus(prev => {
          if (prev !== 'completed') {
            setIsPurchasing(false)
            return 'idle'
          }
          return prev
        })
      }
    },
    [
      purchaseSubscription,
      onSubscribed,
      onClose,
      trackPaywall,
      error,
      checkIsSubscribed,
    ],
  )

  const handleRestore = useCallback(async () => {
    setIsPurchasing(true)
    setPurchaseError(null)

    // Track restore tapped
    trackPaywall('paywall_restore_tapped', {})

    try {
      const success = await restorePurchases()
      if (success || checkIsSubscribed()) {
        // Track restore success
        trackPaywall('paywall_restore_success', {})

        // Update user property for segmentation
        firebaseAnalytics.setUserProperties({
          subscription_status: 'subscribed',
        })

        setSubscriptionStatus(true)
        setIsPurchasing(false) // Reset purchasing state
        setTimeout(() => {
          onSubscribed?.()
          onClose()
        }, 100)
      } else {
        // Track restore failed (no subscription found)
        trackPaywall('paywall_restore_failed', {
          error_message: 'No active subscription found',
        })
        setPurchaseError('No active subscription found.')
      }
    } catch (e: any) {
      // Track restore failed
      trackPaywall('paywall_restore_failed', {
        error_message: e.message || 'Unknown error',
      })
      setPurchaseError(e.message || 'Restore failed. Please try again.')
    } finally {
      setIsPurchasing(false)
    }
  }, [restorePurchases, onSubscribed, onClose, trackPaywall, checkIsSubscribed])

  const monthlyProduct = products.find(
    p => p.productId === SUBSCRIPTION_SKUS.MONTHLY,
  )
  const quarterlyProduct = products.find(
    p => p.productId === SUBSCRIPTION_SKUS.QUARTERLY,
  )

  // Debug: Log product data
  useEffect(() => {
    if (products.length > 0) {
      logger.info('Paywall products loaded', {
        count: products.length,
        products: products.map(p => ({
          productId: p.productId,
          price: p.price,
          localizedPrice: p.localizedPrice,
          title: p.title,
        })),
      })
    }
  }, [products])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={canClose ? handleClose : undefined}>
      <View
        style={[
          a.flex_1,
          a.justify_center,
          a.align_center,
          {backgroundColor: 'rgba(0, 0, 0, 0.7)'},
        ]}>
        <View
          style={[
            a.w_full,
            a.mx_lg,
            a.rounded_xl,
            a.overflow_hidden,
            {
              maxWidth: 400,
              maxHeight: '90%',
              backgroundColor: t.atoms.bg.backgroundColor,
            },
          ]}>
          {/* Header with optional close button */}
          <View
            style={[
              a.flex_row,
              a.justify_between,
              a.align_center,
              a.px_lg,
              a.pt_lg,
            ]}>
            {canClose ? (
              <Pressable
                onPress={handleClose}
                accessibilityLabel={_(msg`Close`)}
                accessibilityHint={_(msg`Close the subscription popup`)}
                style={[a.p_sm, a.rounded_full, t.atoms.bg_contrast_25]}>
                <XIcon size="md" style={t.atoms.text} />
              </Pressable>
            ) : (
              <View style={{width: 40}} />
            )}
            <Text style={[a.text_lg, a.font_bold]}>
              <Trans>BlueFly Premium</Trans>
            </Text>
            <View style={{width: 40}} />
          </View>

          <ScrollView
            contentContainerStyle={[a.p_xl, a.gap_lg]}
            showsVerticalScrollIndicator={false}>
            {/* Hero section */}
            <View style={[a.align_center, a.gap_sm]}>
              <Text
                style={[
                  a.text_2xl,
                  a.font_heavy,
                  a.text_center,
                  {color: t.palette.primary_500},
                ]}>
                <Trans>Unlock Full Access</Trans>
              </Text>
              <Text
                style={[
                  a.text_md,
                  a.text_center,
                  {color: t.palette.contrast_600},
                ]}>
                {!canClose ? (
                  <Trans>Subscribe to continue using BlueFly</Trans>
                ) : (
                  <Trans>Support BlueFly and enjoy premium features</Trans>
                )}
              </Text>
            </View>

            {/* Features */}
            <View style={[a.gap_sm, a.py_md]}>
              <FeatureItem
                text={_(msg`Ad-free browsing experience`)}
                theme={t}
              />
              <FeatureItem
                text={_(msg`Support independent development`)}
                theme={t}
              />
              <FeatureItem text={_(msg`Priority customer support`)} theme={t} />
              <FeatureItem
                text={_(msg`Early access to new features`)}
                theme={t}
              />
            </View>

            {/* Error State */}
            {(error || purchaseError) && (
              <View
                style={[
                  a.p_md,
                  a.rounded_md,
                  {backgroundColor: t.palette.negative_100},
                ]}>
                <Text
                  style={[
                    {color: t.palette.negative_600},
                    a.font_bold,
                    a.mb_xs,
                  ]}>
                  <Trans>Purchase Error</Trans>
                </Text>
                <Text style={[{color: t.palette.negative_600}, a.text_sm]}>
                  {purchaseError || error}
                </Text>
              </View>
            )}

            {/* Subscription Options */}
            {!isLoading && !isPurchasing && isInitialized && (
              <View style={[a.gap_md]}>
                {/* Monthly Plan */}
                {monthlyProduct && (
                  <SubscriptionOption
                    title={_(msg`Monthly`)}
                    price={monthlyProduct.localizedPrice}
                    period={_(msg`per month`)}
                    description={_(msg`7-day free trial`)}
                    onPress={() => {
                      handlePlanSelect(
                        'monthly',
                        SUBSCRIPTION_SKUS.MONTHLY,
                        monthlyProduct.localizedPrice,
                      )
                      handlePurchase(
                        SUBSCRIPTION_SKUS.MONTHLY,
                        'monthly',
                        monthlyProduct.localizedPrice,
                      )
                    }}
                    isLoading={isPurchasing}
                    theme={t}
                    isSelected={selectedPlan === 'monthly'}
                  />
                )}

                {/* Quarterly Plan */}
                {quarterlyProduct && (
                  <SubscriptionOption
                    title={_(msg`Quarterly`)}
                    price={quarterlyProduct.localizedPrice}
                    period={_(msg`per quarter`)}
                    description={_(msg`7-day free trial • Best value!`)}
                    onPress={() => {
                      handlePlanSelect(
                        'quarterly',
                        SUBSCRIPTION_SKUS.QUARTERLY,
                        quarterlyProduct.localizedPrice,
                      )
                      handlePurchase(
                        SUBSCRIPTION_SKUS.QUARTERLY,
                        'quarterly',
                        quarterlyProduct.localizedPrice,
                      )
                    }}
                    isLoading={isPurchasing}
                    theme={t}
                    isBestValue
                    isSelected={selectedPlan === 'quarterly'}
                  />
                )}

                {/* Show fallback subscription options if products aren't loaded */}
                {!monthlyProduct && !quarterlyProduct && (
                  <View style={[a.gap_md]}>
                    {/* Fallback Monthly Plan */}
                    <SubscriptionOption
                      title={_(msg`Monthly`)}
                      price="$2.99"
                      period={_(msg`per month`)}
                      description={_(msg`7-day free trial`)}
                      onPress={() => {
                        handlePlanSelect(
                          'monthly',
                          SUBSCRIPTION_SKUS.MONTHLY,
                          '$2.99',
                        )
                        handlePurchase(
                          SUBSCRIPTION_SKUS.MONTHLY,
                          'monthly',
                          '$2.99',
                        )
                      }}
                      isLoading={isPurchasing}
                      theme={t}
                      isSelected={selectedPlan === 'monthly'}
                    />

                    {/* Fallback Quarterly Plan */}
                    <SubscriptionOption
                      title={_(msg`Quarterly`)}
                      price="$6.99"
                      period={_(msg`per quarter`)}
                      description={_(msg`7-day free trial • Best value!`)}
                      onPress={() => {
                        handlePlanSelect(
                          'quarterly',
                          SUBSCRIPTION_SKUS.QUARTERLY,
                          '$6.99',
                        )
                        handlePurchase(
                          SUBSCRIPTION_SKUS.QUARTERLY,
                          'quarterly',
                          '$6.99',
                        )
                      }}
                      isLoading={isPurchasing}
                      theme={t}
                      isBestValue
                      isSelected={selectedPlan === 'quarterly'}
                    />

                    {/* Info message */}
                    {!isInitialized && (
                      <View
                        style={[
                          a.p_md,
                          a.rounded_md,
                          {backgroundColor: t.palette.contrast_100},
                        ]}>
                        <Text
                          style={[
                            a.text_center,
                            a.text_xs,
                            {color: t.palette.contrast_500},
                          ]}>
                          <Trans>
                            Note: Subscription prices will be confirmed during
                            purchase. For full IAP testing, install via Amazon
                            Appstore or Live App Testing.
                          </Trans>
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Loading State */}
            {(isLoading || isPurchasing) && (
              <View style={[a.py_xl, a.align_center]}>
                <Loader size="lg" />
                {isPurchasing && (
                  <Text style={[a.mt_md, {color: t.palette.contrast_500}]}>
                    {purchaseStatus === 'checking' ? (
                      <Trans>Checking purchase status...</Trans>
                    ) : (
                      <Trans>Processing...</Trans>
                    )}
                  </Text>
                )}
              </View>
            )}

            {/* Restore Purchases */}
            <Button
              variant="ghost"
              color="secondary"
              size="small"
              label={_(msg`Restore Purchases`)}
              onPress={handleRestore}
              disabled={isLoading || isPurchasing}>
              <ButtonText>
                <Trans>Restore Purchases</Trans>
              </ButtonText>
            </Button>

            {/* Terms */}
            <Text
              style={[
                a.text_xs,
                a.text_center,
                {color: t.palette.contrast_400},
              ]}>
              <Trans>
                Subscriptions automatically renew unless cancelled. Payment will
                be charged to your Amazon account.
              </Trans>
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function FeatureItem({text, theme}: {text: string; theme: any}) {
  return (
    <View style={[a.flex_row, a.align_center, a.gap_sm]}>
      <CheckIcon size="sm" style={{color: theme.palette.positive_500}} />
      <Text style={[{color: theme.palette.contrast_700}]}>{text}</Text>
    </View>
  )
}

function SubscriptionOption({
  title,
  price,
  period,
  description,
  onPress,
  isLoading,
  theme,
  isBestValue,
  isSelected,
}: {
  title: string
  price: string
  period: string
  description: string
  onPress: () => void
  isLoading: boolean
  theme: any
  isBestValue?: boolean
  isSelected?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isLoading}
      style={[
        a.p_lg,
        a.rounded_lg,
        a.border,
        {
          borderColor: isSelected
            ? theme.palette.primary_600
            : isBestValue
              ? theme.palette.primary_500
              : theme.palette.contrast_200,
          borderWidth: isSelected || isBestValue ? 2 : 1,
          backgroundColor: isSelected ? theme.palette.primary_50 : undefined,
        },
      ]}>
      {isBestValue && (
        <View
          style={[
            a.absolute,
            a.px_sm,
            a.py_xs,
            a.rounded_sm,
            {
              top: -10,
              right: 16,
              backgroundColor: theme.palette.primary_500,
            },
          ]}>
          <Text style={[a.text_xs, a.font_bold, {color: 'white'}]}>
            <Trans>BEST VALUE</Trans>
          </Text>
        </View>
      )}

      <View style={[a.flex_row, a.justify_between, a.align_center]}>
        <View style={[a.flex_1]}>
          <Text style={[a.text_lg, a.font_bold]}>{title}</Text>
          <Text style={[a.text_xs, {color: theme.palette.contrast_500}]}>
            {description}
          </Text>
        </View>
        <View style={[a.align_end]}>
          <Text style={[a.text_xl, a.font_heavy]}>
            {(() => {
              // Validate price string - should contain numbers and currency symbols
              if (!price || typeof price !== 'string') {
                return 'Loading...'
              }

              // Check for known corrupted values
              const corruptedValues = ['fapFgb', 'undefined', 'null', 'NaN']
              if (
                corruptedValues.some(corrupted => price.includes(corrupted))
              ) {
                logger.warn('Corrupted price detected, using fallback', {price})
                // Use fallback based on title (Monthly = $2.99, Quarterly = $6.99)
                return title.toLowerCase().includes('monthly')
                  ? '$2.99'
                  : '$6.99'
              }

              // Check if price looks valid (must contain at least one digit and currency symbol)
              const hasDigit = /\d/.test(price)
              const hasCurrencySymbol = /[$€£¥₹]/.test(price)
              const isValidPrice =
                hasDigit &&
                hasCurrencySymbol &&
                price.length < 20 &&
                price.length > 0

              if (!isValidPrice) {
                logger.warn('Invalid price format detected, using fallback', {
                  price,
                })
                // Use fallback based on title
                return title.toLowerCase().includes('monthly')
                  ? '$2.99'
                  : '$6.99'
              }

              return price
            })()}
          </Text>
          <Text style={[a.text_xs, {color: theme.palette.contrast_500}]}>
            {period}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}
