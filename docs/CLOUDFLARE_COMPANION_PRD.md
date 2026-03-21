# TRMNL Calendar Sync Portal - Cloudflare Workers Edition

**Product Name**: TRMNL Calendar Sync Portal (Web)  
**Version**: 1.0  
**Last Updated**: March 21, 2026  
**Status**: Ready for Development  
**Platform**: Cloudflare Workers + Cloudflare Pages  
**Target Release**: Q2 2026

---

## Executive Summary

Build a **web-based calendar sync portal** on Cloudflare Workers that enables users with M365 (Microsoft 365 / Outlook) calendars to sync their events to TRMNL devices. This provides a **platform-agnostic solution** that works on any browser (desktop, tablet, Android, iOS) without requiring app installation or annual app store reviews.

**Business Goal**: Provide seamless M365 calendar sync for all users regardless of OS, improving accessibility and reducing support burden.

**MVP Scope**: M365/Outlook calendar sync with web UI + serverless backend on Cloudflare

**Advantages Over Native App**:
- ✅ Works on any browser (Android, iOS, desktop, tablet)
- ✅ No app store approval process
- ✅ Instant updates (no version management)
- ✅ Automated background sync via Cron Triggers
- ✅ Simpler infrastructure (single codebase)
- ✅ Cost-effective at scale

---

## Problem Statement

### Current State
- ✅ **iOS users** with M365 calendars → iOS Companion app (uses EventKit)
- ✅ **Google Calendar users** (any OS) → Native TRMNL Google Calendar plugin
- ❌ **Android users with M365 calendars** → No solution
- ❌ **Desktop users who want to manage sync** → No solution

### User Impact
Users with M365 accounts on any platform cannot push calendar events to TRMNL devices without:
1. Installing a native app (if available)
2. Manually configuring complex OAuth flows
3. Keeping an app open for background sync

### Solution Approach
Build a web portal (no installation) that:
1. Authenticates with user's M365 account via OAuth
2. Fetches calendar events (past 7 days to next 30 days)
3. Pushes events to TRMNL servers
4. Syncs automatically via Cloudflare Cron Triggers (no user device involvement)
5. Provides simple calendar management UI

---

## Feature Requirements

### Phase 1: MVP (Required for Launch)

#### 1.1 Web Portal & Authentication

**Requirement**: Users authenticate with Microsoft 365 account via browser

**Architecture**:
```
User Browser → Cloudflare Pages (Frontend)
                    ↓
              Cloudflare Worker (OAuth Handler)
                    ↓
              Microsoft OAuth Endpoint
                    ↓
              User approves access
                    ↓
              Worker receives auth code
                    ↓
              Worker exchanges code for token
                    ↓
              Worker stores token in KV (encrypted)
                    ↓
              User redirected to dashboard
```

**Flow**:
1. User visits portal URL: `calendar-sync.trmnl.com`
2. Sees "Sign in with Microsoft" button
3. Clicks button → MSAL.js (browser) initiates OAuth flow
4. Microsoft login window opens
5. User approves calendar access
6. Browser receives auth code
7. Frontend sends code to Worker endpoint `/api/auth/callback`
8. Worker exchanges code for access token
9. Worker stores encrypted token in Cloudflare KV
10. Frontend stores user session in localStorage (non-sensitive)
11. User redirected to dashboard

**Token Management**:
- Access tokens stored in KV with TTL (1 hour)
- Refresh tokens stored encrypted in KV
- Auto-refresh before expiration
- Graceful re-authentication if refresh fails

**Success Criteria**:
- ✅ User can sign in via OAuth
- ✅ Tokens securely stored and refreshed
- ✅ Session persists across browser restarts
- ✅ Sign out clears all data
- ✅ Works on all browsers (Chrome, Firefox, Safari, Edge)

---

#### 1.2 Calendar Selection & Instance Mapping

**Requirement**: Users select calendars to sync and map to TRMNL instances

**Flow**:
1. After auth, worker fetches calendars from Microsoft Graph
2. Frontend displays list of user's calendars
3. Worker fetches TRMNL Calendar instances from backend API
4. User drags/selects calendars and assigns to instances
5. Mapping saved to KV store

**UI Components**:
- Calendar list (checkboxes or drag-to-select)
- TRMNL instance list
- Mapping preview
- Save/Cancel buttons

**Data Stored in KV**:
```json
{
  "userId": "user@example.com",
  "mappings": [
    {
      "calendarId": "cal-123",
      "calendarName": "Work",
      "instanceId": "instance-abc",
      "instanceName": "Office Calendar"
    }
  ]
}
```

**Success Criteria**:
- ✅ User sees all calendars
- ✅ User can map to instances
- ✅ Mappings persist in KV
- ✅ Can update mappings anytime

---

#### 1.3 Event Fetching & Sync

**Requirement**: Fetch events from Microsoft Graph and sync to TRMNL

**Event Sync Process**:
```
Cron Trigger (every 6 hours)
    ↓
Worker wakes up
    ↓
Fetch all active user accounts from KV
    ↓
For each user:
  - Refresh access token (if needed)
  - Query Microsoft Graph (/me/calendarview)
  - Parse events (past 7 days to next 30 days)
  - Transform to TRMNL format
  - POST to TRMNL backend API
  - Update sync status in KV
    ↓
Log results (success/failure)
```

