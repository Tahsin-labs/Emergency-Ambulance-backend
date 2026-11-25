# Emergency Ambulance Dispatch System — Backend REST API

A high-performance, resilient, production-ready backend REST API for emergency ambulance dispatch, priority triage, automated fleet matching, incident tracking, real-time trip lifecycle management, and SSLCommerz payment integration.

---

## 📌 Project Overview
The **Emergency Ambulance Dispatch System** provides an end-to-end mission-critical backend service. When patients request emergency medical transportation, the priority engine instantly triages the request (CRITICAL, HIGH, MEDIUM, LOW) and automatically dispatches the nearest suitable ambulance (BASIC, ADVANCED, ICU, NEONATAL) using transactional `FOR UPDATE SKIP LOCKED` database locking. If all units are occupied, requests queue by priority rank and are immediately dispatched the moment an ambulance or driver becomes available.

### Live Deployment & Demo Links
- **Live Production API Base URL**: `https://emergency-ambulance-backend-sovv.onrender.com`
- **Postman Published Documentation**: `https://documenter.getpostman.com/view/placeholder` *(Import collection from `docs/postman/`)*
- **Demo Video Walkthrough**: `https://youtu.be/placeholder` *(Placeholder)*
- **Demo Admin Credentials**:
  - Email: `admin@ambulance.com` *(Configurable via env)*
  - Password: `[CONFIGURED_IN_ENV]` *(Set via ADMIN_PASSWORD)*
- **Demo Patient Credentials**:
  - Email: `patient1@example.com`
  - Password: `Patient@123456`
- **Demo Driver Credentials**:
  - Email: `driver3@ambulance.com`
  - Password: `Driver@123456`

---

## 🛠️ Tech Stack
- **Runtime & Language**: Node.js (v20+), TypeScript (strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon Serverless Postgres with pooling & direct connection)
- **ORM**: Prisma ORM with automated migrations & connection pooling
- **Validation**: Zod schema validation on body, query, and path params
- **Authentication & Security**: JWT (Access Token 15m, Refresh Token 7d with SHA-256 rotation), bcrypt (12 salt rounds), Helmet, CORS, Express-Rate-Limit (strict windowing on auth & payments)
- **File Uploads**: Multer + Cloudinary streaming buffer uploads
- **Payment Gateway**: SSLCommerz Sandbox API integration (initiate, validation, IPN, auto settlement)

---


---

## 🗄️ Database Architecture & Entity Relations

```
[ User ] 1 ──── 0..1 [ Driver ] 1 ──── 0..1 [ Ambulance ]
   │                     │                       │
   │ 1                   │ 0..1                  │ 1
   ▼                     ▼                       ▼
[ EmergencyRequest ] 1 ──────────────────────── 0..1 [ Trip ] 1 ──── 0..1 [ Payment ]
   │                                                     │
   │ 1..*                                                │ 1..*
   ▼                                                     ▼
[ Notification ]                                [ TripStatusEvent ]
```

### Models:
1. **User**: System identities (PATIENT, DRIVER, ADMIN). Stores hashed credentials, OAuth Google ID, status (ACTIVE, SUSPENDED), avatar, and hashed refresh tokens.
2. **Driver**: 1-to-1 profile linked to DRIVER user. Stores license number, image URL, and on-duty availability flag (`isOnDuty`).
3. **Ambulance**: Fleet vehicles. Stores plate number, type (`BASIC`, `ADVANCED`, `ICU`, `NEONATAL`), status (`AVAILABLE`, `ON_TRIP`, `OFFLINE`, `MAINTENANCE`), base fare, per-km rate, and real-time GPS coordinates (`lat`, `lng`).
4. **Hospital**: Receiving hospitals. Stores name, address, coordinates, emergency capabilities, total beds, and live available bed counts.
5. **EmergencyRequest**: Incident requests. Stores patient details, condition image, evaluated `priority` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), `requiredType`, coordinates, address, status, and cancel reason.
6. **Trip**: Active transit state machine. Links an EmergencyRequest to an Ambulance and Hospital. Tracks live status, computed distance, total fare, timestamps.
7. **TripStatusEvent**: Immutable append-only audit trail for every status transition.
8. **Payment**: Financial transactions. Tracks `tranId`, `valId`, amount, currency, status (`PENDING`, `PAID`, `FAILED`, `CANCELLED`), sanitized SSLCommerz gateway response.
9. **Notification**: In-app notifications per user with `unreadCount` tracking.
10. **AuditLog**: Regulatory audit trail capturing actor, entity, action, IP, and changes.

