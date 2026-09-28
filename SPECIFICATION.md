# Kudos System Specification

> **Status:** ✅ **APPROVED (v1.0)** — 2026-09-27. Implementation authorised per Section 4.
> **Generated from:** "Create a feature for our internal web app that allows users to give 'kudos' to their colleagues. A user should be able to select another user from a list, write a short message of appreciation, and submit it. There should also be a public feed on the main dashboard where all recently submitted kudos are visible."
> **Last updated:** 2026-09-27

---

## 1. Overview

The Kudos System is a feature for the internal employee portal that enables peer-to-peer recognition. Employees can select a colleague, write a short message of appreciation, and submit it. A public feed on the main dashboard displays recently submitted kudos to foster a culture of recognition.

### 1.1 Proposed Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + Next.js (App Router), TypeScript | Server-side rendering for fast dashboard loads; single language across stack |
| Styling | Tailwind CSS | Rapid responsive design, consistent design system |
| Backend | Next.js Route Handlers (Node.js runtime) | Co-located API with frontend; simple deployment |
| Database | PostgreSQL (Prisma ORM) | Relational fit for users/kudos; Prisma gives typed queries and migrations |
| Auth | Cookie-based session auth against the corporate user directory (seeded `users` table in dev) | Internal app; keeps implementation self-contained |
| Testing | Vitest (unit) + Playwright (E2E) | Fast unit tests; browser-level acceptance coverage |
| Validation | Zod | Shared validation schemas between client and server |

---

## 2. Functional Requirements

### 2.1 User Stories

1. **US-1 (Authentication):** As a user, I can sign in with my employee account so that kudos are attributed to me and I can only act on my own behalf.
2. **US-2 (User selection):** As a signed-in user, I can select a colleague from a searchable list of employees when composing a kudos.
3. **US-3 (Message creation):** As a signed-in user, I can write a short message of appreciation (max 500 characters) to accompany the kudos.
4. **US-4 (Submission):** As a signed-in user, I can submit the kudos, which is stored in the database and attributed to me as the sender.
5. **US-5 (Public feed):** As a signed-in user, I can view a feed of recent kudos on the main dashboard, showing sender, recipient, message, and relative timestamp.
6. **US-6 (Content moderation):** As an administrator, I can hide or delete inappropriate kudos messages so that the public feed remains a safe and respectful space, with a full audit trail of every moderation action.

### 2.2 Acceptance Criteria

**US-1 Authentication**
- [ ] AC-1.1: A user cannot access the dashboard, compose, or feed data without an active session; unauthenticated requests redirect to the sign-in page.
- [ ] AC-1.2: Sessions expire after a configurable idle timeout (default: 8 hours).
- [ ] AC-1.3: Sign-out invalidates the server-side session.

**US-2 User Selection**
- [ ] AC-2.1: The recipient selector lists all active employees except the currently signed-in user.
- [ ] AC-2.2: The list is searchable by name and supports keyboard navigation.
- [ ] AC-2.3: A kudos cannot be submitted without a selected recipient.

**US-3 Message Creation**
- [ ] AC-3.1: The message field enforces a maximum of 500 characters with a live character counter.
- [ ] AC-3.2: The message must contain at least 1 non-whitespace character.
- [ ] AC-3.3: The message is sanitized on render to prevent HTML/script injection (XSS).

**US-4 Submission**
- [ ] AC-4.1: Submitting a valid kudos persists it with sender, recipient, message, and `created_at` timestamp.
- [ ] AC-4.2: A user cannot send a kudos to themselves (server-side enforced).
- [ ] AC-4.3: On success, the user sees a confirmation and the compose form resets.
- [ ] AC-4.4: On failure, the user sees a clear error message and their input is preserved.
- [ ] AC-4.5: Duplicate submissions (same sender, recipient, and message within 60 seconds) are rejected with a friendly error.

**US-5 Public Feed****visible** kudos, newest first; hidden kudos never appear for non-admin users
- [ ] AC-5.1: The dashboard feed shows the 20 most recent kudos, newest first.
- [ ] AC-5.2: Each feed item displays sender name, recipient name, message, and relative time (e.g., "5 minutes ago").
- [ ] AC-5.3: The feed paginates ("Load more") in batches of 20.
- [ ] AC-5.4: The feed refreshes to include a newly submitted kudos without requiring a full page reload.

