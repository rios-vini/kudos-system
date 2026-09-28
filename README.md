# Kudos System 🎉

An internal employee portal feature for peer-to-peer recognition. Employees give
"kudos" to colleagues with a short message of appreciation, and a public feed on
the main dashboard shows all recently submitted kudos. Administrators can hide
or delete inappropriate messages, with a full moderation audit trail.

Built from an approved specification using a spec-driven development process —
see [`SPECIFICATION.md`](./SPECIFICATION.md) for the full requirements, technical
design, and implementation plan.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS 4 |
| Database | SQLite via Prisma ORM (PostgreSQL-compatible schema) |
| Auth | Server-side sessions, HTTP-only cookies, scrypt password hashing |
| Validation | Zod (shared client/server schemas) |
| Tests | Vitest |

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create the database and seed demo data
cp .env.example .env
npm run db:reset

# 3. Start the dev server
npm run dev
```

Open http://localhost:3000 and sign in with a demo account:

| Email | Role | Password |
|---|---|---|
| `admin@datacom.test` | Administrator | `password123` |
| `alice@datacom.test` | Employee | `password123` |
| `bob@datacom.test` | Employee | `password123` |
| `carol@datacom.test` | Employee | `password123` |
| `dave@datacom.test` | Employee | `password123` |
| `erin@datacom.test` | Employee | `password123` |

> Sign in as `admin@datacom.test` to see moderation controls (Hide / Delete)
> on every kudos card, plus the "Show hidden kudos" filter.

## Features

- **Give kudos** — searchable colleague picker, 500-character message with live
  counter, duplicate and rate-limit protection (5/minute)
- **Public feed** — 20 most recent kudos, cursor pagination ("Load more"),
  live refresh on new submissions, relative timestamps
- **Moderation (admin)** — hide/unhide/delete with mandatory reason, audit log
  (`moderation_actions`), "Show hidden" filter, server-side role enforcement
- **Security** — HTTP-only session cookies, scrypt password hashing, Zod
  validation, self-send guard, no account enumeration on login
- **Responsive & accessible** — mobile-first layout, keyboard navigable,
  ARIA combobox/listbox picker, live-region status messages

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm start` | Start the production server |
| `npm run typecheck` | TypeScript strict type check |
| `npm test` | Run unit tests (Vitest) |
| `npm run db:reset` | Recreate the database and seed demo data |
| `npm run smoke-test` | End-to-end API test against a production build (starts/stops its own server) |

## API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Sign in, creates session cookie |
| `POST` | `/api/auth/logout` | User | Invalidate session |
| `GET` | `/api/users?q=` | User | Searchable colleague list (excludes self) |
| `POST` | `/api/kudos` | User | Create a kudos (rate-limited, duplicate-guarded) |
| `GET` | `/api/kudos?cursor=&limit=` | User | Cursor-paginated feed (visible only; `includeHidden=true` for admins) |
| `PATCH` | `/api/kudos/:id/moderate` | Admin | Hide/unhide with mandatory reason |
| `DELETE` | `/api/kudos/:id` | Admin | Permanently delete with mandatory reason (audit-first) |

## Project Structure

```
prisma/
├── schema.prisma        # users, kudos, sessions, moderation_actions
└── seed.ts               # demo users + sample kudos
src/
├── app/
│   ├── page.tsx          # Dashboard: compose form + feed (SSR initial data)
│   ├── login/page.tsx    # Sign-in page
│   ├── layout.tsx, globals.css
│   └── api/              # Route handlers (auth, users, kudos, moderation)
├── components/           # KudosFeed, KudosCard, ComposeKudos, ModerationControls, …
└── lib/                  # prisma, auth, password, validation, rate-limit, api-errors
tests/                    # Vitest unit tests
scripts/smoke-test.mjs    # End-to-end API smoke test (21 checks)
SPECIFICATION.md          # Approved requirements & design (source of truth)
```

## Production Notes

- Swap SQLite for managed PostgreSQL by changing `DATABASE_URL` and the
  `provider` in `prisma/schema.prisma`; the schema is portable.
- Replace seeded credentials with SSO integration against the corporate
  directory; the session mechanism is unchanged.
- Rate limiting is in-memory per process — use a shared store (e.g., Redis)
  when scaling horizontally.
