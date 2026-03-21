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
- Cloudflare Workers (TypeScript)
- Wrangler CLI (development)
- Cloudflare KV (key-value storage)
- Cloudflare Cron Triggers (scheduled tasks)

**Infrastructure**:
- Cloudflare Pages (static + worker)
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
├── backend/                     # Cloudflare Worker
│   ├── src/
│   │   ├── auth/
│   │   │   └── oauth.ts        # OAuth flow
│   │   ├── calendar/
│   │   │   ├── graph.ts        # Graph API calls
│   │   │   └── sync.ts         # Sync logic
│   │   ├── storage/
│   │   │   └── kv.ts           # KV helpers
│   │   ├── api/
│   │   │   ├── routes.ts       # API endpoints
│   │   │   └── middleware.ts   # CORS, auth, etc
│   │   ├── scheduled.ts        # Cron handler
│   │   └── index.ts            # Entry point
│   ├── wrangler.toml
│   ├── package.json
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
│ Cloudflare Worker (Backend)         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ API Routes                      │ │
│ │ - /auth/login                   │ │
│ │ - /auth/callback                │ │
│ │ - /auth/logout                  │ │
│ │ - /api/calendars                │ │
│ │ - /api/instances                │ │
│ │ - /api/mappings                 │ │
│ │ - /api/sync (manual)            │ │
│ │ - /api/status                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Scheduled Task (Cron)           │ │
│ │ - Every 6 hours                 │ │
│ │ - Sync all active users         │ │
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

### Worker Deployment (Wrangler)
```bash
# wrangler.toml configuration
name = "trmnl-calendar-sync"
type = "javascript"
account_id = "..."
workers_dev = true
routes = [
  { pattern = "api.trmnl-calendar.workers.dev/*", zone_name = "trmnl-calendar.workers.dev" }
]

# KV Binding
[[kv_namespaces]]
binding = "KV_STORAGE"
id = "..."

# Cron Trigger
[[triggers.crons]]
crons = ["0 */6 * * *"]  # Every 6 hours

# Deploy
wrangler publish
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
