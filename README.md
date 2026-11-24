# Emergency Ambulance Dispatch System — Backend

A modern REST API backend for an Emergency Ambulance Dispatch platform connecting patients, drivers, dispatchers, and hospitals in real-time.

## Tech Stack
- **Runtime & Language**: Node.js, TypeScript (Strict Mode)
- **Framework**: Express.js
- **Database & ORM**: PostgreSQL (Neon Serverless), Prisma ORM
- **Authentication & Security**: JWT, bcrypt, Helmet, CORS, Express Rate Limit
- **Validation**: Zod
- **Media Upload**: Multer, Cloudinary
- **Code Quality**: ESLint, Prettier

---

## Getting Started

### Prerequisites
- Node.js (>= 18.x recommended)
- PostgreSQL / Neon database connection strings

### Setup Instructions

1. **Clone the repository** (if not already cloned):
   ```bash
   git clone https://github.com/Tahsin-labs/Emergency-Ambulance-backend.git
   cd Emergency-Ambulance-backend
   ```

2. **Navigate to the backend directory and install dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` inside `backend/` and fill in your values:
   ```bash
   cp .env.example .env
   ```

4. **Run Database Migrations & Generate Prisma Client**:
   ```bash
   npm run prisma:migrate
   # or
   npx prisma migrate deploy
   npx prisma generate
   ```

5. **Seed the Database with Initial Data**:
   Populates 1 admin, 3 drivers with ambulances (Dhaka coordinates), 5 hospitals (Dhaka and Chattogram), and 2 demo patients:
   ```bash
   npm run prisma:seed
   ```

6. **Start the Development Server**:
   ```bash
   npm run dev
   ```

7. **Verify API Health**:
   Send a GET request to:
   ```bash
   curl http://localhost:5000/api/v1/health
   ```

---

## Available Scripts

Inside `backend/`:
- `npm run dev`: Start dev server with hot reload (`ts-node-dev`)
- `npm run build`: Compile TypeScript to `dist/`
- `npm run start`: Run compiled JavaScript in production
- `npm run lint`: Run ESLint checks
- `npm run format`: Format code using Prettier
- `npm run prisma:generate`: Generate Prisma Client
- `npm run prisma:migrate`: Apply database migrations
- `npm run prisma:seed`: Execute database seed script
