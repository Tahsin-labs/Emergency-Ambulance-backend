# Assignment B7A7 Submission — Emergency Ambulance Dispatch

- **Student ID Last Digit**: 5
- **Assigned Domain**: Emergency Ambulance Dispatch
- **Backend Repository**: https://github.com/Tahsin-labs/Emergency-Ambulance-backend
- **Backend Live Base URL**: https://emergency-ambulance-backend-sovv.onrender.com/api/v1
- **Frontend Stack**: Next.js 15 (App Router), TypeScript, Tailwind CSS, TanStack Query v5, Zustand, React Hook Form, Zod, Sonner, Recharts, Lucide React.

---

## 1. Credentials Sheet (1-Click Demo Logins)

The login page (`/login`) includes 1-click login cards for all three roles:

| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@ambulance.com` | `Admin123!` | Dashboard analytics, fleet management, user governance, audit trail |
| **DRIVER** | `driver3@ambulance.com` | `Driver123!` | Duty toggle, ICU ambulance assignment, trip state machine controls |
| **PATIENT** | `patient1@example.com` | `Patient123!` | Request triage form, live trip tracking, SSLCommerz sandbox payments |

---

## 2. Key Architecture & Features

1. **BFF Pattern & Token Rotation**:
   - Access & refresh JWTs stored in `httpOnly` SameSite=Lax cookies via `/api/auth/*`.
   - Proxy handler (`/api/proxy/[...path]`) transparently attaches cookies and handles mutex silent refresh when receiving 401.
2. **Edge Route Protection**:
   - Next.js `middleware.ts` guards `/admin/*`, `/driver/*`, `/patient/*` with role verification and redirects unauthorized attempts.
3. **Emergency Priority Engine**:
   - Auto-allocates Basic, ALS, or ICU ambulances with appropriate life support equipment.
4. **Trip State Machine**:
   - Driver executes sequential actions from departure to pickup and hospital handoff.
5. **SSLCommerz Sandbox Payment**:
   - Digital fare calculation and payment gateway redirects.
