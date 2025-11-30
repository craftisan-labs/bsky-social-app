# MODERATION & COMPLIANCE: BLUESKY vs YOUR APP

## ⚡ QUICK ANSWER

**Split responsibility:**

```
Bluesky provides:
✅ Report API (you send reports to them)
✅ Block API (you can block users)
✅ Mute API (you can mute users)
✅ Content moderation system (they review reports)
✅ Account deletion (they handle it)

YOU must provide:
✅ Report UI (button, form for users to report)
✅ Block UI (button to block users)
✅ Mute UI (button to mute words/users)
✅ Audit logs (track what YOU did)
✅ Support email (for user complaints)
✅ Response process (handle reports quickly)
✅ Abuse prevention (don't enable spam/bots)
✅ First-line filtering (hide offensive content UI)
```

---

## 🏗️ RESPONSIBILITY SPLIT

### BLUESKY'S Responsibility (They Handle)
```
✅ User authentication & security
✅ Account management
✅ Central moderation team
✅ Spam detection algorithms
✅ Bot detection
✅ CSAM detection
✅ Copyright enforcement
✅ Legal compliance
✅ Terms enforcement
✅ Account deletion/suspension
✅ Data retention policies

What they provide to you:
- APIs to access these features
- APIs to report violations
- APIs to block/mute users
- Webhooks for moderation events (if applicable)
```

### YOUR App's Responsibility (You Must Build)
```
✅ Report UI/form in your app
✅ Block button on user/posts
✅ Mute options for words/users
✅ Audit logs of actions YOUR app takes
✅ Support email monitoring
✅ Quick response to reports
✅ Decision logic for what to action
✅ Communication with users
✅ Privacy policy
✅ Terms of service
✅ Compliance with local laws
✅ Secure data storage
```

---

## 📊 DETAILED BREAKDOWN

### 1. CONTENT REPORTING

#### What Bluesky Provides:
```
API Endpoint for reporting:
POST /xrpc/com.atproto.moderation.createReport

You send:
{
  "reasonType": "com.atproto.moderation.defs#spam",
  "subject": {
    "uri": "at://...",
    "cid": "..."
  }
}

Bluesky receives it and:
✅ Stores in their system
✅ Bluesky moderation team reviews
✅ Takes action if needed
✅ Can suspend user if serious
```

#### What YOU Must Build:
```
UI Component: Report Button
- Display on every post
- Display on every user
- Display on comments

Report Form:
- Reason selection (dropdown):
  [ ] Spam
  [ ] Harassment
  [ ] Sexual content
  [ ] Illegal activity
  [ ] Other
- Optional comment field
- Submit button

When user submits:
- Validate form data
- Send to Bluesky API
- Store locally in SQLite:
  {
    reportId: auto-generated,
    postId: user reported,
    reason: selected reason,
    userComment: optional comment,
    timestamp: when reported,
    status: "sent_to_bluesky"
  }
- Show confirmation message to user
- Track metrics
```

#### Terms of Service Requirement:
```
From Bluesky ToS Section 8:
"You are solely responsible for:
- Reviewing content moderation policies
- Responding to user reports of violations
- Taking action on violations"

Translation:
- YOU receive reports in your app
- YOU respond to them
- YOU take action (hide, block, etc.)
- YOU forward serious ones to Bluesky
```

---

### 2. USER BLOCKING

#### What Bluesky Provides:
```
API Endpoint for blocking:
POST /xrpc/app.bsky.graph.block

You send:
{
  "subject": "did:plc:xyz...",
  "createdAt": timestamp
}

Bluesky handles:
✅ Stores block relationship
✅ Prevents blocked user from seeing your posts
✅ Prevents blocked user from following
✅ Syncs across all clients
```

#### What YOU Must Build:
```
UI Component: Block Button
- On user profile
- On posts
- In user menu

When user clicks block:
- Show confirmation dialog
- "Are you sure you want to block @username?"
- Send block request to Bluesky API
- Update UI (change button to "Unblock")
- Show success message
- Optionally update local list

Store locally:
{
  blockedUsers: ["did:plc:xyz...", "did:plc:abc..."],
  timestamp: when blocked
}

This helps your app:
- Hide posts from blocked users immediately
- Don't show in notifications
- Don't show in search results
- Better UX while sync happens
```

