# DEBUG & DEVELOPMENT LOG

## [30 Mar 2026] - Feature: Special Request visibility (Admin) + webhook payload (v0.9.505)
**Status:** ✅ Completed
**Files:** `pages/AdminDashboard.tsx`, `components/MasterScheduleTable.tsx`, `components/BookingForm.tsx`, `utils/specialRequest.ts`, `data/changelog.ts`, `debug-log.md`

* **Admin Console (Default Spreadsheet view):** Added compact **SR** column (Special Request) beside **RF** to surface user special requests entered in the booking form.
* **Admin Console (List view):** Added **SR** column/badge and a **Special Request (Info Only)** section in booking details modal.
* **Keyword detection (info-only):** Simple keyword-based matcher (lunch/refreshment/food/breakfast/tea break variants) + intent hint fallback (request/please/mohon/etc).
* **Email integration:** Booking webhook payload now includes `specialRequest` so n8n/email templates can render the note.
* **Policy:** Visibility only — does not auto-approve or override the 5-working-days rule.

## [26 Mar 2026] - Feature: Admin Console RF column + Catering Attachment rename (v0.9.504)
**Status:** ✅ Completed
**Files:** `pages/AdminDashboard.tsx`, `components/MasterScheduleTable.tsx`, `components/BookingPOFAttachment.tsx`, `data/changelog.ts`, `debug-log.md`

* **Refreshment visibility (minimal UI):** Added compact **RF** column in Admin Console tables, placed before **Booked By/Requester**.
* **Badge mapping:**
  * `Ø RF` = No Refreshment
  * `☕ T&C` = Tea & Coffee Only
  * `🍽 R+T&C` = Refreshment with Tea & Coffee
* **Coverage:** Implemented in both Admin Console **List view** and **Spreadsheet (Master Schedule) view**.
* **Catering print wording:** Renamed all "POF" references in print feature to **Catering Attachment** (button label, tooltip, print title/header, and finance text).

---

## [19 Mar 2026] - Feature: In-app User Guide revamp + HashRouter TOC fix (v0.9.503)
**Status:** ✅ Completed
**Files:** `USER_GUIDE.md`, `pages/UserGuide.tsx`, `components/Sidebar.tsx`, `App.tsx`, `data/changelog.ts`, `debug-log.md`

* **Moved guide in-app:** Replaced sidebar external Bitly link with internal route `/user-guide`.
* **New guide page:** Added `pages/UserGuide.tsx` that renders `USER_GUIDE.md` inside app.
* **UX upgrades:** Added sticky TOC, print button, smooth section jump, and active section highlight while scrolling.
* **HashRouter fix:** TOC links previously used hash anchors and redirected to homepage; replaced with in-page button scroll (`scrollIntoView`) to keep user on `/user-guide`.
* **Content rewrite:** User Guide rewritten to include **USER + ADMIN only** (Super Admin details removed).

---

## [11 Mar 2026] - Refactor: Mobile-friendly Room Availability calendar + 2-week matrix (v0.9.502)
**Status:** ✅ Completed
**Files:** `components/RoomAvailability.tsx`, `pages/UserDashboard.tsx`, `data/changelog.ts`, `package.json`, `debug-log.md`

* **Month View (Mobile):** Cleaner cells with booking-count badge; removed cluttered multi-line text; improved tap targets.
* **Layout (Mobile):** Refactored into consistent sections (controls / calendar / legend) with improved spacing and edge-to-edge behavior.
* **Toggle Controls:** Balanced Month View / 2-Week Matrix segmented control (equal width on mobile).
* **2-Week Matrix (Mobile):** Compact grid; room column reduced; date columns centered; cells show **Free / Full / count**, and **🚫** for maintenance.
* **UserDashboard:** Calendar section can render full-bleed on mobile by cancelling page padding.

---

## [02 Mar 2026] - Policy: 90-day booking window (v0.9.403)
**Status:** ✅ Completed
**Files:** `components/BookingForm.tsx`, `firestore.rules`, `data/changelog.ts`, `debug-log.md`

* **Rule (User):** Users can only create bookings with `startTime` within **90 days from today**.
* **Admin Override:** Admin/Super Admin are not subject to the 90-day limit (needed for long-range planning).
* **Enforcement:** Implemented both **UI validation** (fast feedback) and **Firestore Rules** (cannot be bypassed).

---

## [02 Mar 2026] - Enhancement: Print signage meeting title uppercase (v0.9.402)
**Status:** ✅ Completed
**Files:** `components/BookingServiceSlip.tsx`, `data/changelog.ts`, `debug-log.md`

