# MODERATION RESPONSIBILITY: VISUAL GUIDE

## 🎯 QUICK VISUAL SUMMARY

```
┌─────────────────────────────────────────────────────────┐
│                 USER REPORTS SPAM POST                   │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    ┌─────────────┐              ┌──────────────────┐
    │  YOUR APP   │              │  BLUESKY SYSTEM  │
    │  (Frontend) │              │  (Backend)       │
    └─────────────┘              └──────────────────┘
         │                               │
         │ YOU BUILD:                    │ THEY HANDLE:
         │                               │
         ├─ Report button               ├─ Moderation team
         │  (visible on post)           │  (reviews reports)
         │                               │
         ├─ Report form                 ├─ Bot detection
         │  (collect reason)            │  (automated checks)
         │                               │
         ├─ Submit validation           ├─ Account suspension
         │  (check form data)           │  (if serious)
         │                               │
         ├─ Send to Bluesky API         ├─ Spam algorithm
         │  (POST report)               │  (pattern detection)
         │                               │
         ├─ Store locally               ├─ CSAM detection
         │  (audit log)                 │  (illegal content)
         │                               │
         ├─ Show user confirmation      └─ Account termination
         │  "Report sent"                 (if CSAM/illegal)
         │
         └─ Log action
            (database)

RESULT: User sees "Report sent - Thank you!"
        Bluesky moderation team reviews
        Action taken if needed (hide, warn, suspend)
```

---

## 📊 FEATURE RESPONSIBILITY MATRIX

| Feature | Bluesky | Your App | Effort |
|---------|---------|----------|--------|
| **Report Button** | ❌ | ✅ | Low |
| **Report Form** | ❌ | ✅ | Low |
| **Report Validation** | ❌ | ✅ | Low |
| **Send Report to Bluesky** | ✅ API | ✅ Code | Low |
| **Receive Report** | ✅ | ❌ | N/A |
| **Review Report** | ✅ Team | ❌ | N/A |
| **Hide Post UI** | ❌ | ✅ | Medium |
| **Block User UI** | ❌ | ✅ | Low |
| **Block Enforcement** | ✅ | ✅ Local | Medium |
| **Mute Words UI** | ❌ | ✅ | Medium |
| **Mute Filter** | ❌ | ✅ | Medium |
| **Audit Logs** | ❌ | ✅ | Medium |
| **Support Email** | ❌ | ✅ | Medium |
| **Response Process** | ❌ | ✅ | Medium |
| **Privacy Policy** | ❌ | ✅ | Low |
| **Terms of Service** | Reference | ✅ | Low |
| **Moderation Dashboard** | ❌ | ✅ | High |

---

## 🎮 USER JOURNEY: REPORT SPAM

```
STEP 1: User sees spam post in feed
   ↓
   POST: "@scammer Follow me for FREE MONEY!!!"
   [Like] [Repost] [More options...]
            ↓
         (Click "...")

STEP 2: User clicks "More options" (YOU build)
   ↓
   Menu appears:
   ├─ Save post
   ├─ Share
   ├─ Mute @scammer
   ├─ Block @scammer
   └─ Report [← USER CLICKS HERE]

STEP 3: Report form appears (YOU build)
   ↓
   ┌─────────────────────────────────┐
   │ Report this post                 │
   │                                 │
   │ Why are you reporting?          │
   │ [∨] Choose reason...            │
   │     ├─ It's spam                 │
   │     ├─ It's harassment           │
   │     ├─ Sexual content            │
   │     ├─ It's illegal              │
   │     └─ Other                     │
   │                                 │
   │ Additional details:             │
   │ [________________]              │
   │                                 │
   │ [Cancel] [Report]               │
   └─────────────────────────────────┘

STEP 4: User selects "It's spam" and submits (YOU code)
   ↓
   YOUR CODE:
   ✅ Validate form
   ✅ Call Bluesky API
   ✅ Store locally
   ✅ Show confirmation

STEP 5: Report sent confirmation (YOU show)
   ↓
   ✅ "Report submitted - Thank you!"
   [Close]

STEP 6: Bluesky receives report (BLUESKY handles)
   ↓
   BLUESKY ACTIONS:
   ✅ Store in database
   ✅ Log for moderation team
   ✅ Add to spam queue
   ✅ Run automated checks

STEP 7: Bluesky moderation team reviews (BLUESKY)
   ↓
   MODERATION DECISION:
   ✅ Confirmed spam
   ├─ Hide post from feed
   ├─ Limit reach
   └─ Warn user

RESULT: Spam post is removed from user feeds
        Scammer account may be suspended
        Future posts hidden until reviewed
```

---

## 📝 WHAT YOU ACTUALLY CODE

### Example: Report Button Component