#### Terms Requirement:
```
Bluesky requires:
"Users must have ability to block others"

Your responsibility:
- Provide easy-to-access block feature
- Respect user's block decisions
- Enforce block locally (hide their content)
- Don't spam blocked users
```

---

### 3. MUTING

#### What Bluesky Provides:
```
API Endpoints:
1. Mute users: POST /xrpc/app.bsky.graph.mute
2. Mute words: POST /xrpc/app.bsky.moderation.muteWord

Bluesky handles:
✅ Stores mute preferences
✅ Syncs across clients
✅ Returns muted content in feed
```

#### What YOU Must Build:
```
UI Components:

1. Mute User Button:
- On user profile
- On posts/comments
- Show "Mute" or "Muted" status

2. Mute Words Feature:
- Settings screen → Muted Words
- Add/Remove words list
- Confirmation before muting
- Show all muted words

3. Filter Implementation:
- Check every post against muted list
- Hide posts containing muted words
- Show notification: "Post hidden (contains muted word)"
- Allow user to reveal if interested

Store locally:
{
  mutedUsers: ["did:plc:xyz..."],
  mutedWords: ["spam", "politics", "ads"],
  filters: { hideInFeed: true, hideInNotifications: true }
}
```

---

### 4. AUDIT LOGS (Mandatory per Bluesky ToS)

#### What Bluesky Provides:
```
Nothing - this is YOUR responsibility!

Bluesky ToS Section 8 requires:
"Maintain records of all moderation actions
Keep audit trail for potential audits by Bluesky"

Translation: YOU must track everything!
```

#### What YOU Must Build:
```
SQLite Tables:

CREATE TABLE moderation_actions (
  id INTEGER PRIMARY KEY,
  action_type TEXT, -- 'report', 'block', 'mute', 'hide', 'delete'
  target_type TEXT, -- 'post', 'user', 'comment'
  target_id TEXT,
  target_user TEXT,
  reason TEXT,
  initiated_by TEXT, -- your user DID
  timestamp DATETIME,
  status TEXT, -- 'pending', 'approved', 'rejected'
  notes TEXT,
  forwarded_to_bluesky BOOLEAN
);

CREATE TABLE user_reports (
  id INTEGER PRIMARY KEY,
  report_id TEXT,
  reported_post_id TEXT,
  reported_user TEXT,
  reporting_user TEXT,
  reason TEXT,
  description TEXT,
  timestamp DATETIME,
  status TEXT, -- 'pending', 'reviewed', 'resolved'
  action_taken TEXT,
  bluesky_report_id TEXT -- if forwarded
);

CREATE TABLE compliance_events (
  id INTEGER PRIMARY KEY,
  event_type TEXT, -- 'spam_detected', 'automation_blocked', 'abuse_reported'
  description TEXT,
  user_involved TEXT,
  severity TEXT, -- 'low', 'medium', 'high'
  timestamp DATETIME,
  resolved BOOLEAN
);

Log every action:
- User reported content
- You reviewed report
- You blocked user
- You hid content
- You forwarded to Bluesky
- User deleted account
- etc.
```

#### Why This Matters:
```
Bluesky may audit you:
"Please provide all moderation records
from last 30/60/90 days"

If you have no logs:
❌ Violates ToS
❌ App gets suspended
❌ Access to APIs revoked

If you have complete logs:
✅ Proves compliance
✅ Shows you take moderation seriously
✅ Shows patterns/trends
✅ Helps improve policies
```

---

### 5. SUPPORT EMAIL & RESPONSE PROCESS

#### What Bluesky Provides:
```
Nothing - this is YOUR responsibility!

ToS requires:
"Maintain public contact information
Respond to abuse reports promptly"

Translation: Users who see spam/abuse in your app
will email you - YOU must respond!
```

