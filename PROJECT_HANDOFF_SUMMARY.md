# PROJECT HANDOFF SUMMARY — F1 Pool

**For the next AI session: read this first to continue work seamlessly.**

---

## 1. What This Project Is

**F1 Pool** — A Fantasy F1 pick'em app where groups of friends create pools, pick one driver per race, and compete on a season-long leaderboard. Think fantasy football but for Formula 1 — simple, social, and fun.

---

## 2. What Problem It Solves

A group of friends wanted a private F1 betting/pick pool without using spreadsheets or generic fantasy platforms. Each week, members pick a driver before the race deadline. Points are awarded based on race results (F1 scoring system). Leaderboard tracks the season standings.

---

## 3. Current Features (What Exists)

### Auth
- Register with email/password (email verification required)
- Login via NextAuth (credentials provider)
- Forgot password / reset password flow
- Email verification tokens
- Roles: `user` and `superadmin`

### Pools
- Create a pool (name, season, optional mid-season reset)
- Join a pool via invite code
- Pool admin panel for managing members
- Super admin panel for site-wide user and pool management

### Picks
- Pick one driver per race per pool
- Pick deadline enforced (before race start)
- View all picks for a race
- Unique constraint: one pick per user per pool per race

### Results & Scoring
- Race results import (manual + automated cron)
- F1 points system (race + sprint + fastest lap)
- Leaderboard component showing season standings
- Cron: auto-import results Sunday 10 PM + Monday 10 AM

### Notifications
- Email reminders for upcoming pick deadlines (daily cron at noon)
- Email notifications when results are posted

### Data
- 2026 F1 race calendar seeded
- 2026 driver roster seeded
- Race results stored per driver per race

---

## 4. Technologies and Frameworks

### Stack
- **Next.js 16** (App Router, TypeScript)
- **React 19**
- **Prisma** ORM + **PostgreSQL**
- **NextAuth v4** for authentication
- **Resend** for transactional emails
- **Tailwind CSS v4** for styling
- **Vercel** for hosting and cron jobs

### Key files
- Schema: `prisma/schema.prisma`
- Auth: `src/lib/auth.ts`
- DB client: `src/lib/prisma.ts`
- Email: `src/lib/email.ts`
- F1 API: `src/lib/f1-api.ts`
- Points: `src/lib/f1-points.ts`
- Tokens: `src/lib/tokens.ts`
- Admin utils: `src/lib/admin.ts`

### Pages
- `/` — Landing
- `/login`, `/register`, `/verify`, `/forgot-password`, `/reset-password` — Auth
- `/dashboard` — User's pools overview
- `/pool/create` — Create a new pool
- `/pool/join` — Join via invite code
- `/pool/[id]` — Pool view (leaderboard, race schedule)
- `/pool/[id]/picks` — Make picks for upcoming race
- `/pool/[id]/admin` — Pool admin panel
- `/admin` — Super admin panel

### API Routes
- `/api/auth/[...nextauth]` — NextAuth
- `/api/register` — User registration
- `/api/verify-email` — Email verification
- `/api/forgot-password`, `/api/reset-password` — Password flows
- `/api/pools`, `/api/pools/join` — Pool CRUD
- `/api/picks` — Submit/view picks
- `/api/results/import`, `/api/results/manual` — Import race results
- `/api/cron/import-results` — Automated results cron
- `/api/notify/reminders` — Pick deadline email reminders
- `/api/notify/results` — Results notification emails
- `/api/admin/users`, `/api/admin/pools` — Super admin endpoints

---

## 5. Important Patterns and Assumptions

- App Router (no pages/ directory) — all routes in `src/app/`
- Server components by default; client components marked with `"use client"`
- Prisma singleton in `src/lib/prisma.ts`
- Auth via `getServerSession(authOptions)` in server components/API routes
- NextAuth configured with CredentialsProvider + PrismaAdapter
- Vercel crons defined in `vercel.json` with `CRON_SECRET` for auth
- Build step: `prisma generate && next build`
- `postinstall: "prisma generate"` for Vercel deploys

---

## 6. Things We Decided NOT to Do

*(Add items here as decisions are made)*

---

## 7. Current State of Development

### What works
- Full auth flow (register, verify email, login, forgot/reset password)
- Pool creation and joining via invite code
- Driver picking per race with deadline enforcement
- Race results import (manual + cron)
- Leaderboard and standings
- Email notifications (reminders + results)
- Super admin panel
- Deployed on Vercel

### What's unfinished or uncertain
*(Fill in as issues are found)*

---

## 8. What We Were Working On Last

- Last commit: `2d5ab65` "Add automated race results import via cron"
- Vercel crons set up for results import and pick reminders
- App appears functionally complete for basic pool play

---

## 9. Known Issues or Risks

*(Add items as they're discovered)*

---

## 10. What the Next Step Should Be

*(Fill in based on Jem's priorities)*

---

## 11. Session-Specific Notes

### Deployment
- Hosted on **Vercel** (not Azure)
- Repo: `github.com/Mastjmw/f1-pool` (private)
- DB: PostgreSQL (connection via `DATABASE_URL` env var)
- Email: Resend (`RESEND_API_KEY` — same account as GCC Message Board)
- Auth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL` env vars
- Crons: `CRON_SECRET` env var for cron endpoint auth

### Environment variables needed
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Random secret for JWT signing
- `NEXTAUTH_URL` — Production URL of the app
- `RESEND_API_KEY` — Resend API key for emails
- `CRON_SECRET` — Secret to authenticate cron endpoint calls

---

### ⚠️ DEPLOYMENT RULES

Follow the same protocol as GCC Message Board:
- Work on a branch, explain changes, wait for Jem's go-ahead before deploying
- Vercel auto-deploys on push to main — be careful with direct pushes