**US-6 Content Moderation (Administrator)**
- [ ] AC-6.1: Administrators see moderation controls (hide, delete) on every kudos card; non-admin users never see these controls.
- [ ] AC-6.2: Hiding a kudos immediately removes it from the public feed for all users while retaining the record in the database for audit.
- [ ] AC-6.3: Deleting a kudos permanently removes it from the database; an audit record of the deletion is written first.
- [ ] AC-6.4: Every hide, unhide, and delete action requires a reason (3–500 characters), stored with the moderation record.
- [ ] AC-6.5: Moderation endpoints enforce the `admin` role server-side; non-admin requests receive `403 Forbidden` even if client-side controls are bypassed.
- [ ] AC-6.6: Administrators can filter the feed to view hidden kudos and can rest
- **Spam:** bursts of kudos from one sender are throttled by rate limiting; repeated identical messages to the same recipient are rejected as duplicates and can be cleaned up by administrators via moderation.
- **Inappropriate content:** hidden or deleted kudos disappear from the feed immediately; employees never see a placeholder — hidden items simply do not render.
- **Duplicate submissions:** identical kudos (same sender, recipient, message) within 60 seconds are rejected; administrators can still hide repeated spam patterns manually.
- **Moderation race conditions:** if a kudos is submitted while an administrator is moderating, the feed refetches after each moderation action to converge on server state.ore (unhide) a previously hidden kudos.
- [ ] AC-6.7: All moderation actions are logged with actor, action, target kudos, reason, and timestamp.

### 2.3 Edge Cases & Error Handling

- Empty or whitespace-only messages are rejected (client and server side).
- Messages exceeding 500 characters are truncated client-side and rejected server-side.
- Concurrent submissions from the same user are rate-limited (max 5 per minute).
- If the recipient list fails to load, the compose form shows a retry affordance.
- Feed API failures display an inline error with a retry button, not a blank page.

### 2.4 Non-Functional Requirements
nd all moderation actions (hide/unhide/delete, with actor, reason, and timestamp) are recorded in the `moderation_actions` audit log
- **Responsive design:** Usable at 360px–1920px viewports; single-column on mobile, multi-column dashboard on desktop.
- **Performance:** Feed initial load < 500ms server response time on the first 20 items; list virtualization not required at expected scale (< 100k kudos).
- **Accessibility:** WCAG 2.1 AA — keyboard navigable forms, labeled inputs, live region for submission status.
- **Auditability:** All kudos submissions are logged with actor, action, and timestamp.

---

## 3. Technical Design

### 3.1 Database Schema

