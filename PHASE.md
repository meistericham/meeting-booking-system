# PHASE.md — Meeting / Venue Booking System (MVP)

## Phase 0 — Setup
- [x] Duplicate baseline from e-RUAI
- [x] Create repo-specific docs: `AGENTS.md`, `PHASE.md`
- [x] Decide stack
  - Locked: Vite/React (max reuse) + Firebase free tier
- [ ] Remove non-MVP modules (super admin, printing, archive, legacy docs)

## Phase 1 — MVP (public booking flow)
- [x] Responsive landing page for the venue
- [x] Venue details page (key information)
- [x] Booking request form
  - [x] Date selection
  - [x] Time slot selection
  - [x] Form validation (required fields, correct formats)
  - [x] Prevent invalid/overlapping slot requests
- [x] Booking confirmation page

## Phase 2 — MVP (admin)
- [x] Admin login page
- [x] Admin dashboard to manage bookings
  - [x] List bookings
  - [x] Update status: pending / approved / rejected
  - [x] Basic filters + search

## Phase 3 — Polish
- [ ] Clean UX (spacing, typography, states)
- [x] Empty states + loading + error handling
- [ ] Mobile-first QA

## Notes
- No payment integration.
- No n8n.
