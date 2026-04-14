# e-Ruai: Resource Unified Access Interface 🚀

**e-Ruai** is a centralized resource management and booking system developed for the **Sarawak Tourism Board (STB)**. It serves as a unified platform for staff to book meeting rooms, units, and manage internal queries, replacing manual processes with a modern SaaS-style web application.

![Version](https://img.shields.io/badge/version-v0.9.321-blue.svg)
![Status](https://img.shields.io/badge/status-Beta-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Stack](https://img.shields.io/badge/tech-React%20%7C%20Firebase%20%7C%20Tailwind-green.svg)

**License:** MIT — see [`LICENSE`](./LICENSE)

---

## 📅 System Evolution

* **v4.0 (Planned): All-Year STB Plan** — a centralized annual planning and execution module in e-Ruai, with calendar entries coordinated with the Strategic & Transformation Unit (STU) for alignment and governance.
* **v3.0 (Current):** Full Web Application (React + Firebase). Real-time booking, in-app ticketing, and admin dashboards.
* **v2.0 (Legacy):** Automation via Google Sheets & Google Apps Script (GAS).
* **v1.0 (Legacy):** Manual process (PDF Forms & Email).

---

## ✨ Key Features

### 1. Resource Booking Engine
* **Real-time Availability:** Check room/unit status instantly via a calendar view.
* **Booking Lifecycle (Audit-friendly):** `PENDING → APPROVED/REJECTED → CANCELLED` (plus `BLOCKED` for maintenance).
* **Self-Service Cancellation:** Users can cancel their own `PENDING/APPROVED` bookings with a required reason.
* **Admin Controls:** Admin can reject `PENDING` requests and cancel `APPROVED` meetings with required reasons.
* **Conflict Detection:** Prevents double-booking automatically.

### 2. In-App Ticketing & Support System 🎫
* **Forum-Style Threads:** Users can submit Enquiries, Bugs, or Feedback.
* **Super Admin Inbox:** A centralized inbox for the Developer/Super Admin to manage and reply to tickets.
* **Status Tracking:** Track tickets from `Pending` -> `Replied` -> `Resolved` -> `Closed`.
* **Notifications:** Visual badges (Red Dot) for unread replies.

### 3. User & Admin Dashboards
* **Role-Based Access Control (RBAC):** Distinct views for Normal Users, Admins, and Super Admins.
* **Admin Console Pending Badge:** Sidebar badge shows the number of `PENDING` meeting requests awaiting action.
* **Clear Status Visibility:** Rejected/Cancelled entries are visually de-emphasized (e.g., strike-through/opacity) in admin views.
* **Analytics:** Visual charts for booking trends (hidden by default for performance).
* **Mobile Responsive:** Optimized Sidebar and navigation for mobile devices.

### 4. System Intelligence
* **Version History:** Built-in changelog viewer to track system updates.
* **Workflow Automation (n8n):** Optional webhook integration for booking creation + status updates (e.g., email notifications).
* **Hardened Security:** Firestore Security Rules ensuring strict data privacy (Users see only their own data).

---

## 🛠️ Tech Stack

* **Frontend:** React (Vite), TypeScript
* **Styling:** Tailwind CSS, Lucide React (Icons)
* **Backend / Database:** Firebase Firestore (NoSQL)
* **Authentication:** Firebase Auth
* **Deployment:** Vercel

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18 or higher)
* npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/e-ruai.git](https://github.com/your-username/e-ruai.git)
    cd e-ruai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory and add your Firebase credentials:
    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

---

## 🔐 Security & Roles

* **Super Admin:** Full access to all modules, system config, and the Support Inbox.
* **Admin:** Can manage bookings (Rooms/Units) and view analytics.
* **User:** Can make bookings and submit support tickets.

*Security Rules are enforced at the Firestore level to prevent unauthorized data access.*

---

## 👤 Ownership / Author

Created and maintained by **[Mohd Hisyamudin](https://mohdhisyamudin.com)**.

> Note: Parts of this project were developed with AI-assisted tooling; all final design and implementation decisions, review, and integration are owned by the author.

## 📜 License

This project is licensed under the **MIT License** — see [`LICENSE`](./LICENSE).