* **Admin Console (Print Signage):** Meeting Title is now forced to **UPPERCASE** when printing signage/slip, to ensure consistent formatting for printed display.
* **Scope:** Print output only (no changes to booking form input and no changes to stored data).

---

## [25 Feb 2026] - Fix: Admin cancel crash + Room image stability (v0.9.401)
**Status:** ✅ Completed
**Files:** `pages/AdminDashboard.tsx`, `pages/SuperAdminDashboard.tsx`, `data/changelog.ts`, `debug-log.md`

* **Fix (Admin Cancel):** Resolved runtime error `openAdminCancel is not defined` when clicking **Cancel Meeting** in Admin Booking Details.
* **Rooms (Images):** Removed random placeholder image assignment for new rooms. Room images are now controlled via `rooms.imageUrl` (recommended: use static assets hosted under Vercel `public/rooms/*`).

---

## [24 Feb 2026] - Feature: Daily 7:30am meeting reminder email (n8n) + admin CC (v0.9.400)
**Status:** ✅ Completed
**Where:** n8n workflow `eRUAI - 7:30am Reminder (Daily)`

* **Trigger:** Schedule daily at **07:30** (Asia/Singapore / UTC+8).
* **Data source:** Firestore `bookings` (service account credential).
* **Rules:**
  * Only `status == approved`.
  * Only meetings happening **today**.
  * **Exclude** bookings created **today** (`createdAt` >= start of today).
  * Group by user → **one summary email per user** (lists all meetings today).
* **Timezone fix:** Render time using `Asia/Singapore` so UTC timestamps display correctly (e.g., 09:00 AM - 11:00 AM).
* **CC:** admin@sarawaktourism.com.

---

## [23 Feb 2026] - Fix: Support badge polling + status webhook completeness + user profile auto-heal (v0.9.322)
**Status:** ✅ Completed
**Files:** `components/Sidebar.tsx`, `pages/AdminDashboard.tsx`, `services/authContext.tsx`, `data/changelog.ts`, `debug-log.md`

* **Help & Support badge:** Unread support/ticket count now polls every 5s so developer replies show up without requiring a page refresh.
* **n8n status webhook:** Reject/Cancel now triggers the status webhook (previously only Approve). Payload includes `time` (start-end), `purpose`, and `reason` (when applicable) to support email templates.
* **Auth auto-heal:** On login, the app merges missing user profile fields (e.g., displayName/name) into `/users/{uid}` to reduce bookings/admin views showing placeholder "User".

---

## [22 Feb 2026] - UI: iOS-friendly Booking Form date/time selectors + time prompt (v0.9.321)
**Status:** ✅ Completed
**Files:** `components/BookingForm.tsx`, `components/ui/Modal.tsx`, `index.css`, `data/changelog.ts`, `debug-log.md`

* **Date picker (responsive):** Desktop uses native calendar picker; Mobile uses Day/Month/Year dropdowns (this year + next year) for consistent sizing (iOS-friendly).
* **Time picker:** 30-min step dropdowns.
* **UX:** Start time prompts user to choose; end time is auto-suggested (+30 min) and remains editable.
* **Mobile:** Modal height/padding refined; safe-area padding added; prevented iOS zoom-on-focus/text auto-resize.
* **UI (System Evolution):** Multiple changelog lines for the same version are merged into one release card and shown as bullet details.

---

## [21 Feb 2026] - Feature: User self-cancel booking + cancellation reason (v0.9.320)
**Status:** ✅ Completed
**Files:** `pages/MyBookings.tsx`, `services/dataService.ts`, `components/MasterScheduleTable.tsx`, `pages/AdminDashboard.tsx`, `components/StatusBadge.tsx`, `types.ts`, `data/changelog.ts`, `debug-log.md`

* **New (User):** Users can cancel their own bookings when status is `PENDING` or `APPROVED`.
* **New (Admin):** Admin can **Reject** `PENDING` requests with a required reason and **Cancel** `APPROVED` meetings with a required reason.
* **Reason Rules:** Preset dropdown with `Other Reason: Please specify` requiring a note.
* **Tracking:** Cancellation/rejection is persisted into booking doc fields (reason code/note + by/at) and status is updated to `CANCELLED`/`REJECTED`.
* **UX:** CANCELLED/REJECTED bookings show as strike-through/opacity in **Admin Spreadsheet (MasterScheduleTable)** and List view. Users can view cancellation/rejection reasons in **My Bookings → Details**.
* **Hotfix:** Fixed Admin Dashboard blank screen on mobile Safari after introducing reason modals. Root cause: modal state/handlers were scoped inside `useAdminBookings()` but used in `AdminDashboard` render. Resolved by returning/destructuring the required state and handlers.
* **Hotfix:** Fixed booking clash guard to ignore `CANCELLED` bookings. Previously, a cancelled booking could still block new bookings in the same slot due to client-side overlap checks.