```typescript
// ReportButton.tsx (YOU write this)

import React, { useState } from 'react';
import { TouchableOpacity, Text, Modal, Alert } from 'react-native';
import { useReportService } from '../services/ReportService';

interface ReportButtonProps {
  postId: string;
  userId: string;
  postContent: string;
}

export const ReportButton: React.FC<ReportButtonProps> = ({
  postId,
  userId,
  postContent
}) => {
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const reportService = useReportService();

  const handleReport = async () => {
    if (!selectedReason) {
      Alert.alert('Please select a reason');
      return;
    }

    setIsSubmitting(true);
    try {
      // YOU handle: validation, UI, error handling
      // BLUESKY handles: moderation action
      
      await reportService.reportPost({
        postId,
        reason: selectedReason,
        comment,
        reportingUser: userId
      });

      Alert.alert(
        'Report submitted',
        'Thank you for helping keep the platform safe. Our team will review this.'
      );
      
      setShowReportForm(false);
      setSelectedReason('');
      setComment('');
      
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* YOU build: the button */}
      <TouchableOpacity onPress={() => setShowReportForm(true)}>
        <Text style={{ color: 'red' }}>Report</Text>
      </TouchableOpacity>

      {/* YOU build: the form */}
      <Modal
        visible={showReportForm}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Report Post</Text>
          
          <Picker
            selectedValue={selectedReason}
            onValueChange={setSelectedReason}
          >
            <Picker.Item label="Select reason..." value="" />
            <Picker.Item label="It's spam" value="spam" />
            <Picker.Item label="Harassment" value="harassment" />
            <Picker.Item label="Sexual content" value="sexual" />
            <Picker.Item label="Illegal content" value="illegal" />
            <Picker.Item label="Other" value="other" />
          </Picker>

          <TextInput
            placeholder="Additional details (optional)"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
          />

          <Button
            title={isSubmitting ? 'Submitting...' : 'Report'}
            onPress={handleReport}
            disabled={isSubmitting}
          />
          
          <Button
            title="Cancel"
            onPress={() => setShowReportForm(false)}
          />
        </View>
      </Modal>
    </>
  );
};
```

### What This Code Does:

```
✅ YOU handle:
   - Show button to user
   - Show report form
   - Collect reason
   - Collect optional comment
   - Validate form
   - Show loading state
   - Handle errors
   - Show confirmation
   - Log in database

❌ YOU DON'T handle:
   - Moderation team review
   - Bot detection
   - Account suspension
   - Post removal
   - User punishment
   - Policy enforcement

✅ BLUESKY handles:
   (via their API and systems)
   - All of the above
```

---

## 🎯 MINIMAL REQUIREMENTS FOR APPROVAL

For Amazon Appstore + Bluesky Compliance:

```
MUST HAVE (Non-negotiable):
✅ Report button on every post
✅ Report button on every user
✅ Report form with reasons
✅ Successful submission to Bluesky API
✅ Local audit log in SQLite
✅ Support email (monitored daily)
✅ Privacy policy (published)
✅ Terms of service (published)
✅ Block user feature
✅ No spam/bot features

SHOULD HAVE (Strongly recommended):
✅ Mute user feature
✅ Mute words feature
✅ Word filtering in UI
✅ Moderation dashboard (internal)
✅ Response process documentation
✅ Appeal process
✅ Moderation policy published

NICE TO HAVE (Can come later):
- User education about reporting
- Stats/dashboards
- Team collaboration tools
- Automated filtering
- Advanced analytics
```

---

## 💡 KEY INSIGHT

```
Think of your app like a PHONE:

Bluesky = Phone network (infrastructure)
- Network handles: billing, service, connections
- Network provides: calling capability

Your app = Phone interface (client)
- You provide: dial pad, contacts, call history
- You handle: user experience

When user reports:
- You show: report form (your UI)
- Bluesky receives: report via network
- Bluesky acts: moderation decision

Both work together!
```

---

## ✅ RESPONSIBILITY CHECKLIST

### Before You Start Coding:
```
BLUESKY WILL PROVIDE:
[✅] APIs for reporting
[✅] APIs for blocking
[✅] APIs for muting
[✅] Moderation team
[✅] Account management
[✅] Content detection

YOU MUST BUILD:
[ ] Report UI/button
[ ] Report form
[ ] Block UI
[ ] Mute UI
[ ] Audit logs
[ ] Support email system
[ ] Response process
[ ] Privacy policy
[ ] Terms of service
[ ] Data protection
[ ] Abuse prevention
[ ] Documentation
```

### During Development:
```
TEST:
[ ] Report button works
[ ] Report form validates
[ ] API call succeeds
[ ] Local log created
[ ] User sees confirmation
[ ] Block feature works
[ ] Mute feature works
[ ] Support email receives messages
```

### Before Submission:
```
VERIFY:
[ ] All APIs working
[ ] Audit logs complete
[ ] Privacy policy published
[ ] ToS published
[ ] Support email active
[ ] Moderation policy documented
[ ] No spam features
[ ] No automation vulnerabilities
[ ] GDPR compliance
[ ] Pakistan Data Protection Act compliance
```

---

## 🚀 SUMMARY FOR YOUR PROJECT

```
YOUR JOB:
1. Build beautiful, intuitive UI for reporting
2. Connect to Bluesky's report API
3. Store what users report (locally)
4. Respond to abuse reports (via email)
5. Document your moderation process
6. Prevent spam/bot abuse
7. Protect user data

BLUESKY'S JOB:
1. Provide report API
2. Review serious reports
3. Take action (suspend, delete)
4. Manage platform integrity
5. Handle legal/CSAM issues

WORK TOGETHER:
- User reports → you receive → you log → you send to Bluesky
- Bluesky reviews → Bluesky acts
- You provide first-line defense → Bluesky is final authority
```

---

**Document Created:** November 28, 2025  
**Purpose:** Visual guide to moderation responsibility  
**For:** Bluesky Amazon Appstore Client
