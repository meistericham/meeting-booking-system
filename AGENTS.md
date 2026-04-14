# AGENTS.md — Meeting Booking System

Rules for working in this repo.

## Goal
Ship an MVP booking system fast, with clean UX.

## MVP scope
- Public:
  - Landing
  - Venue details
  - Booking request (date + time slot)
  - Confirmation
- Admin:
  - Login
  - Dashboard
  - Status workflow: pending / approved / rejected
- Validation:
  - Required fields
  - Prevent invalid/overlapping slots

## Tech direction
Preferred (if requirement is strict): Next.js (App Router) + Supabase.
If speed is the only priority: keep Vite/React and swap data layer.

## Working style
- Keep components small and reusable.
- Mobile-first, then desktop.
- No n8n; use API routes (or server actions) + Supabase.
- Write changes incrementally; keep the app runnable.

## Conventions
- Use Tailwind for styling.
- Keep status as an enum: pending | approved | rejected.
- Store all domain types in a single `types.ts` (or `src/types.ts`).
