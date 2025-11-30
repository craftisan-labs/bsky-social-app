/**
 * Subscription Screen for BlueFly
 *
 * Allows users to view and manage their subscription
 */

import React, {useCallback} from 'react'
import {ActivityIndicator, ScrollView, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useIAP, SUBSCRIPTION_SKUS} from '#/lib/iap'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import * as Layout from '#/components/Layout'

export function SubscriptionScreen() {
  const {_} = useLingui()
  const t = useTheme()
  const {
    isInitialized,
    isLoading,
    subscriptionStatus,
    products,
    error,
    purchaseSubscription,
    restorePurchases,
  } = useIAP()

  const handlePurchase = useCallback(
    async (productId: string) => {
      await purchaseSubscription(productId)
    },
    [purchaseSubscription],
  )

  const handleRestore = useCallback(async () => {
    await restorePurchases()
  }, [restorePurchases])

  const monthlyProduct = products.find(
    p => p.productId === SUBSCRIPTION_SKUS.MONTHLY,
  )
  const quarterlyProduct = products.find(
    p => p.productId === SUBSCRIPTION_SKUS.QUARTERLY,
  )

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Subscription</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Content>
        <ScrollView
          contentContainerStyle={[a.p_xl, a.gap_xl]}
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={[a.gap_sm]}>
            <Text style={[a.text_3xl, a.font_heavy, a.text_center]}>
              <Trans>BlueFly Premium</Trans>
            </Text>
            <Text
              style={[
                a.text_md,
                a.text_center,
                {color: t.palette.contrast_600},
              ]}>
              <Trans>
                Support BlueFly development and enjoy an ad-free experience
              </Trans>
            </Text>
          </View>

          {/* Current Status */}
          {subscriptionStatus.isSubscribed && (
            <View
              style={[
                a.p_lg,
                a.rounded_md,
                {backgroundColor: t.palette.positive_100},
              ]}>
              <View style={[a.flex_row, a.align_center, a.gap_sm]}>
                <CheckIcon size="md" style={{color: t.palette.positive_600}} />
                <Text style={[a.font_bold, {color: t.palette.positive_700}]}>
                  <Trans>Active Subscription</Trans>
                </Text>
              </View>
              <Text style={[a.mt_sm, {color: t.palette.positive_700}]}>
                {subscriptionStatus.tier === 'monthly' ? (
                  <Trans>Monthly Plan</Trans>
                ) : (
                  <Trans>Quarterly Plan</Trans>
                )}
              </Text>
              {subscriptionStatus.isTrialPeriod && (
                <Text style={[a.mt_xs, {color: t.palette.positive_600}]}>
                  <Trans>Free trial active</Trans>
                </Text>
              )}
            </View>
          )}

          {/* Features */}
          <View style={[a.gap_md]}>
            <Text style={[a.text_lg, a.font_bold]}>
              <Trans>Premium Features</Trans>
            </Text>
            <FeatureItem text={_(msg`Ad-free browsing experience`)} />
            <FeatureItem text={_(msg`Support independent development`)} />
            <FeatureItem text={_(msg`Priority customer support`)} />
            <FeatureItem text={_(msg`Early access to new features`)} />
          </View>

          {/* Loading State */}
          {isLoading && (
            <View style={[a.py_xl, a.align_center]}>
              <Loader size="lg" />
              <Text style={[a.mt_md, {color: t.palette.contrast_500}]}>
                <Trans>Loading...</Trans>
              </Text>
            </View>
          )}

          {/* Error State */}
          {error && (
            <View
              style={[
                a.p_lg,
                a.rounded_md,
                {backgroundColor: t.palette.negative_100},
              ]}>
              <Text style={[{color: t.palette.negative_600}]}>{error}</Text>
            </View>
          )}

          {/* Subscription Options */}
          {!isLoading && isInitialized && !subscriptionStatus.isSubscribed && (
            <View style={[a.gap_lg]}>
              <Text style={[a.text_lg, a.font_bold]}>
                <Trans>Choose Your Plan</Trans>
              </Text>

              {/* Monthly Plan */}
              {monthlyProduct && (
                <SubscriptionCard
                  title={_(msg`Monthly`)}
                  price={monthlyProduct.localizedPrice}
                  period={_(msg`per month`)}
                  description={_(msg`7-day free trial included`)}
                  onPress={() => handlePurchase(SUBSCRIPTION_SKUS.MONTHLY)}
                  isLoading={isLoading}
                />
              )}

              {/* Quarterly Plan */}
              {quarterlyProduct && (
                <SubscriptionCard
                  title={_(msg`Quarterly`)}
                  price={quarterlyProduct.localizedPrice}
                  period={_(msg`per quarter`)}
                  description={_(msg`7-day free trial • Best value!`)}
                  onPress={() => handlePurchase(SUBSCRIPTION_SKUS.QUARTERLY)}
                  isLoading={isLoading}
                  isBestValue
                />
              )}
            </View>
          )}

          {/* Not Initialized */}
          {!isLoading && !isInitialized && (
            <View style={[a.py_xl, a.align_center]}>
              <Text style={[{color: t.palette.contrast_500}]}>
                <Trans>
                  Subscriptions are only available on Amazon Fire devices
                </Trans>
              </Text>
            </View>
          )}

          {/* Restore Purchases */}
          <View style={[a.pt_lg]}>
            <Button
              variant="ghost"
              color="secondary"
              size="medium"
              label={_(msg`Restore Purchases`)}
              onPress={handleRestore}
              disabled={isLoading || !isInitialized}>
              <ButtonText>
                <Trans>Restore Purchases</Trans>
              </ButtonText>
            </Button>
          </View>

          {/* Terms */}
          <View style={[a.pt_md]}>
            <Text
              style={[a.text_xs, a.text_center, {color: t.palette.contrast_400}]}>
              <Trans>
                Subscriptions automatically renew unless cancelled at least 24
                hours before the end of the current period. Payment will be
                charged to your Amazon account.
              </Trans>
            </Text>
          </View>
        </ScrollView>
      </Layout.Content>
    </Layout.Screen>
  )
}

