# Emergency Ambulance Dispatch & Life Support Network

A mission-critical emergency ambulance dispatch and hospital bed coordination system built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Express + Prisma + Neon PostgreSQL**.

---

## 🌟 Key Features

1. **Intelligent Triage Priority Engine**:
   - Classifies medical urgency (CRITICAL, HIGH, MEDIUM, LOW) based on emergency type and symptom keywords.
   - Automatically allocates appropriate life-support units (Basic, ALS, or ICU).

2. **Sequential Trip State Machine**:
   - `ACCEPTED` $\rightarrow$ `EN_ROUTE` $\rightarrow$ `ARRIVED_AT_PICKUP` $\rightarrow$ `PICKED_UP` $\rightarrow$ `EN_ROUTE_TO_HOSPITAL` $\rightarrow$ `ARRIVED_AT_HOSPITAL` $\rightarrow$ `COMPLETED`.
   - Real-time polling tracking with cancellation guard before patient boarding.

3. **Secure BFF Authentication & Edge Middleware**:
   - `httpOnly` SameSite=Lax JWT cookies (15-min access token, 7-day refresh token).
   - Mutex-locked silent token refresh on 401 prevents parallel refresh token rotation race conditions.
   - Edge Route Middleware protects role-specific portals (`/admin/*`, `/driver/*`, `/patient/*`).

4. **1-Click Demo Login**:
   - Single-click authentication for **Patient**, **Driver**, and **Admin** test roles directly from `/login`.

5. **SSLCommerz Payment Integration**:
   - Distance and tier-based digital fare calculation with instant sandbox payment initiation and verified callbacks.

6. **Hospital & ICU Bed Coordination**:
   - Real-time directory displaying partner hospitals with live ICU and general bed availability counters.

---

## 🚀 Live Links & Portals

- **Frontend Live App**: [Deployed on Vercel]
- **Backend API (Render)**: [https://emergency-ambulance-backend-sovv.onrender.com/api/v1](https://emergency-ambulance-backend-sovv.onrender.com/api/v1)
- **API Documentation**: [`docs/ROUTES.md`](docs/ROUTES.md)
- **Postman Collection**: [`docs/postman/Emergency-Ambulance-Dispatch.postman_collection.json`](docs/postman/Emergency-Ambulance-Dispatch.postman_collection.json)

---

## 🔑 Demo Credentials

| Role | Email | Password | Assigned Equipment |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@ambulance.com` | `Admin123!` | Full Governance & Analytics |
| **Driver (ICU)** | `driver3@ambulance.com` | `Driver123!` | ICU Unit (`DHAKA-METRO-CH-11-1003`) |
| **Patient** | `patient1@example.com` | `Patient123!` | Emergency Booking & Tracking |

---

## 🛠️ Local Development Setup

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Backend
```bash
cd backend
npm install
npm run dev
```
Runs at [http://localhost:5000](http://localhost:5000).