---

## 🧠 Priority Triage & Automated Dispatch Algorithm

### 1. Priority Evaluation Engine
The system uses automated keyword and medical category mapping:
- **CRITICAL** (Requires **ICU** Ambulance): Cardiac arrest, heart attack, unconsciousness, severe bleeding, breathing failure, stroke, choking.
- **HIGH** (Requires **ADVANCED** Ambulance): Major accidents, labor/pregnancy complications, severe burns, active seizures.
- **MEDIUM** (Requires **BASIC** Ambulance): Fractures, high fever, moderate lacerations.
- **LOW** (Requires **BASIC** Ambulance): Non-urgent medical transport.

### 2. Transactional Fleet Selection (`FOR UPDATE SKIP LOCKED`)
Dispatch runs inside an isolated database transaction:
1. Lock the pending emergency request (`FOR UPDATE`).
2. Query candidate ambulances where `status = 'AVAILABLE'`, driver is active and on-duty (`isOnDuty = true`), and ambulance is not deleted.
3. Order matching:
   - **Type Compatibility**: Exact required type first, then higher tiers (`ICU` > `ADVANCED` > `BASIC`). `NEONATAL` is only dispatched when specifically requested.
   - **Haversine Proximity**: Shortest geographical distance from pickup coordinates.
4. Lock the chosen vehicle using `FOR UPDATE SKIP LOCKED`.
5. Simultaneously transition ambulance to `ON_TRIP`, create the `Trip` record, link nearest emergency-capable hospital, and generate notifications.

### 3. Priority Queue & Event Hooks
If no compatible ambulance is available, requests remain in `PENDING` status. The queue engine automatically triggers `dispatchNextPending()` whenever:
- A driver toggles duty status to ON (`PATCH /drivers/me/availability`)
- A completed trip frees an ambulance (`COMPLETED`)
- An admin switches ambulance status to `AVAILABLE` or assigns a new driver.

---

## 🔄 Trip State Machine Lifecycle

```
[ REQUEST CREATED ]
        │
        ▼ (Auto-Dispatch / Admin Dispatch)
  [ DISPATCHED ] ── (Cancelled by Patient/Admin) ──► [ CANCELLED ]
        │
        ▼
   [ EN_ROUTE ] ── (Cancelled by Patient/Admin) ──► [ CANCELLED ]
        │
        ▼
[ ARRIVED_AT_PICKUP ] ── (Cancelled by Patient/Admin) ──► [ CANCELLED ]
        │
        ▼
  [ PICKED_UP ] ── (Cancellation strictly forbidden after pickup)
        │
        ▼
[ EN_ROUTE_TO_HOSPITAL ]
        │
        ▼
[ ARRIVED_AT_HOSPITAL ]
        │
        ▼
  [ COMPLETED ] ──► (Automated Fare Calculation + Payment Row Generated)
        │
        ▼
[ PAYMENT INITIATED ] ──► [ PAID ]
```

---

## 💳 Payment Gateway Workflow (SSLCommerz)

1. **Initiation (`POST /api/v1/payments/initiate`)**:
   - Only patient who created the completed trip can initiate payment.
   - Exact amount is derived from the database (`Trip.fare`); client-submitted amounts are rejected.
   - Generates a unique `tranId` and calls SSLCommerz `gwprocess/v4/api.php`.
   - Returns a secured `GatewayPageURL`.
2. **Success Callback (`POST /api/v1/payments/success`)**:
   - SSLCommerz redirects browser back with `tran_id` and `val_id`.
   - Backend calls SSLCommerz `validationserverAPI.php` to verify:
     - Gateway status is `VALID` or `VALIDATED`.
     - Transaction ID matches.
     - Currency and exact amount match.
   - Payment is set to `PAID`, patient receives notification, and audit log is recorded.
