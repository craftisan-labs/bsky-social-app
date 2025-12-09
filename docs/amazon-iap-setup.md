# Amazon In-App Purchase Setup Guide

This guide explains how to set up Amazon In-App Purchases (IAP) for BlueFly.

## Overview

BlueFly uses `react-native-iap` for Amazon Appstore integration with server-side receipt validation for security.

## Prerequisites

1. **Amazon Developer Account**: Register at [Amazon Developer Console](https://developer.amazon.com/)
2. **App Listed in Amazon Appstore**: Your app must be submitted (at least draft) to get IAP working
3. **Amazon App Tester**: For testing on Fire devices

## Configuration

### 1. Environment Variables

Set these environment variables in your `.env` file or Expo environment:

```bash
# Amazon Developer Shared Secret (keep this secure!)
EXPO_PUBLIC_AMAZON_SHARED_SECRET=your_shared_secret_here

# Amazon Developer ID
EXPO_PUBLIC_AMAZON_DEVELOPER_ID=your_developer_id_here

# Backend validation server URL (recommended for production)
EXPO_PUBLIC_IAP_VALIDATION_URL=https://your-backend.com/api/validate-receipt
```

### 2. Amazon Developer Console Setup

1. Go to [Amazon Developer Console](https://developer.amazon.com/apps-and-games/console/apps)
2. Create or select your app
3. Navigate to **In-App Items** tab
4. Create subscription items:

   | SKU | Type | Title | Price |
   |-----|------|-------|-------|
   | `BlueFlyMonthlyTerm` | Subscription | BlueFly Monthly | $2.99/month |
   | `BlueFlyQuarterlyTerm` | Subscription | BlueFly Quarterly | $6.99/quarter |

5. Configure free trial period (7 days) for each subscription

### 3. Get Shared Secret

1. In Amazon Developer Console, go to **Settings** > **Identity**
2. Find your **Shared Secret** under the IAP section
3. Store this securely - never expose it in client code

## Testing

### Using Amazon App Tester

1. Install **Amazon App Tester** on your Fire device
2. Copy `amazon.sdktester.json` to your device:
   ```bash
   adb push amazon.sdktester.json /sdcard/amazon.sdktester.json
   ```
3. Open Amazon App Tester and verify it loads your IAP items
4. Run your app in development mode

### Test User Setup

1. In Amazon Developer Console, go to **Settings** > **Test Users**
2. Add sandbox test user accounts
3. Sign into these accounts on your test device

## Server-Side Receipt Validation (Firebase Cloud Functions)

BlueFly uses Firebase Cloud Functions for server-side receipt validation.

### Deploy Firebase Functions

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize project** (select your Firebase project):
   ```bash
   firebase use --add
   ```

4. **Set Amazon credentials** (keep these secret!):
   ```bash
   firebase functions:config:set amazon.developer_id="YOUR_AMAZON_DEVELOPER_ID"
   firebase functions:config:set amazon.shared_secret="YOUR_AMAZON_SHARED_SECRET"
   ```

5. **Install dependencies and deploy**:
   ```bash
   cd functions
   npm install
   npm run build
   cd ..
   firebase deploy --only functions
   ```

6. **Get your function URL** (shown after deployment):
   ```
   https://<region>-<project-id>.cloudfunctions.net/validateAmazonReceipt
   ```

7. **Set the URL in your app** (in `.env` or environment):
   ```bash
   EXPO_PUBLIC_IAP_VALIDATION_URL=https://<region>-<project-id>.cloudfunctions.net/validateAmazonReceipt
   ```

### Firebase Functions Provided

| Function | Type | Description |
|----------|------|-------------|
| `validateAmazonReceipt` | HTTP | Public endpoint for receipt validation |
| `validateReceipt` | Callable | Authenticated function for logged-in users |
| `checkSubscription` | Callable | Check user's subscription status |

### Firestore Structure

Subscriptions are stored in Firestore:

```
subscriptions/{userId}
├── receiptId: string
├── productId: string
├── purchaseDate: timestamp
├── renewalDate: timestamp
├── isTrialPeriod: boolean
├── isActive: boolean
├── term: string
├── lastValidated: timestamp
└── updatedAt: timestamp
```

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

---

### Alternative: Custom Backend (Node.js/Express)

```javascript
// server/routes/iap.js
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Amazon RVS endpoints
const AMAZON_RVS_PRODUCTION = 'https://appstore-sdk.amazon.com/version/1.0/verifyReceiptId';
const AMAZON_RVS_SANDBOX = 'https://appstore-sdk.amazon.com/sandbox/version/1.0/verifyReceiptId';

// Your Amazon credentials (keep secure!)
const AMAZON_DEVELOPER_ID = process.env.AMAZON_DEVELOPER_ID;
const AMAZON_SHARED_SECRET = process.env.AMAZON_SHARED_SECRET;

router.post('/validate-receipt', async (req, res) => {
  const { receiptId, productId, userId, isSandbox } = req.body;

  if (!receiptId || !productId) {
    return res.status(400).json({
      isValid: false,
      error: 'Missing receiptId or productId',
    });
  }

  try {
    const rvsUrl = isSandbox ? AMAZON_RVS_SANDBOX : AMAZON_RVS_PRODUCTION;
    const url = `${rvsUrl}/developer/${AMAZON_DEVELOPER_ID}/user/${userId || 'unknown'}/receiptId/${receiptId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-amz-access-token': AMAZON_SHARED_SECRET,
      },
    });

    if (!response.ok) {
      const errorCode = response.status;
      let errorMessage = 'Validation failed';

      switch (errorCode) {
        case 400:
          errorMessage = 'Invalid receipt format';
          break;
        case 496:
          errorMessage = 'Subscription cancelled or expired';
          break;
        case 497:
          errorMessage = 'Invalid receipt';
          break;
        case 500:
          errorMessage = 'Amazon server error';
          break;
      }

      return res.json({
        isValid: false,
        error: errorMessage,
      });
    }

    const data = await response.json();

    // Store subscription in your database
    await saveSubscription({
      userId,
      receiptId: data.receiptId,
      productId: data.productId,
      purchaseDate: new Date(data.purchaseDate),
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
      isActive: !data.cancelDate,
    });

    return res.json({
      isValid: true,
      receiptId: data.receiptId,
      productId: data.productId,
      purchaseDate: new Date(data.purchaseDate).toISOString(),
      expirationDate: data.renewalDate 
        ? new Date(data.renewalDate).toISOString() 
        : null,
      isTrialPeriod: Boolean(data.freeTrialPeriod),
      autoRenewing: !data.cancelDate,
    });
  } catch (error) {
    console.error('Receipt validation error:', error);
    return res.status(500).json({
      isValid: false,
      error: 'Validation server error',
    });
  }
});