#### What YOU Must Build:
```
1. Create Support Email:
- yoursupport@yourdomain.com
- Or: moderation@yourdomain.com
- MUST be monitored actively

2. Email Handling Process:
- Check daily (minimum)
- Log all emails received
- Create ticket system
- Assign to team member
- Set response SLA (e.g., 24 hours)

3. Response Template:
Dear user,

Thank you for reporting [abuse type].
We have reviewed your report:
- Status: [being investigated/resolved/dismissed]
- Action taken: [hidden/user blocked/forwarded to Bluesky]
- Timeline: [expected resolution time]

If you have more information: reply to this email

Best regards,
Moderation Team

4. Tracking System:
- Spreadsheet or database
- Email address
- Date received
- Issue type
- Action taken
- Date resolved
```

---

### 6. ABUSE PREVENTION (No Spam/Bots)

#### What Bluesky Provides:
```
Their algorithms detect:
✅ Automated spam patterns
✅ Bulk account creation
✅ Coordinated behavior

Your app's role:
❌ You MUST NOT enable spam
❌ You MUST NOT automate bulk actions
```

#### What YOU Must NOT Build:
```
❌ Auto-like/follow features
❌ Bulk follow tools
❌ Spam message generators
❌ Bot farming features
❌ Credential sharing
❌ Automated bulk posting
❌ Automation scripts
❌ Scraping tools
❌ Fake account creators
❌ Follower/like buyers
```

#### What YOU MUST Prevent:
```
✅ Rate limiting:
- Max 50 likes/follows per hour
- Max 10 posts per hour
- Max 5 new users per day
- Reasonable delays between actions

✅ Validation:
- Detect automation patterns
- Flag suspicious behavior
- Block repeat offenders
- Report to Bluesky

✅ Logging:
- Track user activity patterns
- Flag unusual activity
- Store logs for audit
```

---

### 7. PRIVACY & DATA PROTECTION

#### What Bluesky Provides:
```
Their infrastructure:
✅ User account security
✅ Password hashing
✅ Data encryption in transit
✅ Backup systems
✅ Account deletion infrastructure

Your responsibility:
✅ Don't store passwords (ever!)
✅ Secure token storage
✅ Minimal data collection
✅ GDPR compliance
```

#### What YOU Must Build:
```
1. Privacy Policy (written document):
- What data you collect
- Why you collect it
- How you use it
- Who has access
- How long you keep it
- User rights (access, delete, etc.)
- Your contact info

2. Data Handling Code:
✅ Use Keychain/Keystore for tokens
✅ Use HTTPS for all API calls
✅ Encrypt sensitive data at rest
✅ Minimal logging
✅ No sensitive info in logs
✅ Secure cache clearance

3. Deletion Requests:
- User can request deletion
- You delete their local data
- Forward request to Bluesky if needed
- Confirm deletion in 48 hours

4. GDPR Compliance (if EU users):
- Right to access: provide data export
- Right to delete: delete on request
- Right to data portability: export format
- Data processing agreement
```

---

### 8. FIRST-LINE CONTENT FILTERING

#### What Bluesky Provides:
```
Their API returns all content.
They don't filter in their responses.

Your responsibility:
Apply YOUR filtering in your UI
```

#### What YOU Should Consider Building:
```
1. Sensitive Content Filter:
const filterSensitiveContent = (post) => {
  if (post.facets?.contains("porn")) return hide;
  if (post.facets?.contains("violence")) return hide;
  if (post.facets?.contains("sensitive")) return hide;
  return show;
};

2. User Preferences:
Settings → Content Filtering
[ ] Show sexual content
[ ] Show violence
[ ] Show sensitive/spoilers
[ ] Show adult content

3. Hide Implementation:
{
  postId: "abc123",
  reason: "Sensitive content",
  hidden: true,
  canReveal: true // user can click "Show anyway"
}
```

---

## 🎯 PRACTICAL EXAMPLE

### User Sees Spam Post

```
Scenario: User opens app, sees spam post

STEP 1: User Interface (YOU build)
┌──────────────────────────────┐
│  Spam post content           │
│                              │
│  [❤️] [🔄] [...more options] │
│         ↑                    │
│      Click "..."             │
└──────────────────────────────┘

STEP 2: Menu Options (YOU build)
[Save]
[Share]
[Mute this user]
[Block this user]
[Report] ← User clicks this
```

