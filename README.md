# Pulse - Modern Task Management Application

Pulse is a full-stack, real-time task workspace for small teams. It combines project boards, direct messaging, notifications and a gamified leaderboard, with role-based access enforced on the server and in Firestore security rules.

## 🚀 Features

**Work management**
*   **Four project views:** List, Board (Kanban), Calendar and Table, all live-updating.
*   **Board drag & drop:** Move cards between columns *and* reorder within a column; a status menu on every card offers a keyboard/touch alternative.
*   **Rich tasks:** Subtasks with progress, labels, due dates, priorities, file attachments (up to 10 MB, image previews), comments with @mentions and attachments, and a per-task activity history.
*   **Recurring tasks:** Daily, weekly or monthly; completing one schedules the next occurrence automatically.
*   **Dependencies:** "Blocked by" links stop a task from being completed until its prerequisites are done.
*   **Filters & saved views:** Filter by status, priority, assignee and label, and save combinations as personal views.
*   **Undo:** Deleting or archiving a task shows an Undo toast.
*   **Command palette:** `Ctrl+K` / `/` searches tasks, projects, spaces and people, with arrow-key navigation and recent searches.

**Collaboration**
*   **Direct messages** over Socket.io with unread counts, read receipts ("Seen"), typing indicators and paginated history.
*   **Notifications:** Inbox for assignments, mentions and due-date reminders; optional desktop notifications and a daily email digest.
*   **Team directory, invitations** (admin-only, via email) and **Contact Admin** requests.

**Gamification**
*   **XP & leaderboard:** 10 XP per completed task (awarded server-side to the assignee), a daily XP cap to prevent farming, admin XP adjustments, and archived **seasons** with past standings.

**Security & roles**
*   Firebase Authentication; every API route and socket connection verifies the Firebase ID token (revoked tokens are rejected).
*   Admin/employee roles enforced by Firestore rules: users can't promote themselves, edit their own XP, impersonate others or read other people's notifications.
*   Task status and XP are server-authoritative; Helmet security headers, strict CORS and rate limiting on the API.

**Experience**
*   Responsive from phone to desktop (off-canvas navigation, collapsible icon-rail sidebar), skeleton loading states, and GSAP motion that respects `prefers-reduced-motion`.
*   Accessibility: skip link, focus-trapped dialogs, keyboard shortcuts (`?` lists them), labelled controls and chart data tables. Key dashboard pages pass an automated WCAG 2.2 AA scan (axe-core) with no serious or critical issues.

## 🛠️ Technology Stack

**Frontend:** React 19, Vite, Tailwind CSS v4, GSAP (+ `@gsap/react`), Lenis (landing page scroll), Recharts, Lucide icons, Firebase JS SDK (Auth, Firestore, Storage), Socket.io client.

**Backend:** Node.js 22 & Express 5, Socket.io, Firebase Admin SDK (modular API), MongoDB (Mongoose) for messages and the activity log, Nodemailer, node-cron, Helmet, express-rate-limit.

**Data split:** Firestore holds users, spaces, projects, tasks, comments, notifications and seasons (real-time listeners); MongoDB holds chat messages and the audit log; Cloud Storage holds attachments.

---

