# PHASE.md — Meeting Booking System (MVP)

## Phase 0 — Setup (today)
- Duplicate from e-RUAI baseline
- Rename and clean project identity
- Define MVP scope and success criteria
- Confirm stack direction:
  - Option A: Vite/React (fastest reuse)
  - Option B: Next.js App Router + Supabase (recommended if must be Next.js)

## Phase 1 — MVP (public booking flow)
- Landing page (responsive)
- Venue details page (key info)
- Booking request form
  - Date + time slot selection
  - Validation (required fields, valid slot, prevent overlaps)
- Booking confirmation page

## Phase 2 — MVP (admin)
- Admin login
- Admin dashboard
  - View bookings
  - Update status: pending / approved / rejected
  - Basic filters + search

## Phase 3 — Polish
- UX cleanup
- Empty states + loading + error handling
- Mobile-first QA
- Basic analytics (optional)

## Notes
- No n8n. Any notifications (email/WA) will be done via in-app API routes or later integration.