**Microsoft Graph Query**:
```
GET /me/calendarview?startDateTime={past7days}&endDateTime={next30days}
```

**Event Fields**:
- Event ID, Title, Description
- Start/End times (with timezone)
- All-day flag
- Response status (accepted/tentative/declined)
- Calendar name
- Reminders

**Data Transform**:
```javascript
{
  "events": [
    {
      "id": "event-123",
      "title": "Team Standup",
      "start": "2026-03-21T09:00:00Z",
      "end": "2026-03-21T09:30:00Z",
      "allDay": false,
      "description": "Daily sync",
      "calendar": "Work",
      "responseStatus": "accepted"
    }
  ],
  "source": "cloudflare-portal",
  "lastSync": "2026-03-21T14:30:00Z"
}
```

**TRMNL Backend Endpoint**:
```
POST /api/calendar-sync
Authorization: Bearer {trmnl_api_token}
```

**Error Handling**:
- Retry failed syncs (exponential backoff)
- Log errors for debugging
- Alert via email if repeated failures
- Invalid tokens trigger manual re-auth

**Success Criteria**:
- ✅ Events fetched correctly
- ✅ Synced to TRMNL backend
- ✅ Appears in Calendar XL on devices
- ✅ Handles network failures gracefully

---

#### 1.4 Automatic Scheduled Sync

**Requirement**: Sync events automatically without user action

**Implementation**: Cloudflare Cron Triggers
```toml
# wrangler.toml
[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours
```

**Worker Handler**:
```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Sync logic runs automatically
  }
}
```

**Sync Logic**:
1. Fetch all users from KV who enabled sync
2. For each user:
   - Check if token needs refresh
   - Fetch calendar events
   - Post to TRMNL
   - Record sync timestamp
3. Log summary (X users synced, Y failed)

**Default Behavior**:
- Sync every 6 hours (configurable via UI)
- Skip if user disabled sync
- Continue even if one user fails (fault-tolerant)
- Timeout protection (abort if >30 seconds)

**Success Criteria**:
- ✅ Cron triggers execute reliably
- ✅ All users receive syncs
- ✅ Failed syncs don't block others
- ✅ Sync completes <10 seconds per user

---

#### 1.5 Dashboard & Settings UI

**Requirement**: Web interface for user management

**Dashboard Features**:
```
+─────────────────────────────────────────+
│ TRMNL Calendar Sync Portal              │
├─────────────────────────────────────────+
│ Signed in as: user@example.com          │
│ Last Sync: Just now ✓                   │
│ [Sync Now] [Settings] [Sign Out]        │
├─────────────────────────────────────────+
│                                         │
│ Calendar Mappings:                      │
│ ✓ Work Calendar → Office Calendar       │
│ ✓ Personal Calendar → Home Calendar     │
│                                         │
│ [Edit Mappings] [Add Calendar]          │
├─────────────────────────────────────────+
│ Sync Status: 42 events synced           │
│ Next sync: 5 hours 23 minutes           │
└─────────────────────────────────────────+
```

**Pages**:

1. **Landing Page** (`/`)
   - Sign in button
   - Feature overview
   - FAQ

2. **Dashboard** (`/dashboard`)
   - Current sync status
   - Last sync time
   - Mapped calendars
   - Manual sync button
   - Link to settings

3. **Settings** (`/settings`)
   - Sync frequency dropdown
   - Enable/disable sync toggle
   - Manage calendar mappings
   - View sync history
   - Sign out button

4. **Callback** (`/auth/callback`)
   - OAuth redirect target
   - Handles code exchange
   - Redirects to dashboard

**Tech Stack**:
- **Frontend Framework**: React (or Vue/Svelte)
- **Hosting**: Cloudflare Pages (auto-deployed from GitHub)
- **API Client**: MSAL.js (Microsoft Auth) + fetch for backend calls
- **Styling**: Tailwind CSS
- **State Management**: React Context or Zustand (minimal)

**Success Criteria**:
- ✅ Dashboard loads in <2 seconds
- ✅ Settings intuitive and discoverable
- ✅ Clear feedback on sync status
- ✅ Mobile-responsive design

---

#### 1.6 Sync Status & History

**Requirement**: Users see sync status and history

**Status Display**:
- Last sync time (exact timestamp)
- Last sync status (Success/Failed/In Progress)
- Events synced count
- Next scheduled sync
- Manual sync button

**Sync History Page** (`/settings/history`):
```
Sync Time           Status    Events  Error
2026-03-21 14:30    ✓ Success 42      —
2026-03-21 08:30    ✓ Success 42      —
2026-03-21 02:30    ✓ Success 41      —
2026-03-20 20:30    ✗ Failed  —       Token expired
2026-03-20 14:30    ✓ Success 42      —
```

**Data Stored in KV**:
```json
{
  "syncHistory": [
    {
      "timestamp": "2026-03-21T14:30:00Z",
      "status": "success",
      "eventCount": 42,
      "error": null
    }
  ]
}
```

**Retention**: Store last 30 syncs in KV

**Success Criteria**:
- ✅ Users can view sync history
- ✅ Understand why sync failed
- ✅ Know when next sync is scheduled

---

