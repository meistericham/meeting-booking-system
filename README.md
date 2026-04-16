# Meeting Booking System

Responsive hall and venue booking web app built with Vite, React, Tailwind, Firebase Auth, and Firestore.

Open-source project by [Mohd Hisyamudin](https://github.com/meistericham), published at [github.com/meistericham/meeting-booking-system](https://github.com/meistericham/meeting-booking-system).

This repo now targets a focused MVP:
- Public users can browse venues without logging in
- Invited users must sign in before booking
- Admins manage booking approvals and invite-only onboarding
- Booking statuses are `pending`, `approved`, `rejected`, and `cancelled`
- Optional email notifications run through a Vercel serverless function with SMTP env vars

## Stack
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Firebase Auth
- Firestore
- Vercel serverless API for SMTP email

## Current MVP Flow
- Public:
  - Landing page
  - Venue details
- User:
  - Invite-only signup
  - Login
  - Availability-first booking flow
  - User dashboard with booking history
  - Self-cancel for `pending` and `approved` bookings
- Admin:
  - Login
  - Table-first dashboard
  - Approve / reject bookings
  - Add or resend user invites

## Local Setup
1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Fill in Firebase web app values in `.env.local`.

4. Start dev server:

```bash
npm run dev
```

5. Build for verification:

```bash
npm run build
```

## Environment Variables
Frontend Firebase config:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Optional email backend config for `api/send-email.ts`:

```env
EMAIL_ENABLED=false
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
ADMIN_NOTIFICATION_EMAILS=
```

Notes:
- Keep SMTP variables out of the frontend env namespace.
- `ADMIN_NOTIFICATION_EMAILS` accepts a comma-separated list.
- If `EMAIL_ENABLED` is not `true`, the email endpoint safely no-ops.

## Firebase Setup Checklist
1. Create a Firebase project.
2. Register a Web App and copy the config into `.env.local`.
3. Enable `Authentication > Email/Password`.
4. Add authorized domains:
   - `localhost`
   - your Vercel domain
   - any custom production domain
5. Create Firestore.
6. Seed one admin account:
   - create auth user in Firebase Authentication
   - create matching Firestore doc in `users/{uid}` with `role: "admin"`
7. Seed at least one venue in `venues`.

## Firestore Collections Used
- `users`
- `approvedEmails`
- `venues`
- `bookings`

## Security Rules
`firestore.rules` in this repo is now aligned to the current MVP model:
- users can read and update their own profile
- admins can read all users
- only admins manage `approvedEmails`
- public venue browsing is allowed
- bookings are readable by signed-in users for availability checks
- only owners can cancel their own bookings
- only admins can approve or reject bookings

Deploy Firestore rules separately after confirming your Firebase project:

```bash
firebase deploy --only firestore:rules
```

## Known Tradeoff
For the current MVP, signed-in users can read booking documents needed for availability checks. This keeps the frontend simple, but it is not a privacy-maximal design. A later hardening phase should move availability into a reduced public-safe shape or a backend-mediated query.

## Deployment
This project is set up as a Vite SPA with Vercel rewrites in `vercel.json`.

For production email:
- set SMTP env vars in Vercel project settings
- redeploy after env changes

## Open Source
This repository is open source under the MIT License.

Issues and pull requests are welcome, but the project direction and maintainer decisions remain with the repository owner.

## Ownership
Repository owner and primary maintainer: [Mohd Hisyamudin](https://github.com/meistericham)

Project homepage: [github.com/meistericham/meeting-booking-system](https://github.com/meistericham/meeting-booking-system)

## License
[MIT](./LICENSE)

## Author
Created and maintained by [Mohd Hisyamudin](https://mohdhisyamudin.com).
