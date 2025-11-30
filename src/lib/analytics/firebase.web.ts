/**
 * Firebase Analytics Service for BlueFly (Web - No-op)
 *
 * Web analytics can be added later if needed.
 * For now, this is a no-op implementation.
 */

import {logger} from '#/logger'

export type ScreenName = string
export type UserJourneyEvent = string
export type InteractionEvent = string
export type ButtonEvent = string
export interface EventParams {
  [key: string]: string | number | boolean | undefined
}

class FirebaseAnalyticsService {
  async init() {
    logger.debug('FirebaseAnalytics (Web): No-op initialized')
  }

  async setEnabled(_enabled: boolean) {}
  async setUserId(_userId: string | null) {}
  async setUserProperties(_properties: Record<string, string | null>) {}
  async logScreenView(_screenName: ScreenName, _screenClass?: string) {}
  async logUserJourney(_event: UserJourneyEvent, _params?: EventParams) {}
  async logInteraction(_event: InteractionEvent, _params?: EventParams) {}
  async logButtonTap(_button: ButtonEvent, _params?: EventParams) {}
  async logEvent(_eventName: string, _params?: EventParams) {}
  async logAppOpen() {}
  async logLogin(_method?: string) {}
  async logSignUp(_method?: string) {}
  async logShare(_contentType: string, _itemId: string, _method?: string) {}
  async logSearch(_searchTerm: string) {}
  async logSelectContent(_contentType: string, _itemId: string) {}
  async resetAnalyticsData() {}
}

export const firebaseAnalytics = new FirebaseAnalyticsService()

export const logScreenView = (_screenName: ScreenName, _screenClass?: string) =>
  Promise.resolve()
export const logUserJourney = (_event: UserJourneyEvent, _params?: EventParams) =>
  Promise.resolve()
export const logInteraction = (_event: InteractionEvent, _params?: EventParams) =>
  Promise.resolve()
export const logButtonTap = (_button: ButtonEvent, _params?: EventParams) =>
  Promise.resolve()
export const logEvent = (_eventName: string, _params?: EventParams) =>
  Promise.resolve()

