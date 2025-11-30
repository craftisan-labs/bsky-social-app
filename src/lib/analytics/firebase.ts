/**
 * Firebase Analytics Service for BlueFly
 *
 * This module provides comprehensive analytics tracking including:
 * - Screen views
 * - User journey events (login, signup, etc.)
 * - Button/interaction events
 * - Performance metrics
 */

import analytics from '@react-native-firebase/analytics'

import {logger} from '#/logger'

// =============================================================================
// Types
// =============================================================================

export type ScreenName =
  | 'Home'
  | 'Search'
  | 'Feeds'
  | 'Notifications'
  | 'Messages'
  | 'Profile'
  | 'Settings'
  | 'PostThread'
  | 'Composer'
  | 'Login'
  | 'Signup'
  | 'Onboarding'
  | 'Lists'
  | 'Moderation'
  | 'StarterPack'
  | 'HashtagFeed'
  | 'ProfileFollowers'
  | 'ProfileFollows'
  | 'ProfileLikes'
  | 'EditProfile'
  | 'SavedFeeds'
  | 'PreferencesFollowingFeed'
  | 'PreferencesThreads'
  | 'PreferencesExternalEmbeds'
  | 'AppPasswords'
  | 'ChangeHandle'
  | 'ChangeEmail'
  | 'PrivacyPolicy'
  | 'TermsOfService'
  | 'CommunityGuidelines'
  | 'CopyrightPolicy'
  | 'Support'
  | 'Debug'
  | 'Log'
  | 'About'
  | 'LanguageSettings'
  | 'Accessibility'
  | 'AppearanceSettings'
  | 'AccountSettings'
  | 'ContentAndMediaSettings'
  | 'NotificationSettings'
  | 'ChatSettings'
  | 'ExternalEmbedSettings'
  | 'MutedAccounts'
  | 'BlockedAccounts'
  | 'HiddenPosts'
  | 'ModerationModlists'
  | 'ModerationBlockedAccounts'
  | 'ModerationMutedAccounts'
  | string // Allow custom screen names

export type UserJourneyEvent =
  | 'signup_started'
  | 'signup_completed'
  | 'signup_failed'
  | 'login_started'
  | 'login_completed'
  | 'login_failed'
  | 'logout'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'profile_created'
  | 'profile_updated'
  | 'first_post'
  | 'first_follow'
  | 'first_like'
  | 'first_repost'
  | 'account_deleted'
  | 'session_resumed'
  | 'session_expired'

export type InteractionEvent =
  | 'post_created'
  | 'post_deleted'
  | 'post_liked'
  | 'post_unliked'
  | 'post_reposted'
  | 'post_unreposted'
  | 'post_quoted'
  | 'post_replied'
  | 'post_shared'
  | 'post_reported'
  | 'post_muted'
  | 'post_hidden'
  | 'post_translated'
  | 'user_followed'
  | 'user_unfollowed'
  | 'user_blocked'
  | 'user_unblocked'
  | 'user_muted'
  | 'user_unmuted'
  | 'user_reported'
  | 'user_profile_viewed'
  | 'feed_subscribed'
  | 'feed_unsubscribed'
  | 'feed_liked'
  | 'feed_unliked'
  | 'feed_pinned'
  | 'feed_unpinned'
  | 'feed_shared'
  | 'list_created'
  | 'list_deleted'
  | 'list_user_added'
  | 'list_user_removed'
  | 'list_subscribed'
  | 'list_unsubscribed'
  | 'dm_sent'
  | 'dm_conversation_started'
  | 'dm_conversation_deleted'
  | 'notification_tapped'
  | 'notification_cleared'
  | 'search_performed'
  | 'search_result_tapped'
  | 'hashtag_tapped'
  | 'mention_tapped'
  | 'link_tapped'
  | 'image_viewed'
  | 'video_played'
  | 'video_completed'
  | 'media_downloaded'
  | 'settings_changed'
  | 'theme_changed'
  | 'language_changed'
  | 'app_icon_changed'
  | 'share_sheet_opened'
  | 'deep_link_opened'
  | 'push_permission_granted'
  | 'push_permission_denied'
  | 'error_displayed'
  | 'refresh_feed'
  | 'scroll_to_top'
  | 'pull_to_refresh'

export type ButtonEvent =
  | 'button_compose'
  | 'button_post'
  | 'button_reply'
  | 'button_repost'
  | 'button_like'
  | 'button_share'
  | 'button_follow'
  | 'button_unfollow'
  | 'button_message'
  | 'button_search'
  | 'button_settings'
  | 'button_profile'
  | 'button_notifications'
  | 'button_home'
  | 'button_feeds'
  | 'button_back'
  | 'button_close'
  | 'button_menu'
  | 'button_save'
  | 'button_cancel'
  | 'button_confirm'
  | 'button_delete'
  | 'button_edit'
  | 'button_report'
  | 'button_block'
  | 'button_mute'
  | 'button_login'
  | 'button_signup'
  | 'button_logout'
  | 'button_camera'
  | 'button_gallery'
  | 'button_gif'
  | 'button_emoji'
  | 'button_attach'

export interface EventParams {
  [key: string]: string | number | boolean | undefined
}

// =============================================================================
// Firebase Analytics Service
// =============================================================================

class FirebaseAnalyticsService {
  private isEnabled: boolean = true
  private userId: string | null = null

  /**
   * Initialize the analytics service
   */
  async init() {
    try {
      // Enable analytics collection
      await analytics().setAnalyticsCollectionEnabled(this.isEnabled)
      logger.info('FirebaseAnalytics: Initialized')
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to initialize', {error})
    }
  }