// =============================================================================
// Components
// =============================================================================

function FeatureItem({text}: {text: string}) {
  const t = useTheme()
  return (
    <View style={[a.flex_row, a.align_center, a.gap_sm]}>
      <CheckIcon size="sm" style={{color: t.palette.primary_500}} />
      <Text style={[{color: t.palette.contrast_700}]}>{text}</Text>
    </View>
  )
}

function SubscriptionCard({
  title,
  price,
  period,
  description,
  onPress,
  isLoading,
  isBestValue,
}: {
  title: string
  price: string
  period: string
  description: string
  onPress: () => void
  isLoading: boolean
  isBestValue?: boolean
}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.p_lg,
        a.rounded_lg,
        a.border,
        {
          borderColor: isBestValue
            ? t.palette.primary_500
            : t.palette.contrast_200,
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
              backgroundColor: t.palette.primary_500,
            },
          ]}>
          <Text style={[a.text_xs, a.font_bold, {color: 'white'}]}>
            <Trans>BEST VALUE</Trans>
          </Text>
        </View>
      )}

      <View style={[a.flex_row, a.justify_between, a.align_center]}>
        <View>
          <Text style={[a.text_xl, a.font_bold]}>{title}</Text>
          <Text style={[a.text_sm, {color: t.palette.contrast_500}]}>
            {description}
          </Text>
        </View>
        <View style={[a.align_end]}>
          <Text style={[a.text_2xl, a.font_heavy]}>{price}</Text>
          <Text style={[a.text_xs, {color: t.palette.contrast_500}]}>
            {period}
          </Text>
        </View>
      </View>

      <Button
        variant="solid"
        color="primary"
        size="large"
        label={`Subscribe to ${title}`}
        onPress={onPress}
        disabled={isLoading}
        style={[a.mt_lg]}>
        {isLoading ? (
          <ButtonIcon icon={Loader} />
        ) : (
          <ButtonText>
            <Trans>Subscribe</Trans>
          </ButtonText>
        )}
      </Button>
    </View>
  )
}

