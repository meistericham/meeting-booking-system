# e-RUAI User Guide (USER & ADMIN)

Version: v3.x (Web App)  
Last updated: 2026-03-19

---

## 1) Overview

e-RUAI (Resource Unified Access Interface) is STB’s internal platform to:
- Check room/unit availability
- Submit and manage bookings
- Process booking approvals (Admin)
- Track booking status and history
- Submit support enquiries

---

## 2) Roles in Scope

This guide only covers:

### USER
Can:
- Check availability
- Create booking requests
- View own bookings
- Cancel own bookings (with reason)
- Submit support tickets
- Update own profile/settings

### ADMIN
Can do everything USER can, plus:
- Review pending bookings
- Approve/reject booking requests
- Cancel approved bookings when needed (with reason)

> Super Admin scope is intentionally excluded.

---

## 3) Booking Status Flow

- **PENDING**: Waiting for admin action
- **APPROVED**: Booking accepted
- **REJECTED**: Booking denied
- **CANCELLED**: Booking cancelled after submission
- **BLOCKED**: Resource intentionally unavailable

Typical flow:  
`PENDING → APPROVED` (or `REJECTED`)

Cancellation flow:  
`PENDING/APPROVED → CANCELLED`

---

## 4) USER Guide (Step-by-Step)

### Step 1 — Login
1. Open e-RUAI URL
2. Sign in with your account
3. If access is pending, complete required profile info and wait for approval

**Image placeholder:**  
`[IMG_LOGIN_PAGE_URL]`

### Step 2 — Check Availability
1. Open the availability page
2. Select date/resource
3. Confirm slot is available before booking

**Image placeholder:**  
`[IMG_AVAILABILITY_PAGE_URL]`

### Step 3 — Create Booking
1. Fill in booking form details:
   - Date/time
   - Room/unit
   - Purpose/title
   - Notes (if needed)
2. Submit request
3. Status becomes **PENDING**

**Image placeholders:**  
`[IMG_BOOKING_FORM_URL]`  
`[IMG_BOOKING_SUBMITTED_STATUS_URL]`

### Step 4 — Track Booking
1. Open your booking list
2. Monitor status updates (Pending/Approved/Rejected/Cancelled)

**Image placeholder:**  
`[IMG_MY_BOOKINGS_LIST_URL]`

### Step 5 — Cancel Own Booking (if needed)
1. Open your booking list
2. Select booking with status **PENDING** or **APPROVED**
3. Click cancel
4. Enter cancellation reason
5. Confirm

**Image placeholders:**  
`[IMG_CANCEL_MODAL_URL]`  
`[IMG_CANCELLED_STATUS_URL]`

---

## 5) ADMIN Guide (Step-by-Step)

### Step 1 — Review Pending Requests
1. Open the admin booking management page
2. Filter for **PENDING** requests

**Image placeholder:**  
`[IMG_ADMIN_PENDING_LIST_URL]`

### Step 2 — Review Request Detail
Check:
- Time and resource request
- Any overlap/conflict
- Operational suitability

**Image placeholder:**  
`[IMG_ADMIN_REQUEST_DETAIL_URL]`

### Step 3 — Take Action
- **Approve** request → status becomes APPROVED
- **Reject** request → status becomes REJECTED (reason recommended)

**Image placeholders:**  
`[IMG_ADMIN_APPROVE_ACTION_URL]`  
`[IMG_ADMIN_REJECT_ACTION_URL]`

### Step 4 — Manage Approved Bookings
If necessary, admin may cancel approved bookings with clear reason for audit clarity.

**Image placeholder:**  
`[IMG_ADMIN_CANCEL_APPROVED_URL]`

---

## 6) Help & Support (USER + ADMIN)

1. Open Help & Support
2. Create ticket (Enquiry / Bug / Feedback)
3. Provide clear details (what happened, where, when)
4. Track status:
   - Pending
   - Replied
   - Resolved
   - Closed

**Image placeholders:**  
`[IMG_SUPPORT_CREATE_TICKET_URL]`  
`[IMG_SUPPORT_TICKET_STATUS_URL]`

---

## 7) Badge & Notification Behavior

- Support badge: unread replies for current user
- Admin booking badge: pending booking count

**Image placeholder:**  
`[IMG_SIDEBAR_BADGES_URL]`

---

## 8) Best Practices

1. Check availability first before booking
2. Use clear booking title/purpose
3. Cancel early if no longer needed
4. Admin actions should include clear reason (especially reject/cancel)
5. Use ticketing for formal support tracking

---

## 9) Troubleshooting

### A) Cannot submit booking
- Check required fields
- Check slot/resource status
- Refresh and try again

### B) Booking remains Pending
- Waiting admin action
- Follow up through Help & Support if urgent

### C) Cannot access admin booking actions
- Confirm your role is Admin
- Re-login and try again

### D) Guide/TOC not scrolling correctly
- Refresh page once
- Reopen User Guide from sidebar

---

## 10) Quick Checklist

- [ ] Login successful
- [ ] Check availability
- [ ] Submit booking
- [ ] Monitor status
- [ ] Cancel (if needed) with reason
- [ ] Use support ticket if issue occurs

---

Document owner: [Mohd Hisyamudin](https://mohdhisyamudin.com)