---

## [20 Feb 2026] - Feature: Admin Console badge for pending meeting requests (v0.9.319)
**Status:** ✅ Completed
**Files:** `components/Sidebar.tsx`, `services/dataService.ts`, `data/changelog.ts`, `debug-log.md`

* **Requirement:** Show a **"New Request"**-style notification (red dot with number) next to **Admin Console** menu item.
* **Logic:** Badge count = total `bookings` where `status == PENDING` (shared queue, all admins see it).
* **Behavior:** Viewing alone does not clear the badge. Badge decreases/hides automatically only after **approve/reject** changes booking status away from `PENDING`.
* **Implementation:** Added `fetchPendingBookingsCount()` using Firestore `getCountFromServer()` (fallback to `getDocs`) and a 5s polling loop in Sidebar.

---

## [19 Feb 2026] - Fix: Sign-up false failure when Firestore blocked (v0.9.318)
**Status:** ✅ Completed
**Files:** `services/authContext.tsx`, `pages/SignUp.tsx`, `data/changelog.ts`, `debug-log.md`

* **Issue:** Users sometimes saw sign-up failure (blocked Firebase / generic permissions) but the Auth account was actually created; app remained on SignUp form.
* **Fix:** Register now treats **Auth creation as the success condition**. Firestore profile writes are non-blocking (warn + continue). Sign-up always shows success + redirects to Login; logout is also non-blocking.

---

## [19 Feb 2026] - UX: Sign-up blocked-client error clarity (v0.9.317)
**Status:** ✅ Completed
**Files:** `pages/SignUp.tsx`, `data/changelog.ts`, `debug-log.md`

* **Issue:** Some browsers/extensions block Firebase (Firestorm/Auth) requests (`ERR_BLOCKED_BY_CLIENT`), but UI shows generic "Missing or insufficient permissions".
* **Fix:** Detect common permission/network patterns and show a clearer help message (disable shields/adblock or use Incognito).

---

## [19 Feb 2026] - UX: Sign-up success message + return to login (Pending lock) (v0.9.316)
**Status:** ✅ Completed
**Files:** `pages/SignUp.tsx`, `data/changelog.ts`, `debug-log.md`

* **UX:** After successful sign-up, shows a success message (“Admin will approve…”) then returns user to Login.
* **Auth:** Signs out immediately after sign-up (Firebase auto-signs-in by default) so next step is a clean login.
* **Clarity:** If Firebase is blocked by client (adblock/privacy), show a clearer instruction instead of generic permissions error.

---

## [19 Feb 2026] - Fix: Booking submission crash (logger undefined) (v0.9.315)
**Status:** ✅ Completed
**Files:** `components/BookingForm.tsx`, `data/changelog.ts`, `debug-log.md`

* **Issue:** Production runtime error during booking submission: `ReferenceError: logger is not defined`.
* **Impact:** Prevented booking submission (reported when booking **SPECIAL** meeting).
* **Fix:** Import shared `logger` in `BookingForm.tsx` so debug/error calls are defined.

---

## [19 Feb 2026] - Feature: Help & Support in Sidebar (v0.9.314)
**Status:** ✅ Completed
**Files:** `components/Sidebar.tsx`, `pages/SupportCenter.tsx`, `data/changelog.ts`, `debug-log.md`

* **UX:** Added **Help & Support** menu item in sidebar under **My Bookings** for better discoverability.
* **Routing:** Links to existing Support Center at `/support`.
* **Visibility:** Shows **unread ticket badge** (count of tickets not read by user).

---

## [18 Feb 2026] - Admin Dashboard Analytics UX (v0.9.313)
**Status:** ✅ Completed
**Files:** `pages/AdminDashboard.tsx`, `components/DashboardAnalytics.tsx`, `data/changelog.ts`

* **Default behaviour:** Analytics now **hidden** each time Admin Dashboard is opened.
* **UX:** Added **slide-down + fade** animation when showing analytics.
* **Layout:** KPI cards switched to **3-column** layout (equal width, no unused right space).
* **Diagnostics:** Added lightweight log line when toggling analytics.
* **Branding:** Added new favicon + apple-touch-icon.