```
STEP 3: Report Form (YOU build)
┌──────────────────────────────┐
│  Report this post            │
│                              │
│  Reason:                     │
│  [v] Select reason...        │
│    - Spam                    │
│    - Harassment              │
│    - Sexual content          │
│    - Illegal                 │
│    - Other                   │
│                              │
│  Additional info:            │
│  [Text field]                │
│                              │
│  [Cancel] [Report]           │
└──────────────────────────────┘
```

```
STEP 4: Behind the Scenes (YOU code)
// When user clicks Report:
1. Validate form
2. Call Bluesky API:
   await client.call(
     'com.atproto.moderation.createReport', 
     {
       reasonType: 'com.atproto.moderation.defs#spam',
       subject: postRef
     }
   )
3. Store locally:
   db.insert('user_reports', {
     reported_post: postId,
     reason: 'spam',
     timestamp: now,
     status: 'sent_to_bluesky',
     bluesky_response_id: responseId
   })
4. Show user: "Report sent. Thank you!"
```

```
STEP 5: Bluesky's Moderation (BLUESKY handles)
- Receives report
- Checks for similar reports
- Bluesky moderation team reviews
- If violation confirmed:
  ✅ Hide post
  ✅ Warn user
  ✅ Suspend account if severe
  ✅ Delete account if CSAM/illegal
```

---

## ✅ FEATURES YOU MUST BUILD

### For MVP (Non-Negotiable):

```
1. Report Button
   ├── On every post
   ├── On every user
   ├── Report form with reasons
   └── Submit to Bluesky API

2. Block Feature
   ├── Block button on user
   ├── Block button on posts
   ├── Confirmation dialog
   └── Visual feedback

3. Mute Feature
   ├── Mute users
   ├── Mute words
   └── Apply filtering

4. Audit Logs
   ├── SQLite database
   ├── Track all actions
   ├── Keep for 90+ days
   └── Organized by date/type

5. Support Email
   ├── Public email address
   ├── Monitored daily
   ├── Response process
   └── Ticket tracking

6. Privacy Policy
   ├── Written document
   ├── Published on web
   ├── Link in app settings
   └── Clear language

7. Terms of Service
   ├── Written document
   ├── Published on web
   ├── Link in app settings
   └── References Bluesky ToS

8. Documentation
   ├── Moderation policy
   ├── Response procedures
   ├── Appeal process
   └── Team guidelines
```

---

## 🛠️ CODE EXAMPLE: Report Feature

