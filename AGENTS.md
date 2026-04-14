# AGENTS.md — Meeting / Venue Booking System

Rules for working in this repo.

## Product brief (source of truth)
Build a responsive web app for a hall, venue, or event space booking system. No payment integration.

Users can browse a venue, view key details, select a date and time slot, and submit a booking request.

Admins can log in, review incoming bookings, and manage them through a simple dashboard.

Focus: booking flow, responsiveness, usability, and overall polish.

## Requirements (must-have)
1. Responsive landing page for the venue
2. Venue details page with key information
3. Booking request form
4. Date + time slot selection
5. Booking confirmation page
6. Admin login page
7. Admin dashboard to manage bookings
8. Booking statuses: pending, approved, rejected
9. Proper form validation
10. Clean, user-friendly UX

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
- Preferred (if requirement is strict): Next.js (App Router) + Supabase.
- If speed is the only priority: keep Vite/React and reuse most code, with Firebase/Firestore or Supabase swap.

## Working style
- Keep components small and reusable.
- Mobile-first, then desktop.
- No n8n. Any notifications later must be done via in-app API routes/server actions.
- Write changes incrementally; keep the app runnable.

## Conventions
- Tailwind for styling.
- Booking status enum: `pending | approved | rejected`.
- Keep domain types in one place (`types.ts` or `src/types.ts`).