## 💻 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) **v22 or newer** (required by `firebase-admin` 14)
*   [MongoDB](https://www.mongodb.com/) (local instance or MongoDB Atlas URL)
*   A [Firebase](https://firebase.google.com/) project with Authentication (Email/Password and Google), Firestore and, for attachments, Cloud Storage

### 1. Clone the repository

```bash
git clone https://github.com/Aditya-Sh9/Pulse.git
cd Pulse
```

### 2. Backend Setup

1.  Install dependencies:
    ```bash
    cd backend
    npm install
    ```
2.  Create `backend/.env` from `.env.example`:
    ```env
    PORT=5000
    FRONTEND_URL=http://localhost:5173   # allowed CORS/socket origin(s), comma-separated
    APP_TIMEZONE=Asia/Kolkata            # reminders, digests, XP-cap day boundary
    DAILY_TASK_XP_CAP=100                # max task XP per member per day
    EMAIL_USER=your_email@gmail.com      # invitations + daily digest (Gmail app password)
    EMAIL_PASS=your_app_password
    MONGO_URI=your_mongodb_connection_string
    ```
3.  Set up Firebase Admin: generate a private key in **Project Settings → Service Accounts** and save it as `backend/config/serviceAccountKey.json` (see `serviceAccountKey.example.json`). On hosts without files, put the JSON in the `FIREBASE_SERVICE_ACCOUNT` env var instead.
4.  Start the server:
    ```bash
    npm run dev
    ```

Scheduled jobs (in `APP_TIMEZONE`): 08:00 due-tomorrow reminders, 09:00 email digests (for users who opt in), 00:00 cleanup of read notifications older than 7 days.

### 3. Deploy the Firestore and Storage security rules

The rules in `firestore.rules` and `storage.rules` are the core of the permission model. They only take effect once deployed:

```bash
npx firebase-tools deploy --only firestore,storage --project <your-project-id>
```

This also creates the composite indexes in `firestore.indexes.json`.

> **Attachments need Cloud Storage.** Enable Storage in the Firebase console (new projects need the Blaze pay-as-you-go plan for a default bucket). Without it everything else works; uploads just show an error.

### 4. Password-reset emails

"Forgot password?" uses Firebase Auth's built-in reset email and returns people to `/login` afterwards. Add your frontend domain under **Authentication → Settings → Authorized domains**, and customise the sender name/template under **Authentication → Templates**.

### 5. Create the first admin

Every signup is an `employee`, and clients can't change roles. To bootstrap, open the Firebase console → Firestore → `users/<your-uid>` and set `role` to `admin`. From then on, admins can promote others from the **Team** page.

### 6. Frontend Setup

1.  Install dependencies:
    ```bash
    cd client/frontend
    npm install
    ```
2.  Create `client/frontend/.env` from `.env.example`:
    ```env
    VITE_API_URL=http://localhost:5000
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```
3.  Start the dev server:
    ```bash
    npm run dev
    ```

#### Developing against the Firebase Emulator Suite

Add these to `client/frontend/.env`:

```env
VITE_USE_EMULATORS=true
VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
VITE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

then run `npx firebase-tools emulators:start --only auth,firestore,storage` from the repo root. Point the backend at the same emulators with `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST`.

### 7. Usage

*   Frontend: `http://localhost:5173`
*   Backend API: `http://localhost:5000`

**Keyboard shortcuts:** `Ctrl+K` or `/` search · `C` new task (in a project view) · `Ctrl+Enter` submit the task form · `Esc` close dialogs · `?` show all shortcuts.

---

## 🐳 Docker Setup

1. Install Docker and Docker Compose.
2. Create `backend/.env` and `client/frontend/.env` as above, and place `serviceAccountKey.json` in `backend/config/` (mounted read-only into the container).
3. Run:
   ```bash
   docker-compose up --build
   ```
4. Open the frontend at `http://localhost:8080` (backend on `http://localhost:5000`).

The frontend is served by nginx with security headers and long-term caching for hashed assets; both containers run on Node 22 images and the backend runs as a non-root user.

---

## ☁️ Deployment Guide

### Deployment Architecture
- **Frontend (Vercel):** Static Vite build served from a CDN; talks to the backend over REST and Socket.io.
- **Backend (Render):** Express + Socket.io web service.
- **Data:** Firebase (Auth, Firestore, Storage) and MongoDB Atlas.

### 1. Deploying Backend to Render
1. **New → Web Service**, connect the repository.
2. **Root Directory:** `backend` · **Build Command:** `npm install` · **Start Command:** `npm start` · **Node version:** 22+.
3. **Environment Variables:** everything from `backend/.env`, plus:
   - `FRONTEND_URL` = your Vercel URL (comma-separate multiple origins, e.g. preview deploys).
   - `FIREBASE_SERVICE_ACCOUNT` = the service-account JSON as a single-line string.
4. Deploy and copy the service URL (e.g. `https://pulse-backend-xyz.onrender.com`).

### 2. Deploying Frontend to Vercel
1. **Add New → Project**, import the repository.
2. **Framework Preset:** Vite · **Root Directory:** `client/frontend`.
3. **Environment Variables:** all `VITE_FIREBASE_*` values, and `VITE_API_URL` = your Render URL.
4. Deploy, then add the Vercel domain to Firebase **Authorized domains**.

---

## 🔐 Security Overview

| Layer | Protection |
|---|---|
| API | Firebase ID token required on every route (with revocation check); admin routes re-check the role in Firestore; Helmet headers; CORS locked to `FRONTEND_URL`; global + invite-specific rate limits |
| Sockets | Token verified on connect; sender identity comes from the token; message length and rate limits |
| Firestore rules | No self-promotion or XP edits; task status/completion/XP fields writable only by the server; employees can only assign tasks to themselves; notifications readable and editable only by their recipient |
| Storage rules | Uploads only into your own folder, under 10 MB, no HTML/SVG/executables |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📜 License

This project is licensed under the ISC License.