3. **Idempotence & Safety**:
   - Already `PAID` transactions can never be downgraded by subsequent duplicate webhooks or fail callbacks.
   - Secret credentials (`SSL_STORE_PASSWORD`) are never logged or stored in `gatewayResponse`.

---

## 🚀 Local Setup & Installation

### 1. Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL database instance (Neon or local Postgres)
- Git

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/Tahsin-labs/Emergency-Ambulance-backend.git
cd Emergency-Ambulance-backend/backend
npm install
```

### 3. Configure Environment Variables
Create `.env` inside `backend/`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://user:pass@ep-host-pooler.neon.tech/neondb?sslmode=require&schema=ambulance"
DIRECT_URL="postgresql://user:pass@ep-host.neon.tech/neondb?sslmode=require&schema=ambulance"

JWT_ACCESS_SECRET="your-access-secret"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES="7d"

GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-cloudinary-key"
CLOUDINARY_API_SECRET="your-cloudinary-secret"

SSL_STORE_ID="your-store-id"
SSL_STORE_PASSWORD="your-store-password"
SSL_IS_LIVE=false
BACKEND_URL="http://localhost:5000"

ADMIN_EMAIL="admin@ambulance.com"
ADMIN_PASSWORD="Admin@123456"
CORS_ORIGIN="*"
```

### 4. Database Migrations & Seeding
```bash
# Generate Prisma Client
npm run prisma:generate

# Run DB Migrations
npm run prisma:migrate

# Seed Demo Data (Admin, Drivers, Patients, Ambulances, Hospitals)
npm run prisma:seed
```

### 5. Run the Server
```bash
# Development (with live-reload)
npm run dev

# Production Build & Start
npm run build
npm start
```

---

## 🧪 Automated Test Suites & Verification

### Running Test Suites
```bash
# Phase 4 (Triage, Concurrency, Dispatch, Trip State Machine)
npx ts-node scripts/testPhase4.ts

# Phase 5 (Notifications, Admin User Roles, Dashboard Analytics, Audit Logs)
npx ts-node scripts/testPhase5.ts

# Phase 6 (SSLCommerz Payment Gateway, Validation, Idempotence)
npx ts-node scripts/testPhase6.ts

# Production Smoke Verification (Can be targeted at local or live Render deployment)
npx ts-node scripts/smokeProd.ts http://localhost:5000
```

### Deployment Verification
Run the smoke test suite against your deployed instance:
```bash
npx ts-node backend/scripts/smokeProd.ts https://emergency-ambulance-backend-sovv.onrender.com
```

---

## 📮 Postman Collection & API Documentation

A complete, production-grade Postman collection and environment definitions are provided under [`docs/postman/`](file:///c:/Backend-ts/Emergency%20Ambulance/docs/postman/):

### 1. Files Included
- **Collection**: `docs/postman/Emergency-Ambulance-Dispatch.postman_collection.json` (Postman Collection v2.1)
- **Local Environment**: `docs/postman/Local.postman_environment.json` (`baseUrl: http://localhost:5000`)
- **Production Environment**: `docs/postman/Production.postman_environment.json` (`baseUrl: https://emergency-ambulance-backend-sovv.onrender.com`)

### 2. How to Import and Execute
1. Open **Postman** $\rightarrow$ Click **Import** $\rightarrow$ Drag & drop the three JSON files from `docs/postman/`.
2. In the top-right environment selector, choose either:
   - **Emergency Ambulance Dispatch - Local** (for local development)
   - **Emergency Ambulance Dispatch - Production** (for the live Render deployment)
3. To run the automated end-to-end user story, open folder **`11 FULL DEMO FLOW`** and click **Run folder**:
   - Executes 16 chained requests with automatic token passing and dynamic variable storage.
   - Transitions an emergency request from initial dispatch through hospital routing, trip completion, fare computation, and payment URL generation.
4. All 60 REST endpoints are cataloged with methods and descriptions in [docs/ROUTES.md](file:///c:/Backend-ts/Emergency%20Ambulance/docs/ROUTES.md).