```sql
-- Users: seeded from the corporate directory in dev
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    display_name  VARCHAR(100) NOT NULL,
    avatar_url    VARCHAR(500),
    role          VARCHAR(20)  NOT NULL DEFAULT 'employee',  -- 'employee' | 'admin'
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Kudos: one row per recognition given
CREATE TABLE kudos (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id            UUID NOT NULL REFERENCES users(id),
    recipient_id         UUID NOT NULL REFERENCES users(id),
    message              VARCHAR(500) NOT NULL,
    is_visible           BOOLEAN      NOT NULL DEFAULT true,   -- moderation: hidden when false
    moderated_by         UUID         REFERENCES users(id),    -- admin who last moderated
    moderated_at         TIMESTAMPTZ,                           -- when last moderated
    reason_for_moderation VARCHAR(500),                        -- admin-supplied reason
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_kudos_created_at ON kudos (created_at DESC);
CREATE INDEX idx_kudos_recipient ON kudos (recipient_id);
CREATE INDEX idx_kudos_visible_created ON kudos (is_visible, created_at DESC);

-- Sessions: server-side session store
CR

-- Moderation audit log: one row per hide/unhide/delete action
CREATE TABLE moderation_actions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kudos_id    UUID NOT NULL REFERENCES kudos(id) ON DELETE SET NULL,
    admin_id    UUID NOT NULL REFERENCES users(id),
    action      VARCHAR(20) NOT NULL,               -- 'hide' | 'unhide' | 'delete'
    reason      VARCHAR(500) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_moderation_kudos ON moderation_actions (kudos_id);
CREATE INDEX idx_moderation_admin ON moderation_actions (admin_id);EATE TABLE sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Relationships:** `kudos.sender_id` → `users.id` (N:1); `kudos.recipient_id` → `users.id` (N:1). A user can send and receive many kudos.

### 3.2 API Endpoints

| Method | Path | Auth | Description | Success | Errors |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | None | Sign in with email; creates session cookie | `200 { user }` | `401` invalid credentials |
| `POST` | `/api/auth/logout` | User | Invalidates current session | `204` | — |
| `GET` | `/api/users` | User | List active colleagues (excludes self) for recipient picker; `?q=` search | `200 [{ id, display_name, avatar_url }]` | `401`, `500` |
| `POST` | `/api/kudos` | User | Create a kudos. Body: `{ recipientId: UUID, message: string }` | `201 { kudos }` | `400` validation, `401`, `409` duplicate, `429` rate limit |
| `GET` | `/api/kudos` | User | Paginated feed. Query: `?cursor=<ISO8601>&limit=20&includeHidden=true` (admin-only param) | `200 { items: [...], nextCursor }` | `401`, `403` non-admin uses `includeHidden`, `500` |
| `PATCH` | `/api/kudos/:id/moderate` | Admin | Hide or unhide. Body: `{ action: "hide" \| "unhide", reason: string }` | `200 { kudos }` | `400` invalid action/reason, `401`, `403` non-admin, `404` not found |
| `DELETE` | `/api/kudos/:id` | Admin | Permanently delete a kudos (audit record written first). Body: `{ reason: string }` | `204` | `400` missing reason, `401`, `403` non-admin, `404` not found |

**Validation rules (shared Zod schema):
- `reason` (moderation): trimmed, 3–500 characters, required for every moderation action.**
- `recipientId`: valid UUID, must exist, must not equal sender, recipient must be active.
- `message`: trimmed, 1–500 characters.

### 3.3 Frontend Components

```
app/
├── page.tsx                  # Dashboard: KudosFeed + GiveKudosButton
├── login/page.tsx            # Sign-in form
├── compose/page.tsx          # Give kudos (modal on desktop, page on mobile)
└── api/                      # Route handlers (see 3.2)
components/
├── KudosFeed.tsx             # Feed list: fetch, pagination, empty/error states
│   └── KudosCard.tsx         # Single kudos: sender → recipient, message, time
│       └── ModerationControls.tsx  # Admin-only: hide/unhide/delete with reason prompt
├── ComposeKudos.tsx          # Form: RecipientPicker + MessageInput + submit
│   ├── RecipientPicker.tsx   # Searchable, keyboard-navigable user list
│   └── MessageInput.tsx      # Textarea with live character counter
├── Navbar.tsx                # App header: user menu, sign-out
└── StatusBanner.tsx          # Accessible success/error live region
```

**Interactions:**
1. Dashboard loads → `KudosFeed` fetches `GET /api/kudos` (SSR initial payload, client refetch on new submission).
2. "Give kudos" → `ComposeKudos` opens → `RecipientPicker` fetches `GET /api/users` (debounced search).
3. Submit → `POST /api/kudos` → on `201`, close form
5. Admin clicks hide/delete on a card → `ModerationControls` prompts for a reason → `PATCH /api/kudos/:id/moderate` or `DELETE /api/kudos/:id` → feed refetches; hidden kudos disappear (or reappear on unhide).
6. Admin toggles "Show hidden" → feed refetches with `includeHidden=true`; hidden cards render with a distinct style and an "Unhide" action., show success banner, prepend new kudos to feed.
4. "Load more" → fetch next page using `nextCursor`.

### 3.4 Security Considerations
 Moderation endpoints (`PATCH /api/kudos/:id/moderate`, `DELETE /api/kudos/:id`, `includeHidden` feed param) are restricted to the `admin` role, enforced server-side on every request.
- **Moderation audit:** every hide/unhide/delete writes an immutable `moderation_actions` row with actor, action, reason, and timestamp; deletes write the audit row before removing the kudos.
- **Authentication:** HTTP-only, SameSite=Lax, Secure session cookies; server-side session lookup on every request.
- **Authorization:** Users can only create kudos as themselves (sender derived from session, never from request body).
- **Input sanitization:** Zod validation server-side; React escapes output by default (no `dangerouslySetInnerHTML`).
- **Rate limiting:** Per-user sliding window on `POST /api/kudos` (5/minute) to mitigate spam.
- **SQL injection:** Prisma parameterized queries only.
- **CSRF:** SameSite cookie policy + custom header check on mutations.

### 3.5 Performance Considerations

- Keyset (cursor) pagination on the feed — stable under concurrent inserts, no `OFFSET` scans.
- Composite index on `(is_visible, created_at DESC)` so the default feed query (visible only) stays index-covered.
- Feed initial data server-rendered to avoid client-side loading flash.
- Debounced (300ms) recipient search to limit query volume.

### 3.6 Error Handling & Logging

- API errors return a consistent JSON envelope: `{ error: { code, message } }`.
- Client maps error codes to friendly, actionable messages.
- Server logs structured JSON (level, request ID, route, user ID, latency) to stdout for aggregation.
- Unexpected errors are logged with stack traces and returned as opaque `500`s (no internals leaked).

---

## 4. Implementation Plan

| # | Task | Depends on |
|---|---|---|
| 1 | Scaffold Next.js + TypeScript + Tailwind project; Prisma setup | — |
| 2 | Schema + migration: `users`, `kudos`, `sessions`; seed users | 1 |
| 3 | Session auth: login/logout route handlers, middleware guard | 2 |
| 4 | `GET /api/users` with search | 2, 3 |
| 5 | `POST /api/kudos` with validation, self-send guard, duplicate + rate-limit checks | 2, 3 |
| 6 | `GET /api/kudos` cursor-paginated feed (visible-only; `includeHidden` for admins) | 2, 3 |
| 6b | Moderation: `PATCH /api/kudos/:id/moderate`, `DELETE /api/kudos/:id`, `moderation_actions` audit log | 2, 3 |
| 7 | Login page + Navbar | 3 |
| 8 | ComposeKudos (RecipientPicker + MessageInput) wired to APIs | 4, 5 |
| 9 | KudosFeed + KudosCard with pagination and refresh | 6 |
| 9b | ModerationControls (hide/unhide/delete with reason) + admin "Show hidden" filter | 6b, 9 |
| 10 | Responsive + accessibility pass | 7, 8, 9, 9b |
| 11 | Unit tests (validation, API handlers, moderation authorization) + E2E happy path & moderation flow | 8, 9, 9b |
| 12 | README, deployment config | all |
, moderation reason validation.
- Integration: API route handlers against a test database, including `403` for non-admin moderation attempts.
- E2E (Playwright): sign in → send kudos → see it in feed; admin hides kudos with reason → it disappears from employee view → admin unhides → it reappears; admin deletes kudos → gone for allsor logic.
- Integration: API route handlers against a test database.
- E2E (Playwright): sign in → send kudos → see it in feed.

**Deployment considerations:**
- Single Next.js service; managed PostgreSQL; migrations run on release.
- Environment config for session secret, database URL, and session TTL.
- Seed script provides demo users for non-production environments.

---

## 5. Open Questions for Architect Review

1. Should users be able to edit or delete their own kudos after submission?
2. Is anonymity supported (hidden sender), or is all recognition public?
3. Are notifications (email/Slack) expected when a user receives kudos?
4. Should the feed support reactions or comments?
5. ~~Content moderation~~ **RESOLVED in v0.2:** administrative hide/delete with reason, audit trail, and `is_visible` flag added per Architect refinement.
6. Should hidden kudos be permanently purged after a retention period (e.g., 90 days)?
7. Do administrators need a dedicated moderation dashboard (list of all moderation actions), or are in-feed controls sufficient for v1?

---

## 6. Approval & Implementation Notes

**Approved by the Architect on 2026-09-27.** Implementation is authorised per the plan in Section 4.

Notes recorded during implementation (consistent with the approved design):

1. **`users.password_hash`** — added to the `users` table so the self-contained dev build can authenticate against seeded accounts. In production this would be replaced by SSO integration with the corporate directory; the session mechanism is unchanged.
2. **`moderation_actions.kudos_id` is nullable** — the draft SQL declared `NOT NULL` together with `ON DELETE SET NULL`, which is contradictory. The implemented schema makes `kudos_id` nullable so deletion audit records survive the kudos they refer to (audit written before delete, per AC-6.3).
3. **Rate limiting** is in-memory per process (sliding window). Acceptable for a single-instance v1 deployment; a shared store (e.g., Redis) is the documented upgrade path for horizontal scaling.
4. **Middleware** performs only a cheap cookie-presence check at the edge; full session validation (expiry, active user) happens server-side in every route handler and page, per the security design.
5. **Moderation metadata privacy** — non-admin feed responses omit `moderatedAt` and `reasonForModeration`; only administrators see moderation reasons (AC-6.1).

---

*Specification approved 2026-09-27. This document is the single source of truth for the Kudos System implementation in this repository.*