---

## [17 Feb 2026] - Fix: Workspace corruption + build stability (Node 22 LTS)
**Status:** ✅ Completed
**Files:** `index.tsx`, `data/changelog.ts`, `debug-log.md`, workspace migration under `~/Desktop/CURSOR`

* **Issue:** Build failed with `Unknown system error -11, read` / `Resource deadlock avoided` while reading files under `~/Desktop/CURSOR/e-ruai`.
* **Root Cause:** Filesystem-level read failures in the workspace (including some `.git/objects/*`).
* **Fix:**
  * Installed **Node.js 22 LTS**.
  * Migrated source into a clean folder and re-established Git history via re-clone, then pushed.
  * Restored System Evolution + changelog entries (incl. Profile Edit fix notes).
  * Removed the global `logger` shim from `index.tsx` so missing imports surface properly.

---

## [14 Feb 2026] - Fix: System Evolution Mobile Blank Screen + Route Stability (v0.9.311)
**Status:** ✅ Completed
**Files:** `components/ErrorBoundary.tsx`, `pages/SystemEvolution.tsx`, `components/Layout.tsx`

* **Release Numbering:** Normalized older releases: `v0.9.31–v0.9.39` → `v0.9.301–v0.9.309` for consistent `v0.9.3xx` scheme.
* **Changelog Cleanup:** Added dates for early milestones: `v0.1.0 (09 Jan 2025)` and `v0.5.5 (29 Jan 2025)`.

* **Issue:** On mobile, tapping **System Evolution** showed a brief loading state then a blank/dark screen.
* **Root Cause (1):** `ErrorBoundary` used React Router `Link` while wrapping the app outside Router context → `basename` context was null.
* **Root Cause (2):** `SystemEvolution` imported lucide icon `Map` which shadowed the JavaScript `Map` constructor → `TypeError: ... is not a constructor`.
* **Root Cause (3):** Mobile sidebar backdrop could remain open after navigation, visually covering the page.
* **Fix:**
  * Updated ErrorBoundary to use hash-safe anchor links (`#/dashboard`) and no Router dependencies.
  * Renamed icon import (`Map` → `MapIcon`) to preserve JS `Map` usage.
  * Auto-close mobile sidebar overlay on route change.

---

## [13 Feb 2026] - Feature: User Guide Link in Sidebar (Google Drive)
**Status:** ✅ Completed
**Files:** `components/Sidebar.tsx`

* **New:** Added **User Guide** link in sidebar menu.
* **Link:** https://bit.ly/eruai-userguide
* **Behavior:** Opens in a new tab (Google Drive/Doc link so content can be updated without redeploy).

---

## [13 Feb 2026] - Fix: Profile Update (Display Name / Avatar) for Legacy Users
**Status:** ✅ Completed
**Files:** `services/authContext.tsx`, `firestore.rules`, Firebase Console (Rules Publish)

* **Issue:** Some users could not update Display Name/Avatar due to missing `/users/{uid}` document (`No document to update`).
* **Fix:** Profile updates now use `setDoc(..., { merge:true })` on `/users/{uid}` to create the document if missing.
* **Security:** Updated Firestore Rules to allow self-service updates **only** for profile fields (displayName/avatar) while preventing users from editing role/approver/status fields.
* **Ops:** Rules published in Firebase Console and verified working.

---

## [07 Mar 2026] - Hotfix: Firestore Read Quota Optimization (Dashboard Polling)
**Status:** ✅ Completed
**Version:** v0.9.501
**Files:** `pages/AdminDashboard.tsx`, `components/NotificationBell.tsx`, `components/Sidebar.tsx`

* **Issue:** Free tier Firestore reads exceeded due to aggressive polling (5s intervals) on Admin Dashboard + notification/sidebar badges.
* **Fix:** Dashboard auto-refresh changed from **5s → 5 minutes**, and skips refresh when tab is not visible; refresh triggers when returning to the tab.
* **Fix:** Notifications + Sidebar badge polling reduced to **60s**, and notifications only poll while dropdown is open.

---

## [12 Feb 2026] - Hotfix: Notifications (Permissions + Index + Runtime Stability)
**Status:** ✅ Completed
**Files:** `services/dataService.ts`, `index.tsx`, Firestore Console (Composite Index)

* **Fix:** Adjusted notification queries to align with Firestore rules (only fetch permitted combinations; constrained targeted queries by `recipientRole`).
* **Ops:** Created required composite index for notifications queries (recipientRole + targetUserId + timestamp).

---
