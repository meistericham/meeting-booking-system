# PHASE.md — Meeting / Venue Booking System (MVP)

## Phase 0 — Setup
- [x] Duplicate baseline from e-RUAI
- [x] Create repo-specific docs: `AGENTS.md`, `PHASE.md`
- [x] Decide stack
  - Locked: Vite/React (max reuse) + Firebase free tier
- [ ] Remove non-MVP modules (super admin, printing, archive, legacy docs)

## Phase 1 — MVP (public booking flow)
- [ ] Responsive landing page for the venue
- [ ] Venue details page (key information)
- [ ] Booking request form
  - [ ] Date selection
  - [ ] Time slot selection
  - [ ] Form validation (required fields, correct formats)
  - [ ] Prevent invalid/overlapping slot requests
- [ ] Booking confirmation page

## Phase 2 — MVP (admin)
- [ ] Admin login page
- [ ] Admin dashboard to manage bookings
  - [ ] List bookings
  - [ ] Update status: pending / approved / rejected
  - [ ] Basic filters + search

## Phase 3 — Polish
- [ ] Clean UX (spacing, typography, states)
- [ ] Empty states + loading + error handling
- [ ] Mobile-first QA

## Notes
- No payment integration.
- No n8n.
