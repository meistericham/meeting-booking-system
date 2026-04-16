# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

e-RUAI (Resource Unified Access Interface) — a meeting room / venue booking system for the Sarawak Tourism Board. Built on a cloned baseline from a previous e-RUAI version; the repo is being stripped down to an MVP focused on venue booking (see `AGENTS.md` for product brief, `PHASE.md` for progress).

## Commands

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Production build (Vite)
npm run preview  # Preview production build
```

No test runner or linter is configured.

## Tech stack

- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS
- **Backend:** Firebase Auth + Firestore (NoSQL, free tier)
- **Icons:** Lucide React
- **Charts:** Recharts (analytics dashboards)
- **Routing:** react-router-dom v7 with `HashRouter`
- **Deployment:** Vercel (SPA rewrite in `vercel.json`)

## Project structure (flat, no `src/` directory)

All source files live at the repo root — there is no `src/` folder.

- `App.tsx` — Route definitions, `ProtectedRoute` component, role-based guards
- `types.ts` — All domain types/enums (`UserRole`, `BookingStatus`, `Booking`, `Ticket`, etc.)
- `firebase.ts` — Firebase app init, exports `auth` and `db`
- `services/authContext.tsx` — Auth provider/hook (`useAuth`), login/register/logout, user doc auto-heal logic
- `services/dataService.ts` — All Firestore CRUD (rooms, bookings, users, notifications, tickets)
- `services/themeContext.tsx` — Dark mode theme provider
- `config/appConfig.ts` — App name/subtitle constants
- `data/changelog.ts` — Version history entries (canonical version source)
- `components/` — Reusable UI components and feature components
- `pages/` — Route-level page components
- `utils/` — Small utilities (avatar colors, logger, special request helpers)
- `firestore.rules` — Firestore security rules (deployed separately)

## Architecture notes

**Roles & access control:** Three roles — `user`, `admin`, `super_admin` (enum in `types.ts`). Route protection is in `App.tsx` via `ProtectedRoute` which checks `allowedRoles`. Firestore rules enforce server-side access (see `firestore.rules`). New users start with `status: 'PENDING'` and see `PendingAccessScreen` until approved.

**User doc keying:** Legacy docs are keyed by email, newer docs by Firebase UID. `authContext.tsx` has `fetchUserDoc` that checks both, plus auto-heal logic that normalizes to UID-keyed docs. Firestore rules support both patterns.

**Booking lifecycle:** `pending → approved/rejected → cancelled` (plus `blocked` for maintenance). Conflict detection prevents double-booking. Bookings carry full audit fields (cancellation reason, who cancelled, timestamps).

**Path alias:** `@/*` maps to the repo root (configured in `tsconfig.json` and `vite.config.ts`).

**Environment variables:** Firebase config via `VITE_FIREBASE_*` env vars. Gemini API key via `GEMINI_API_KEY` (exposed as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` through Vite define).

## Conventions (from AGENTS.md)

- Tailwind for all styling; mobile-first
- Booking status enum: `pending | approved | rejected | cancelled | blocked`
- Domain types centralized in `types.ts`
- Keep components small and reusable
- No n8n — notifications must be in-app or via SMTP env vars
- Write changes incrementally; keep the app runnable