#### 1.7 Manual Sync Trigger

**Requirement**: Users can manually sync on-demand

**Implementation**:
```typescript
// Frontend
async function triggerSync() {
  const response = await fetch('/api/sync', { method: 'POST' })
  const result = await response.json()
  // Show result to user
}

// Worker endpoint
export async function handleSync(request: Request, env: Env) {
  if (request.method === 'POST') {
    // Trigger sync immediately
    return syncUserCalendars(userId, env)
  }
}
```

**Flow**:
1. User clicks "Sync Now" button
2. Frontend POST to `/api/sync`
3. Worker fetches calendars and syncs
4. Returns count of events synced
5. Frontend shows "Synced X events"
6. Updates last sync time

**Success Criteria**:
- ✅ Sync completes <5 seconds
- ✅ User sees feedback
- ✅ Works reliably

---

#### 1.8 Error Handling & User Feedback

**Error Scenarios**:

| Scenario | Message | Recovery |
|----------|---------|----------|
| Not signed in | "Sign in to sync your calendar" | Go to login |
| Token expired | "Please sign in again" | Redirect to auth |
| No calendars selected | "Select calendars to sync" | Go to settings |
| Network error | "Connection failed. Retrying..." | Auto-retry or manual sync |
| Sync failed | "Sync failed. Check internet and try again" | Manual retry or retry at next schedule |
| Microsoft permissions denied | "Calendar access denied. Please try again" | Re-authenticate |
| TRMNL API error | "Failed to sync to TRMNL. Contacting support..." | Notify user |

**User Notifications**:
- Toast messages (success/error/info)
- Status banner on dashboard
- Email alert if repeated failures (after 3 tries)
- Sync history logs

**Success Criteria**:
- ✅ Clear, non-technical messages
- ✅ Always know what to do next
- ✅ Errors don't leave app in broken state

---

### Phase 2: Enhanced Features (Post-MVP)

#### 2.1 Multiple Calendar Support
- Extend to Fastmail, CalDAV
- Reuse UI patterns from MVP

#### 2.2 Email Notifications
- Sync started/completed notifications
- Failure alerts
- Weekly summary

#### 2.3 Advanced Filtering
- Exclude certain calendars
- Filter by time range
- Exclude past events

#### 2.4 Analytics Dashboard
- Sync frequency over time
- Success rate
- Event count trends

---

## User Flows

### Flow 1: Initial Setup
```
1. User visits calendar-sync.trmnl.com
2. Sees landing page with "Sign in with Microsoft" button
3. Clicks button
4. MSAL.js initiates OAuth
5. User logs in with M365 account (or already logged in)
6. Approves calendar access
7. Browser gets auth code
8. Frontend sends code to Worker `/api/auth/callback`
9. Worker exchanges code for tokens
10. Tokens stored in KV
11. User redirected to /dashboard
12. Dashboard shows calendar list
13. User selects calendars to sync
14. User maps to TRMNL instances
15. User clicks "Save Mappings"
16. Worker stores mapping in KV
17. Worker triggers initial sync immediately
18. Dashboard shows "Sync Complete: 42 events"
9. User sees "Next sync in 6 hours"
```

### Flow 2: Automatic Scheduled Sync
```
1. Cron trigger fires (every 6 hours)
2. Worker fetches all users from KV
3. For user@example.com:
   - Fetch stored mappings
   - Refresh token if needed
   - Query Microsoft Graph for events
   - Transform events
   - POST to TRMNL backend
   - Update lastSyncTime in KV
4. Move to next user
5. Log summary to Cloudflare Analytics
```

### Flow 3: Manual Sync
```
1. User opens dashboard
2. Sees "Last sync: 2 hours ago"
3. Clicks "Sync Now" button
4. Button shows loading spinner
5. Frontend POST to /api/sync
6. Worker fetches changes
7. Worker syncs to TRMNL
8. Returns {"status": "success", "eventCount": 42}
9. Dashboard shows "Synced 42 events just now"
```

### Flow 4: Update Mappings
```
1. User in Settings → Calendars
2. Clicks "Edit Mappings"
3. Sees current calendar-instance mappings
4. Adds new mapping or removes old
5. Clicks "Save"
6. Worker updates KV
7. Shows success message
8. Triggers sync with new mappings
```

### Flow 5: Sign Out
```
1. User clicks "Sign Out"
2. Confirms: "This will delete your synced data"
3. Worker deletes from KV:
   - Access tokens
   - Refresh tokens
   - Mappings
   - Sync history
4. Frontend clears localStorage
5. Redirects to landing page
```

### Flow 6: Returning User Manages Connection

**Scenario**: User previously set up M365 sync and returns days/weeks later to adjust or monitor sync

```
1. User visits calendar-sync.trmnl.com
2. Frontend checks localStorage for existing session
3. Session exists and valid token in KV
   → Skip landing page, redirect to /dashboard
4. User lands on Dashboard (no re-auth needed)
5. Dashboard shows:
   - ✓ Subscription status: "Active"
   - ✓ Signed in as: user@example.com
   - ✓ Last sync: "1 hour ago"
   - ✓ Current mappings: "2 calendars synced"
   - ✓ Next scheduled sync: "In 5 hours"
   - [Sync Now] [Settings] [Sign Out] buttons
6. User can:
   - Click [Sync Now] to immediately sync new events
   - Click [Settings] to adjust which calendars sync
   - View sync history to debug failed syncs
   - Change sync frequency (every 6 hours, 12 hours, daily, etc)
7. Any changes saved to KV immediately
8. No need to re-authenticate (token auto-refreshes)
9. User browses away or closes browser
10. Next visit: Session still valid, lands on Dashboard again
```