```typescript
// reportService.ts

import { AtpClient } from '@atproto/api';
import { SQLite } from 'react-native-sqlite-storage';

interface Report {
  id: string;
  postId: string;
  reason: string;
  comment: string;
  timestamp: Date;
  status: 'pending' | 'sent' | 'resolved';
}

export class ReportService {
  private client: AtpClient;
  private db: SQLite;

  async reportPost(
    postId: string,
    reason: string,
    comment: string
  ): Promise<void> {
    try {
      // 1. Send to Bluesky
      const response = await this.client.call(
        'com.atproto.moderation.createReport',
        {
          reasonType: `com.atproto.moderation.defs#${reason}`,
          subject: {
            uri: postId,
            cid: 'cid123' // you'd get this from post
          }
        }
      );

      // 2. Store locally
      const report: Report = {
        id: this.generateId(),
        postId,
        reason,
        comment,
        timestamp: new Date(),
        status: 'sent'
      };

      await this.db.execute(
        `INSERT INTO reports 
         (id, postId, reason, comment, timestamp, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          report.id,
          report.postId,
          report.reason,
          report.comment,
          report.timestamp.toISOString(),
          report.status
        ]
      );

      // 3. Log action
      await this.logAudit({
        action: 'report_sent',
        targetId: postId,
        reason,
        timestamp: new Date(),
        blueskyResponseId: response.id
      });

      // 4. Show success to user
      return { success: true, reportId: report.id };

    } catch (error) {
      console.error('Report failed:', error);
      throw new Error('Failed to submit report');
    }
  }

  private async logAudit(action: any): Promise<void> {
    // Insert into audit log
    await this.db.execute(
      `INSERT INTO moderation_actions 
       (action_type, target_id, reason, timestamp) 
       VALUES (?, ?, ?, ?)`,
      [action.action, action.targetId, action.reason, action.timestamp]
    );
  }

  private generateId(): string {
    return `report_${Date.now()}_${Math.random()}`;
  }
}
```

---

## 📋 BLUESKY ToS REQUIREMENTS CHECKLIST

From Section 8 of ToS, what YOU must implement:

```
MANDATORY:
[ ] Provide method to report illegal content
[ ] Provide method to block forbidden content
[ ] Provide method to block abusive users
[ ] Respond to user reports of violations
[ ] Keep records of all reports/responses
[ ] Maintain audit logs
[ ] Maintain public contact information
[ ] Respond to violations within reasonable time
[ ] Keep records for Bluesky audits
[ ] Do NOT enable spam/bots
[ ] Do NOT enable automated bulk actions
[ ] Do NOT share credentials
[ ] Do NOT circumvent platform integrity

RECOMMENDED:
[ ] Publish moderation policy
[ ] Provide appeal process
[ ] Communicate moderation decisions
[ ] Train moderation team
[ ] Regular policy review
[ ] Collaborate with Bluesky on serious violations
```

---

## 🎓 SUMMARY TABLE

| Feature | Bluesky Provides | You Must Build | Effort |
|---------|------------------|----------------|--------|
| **Reporting** | API endpoint | UI + form + validation | Medium |
| **Blocking** | API endpoint | UI button + feedback | Low |
| **Muting** | API endpoint | UI + settings + filtering | Medium |
| **Audit Logs** | Nothing | Database + tracking | Medium |
| **Support Email** | Nothing | Email system + process | Medium |
| **Privacy Policy** | Nothing | Document + web page | Low |
| **Terms of Service** | Reference only | Your own document | Low |
| **First-line filtering** | Nothing | UI filtering logic | Medium |
| **Bot prevention** | Algorithms | Rate limiting + validation | Medium |
| **Data security** | Infrastructure | Secure coding | High |

---

## 🚀 DEVELOPMENT PRIORITY

**Week 1-2: Legal Documents**
```
[ ] Write privacy policy
[ ] Write terms of service
[ ] Create moderation policy
[ ] Set up support email
```

**Week 3-4: Core Moderation**
```
[ ] Build report button UI
[ ] Build report form
[ ] Integrate Bluesky report API
[ ] Implement local logging
```

**Week 5-6: Extended Features**
```
[ ] Build block UI
[ ] Build mute UI
[ ] Implement filtering
[ ] Set up audit logs
```

**Week 7-8: Safety**
```
[ ] Implement rate limiting
[ ] Add validation
[ ] Test moderation flows
[ ] Document processes
```

**Week 9-12: Testing**
```
[ ] Test all flows
[ ] Security audit
[ ] Privacy review
[ ] Performance testing
```

---

## ❓ FAQ

**Q: Can I use Bluesky's moderation dashboard for my app?**
A: No, you can send reports to it, but you need your own dashboard for your app's moderation.

**Q: Do I need a moderation team?**
A: For MVP, just you. But as users grow, yes.

**Q: What if I get a report I can't handle?**
A: Forward serious ones (illegal content) to Bluesky + your email process.

**Q: Can I automate moderation decisions?**
A: Some (like filtering words), but manual review is safer for serious actions.

**Q: What if I receive DMCA takedown?**
A: Forward to Bluesky. You're just the client, not the host.

**Q: Do I need to delete user posts if they ask?**
A: You can't delete from Bluesky, but you can hide from your app's UI.

---

## 🎯 BOTTOM LINE

```
Bluesky provides:
✅ APIs for moderation actions
✅ Central moderation team
✅ Account/content management
✅ Legal compliance infrastructure

YOU must provide:
✅ User interface for reporting
✅ User interface for blocking/muting
✅ Local audit logs
✅ Support process
✅ Privacy policy
✅ Response procedures
✅ Abuse prevention
✅ Data protection

Think of it like:
- Bluesky = social network infrastructure
- Your app = client interface to that infrastructure
- Moderation = shared responsibility
```

---

**Document Created:** November 28, 2025  
**Purpose:** Clarify moderation responsibilities  
**For:** Bluesky Amazon Appstore Client