module.exports = router;
```

### Database Schema Example

```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  receipt_id VARCHAR(500) UNIQUE NOT NULL,
  product_id VARCHAR(100) NOT NULL,
  purchase_date TIMESTAMP NOT NULL,
  renewal_date TIMESTAMP,
  cancel_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_is_active ON subscriptions(is_active);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BlueFly App                              │
├─────────────────────────────────────────────────────────────────┤
│  PaywallModal  ←→  IAPContext  ←→  amazon.ts (react-native-iap) │
│                                          │                       │
│                                          ↓                       │
│                               receiptValidation.ts               │
└─────────────────────────────────────────────────────────────────┘
                                          │
                                          ↓
                             ┌────────────────────────┐
                             │   Your Backend Server  │
                             │   /api/validate-receipt│
                             └────────────────────────┘
                                          │
                                          ↓
                             ┌────────────────────────┐
                             │  Amazon RVS Service    │
                             │  (Receipt Verification)│
                             └────────────────────────┘
```

## Subscription Flow

1. **User opens app** → Check cached subscription status
2. **User taps Subscribe** → `purchaseSubscription()` called
3. **Amazon purchase dialog** → User completes payment
4. **Purchase callback** → Receive purchase token
5. **Receipt validation** → Send to backend → Amazon RVS
6. **Success** → Update subscription status, hide paywall
7. **Periodic verification** → Re-validate every 24 hours

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Invalid receipt format | Check receipt data |
| 496 | Subscription cancelled/expired | Update status to free |
| 497 | Invalid receipt | Receipt not found - possible fraud |
| 500 | Amazon server error | Retry later |

## Security Considerations

1. **Never expose shared secret in client code**
2. **Always validate receipts server-side in production**
3. **Store subscription status in your backend database**
4. **Implement periodic re-validation (every 24 hours)**
5. **Handle subscription cancellation gracefully**

## Troubleshooting

### IAP Not Working

1. Ensure app is submitted (even as draft) in Amazon Developer Console
2. Check `amazon.sdktester.json` is loaded in App Tester
3. Verify SKUs match between app and developer console
4. Check for console errors in Metro bundler

### Purchases Not Completing

1. Check Amazon account is signed in on device
2. Verify payment method is set up
3. Check network connectivity
4. Review Amazon App Tester logs

### Receipt Validation Failing

1. Verify shared secret is correct
2. Check developer ID is correct
3. Ensure using correct endpoint (sandbox vs production)
4. Check backend server logs

## Resources

- [Amazon IAP Documentation](https://developer.amazon.com/docs/in-app-purchasing/iap-overview.html)
- [Amazon RVS Documentation](https://developer.amazon.com/docs/in-app-purchasing/iap-rvs-for-android-apps.html)
- [react-native-iap Documentation](https://react-native-iap.dooboolab.com/)
- [Amazon App Tester](https://developer.amazon.com/docs/in-app-purchasing/iap-app-tester-user-guide.html)