**Session Persistence**:
- Access token valid for 1 hour, auto-refreshes via refresh token
- Refresh token valid for 90 days (Microsoft default)
- After 90 days of inactivity, user must re-authenticate
- localStorage persists session across browser closes (user context maintained)

**Multi-User Isolation Guarantee**:
- User A returns to dashboard → sees only User A's data
- User B on same computer returns → sees only User B's data (separate session)
- Even if User A's browser is logged in, User B cannot access User A's calendars
  - Each user has unique OAuth token → different userId in KV → isolated data

---

## Technical Architecture

### Tech Stack

**Frontend**:
- React 18+ (TypeScript)
- MSAL.js (Microsoft auth)
- Tailwind CSS (styling)
- Vite (build tool)
- Deploy to Cloudflare Pages

**Backend**:
- **Hono** (TypeScript) — Lightweight web framework built for Cloudflare Workers
  - Fast routing and middleware
  - Built-in CORS, logging, error handling
  - Type-safe API definitions
  - Minimal overhead (~15KB)
- Wrangler CLI (development)
- Cloudflare KV (key-value storage)
- Cloudflare Cron Triggers (scheduled tasks)
- **hono/jsx** — JSX rendering for HTML responses (error pages, fallbacks)

**Infrastructure**:
- Cloudflare Pages (static frontend + worker)
- Cloudflare KV (encrypted data store)
- Cloudflare Analytics (monitoring)

### Project Structure
```
trmnl-calendar-sync-portal/
├── frontend/                    # React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginButton.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CalendarList.tsx
│   │   │   ├── InstanceMapper.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── SyncStatus.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── AuthCallback.tsx
│   │   │   └── NotFound.tsx
│   │   ├── services/
│   │   │   ├── auth.ts         # MSAL setup
│   │   │   ├── api.ts          # API calls
│   │   │   └── storage.ts      # localStorage helpers
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                     # Cloudflare Worker + Hono
│   ├── src/
│   │   ├── auth/
│   │   │   ├── oauth.ts        # MSAL OAuth exchange
│   │   │   └── middleware.ts   # Bearer token validation
│   │   ├── calendar/
│   │   │   ├── graph.ts        # Microsoft Graph API calls
│   │   │   └── sync.ts         # Sync logic
│   │   ├── storage/
│   │   │   ├── kv.ts           # KV helpers (get/put encrypted)
│   │   │   └── crypto.ts       # Encryption/decryption utilities
│   │   ├── api/
│   │   │   └── routes.ts       # Hono route definitions
│   │   ├── views/
│   │   │   ├── error.tsx       # Error page (hono/jsx)
│   │   │   └── health.tsx      # Health check page (hono/jsx)
│   │   ├── scheduled.ts        # Cron handler (Hono scheduled event)
│   │   └── index.ts            # Hono app entry point
│   ├── wrangler.toml           # Cloudflare config
│   ├── package.json            # Dependencies including hono
│   └── tsconfig.json
│
├── shared/                      # Types, constants
│   └── types.ts
│
└── README.md
```

### Data Flow
```
┌─────────────────────────────────────┐
│  User Browser                       │
│ (React App + MSAL.js)               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Dashboard                       │ │
│ │ - Calendar list                 │ │
│ │ - Sync status                   │ │
│ │ - Manual sync button            │ │
│ └─────────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │ HTTP/HTTPS
               ↓
┌─────────────────────────────────────┐
│ Cloudflare Workers (Hono App)       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Hono Middleware                 │ │
│ │ - CORS handling                 │ │
│ │ - Bearer token validation       │ │
│ │ - Error handling                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Hono Routes                     │ │
│ │ - POST /auth/callback           │ │
│ │ - POST /api/sync                │ │
│ │ - GET /api/calendars            │ │
│ │ - GET /api/instances            │ │
│ │ - POST /api/mappings            │ │
│ │ - GET /api/status               │ │
│ │ - POST /api/logout              │ │
│ │ - GET /health (hono/jsx)        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Scheduled Handler (Hono)        │ │
│ │ - Cron: Every 6 hours           │ │
│ │ - Sync all active users         │ │
│ │ - Token refresh & validation    │ │
│ └─────────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────────────┬────────┐
        ↓                     ↓        ↓
  Microsoft Graph         Cloudflare  TRMNL
  (OAuth + Calendar)      KV Storage  Backend
                          (Encrypted) API
```

### KV Storage Schema
```
// User auth data (encrypted)
kvData["user:{userId}"] = {
  accessToken: "...",
  refreshToken: "...",
  expiresAt: 1711000000,
  email: "user@example.com"
}

// Calendar mappings
kvData["mappings:{userId}"] = {
  mappings: [
    { calendarId, calendarName, instanceId, instanceName }
  ]
}

// Sync history
kvData["sync_history:{userId}"] = {
  lastSync: 1711000000,
  history: [
    { timestamp, status, eventCount, error }
  ]
}

// Settings
kvData["settings:{userId}"] = {
  syncFrequency: "6h",
  syncEnabled: true,
  timezone: "America/New_York"
}
```

