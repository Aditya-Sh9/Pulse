# Pulse - Modern Task Management Application

Pulse is a comprehensive, full-stack Task Management application built to help teams organize, track, and collaborate on projects efficiently. It features a modern, responsive UI with real-time updates and role-based access control.

## 🚀 Features

*   **Role-Based Access Control (RBAC):** Distinct roles (Admin, Member, etc.) with specific permissions to ensure data security and proper workflow management.
*   **Real-time Updates:** Powered by Socket.io, seeing changes happen instantly across all connected clients without refreshing.
*   **Interactive Task Board:** Kanban-styled drag-and-drop task management.
*   **Multiple Views:** Switch between Board, List, Table, and Calendar views to manage tasks however you prefer.
*   **Authentication:** Secure user authentication managed via Firebase.
*   **Email Notifications:** Automated email updates for important actions utilizing Nodemailer.
*   **Dynamic UI:** Built with React, Vite, and Tailwind CSS for a fast, responsive, and beautiful user experience.

## 🛠️ Technology Stack

**Frontend:**
*   React 19
*   Vite
*   Tailwind CSS v4
*   Framer Motion (Animations)
*   Firebase (Authentication)
*   Socket.io-client
*   Recharts (Data Visualization)
*   @hello-pangea/dnd (Drag and drop)

**Backend:**
*   Node.js & Express.js
*   MongoDB (Mongoose)
*   Socket.io (Real-time events)
*   Firebase Admin SDK
*   Nodemailer (Emails)
*   Node-cron (Scheduled tasks)

---

## 💻 Getting Started

Follow these instructions to set up the project locally on your machine for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v16 or higher recommended)
*   [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URL)
*   [Firebase Account](https://firebase.google.com/) for Authentication and Admin SDK

### 1. Clone the repository

```bash
git clone https://github.com/Aditya-Sh9/Pulse.git
cd Pulse
```

### 2. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    *   Create a `.env` file in the `backend` directory.
    *   Copy the structure from `.env.example`:
        ```env
        PORT=5000
        EMAIL_USER=your_email@gmail.com
        EMAIL_PASS=your_app_password
        MONGO_URI=your_mongodb_connection_string
        ```
4.  Set up Firebase Admin:
    *   Generate a new private key from your Firebase Project Settings -> Service Accounts.
    *   Save it as `serviceAccountKey.json` inside the `backend/config/` directory (Use `backend/config/serviceAccountKey.example.json` as a structural reference).
5.  Start the development server:
    ```bash
    npm run dev
    ```

### 3. Frontend Setup

1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd client/frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    *   Create a `.env` file in the `client/frontend` directory.
    *   Copy the structure from `.env.example` and fill in your Firebase project configuration:
        ```env
        VITE_FIREBASE_API_KEY=your_api_key
        VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
        VITE_FIREBASE_PROJECT_ID=your_project_id
        VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
        VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
        VITE_FIREBASE_APP_ID=your_app_id
        ```
4.  Start the frontend development server:
    ```bash
    npm run dev
    ```

### 4. Usage

Once both servers are running:
*   Frontend runs at `http://localhost:5173` (or whichever port Vite allocates).
*   Backend API runs at `http://localhost:5000`.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📜 License

This project is licensed under the ISC License.
