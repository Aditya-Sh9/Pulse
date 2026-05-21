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

---

## 🐳 Docker Setup

You can run the entire application stack using Docker Compose.

1. Ensure Docker and Docker Compose are installed on your machine.
2. At the root of the project, create `.env` files for both frontend and backend as described in the setup steps.
3. Run the following command:
   ```bash
   docker-compose up --build
   ```
4. Access the application:
   * Frontend: `http://localhost:8080`
   * Backend: `http://localhost:5000`

---

## ☁️ Deployment Guide

### Deployment Architecture
- **Frontend (Vercel):** The React application is built via Vite. Vercel acts as a CDN and serves the static files. It communicates with the backend via REST and Socket.io.
- **Backend (Render):** The Node.js/Express backend runs as a Web Service on Render, handling API requests, Socket.io real-time connections, and interacting with MongoDB.
- **Database:** MongoDB Atlas (Cloud).

### 1. Deploying Backend to Render
1. Create an account on [Render](https://render.com/).
2. Click "New" -> "Web Service".
3. Connect your GitHub repository and select the `Pulse` repository.
4. **Configuration:**
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Environment Variables:**
   Add all variables from your backend `.env` file (`MONGO_URI`, `EMAIL_USER`, etc.). 
   *Also add:* `FRONTEND_URL` (set this to your Vercel frontend URL once deployed, to allow CORS).
6. Click **Create Web Service**. Wait for the deployment to finish and copy the Render URL (e.g., `https://pulse-backend-xyz.onrender.com`).

*(Note regarding `serviceAccountKey.json`: For Render deployment, you cannot upload files directly. You should ideally convert the JSON to a base64 string in an environment variable `FIREBASE_SERVICE_ACCOUNT` and parse it in `firebase-config.js`. Alternatively, securely commit it to a private repo.)*

### 2. Deploying Frontend to Vercel
1. Create an account on [Vercel](https://vercel.com/).
2. Click "Add New..." -> "Project".
3. Import your `Pulse` GitHub repository.
4. **Configuration:**
   - **Framework Preset:** Vite
   - **Root Directory:** `client/frontend`
5. **Environment Variables:**
   Add all your `VITE_FIREBASE_*` variables.
   *Crucially add:* `VITE_API_URL` and set it to your Render backend URL (e.g., `https://pulse-backend-xyz.onrender.com`).
6. Click **Deploy**. Vercel will build and serve your frontend.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📜 License

This project is licensed under the ISC License.