---

## Security Considerations

### OAuth & Authentication
- ✅ Use MSAL.js official library
- ✅ OAuth 2.0 PKCE flow (browser-based)
- ✅ Never expose client secret in frontend
- ✅ Worker validates all requests
- ✅ Tokens expire and auto-refresh
- ✅ Support MFA-protected accounts

### Data Encryption
- ✅ Sensitive data encrypted before KV storage
- ✅ Use `crypto.subtle` (web crypto API) for encryption
- ✅ Encryption keys stored securely (never hardcoded)
- ✅ Clear data on sign out

### Network Security
- ✅ HTTPS only (Cloudflare enforces)
- ✅ CORS configured restrictively
- ✅ Rate limiting on API endpoints
- ✅ Request signing/validation with TRMNL

### Permissions & Scopes
- ✅ Request minimal Microsoft Graph scopes
- ✅ `Calendars.Read` only (read-only access)
- ✅ Do not request mail, contacts, or other scopes
- ✅ Clear explanation of what permissions do

### Data Privacy
- ✅ Calendar events not stored longer than needed
- ✅ No event analytics or tracking
- ✅ No third-party data sharing
- ✅ Comply with GDPR/CCPA
- ✅ Provide data export/deletion options

### Worker Security
- ✅ Input validation on all endpoints
- ✅ SQL injection protection (don't use SQL)
- ✅ CSRF protection via SameSite cookies
- ✅ XSS protection via Content-Security-Policy
- ✅ Secrets managed via Cloudflare environment variables

---

## Multi-User Architecture & Isolation

### Architecture Overview

This is a **multi-tenant SaaS portal** where hundreds of independent users can simultaneously:
- Authenticate with their own M365 accounts
- Manage their own calendar mappings
- Sync to their own TRMNL instances
- View only their own sync history

**Each user operates in complete isolation** — no user can see, access, or modify another user's data.

### Per-User Data Isolation Guarantees

**Authentication Isolation**:
- ✅ Each user authenticated independently via MSAL.js OAuth flow
- ✅ Unique session token generated per user (no token sharing)
- ✅ All API endpoints validate `Authorization: Bearer {token}` header
- ✅ Token contains encrypted userId, only accessible to user's session
- ✅ Expired tokens trigger re-authentication (cannot access other users' data with stale token)

**Data Isolation (Cloudflare KV)**:
- ✅ All KV keys namespaced by userId: `user:{userId}`, `mappings:{userId}`, `sync_history:{userId}`, `settings:{userId}`
- ✅ Worker validates userId from token against ALL KV operations
- ✅ No cross-user KV queries possible (KV getter is key-specific, not pattern-based)
- ✅ Encryption keys derived from userId (even if KV compromised, events remain encrypted per user)

**API Endpoint Protection**:
Every endpoint implements **user ownership validation**:

```typescript
// Example: GET /api/calendars
async function handleGetCalendars(request: Request, env: Env) {
  const userId = validateAndExtractUserId(request)  // throws if invalid
  const calendars = await fetchCalendarsFromKV(userId, env)
  return calendars
}

// Example: POST /api/sync
async function handleSync(request: Request, env: Env) {
  const userId = validateAndExtractUserId(request)  // must match token
  const userMappings = await KV.get(`mappings:${userId}`, env)  // userId in key
  if (!userMappings) return error('No calendars configured')
  // Sync only this user's data
}
```

**Protection Against Common Attacks**:

| Attack | Prevention |
|--------|-----------|
| Guessing another user's ID | Token validation + cryptographically random IDs (UUIDs) |
| Accessing `/api/sync` without auth | Bearer token required on all endpoints |
| Modifying another user's mappings | userId validation on POST /api/mappings |
| Viewing another user's sync history | userId in KV key + validation at endpoint |
| Token reuse across users | Token contains encrypted userId, cross-user reuse rejected |
| Direct KV access | Worker validates userId on every KV get/put |
| Timing attacks on userId lookups | Same timeout for existing/non-existing users |

### Scalability for Hundreds of Users

**Cloudflare KV Limits** (supports massive scale):
- ✅ No limit on number of keys (each user gets 4-5 keys: user, mappings, sync_history, settings)
- ✅ 500+ concurrent requests per region
- ✅ ~100-200 users per second authentication capacity (MSAL OAuth bottleneck, not our system)
- ✅ 1GB total storage per account (enough for 100k users × 10KB data each)

**Cron Trigger Scaling**:
- ✅ Cron runs once per 6 hours (not per user)
- ✅ Worker loops through active users sequentially
- ✅ Each user sync takes <10 seconds (includes Microsoft Graph call)
- ✅ Can sync 360+ users per 6-hour cycle (6 users/minute × 60 minutes)
- ✅ For 1000 users: running Cron more frequently (every 2 hours) handles it easily

**Example Cron Math**:
```
Cycle frequency: Every 6 hours = 4 cycles/day
Sync time per user: ~8 seconds (graph call + KV write)
Users per cycle: (6 hours × 3600 sec) / 8 sec = 2,700 users
Max comfortable users: 500-1000 (headroom for graph latency)
```

**Cost at Scale** (Cloudflare Workers):
- ~0.5 MS per request (Workers pricing)
- Free tier: 100k requests/day
- Paid: $0.50 per million requests
- 500 users syncing 4x/day = 2,000 sync ops/day = $1/month

### Future Provider Extensibility

**MVP Scope**: M365 (Microsoft Calendar)

**Phase 2+ Scope**: Multi-provider support

**Architecture for Multiple Providers**:

The backend is designed to support multiple calendar providers with **minimal changes**:

1. **Provider-Agnostic User Flow**:
```
Landing Page
  ↓
"Choose Calendar Provider"
  ↓ (option 1) → "Sign in with Microsoft"  [hono/msal-microsoft]
  ↓ (option 2) → "Sign in with Google"     [hono/msal-google]
  ↓ (option 3) → "Sign in with Apple"      [hono/msal-apple]
  ↓ (option 4) → "CalDAV Setup"            [hono/caldav-client]
```

2. **Modulized Auth Backend**:
```
backend/src/auth/
├── oauth.ts              # Base OAuth handler
├── providers/
│   ├── microsoft.ts      # M365 MSAL + Graph
│   ├── google.ts         # Google OAuth + Calendar API
│   ├── apple.ts          # Apple OAuth + CalDAV
│   └── caldav.ts         # CalDAV (Fastmail, etc)
└── middleware.ts         # Provider-agnostic token validation
```

3. **Unified KV Schema**:
```json
{
  "user:{userId}": {
    "email": "user@example.com",
    "provider": "microsoft",  // "microsoft" | "google" | "apple" | "caldav"
    "accessToken": "...",
    "refreshToken": "...",
    "providerConfig": { /* provider-specific */ }
  }
}
```

4. **Unified Sync Logic**:
```typescript
// backend/src/calendar/sync.ts — provider-agnostic
async function syncUserCalendars(userId: string, env: Env) {
  const user = await getUser(userId, env)
  const provider = getProvider(user.provider)  // instantiate correct provider
  const events = await provider.fetchEvents(user)  // each provider implements this
  await postToTRMNL(events, env)
}
```

5. **Provider Interface** (all providers implement):
```typescript
interface CalendarProvider {
  name: string  // "microsoft" | "google" | "apple" | "caldav"
  authUrl(state: string): string
  exchangeCode(code: string): Promise<{ accessToken, refreshToken, expiresIn }>
  refreshToken(refreshToken: string): Promise<{ accessToken, expiresIn }>
  fetchCalendars(accessToken: string): Promise<Calendar[]>
  fetchEvents(accessToken: string, calendarId: string): Promise<Event[]>
}
```

**Phase 2 Providers** (post-MVP):
- ✅ **Google Calendar**: Google OAuth 2.0 + Google Calendar API (similar to Microsoft Graph)
- ✅ **Apple Calendar / iCloud**: Sign in with Apple + CalDAV protocol
- ✅ **Fastmail CalDAV**: Open CalDAV standard (no OAuth needed, username/password or access token)

**Migration Path**:
1. Phase 1: M365 only (hardcoded provider)
2. Phase 2a: Add Google (provider selection UI)
3. Phase 2b: Add Apple CalDAV
4. Phase 2c: Add open CalDAV support (Fastmail, Nextcloud, etc)

**Each provider addition requires**:
- ✅ New OAuth flow (if supported by provider)
- ✅ Calendar API client (Graph, Google Calendar API, or CalDAV)
- ✅ Event fetcher implementation
- ✅ Minimal UI changes (provider selection screen)
- ✅ No changes to sync/KV/TRMNL integration

---

## API Contracts

### Frontend → Worker Endpoints

#### GET /api/auth/login
```
Returns OAuth authorization URL for frontend to redirect to
Response: { url: "https://login.microsoftonline.com/..." }
```

#### POST /api/auth/callback
```
Exchange OAuth code for tokens
Request: { code: "...", state: "..." }
Response: { success: true, redirect: "/dashboard" }
```

#### GET /api/calendars
```
List user's calendars
Headers: Authorization: Bearer {sessionToken}
Response: [
  { id: "cal-1", name: "Work", email: "user@company" },
  { id: "cal-2", name: "Personal", email: "user@outlook" }
]
```

#### GET /api/instances
```
List TRMNL Calendar instances (from TRMNL backend)
Headers: Authorization: Bearer {sessionToken}
Response: [
  { id: "instance-1", name: "Office Calendar" },
  { id: "instance-2", name: "Home Calendar" }
]
```

#### POST /api/mappings
```
Save calendar-to-instance mappings
Request: {
  mappings: [
    { calendarId: "cal-1", instanceId: "instance-1" }
  ]
}
Response: { success: true }
```

#### POST /api/sync
```
Trigger manual sync
Response: { status: "success", eventCount: 42, lastSync: "2026-03-21T14:30:00Z" }
```

#### GET /api/status
```
Get current sync status
Response: {
  lastSync: "2026-03-21T14:30:00Z",
  status: "success",
  eventCount: 42,
  nextSync: "2026-03-21T20:30:00Z"
}
```

#### POST /api/auth/logout
```
Sign out user
Response: { success: true }
```

### Worker → Microsoft Graph

```
GET https://graph.microsoft.com/v1.0/me/calendars
Authorization: Bearer {accessToken}

GET https://graph.microsoft.com/v1.0/me/calendarview
  ?startDateTime=2026-03-14T00:00:00Z
  &endDateTime=2026-04-20T23:59:59Z
Authorization: Bearer {accessToken}
```

### Worker → TRMNL Backend

```
POST https://api.trmnl.com/calendar-sync
Authorization: Bearer {trmnl_api_token}

Request: {
  source: "cloudflare-portal",
  events: [...],
  lastSync: "2026-03-21T14:30:00Z"
}

Response: {
  status: "success",
  eventCount: 42,
  nextSync: "2026-03-21T20:30:00Z"
}
```

---

## Deployment & Infrastructure

### Frontend Deployment (Cloudflare Pages)
```bash
# Package.json scripts
npm run build        # Vite builds to dist/
npm run deploy       # Auto-deploy from GitHub

# Cloudflare integration:
1. Connect GitHub repo to Cloudflare Pages
2. Set build command: npm run build
3. Set publish directory: dist/
4. Auto-deploys on push to main
```

### Worker Deployment (Wrangler + Hono)
```bash
# wrangler.toml configuration
name = "trmnl-calendar-sync"
main = "src/index.ts"
compatibility_date = "2024-01-01"
workers_dev = true

# KV Binding
[[kv_namespaces]]
binding = "KV_STORAGE"
id = "..."
preview_id = "..."

# Cron Trigger
[[triggers.crons]]
crons = ["0 */6 * * *"]  # Every 6 hours

# Package.json dependencies
{
  "dependencies": {
    "hono": "^4.0.0",
    "@microsoft/msal-node": "^1.18.0"
  },
  "devDependencies": {
    "wrangler": "^3.0.0",
    "typescript": "^5.0.0"
  }
}

# Deploy
wrangler deploy
```

### Example Hono Application Structure
```typescript
// src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bearerAuth } from 'hono/bearer-auth'
import authRoutes from './api/routes'
import { handleScheduled } from './scheduled'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Middleware
app.use(cors({ origin: 'https://calendar-sync.trmnl.com' }))
app.use('/api/*', async (c, next) => {
  // Token validation middleware
  await next()
})

// Routes
app.route('/auth', authRoutes)
app.get('/health', (c) => c.json({ status: 'ok' }))
app.all('*', (c) => c.status(404).json({ error: 'Not found' }))

// Scheduled handler for Cron
export default {
  fetch: app.fetch,
  scheduled: handleScheduled
}
```

### HTML Rendering with hono/jsx
```typescript
// src/views/error.tsx - Error page using hono/jsx
import { html } from 'hono/html'

export const ErrorPage = (status: number, message: string) => {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: sans-serif; margin: 2rem; }
          .error { color: #d32f2f; }
        </style>
      </head>
      <body>
        <h1 class="error">${status}</h1>
        <p>${message}</p>
      </body>
    </html>
  `
}

// Usage in route
app.get('/error/:status', (c) => {
  const status = Number(c.req.param('status'))
  return c.html(ErrorPage(status, 'Something went wrong'))
})
```

### Environment Variables
```
# wrangler.toml or Cloudflare dashboard
MICROSOFT_CLIENT_ID = "your-client-id"
TRMNL_API_KEY = "your-api-key"
TRMNL_API_URL = "https://api.trmnl.com"
ENCRYPTION_KEY = "your-encryption-key"  # Generated via crypto

# Frontend
VITE_WORKER_URL = "https://api.calendar-sync.workers.dev"
VITE_MICROSOFT_CLIENT_ID = "your-client-id"
VITE_REDIRECT_URI = "https://calendar-sync.trmnl.com/auth/callback"
```

### Domain Setup
```
Subdomain: calendar-sync.trmnl.com
Points to: Cloudflare Pages (frontend)
API subdomain: api.calendar-sync.trmnl.com
Points to: Cloudflare Worker

DNS records managed by Cloudflare
SSL/TLS: Automatic (Cloudflare)
```

---

## Monitoring & Observability

### Cloudflare Analytics
- Request count and latency
- Worker execution duration
- Error rates by endpoint
- KV storage usage

### Custom Logging
```typescript
// In Worker
console.log(`[SYNC] User ${userId}: ${eventCount} events`)
console.error(`[SYNC_FAILED] ${error.message}`)
```

### Alerts
- Send email alert if:
  - Cron sync fails
  - Repeated auth failures
  - High error rates (>5%)
  - Worker response time >5s

### Dashboard Metrics
- Active users (last 7 days)
- Total events synced (daily)
- Sync success rate (%)
- Avg sync duration (ms)

---

## Success Metrics

### User Adoption
- [ ] 1000+ users within 60 days
- [ ] 80%+ complete initial setup
- [ ] 70%+ retention after 30 days

### Functionality
- [ ] 99%+ sync success rate
- [ ] <3 second average sync time
- [ ] <10 second cron execution per user
- [ ] <100MB Cloudflare KV usage

### Performance
- [ ] Dashboard loads in <1 second
- [ ] Auth callback <500ms
- [ ] Manual sync response <3 seconds
- [ ] Cron job completes in <60 seconds for 1000 users

### User Satisfaction
- [ ] 4.2+ rating (if hosted externally)
- [ ] <0.5% crash rate
- [ ] <2% manual re-sync rate (indicates issues)

---

## Testing Strategy

### Unit Tests (Frontend)
- Component rendering tests (React Testing Library)
- Auth flow tests
- API service tests
- Storage helpers tests

### Unit Tests (Worker)
- OAuth code exchange tests
- Token refresh tests
- Event transform tests
- KV encryption/decryption tests

### Integration Tests
- End-to-end flow: login → select → sync
- Error recovery scenarios
- Token expiration and refresh
- Multiple users sync in parallel

### Manual Testing
- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile devices (iOS Safari, Android Chrome)
- Test with different M365 account types
- Test with 0, 50, 500, 5000 events
- Network throttling tests
- Offline → online recovery

### Load Testing
- Simulate 1000 concurrent users
- Simulate 100 parallel cron syncs
- Verify KV throttling limits
- Monitor Cloudflare worker CPU time

---

## Known Limitations & Workarounds

| Limitation | Impact | Workaround |
|-----------|--------|-----------|
| OAuth callback requires browser tab | User must have tab open for auth | Can be minimized; normal flow |
| KV has read/write rate limits | High-volume syncs may throttle | Batch requests, use reasonably |
| Cron runs every 6 hours (not 1 hour) | Lower sync frequency | Manual sync for immediate updates |
| No native push notifications | User won't know sync status | Show in dashboard, email alerts |
| Data limited to 7 days past/30 days future | Can't see old/far-future events | By design; matches iOS app |

---

## Cost Analysis

### Cloudflare Workers (Monthly)
- **Free tier**: 100,000 requests/day
- **Paid**: $0.50 per million requests
- **Estimate with 1000 users, 4 syncs/day each**: 4,000 requests/day = **free tier**
- **Estimate with 10,000 users**: 40,000 requests/day = **free tier**
- **Estimate with 100,000 users**: 400,000 requests/day = **~$6/month**

### Cloudflare KV
- **Free tier**: 100,000 read/write operations/day
- **Paid**: $0.50 per 1M reads, $5 per 1M writes
- **Estimate 1000 users**: ~5,000 writes/day = **free tier**
- **Estimate 100,000 users**: ~500,000 writes/day = **$2.50/month**

### Cloudflare Pages (Frontend Hosting)
- **Free**: Unlimited bandwidth
- **Custom domain**: Free

### Total Estimated Monthly Cost
- **1,000 users**: ~$0 (free tier)
- **10,000 users**: ~$0 (free tier)
- **100,000 users**: ~$8.50/month

**Comparison**: Native Android app would require:
- App server infrastructure: ~$200-500/month
- Hosting/database: ~$100-300/month
- App store distribution coordination: Ongoing
- **Total**: $300-800/month minimum

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Microsoft Graph API rate limit | Low | Sync failures | Implement caching, exponential backoff |
| Cloudflare KV capacity limits | Low | Storage errors | Monitor usage, archive old history |
| OAuth token expiration (sync) | Medium | Manual re-auth required | Auto-refresh during sync, graceful retry |
| Browser compatibility issues | Low | Some users can't auth | Test against major browsers, provide FAQ |
| TRMNL API changes | Low | Sync failures | Version API, maintain compatibility |
| User deletes app data| Low | Lost mappings | Store backup in KV, allow restore |

---

## Roadmap

### Q2 2026 (MVP)
- ✅ Web portal launched
- ✅ M365 OAuth integration
- ✅ Calendar selection & mapping
- ✅ Automated sync via Cron
- ✅ Manual sync button
- ✅ Dashboard & settings

### Q3 2026 (Enhancements)
- Additional calendar providers (Fastmail, CalDAV)
- Email notifications
- Advanced filtering
- Sync analytics

### Q4 2026 (Polish)
- Mobile app UI optimization
- Performance improvements
- User feedback implementation

---

## Success Definition

**MVP is complete when**:

1. ✅ User can sign in with M365 account via OAuth
2. ✅ User can select calendars and map to TRMNL instances
3. ✅ App fetches events from Microsoft Graph correctly
4. ✅ App syncs events to TRMNL backend reliably
5. ✅ Cron triggers sync every 6 hours for all users
6. ✅ Manual "Sync Now" button works
7. ✅ Settings allow sync frequency adjustment
8. ✅ Dashboard shows sync status and last sync time
9. ✅ Clear error messages for all failure scenarios
10. ✅ Sign out properly clears all data
11. ✅ Works on multiple browsers and devices
12. ✅ <100ms Worker response time
13. ✅ <1% error rate in production

---

## References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Storage](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/)
- [Microsoft Authentication Library (MSAL.js)](https://learn.microsoft.com/en-us/javascript/api/@azure/msal-browser/)
- [Microsoft Graph API - Calendars](https://learn.microsoft.com/en-us/graph/api/resources/calendar)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [TRMNL Calendar XL Plugin](./README.md)

---

**Document Owner**: Hossain Khan  
**Last Updated**: March 21, 2026  
**Status**: Ready for Development  
**Next Review**: Upon project completion
