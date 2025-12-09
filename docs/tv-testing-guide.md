# Fire TV Subscription Testing Guide

This guide explains how to test Amazon in-app subscriptions on Fire TV devices in a production environment using Amazon's Live App Testing (LAT) feature.

## Overview

Testing subscriptions on Fire TV devices requires a production-like environment to ensure the complete subscription flow works correctly. We use **Amazon Live App Testing (LAT)** instead of hardcoding credentials, which provides:

- **Real Production Testing**: Tests actual production IAP flow (not sandbox)
- **Security**: No credentials stored in code
- **Real User Experience**: Tests complete user journey from sign-in to subscription
- **Compliance**: Follows Amazon's recommended practices
- **Scalability**: Easy to add/remove testers

## Prerequisites

1. **Amazon Developer Account** with app submitted to Amazon Appstore
2. **Production APK Build** ready for testing
3. **Fire TV Devices** for testers (Fire TV Stick, Fire TV Cube, or Fire TV Edition)
4. **Testers** with Amazon accounts and Fire TV devices

## Step-by-Step LAT Workflow

### 1. Build Production APK

Build your production APK using EAS Build or local build:

```bash
# Using EAS Build (recommended)
eas build --profile amazon-appstore --platform android

# Or build locally
yarn android:prod
```

The APK will be available for download from EAS or your local build output.

### 2. Create Live App Testing Session

