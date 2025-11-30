/**
 * Paywall Modal Component
 * 
 * Shows subscription options with conditional close button based on
 * how many times the user has dismissed the paywall.
 */

import React, {useCallback, useEffect, useState} from 'react'
import {Modal, Pressable, ScrollView, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useIAP, SUBSCRIPTION_SKUS} from '#/lib/iap'
import {
  canDismissPaywall,
  getDismissCount,
  incrementDismissCount,
  setLastShownTime,
  isUserSubscribed,
  setSubscriptionStatus,
} from '#/lib/iap/PaywallState'
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
}

export function PaywallModal({visible, onClose, onSubscribed}: PaywallModalProps) {
  const {_} = useLingui()
  const t = useTheme()
  const {
    isInitialized,
    isLoading,
    products,
    error,
    purchaseSubscription,
    restorePurchases,
  } = useIAP()

  const [canClose, setCanClose] = useState(true)
  const [dismissCount, setDismissCount] = useState(0)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      // Check if user can dismiss this time
      const canDismiss = canDismissPaywall()
      setCanClose(canDismiss)
      setDismissCount(getDismissCount())
      setLastShownTime()
      setPurchaseError(null) // Clear any previous errors
    }
  }, [visible])

  const handleClose = useCallback(() => {
    if (canClose) {
      incrementDismissCount()
      onClose()
    }
    // If canClose is false (hard paywall), do nothing - user must subscribe
  }, [canClose, onClose])

  const handlePurchase = useCallback(
    async (productId: string) => {
      setIsPurchasing(true)
      setPurchaseError(null)
      
      try {
        const result = await purchaseSubscription(productId)
        if (result) {
          setSubscriptionStatus(true)
          onSubscribed?.()
          onClose() // Only close on successful subscription
        } else {
          // Purchase failed or was cancelled - keep paywall open
          setPurchaseError('Purchase could not be completed. Please try again.')
        }
      } catch (e: any) {
        setPurchaseError(e.message || 'Purchase failed. Please try again.')
      } finally {
        setIsPurchasing(false)
      }
    },
    [purchaseSubscription, onSubscribed, onClose],
  )

  const handleRestore = useCallback(async () => {
    setIsPurchasing(true)
    setPurchaseError(null)
    
    try {
      const success = await restorePurchases()
      if (success) {
        setSubscriptionStatus(true)
        onSubscribed?.()
        onClose()
      } else {
        setPurchaseError('No active subscription found.')
      }
    } catch (e: any) {
      setPurchaseError(e.message || 'Restore failed. Please try again.')
    } finally {
      setIsPurchasing(false)
    }
  }, [restorePurchases, onSubscribed, onClose])

  const monthlyProduct = products.find(
    p => p.productId === SUBSCRIPTION_SKUS.MONTHLY,
  )
  const quarterlyProduct = products.find(
    p => p.productId === SUBSCRIPTION_SKUS.QUARTERLY,
  )

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
                  <Trans>
                    Subscribe to continue using BlueFly
                  </Trans>
                ) : (
                  <Trans>
                    Support BlueFly and enjoy premium features
                  </Trans>
                )}
              </Text>
            </View>

            {/* Features */}
            <View style={[a.gap_sm, a.py_md]}>
              <FeatureItem text={_(msg`Ad-free browsing experience`)} theme={t} />
              <FeatureItem text={_(msg`Support independent development`)} theme={t} />
              <FeatureItem text={_(msg`Priority customer support`)} theme={t} />
              <FeatureItem text={_(msg`Early access to new features`)} theme={t} />
            </View>

            {/* Error State */}
            {(error || purchaseError) && (
              <View
                style={[
                  a.p_md,
                  a.rounded_md,
                  {backgroundColor: t.palette.negative_100},
                ]}>
                <Text style={[{color: t.palette.negative_600}]}>
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
                    onPress={() => handlePurchase(SUBSCRIPTION_SKUS.MONTHLY)}
                    isLoading={isPurchasing}
                    theme={t}
                  />
                )}

                {/* Quarterly Plan */}
                {quarterlyProduct && (
                  <SubscriptionOption
                    title={_(msg`Quarterly`)}
                    price={quarterlyProduct.localizedPrice}
                    period={_(msg`per quarter`)}
                    description={_(msg`7-day free trial • Best value!`)}
                    onPress={() => handlePurchase(SUBSCRIPTION_SKUS.QUARTERLY)}
                    isLoading={isPurchasing}
                    theme={t}
                    isBestValue
                  />
                )}
              </View>
            )}

            {/* Loading State */}
            {(isLoading || isPurchasing) && (
              <View style={[a.py_xl, a.align_center]}>
                <Loader size="lg" />
                {isPurchasing && (
                  <Text style={[a.mt_md, {color: t.palette.contrast_500}]}>
                    <Trans>Processing...</Trans>
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
                Subscriptions automatically renew unless cancelled. Payment
                will be charged to your Amazon account.
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
}: {
  title: string
  price: string
  period: string
  description: string
  onPress: () => void
  isLoading: boolean
  theme: any
  isBestValue?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      style={[
        a.p_lg,
        a.rounded_lg,
        a.border,
        {
          borderColor: isBestValue
            ? theme.palette.primary_500
            : theme.palette.contrast_200,
          borderWidth: isBestValue ? 2 : 1,
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
          <Text style={[a.text_xl, a.font_heavy]}>{price}</Text>
          <Text style={[a.text_xs, {color: theme.palette.contrast_500}]}>
            {period}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

