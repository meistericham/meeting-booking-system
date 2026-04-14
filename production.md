# PRODUCTION CONTEXT: e-Ruai (Resource Unified Access Interface)

## 1. Project Overview
**App Name:** e-Ruai (Unified Resource Access Interface)
**Client:** Sarawak Tourism Board (STB)
**Purpose:** Centralized booking system for meeting rooms, units, and internal support ticketing.
**Current Version:** v0.9.1 (Beta)
**Status:** Live Trial Mode

## 2. Tech Stack
* **Frontend:** React (Vite), TypeScript
* **Styling:** Tailwind CSS
* **Backend:** Firebase (Firestore, Auth, Storage)
* **Hosting:** Vercel

## 3. Core Modules & Features
### A. Authentication & Roles
* **Super Admin:** Full system access + Developer settings.
* **Admin:** Manage bookings, view analytics.
* **User:** Book resources, submit support tickets.
* **Security:** Role-based rendering (RBAC) & Firestore Security Rules.

### B. Resource Booking (Main Feature)
* **Rooms & Units:** CRUD management for resources.
* **Calendar Engine:**
    * **Traffic Light UI:** Green (Free), Orange (Partial), Red (Full).
    * **Stack View:** Shows "Time - Name" directly in cell.
    * **Modal Hub:** Click Date -> View List -> Book Slot Action.
* **Conflict Detection:** Prevents double booking on backend.

### C. In-App Ticketing (Support)
* Forum-style thread system for "Enquiry", "Bug", "Feedback".
* Status tracking: Pending -> Replied -> Resolved.

### D. System Intelligence
* **Version History:** Dynamic changelog page (v3.0 structure).
* **Analytics:** Hidden by default (performance), toggleable.

## 4. Coding Standards & Rules
1.  **Structure:** **Flat Structure** (No `src` folder). All main folders sit at root.
2.  **TypeScript:** Strict typing. Use `types.ts` for shared interfaces.
3.  **Tailwind:** Use utility classes. Avoid custom CSS files.
4.  **Components:** Functional components with Hooks.
5.  **Privacy:** Users should strictly see ONLY their own non-public data.

## 5. File Structure Key (Flat Root)
* `/components`: Reusable UI (Sidebar, Modals, Cards).
* `/pages`: Main route views (AdminDashboard, Booking, Login).
* `/data`: Static data (changelog.ts).
* `/services`: Business logic & API calls.
* `/config`: App configuration files.
* `types.ts`: Centralized TypeScript definitions (User, Booking, Ticket).
* `utils.ts`: Helper functions (Date formatting, validators).
* `firebase.ts`: Firebase initialization.
* `App.tsx`: Main router and layout structure.