1. Go to [Amazon Developer Console](https://developer.amazon.com/apps-and-games/console/apps)
2. Select your app (BlueFly)
3. Navigate to **"Live App Testing"** in the left sidebar
4. Click **"Create New Test"**

### 3. Configure Test Details

Fill in the test configuration:

- **Test Name**: e.g., "Fire TV Production Subscription Test"
- **Description**: 
  ```
  Testing subscription purchase flow on Fire TV devices in production environment.
  Testers will verify:
  - App installation and launch on Fire TV
  - User sign-in flow
  - Subscription purchase flow
  - Subscription status verification
  - Subscription restoration
  ```
- **Test Duration**: Recommend 7-14 days for thorough testing
- **Allow Feedback**: Enable to receive tester feedback

### 4. Upload APK

1. Click **"Upload APK"** or drag and drop your production APK
2. Wait for upload to complete
3. Verify the APK details are correct (version, build number, etc.)

### 5. Add Testers

1. Click **"Add Testers"**
2. Enter email addresses of testers who have:
   - Fire TV devices (Fire TV Stick, Fire TV Cube, or Fire TV Edition)
   - Amazon accounts
   - Access to the device for testing
3. **Recommended**: Start with 3-5 testers for initial testing
4. Click **"Add"** to add testers

**Note**: Testers will receive an email invitation with instructions to download and install the app.

### 6. Launch Test

1. Review all test settings
2. Click **"Launch Test"**
3. Testers will receive email notifications with:
   - Test invitation link
   - Instructions for installation
   - Test duration information

## Tester Workflow

### For Testers (Instructions to Share)

1. **Receive Invitation**: Check email for LAT invitation
2. **Open on Fire TV**: 
   - Open email on Fire TV device (or use Amazon account on web)
   - Click invitation link
3. **Install App**:
   - Follow prompts to install app from LAT
   - App will appear in "Your Apps & Channels" on Fire TV
4. **Launch App**: Open BlueFly from Fire TV home screen
5. **Sign In**: 
   - Sign in with your real Amazon account
   - Complete any authentication steps
6. **Test Subscription**:
   - Navigate to subscription/paywall screen
   - Select a subscription tier (Monthly or Quarterly)
   - Click "Subscribe" button
   - Complete purchase with real payment method
   - Verify subscription is active
7. **Test Restoration**:
   - Uninstall and reinstall app
   - Sign in again
   - Verify subscription is restored
8. **Provide Feedback**: Use feedback option in LAT to report issues

## Monitoring Test Results

### In Amazon Developer Console

1. **LAT Dashboard**:
   - Go to "Live App Testing" → Your test
   - View tester activity and status
   - Check installation and usage statistics

2. **Subscription Reports**:
   - Navigate to "In-App Items" → "Reports"
   - View subscription purchases
   - Check subscription status and renewals
   - Verify receipt IDs match your backend logs

3. **Tester Feedback**:
   - Review feedback from testers
   - Address any issues reported

### In Your Backend

1. **Receipt Validation Logs**:
   - Check Firebase Cloud Functions logs
   - Verify receipt validation is working
   - Monitor for any validation errors

2. **Subscription Status**:
   - Verify subscriptions are being stored correctly
   - Check subscription expiration dates
   - Monitor auto-renewal status

## Testing Checklist

Use this checklist to ensure comprehensive testing:

### Installation & Launch
- [ ] App installs successfully on Fire TV
- [ ] App appears in Fire TV launcher
- [ ] App launches without crashes
- [ ] UI is visible and usable on TV screen

### Authentication
- [ ] User can sign in with Amazon account
- [ ] Sign-in flow works with Fire TV remote
- [ ] Session persists after app restart

### Subscription Purchase
- [ ] Subscription products load correctly
- [ ] Subscription prices display correctly
- [ ] Purchase flow initiates correctly
- [ ] Amazon payment dialog appears
- [ ] Purchase completes successfully
- [ ] Receipt validation succeeds
- [ ] Subscription status updates in app

### Subscription Status
- [ ] Active subscription is detected
- [ ] Subscription tier is correct
- [ ] Expiration date is accurate
- [ ] Trial period status is correct (if applicable)

### Subscription Restoration
- [ ] Subscription restores after reinstall
- [ ] Subscription restores after sign-out/sign-in
- [ ] Multiple subscriptions handled correctly

### Edge Cases
- [ ] Cancelled subscription is detected
- [ ] Expired subscription is handled
- [ ] Network errors during purchase are handled
- [ ] Purchase cancellation is handled gracefully

## Troubleshooting

### Common Issues

#### App Not Appearing in LAT
- **Issue**: Testers can't find app in LAT
- **Solution**: 
  - Verify tester email is correct
  - Check spam folder for invitation
  - Ensure Fire TV device is linked to correct Amazon account

#### Subscription Purchase Fails
- **Issue**: Purchase doesn't complete
- **Solution**:
  - Verify IAP items are active in Amazon Developer Console
  - Check payment method is valid on Amazon account
  - Verify app is using production build (not sandbox)

#### Receipt Validation Fails
- **Issue**: Backend validation returns error
- **Solution**:
  - Check Firebase Cloud Functions logs
  - Verify Amazon shared secret is correct
  - Ensure receipt ID format is correct
  - Check network connectivity

#### App Crashes on Fire TV
- **Issue**: App crashes on launch or during use
- **Solution**:
  - Check Android logs: `adb logcat`
  - Verify TV manifest entries are correct
  - Test UI navigation with remote control
  - Check for TV-specific compatibility issues

### Getting Help

- **Amazon Developer Support**: [Amazon Developer Forums](https://forums.developer.amazon.com/)
- **LAT Documentation**: [Amazon LAT Guide](https://developer.amazon.com/docs/app-testing/about-live-app-testing.html)
- **IAP Documentation**: [Amazon IAP Guide](https://developer.amazon.com/docs/in-app-purchasing/iap-overview.html)

## Best Practices

1. **Test Duration**: Allow 7-14 days for thorough testing
2. **Tester Selection**: Choose testers with different Fire TV models
3. **Clear Instructions**: Provide detailed instructions to testers
4. **Monitor Regularly**: Check LAT dashboard daily during test period
5. **Document Issues**: Keep track of all issues and resolutions
6. **Test Multiple Scenarios**: Test both monthly and quarterly subscriptions
7. **Verify Backend**: Ensure receipt validation is working correctly
8. **Test Restoration**: Always test subscription restoration flow

## Next Steps After Testing

Once LAT testing is complete:

1. **Review Results**: Analyze all test results and feedback
2. **Fix Issues**: Address any bugs or issues found
3. **Update Documentation**: Update this guide with any new findings
4. **Prepare for Release**: Once all issues are resolved, proceed with production release
5. **Monitor Production**: After release, monitor subscription purchases and validation

## Additional Resources

- [Amazon Live App Testing Documentation](https://developer.amazon.com/docs/app-testing/about-live-app-testing.html)
- [Amazon IAP Testing Guide](https://developer.amazon.com/docs/in-app-purchasing/iap-testing.html)
- [Fire TV Development Guide](https://developer.amazon.com/docs/fire-tv/getting-started.html)
- [Amazon Appstore Submission Guide](https://developer.amazon.com/docs/app-submission/submitting-your-app.html)