  /**
   * Enable or disable analytics collection
   */
  async setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    try {
      await analytics().setAnalyticsCollectionEnabled(enabled)
      logger.debug(`FirebaseAnalytics: Collection ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to set enabled state', {error})
    }
  }

  /**
   * Set the user ID for analytics
   */
  async setUserId(userId: string | null) {
    this.userId = userId
    try {
      await analytics().setUserId(userId)
      logger.debug('FirebaseAnalytics: User ID set', {userId: userId ? '[SET]' : '[CLEARED]'})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to set user ID', {error})
    }
  }

  /**
   * Set user properties
   */
  async setUserProperties(properties: Record<string, string | null>) {
    try {
      for (const [key, value] of Object.entries(properties)) {
        await analytics().setUserProperty(key, value)
      }
      logger.debug('FirebaseAnalytics: User properties set', {properties})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to set user properties', {error})
    }
  }

  /**
   * Log a screen view event
   */
  async logScreenView(screenName: ScreenName, screenClass?: string) {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      })
      logger.debug('FirebaseAnalytics: Screen view', {screenName})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to log screen view', {error, screenName})
    }
  }

  /**
   * Log a user journey event
   */
  async logUserJourney(event: UserJourneyEvent, params?: EventParams) {
    try {
      await analytics().logEvent(event, {
        ...params,
        event_category: 'user_journey',
        timestamp: Date.now(),
      })
      logger.debug('FirebaseAnalytics: User journey event', {event, params})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to log user journey', {error, event})
    }
  }

  /**
   * Log an interaction event
   */
  async logInteraction(event: InteractionEvent, params?: EventParams) {
    try {
      await analytics().logEvent(event, {
        ...params,
        event_category: 'interaction',
        timestamp: Date.now(),
      })
      logger.debug('FirebaseAnalytics: Interaction event', {event, params})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to log interaction', {error, event})
    }
  }

  /**
   * Log a button tap event
   */
  async logButtonTap(button: ButtonEvent, params?: EventParams) {
    try {
      await analytics().logEvent(button, {
        ...params,
        event_category: 'button',
        timestamp: Date.now(),
      })
      logger.debug('FirebaseAnalytics: Button tap', {button, params})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to log button tap', {error, button})
    }
  }

  /**
   * Log a generic custom event
   */
  async logEvent(eventName: string, params?: EventParams) {
    try {
      await analytics().logEvent(eventName, {
        ...params,
        timestamp: Date.now(),
      })
      logger.debug('FirebaseAnalytics: Custom event', {eventName, params})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to log event', {error, eventName})
    }
  }

  /**
   * Log app open event
   */
  async logAppOpen() {
    try {
      await analytics().logAppOpen()
      logger.debug('FirebaseAnalytics: App open')
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to log app open', {error})
    }
  }

  /**
   * Log login event
   */
  async logLogin(method: string = 'email') {
    try {
      await analytics().logLogin({method})
      logger.debug('FirebaseAnalytics: Login', {method})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to log login', {error})
    }
  }

  /**
   * Log signup event
   */
  async logSignUp(method: string = 'email') {
    try {
      await analytics().logSignUp({method})
      logger.debug('FirebaseAnalytics: Signup', {method})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to log signup', {error})
    }
  }

  /**
   * Log share event
   */
  async logShare(contentType: string, itemId: string, method?: string) {
    try {
      await analytics().logShare({
        content_type: contentType,
        item_id: itemId,
        method: method || 'unknown',
      })
      logger.debug('FirebaseAnalytics: Share', {contentType, itemId, method})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to log share', {error})
    }
  }

  /**
   * Log search event
   */
  async logSearch(searchTerm: string) {
    try {
      await analytics().logSearch({search_term: searchTerm})
      logger.debug('FirebaseAnalytics: Search', {searchTerm})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to log search', {error})
    }
  }

  /**
   * Log select content event
   */
  async logSelectContent(contentType: string, itemId: string) {
    try {
      await analytics().logSelectContent({
        content_type: contentType,
        item_id: itemId,
      })
      logger.debug('FirebaseAnalytics: Select content', {contentType, itemId})
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to log select content', {error})
    }
  }

  /**
   * Reset analytics data (for logout)
   */
  async resetAnalyticsData() {
    try {
      await analytics().resetAnalyticsData()
      this.userId = null
      logger.debug('FirebaseAnalytics: Data reset')
    } catch (error) {
      logger.error('FirebaseAnalytics: Failed to reset data', {error})
    }
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const firebaseAnalytics = new FirebaseAnalyticsService()

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Log a screen view - use this in your screen components
 */
export const logScreenView = (screenName: ScreenName, screenClass?: string) =>
  firebaseAnalytics.logScreenView(screenName, screenClass)

/**
 * Log a user journey event
 */
export const logUserJourney = (event: UserJourneyEvent, params?: EventParams) =>
  firebaseAnalytics.logUserJourney(event, params)

/**
 * Log an interaction event
 */
export const logInteraction = (event: InteractionEvent, params?: EventParams) =>
  firebaseAnalytics.logInteraction(event, params)

/**
 * Log a button tap event
 */
export const logButtonTap = (button: ButtonEvent, params?: EventParams) =>
  firebaseAnalytics.logButtonTap(button, params)

/**
 * Log a custom event
 */
export const logEvent = (eventName: string, params?: EventParams) =>
  firebaseAnalytics.logEvent(eventName, params)

