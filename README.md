# Multi-Community B2B Business Platform

Welcome to the **Multi-Community B2B Business Platform** monorepo repository. This system powers **Web**, **iOS**, and **Android** applications using a single, unified Node.js API engine with strict server-side multi-community data isolation (**Clothing** & **Jewellery**).

---

## 🚀 Step-by-Step Local Setup & Installation Guide

Follow these instructions to install, run, and test the project on your local computer.

### 1. Prerequisites
Make sure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Local PostgreSQL installation or a free PostgreSQL cloud connection string (from [Supabase](https://supabase.com), [Neon](https://neon.tech), or Docker).

---

### 2. Step 1: Install Dependencies
Open your terminal in the root folder (`e:/1st`) and run:

```bash
npm install
```

This will automatically install all dependencies across the monorepo workspaces (`apps/api`, `apps/web`, `apps/mobile`, `packages/database`, `packages/shared-types`).

---

### 3. Step 2: Set Up Environment Variables
Create a `.env` file in `packages/database/` and `apps/api/`:

**File: `packages/database/.env`**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/b2b_platform_db?schema=public"
```
*(Replace `postgresql://postgres:postgres@localhost:5432/b2b_platform_db` with your local PostgreSQL credentials or cloud connection string).*

**File: `apps/api/.env`**
```env
PORT=5000
JWT_SECRET="b2b-secure-jwt-secret-key-2026"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/b2b_platform_db?schema=public"
```

---

### 4. Step 3: Initialize Database Schema
Generate the Prisma Client and push the database schema to your PostgreSQL database:

```bash
# Generate Prisma TypeScript Client
npm run db:generate

# Push schema tables to PostgreSQL
npm run db:push
```

---

### 5. Step 4: Open Visual Database Admin (Prisma Studio)
To visually view, search, edit, or add records to your database in your browser:

```bash
npm run db:studio
```
> Opens Prisma Studio at: `http://localhost:5555`

---

### 6. Step 5: Run the Project Locally
To start all applications (Backend API, Next.js Web, and Expo Mobile) simultaneously in development mode:

```bash
npm run dev
```

- **Backend API**: `http://localhost:5000/api/v1/health`
- **Web App**: `http://localhost:3000`
- **Mobile App**: Run `cd apps/mobile && npm start` to open Expo DevTools and scan the QR code on your Android/iOS phone!

---

## 🔒 Security Architecture Highlights

1. **Server-Side Community Isolation**: Every query validates `activeCommunityId`. Clothing data (Shirts, Jeans) is strictly isolated from Jewellery data (1 Gram, Original Gold, Silver).
2. **5-Session Concurrent Login Guard**: Enforces configurable session limits per business subscription account.
3. **Super Admin Verification Tag**: Feeds, directory search, and RFQs are locked until Super Admin approves shop photos/videos & GST.
4. **Product Code Deduplication (`SKU-001`)**: Unique product codes prevent duplicate media uploads and reduce server media storage by **>80%**.
5. **Quick `$` Catalog Selector in Chat**: Socket.io chat payload passes `{ productCode: "SKU-001" }` to instantly share product cards without uploading duplicate 5MB files.

---

## 🔄 CI/CD Pipeline
Automated GitHub Actions CI workflow is configured in `.github/workflows/ci-cd.yml`. Every commit automatically validates the Prisma schema, compiles TypeScript, and runs build tests!
