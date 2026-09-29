# 🏛️ Enterprise Software Architecture Blueprint & Developer Standards

> **Project Target:** Long-term, scalable, developer-friendly B2B Monorepo  
> **Architecture Pattern:** Modular Monolith First  
> **Core Stack:** Next.js (Frontend), Express & Node.js (Backend API), Redux Toolkit + RTK Query (State/Data Fetching), PostgreSQL + Prisma (Database), Turborepo (Monorepo Manager).

---

## 1. Modular Monolith & Layer Architecture

The repository is structured as a **Modular Monolith inside a Turborepo Monorepo** to enforce strict separation of concerns, maximize code reuse, and eliminate premature microservice complexity.

```
e:\1st\
├── apps/
│   ├── web/                     # Next.js Frontend Application
│   └── api/                     # Node.js / Express Backend REST API
├── packages/
│   ├── shared-types/            # Shared DTOs, Enums & Zod Schemas (NO business logic)
│   ├── ui/                      # Shared Core UI Design System Components
│   ├── config-eslint/           # Shared ESLint Configuration
│   └── config-typescript/       # Shared TSConfig Definitions
├── ARCHITECTURE_BLUEPRINT.md    # Architecture & Onboarding Guidelines
└── turbo.json                   # Monorepo Build Pipeline Config
```

### 🔑 Monorepo Dependency Rules:
1. `apps/web` **may import from** `packages/shared-types` and `packages/ui`.
2. `apps/api` **may import from** `packages/shared-types`.
3. `packages/shared-types` **MUST NEVER import from** `apps/web` or `apps/api` and MUST contain zero business logic.
4. `apps/web` and `apps/api` **MUST NEVER import directly from each other**.

---

## 2. Frontend Architecture (Feature-Sliced Design)

To keep code maintainable as the project grows, UI components and state logic are grouped into **Feature Modules**.

```
apps/web/
├── app/                         # Next.js App Router Pages (Thin Routing Layer ONLY < 20 lines)
│   ├── admin/page.tsx           # Renders <AdminDashboard />
│   ├── login/page.tsx           # Renders <LoginForm />
│   ├── register/page.tsx        # Renders <RegisterForm />
│   ├── product/[id]/page.tsx    # Renders <ProductDetail id={id} />
│   └── profile/[id]/page.tsx    # Renders <BusinessProfile id={id} />
├── features/                    # Modular Business Features
│   ├── admin/                   # Admin Feature (AdminDashboard.tsx, adminApi.ts)
│   ├── auth/                    # Auth Feature (LoginForm.tsx, RegisterForm.tsx, authApi.ts)
│   ├── products/                # Product Feature (ProductDetail.tsx, productApi.ts)
│   └── leads/                   # Lead Capture Feature (LeadModal.tsx, leadsApi.ts)
├── lib/
│   ├── api/
│   │   └── config.ts            # Global Base URL & Environment Config ONLY
│   └── redux/
│       ├── store.ts             # Global Redux Store Configuration
│       └── api/
│           ├── baseApi.ts       # Base RTK Query with Auth Header Injection
│           ├── adminApi.ts      # Admin RTK Query endpoints
│           ├── authApi.ts       # Auth RTK Query endpoints
│           └── leadsApi.ts      # Leads RTK Query endpoints
└── components/
    └── ui/                      # Generic Shared UI Controls (Button, Modal, Card, Input)
```

### 📋 Feature & Endpoint Decoupling:
- **Decentralized Endpoints:** Avoid putting all endpoints into one giant `config.ts`. Each RTK Query feature slice (`authApi.ts`, `adminApi.ts`) defines its own endpoint paths locally.
- **Responsibility Over Line Count:** The 300-line target is a helpful guideline for single responsibility, not a rigid dogma. Focus on cohesive single responsibility.

---

## 3. Backend Architecture (Controller - Service - Repository)

The backend follows the **Controller → Service → Repository (CSR)** pattern within domain modules (`apps/api/src/modules/`).

```
apps/api/src/modules/
├── admin/                       # Admin Domain Module
│   ├── admin.controller.ts      # HTTP layer (params, status code, response payload)
│   ├── admin.service.ts         # Business logic & validation rules
│   ├── admin.repository.ts      # Prisma ORM & Database queries
│   └── admin.routes.ts          # Express Router definition
├── auth/                        # Auth Domain Module
├── product/                     # Product Domain Module
└── lead/                        # Lead Domain Module
```

### 🔄 Data Flow Pipeline:
`Client Request` ➔ `Route` ➔ `Middleware (Auth/Validate)` ➔ `Controller` ➔ `Service` ➔ `Repository/DB` ➔ `Response`

---

## 4. Production Readiness & DevOps Checklist

### 1. Database Migrations & Backups
- **Dev Workflow:** Use `npx prisma migrate dev` during local schema updates.
- **Prod Workflow:** Execute `npx prisma migrate deploy` in CI/CD release pipelines.
- **Backups:** Automated daily PostgreSQL dump scripts (`pg_dump`) with offsite encrypted S3 storage.

### 2. Centralized Structured Logging & Observability
- Backend uses `pino` or `winston` for JSON structured logging with request trace IDs.
- HTTP traffic logged with response time metrics (`morgan` / custom middleware).

### 3. Automated Testing Standard
- **Unit Tests:** `vitest` for pure service logic, utility helpers, and Zod validators.
- **Integration Tests:** API endpoint integration tests using `supertest` against a test PostgreSQL instance.

### 4. Security Hardening
- **Helmet**: Secures HTTP headers.
- **CORS**: Strict domain whitelist checking.
- **Rate Limiting**: `express-rate-limit` on login and public lead endpoints.
- **Auth Security**: Short-lived JWT access tokens + HTTP-only secure refresh tokens.

### 5. Continuous Integration / Continuous Deployment (CI/CD)
- **GitHub Actions Pipeline**:
  1. TypeScript type check (`npx tsc --noEmit`)
  2. Linting check (`npm run lint`)
  3. Automated unit & integration tests (`npm run test`)
  4. Build & Containerize Docker images

---

## 5. Technology Stack & Low-Cost Infrastructure

To avoid vendor lock-in and high monthly cloud costs, the project uses open-source, portable, and standard technologies:

| Layer | Selected Tech | Why Chosen (Benefits) | Vendor Lock-in |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js 14 + React | Standard SSR/SPA framework, highly optimized | ❌ None (Runs on any Node server or Docker) |
| **State / Fetching**| Redux Toolkit + RTK Query | Single store, built-in caching, zero boilerplate | ❌ None (Open Source) |
| **Backend API** | Express + TypeScript | Fast, stable, lightweight REST server | ❌ None (Standard Node.js) |
| **Database** | PostgreSQL + Prisma ORM | ACID compliant, relational, type-safe queries | ❌ None (Standard SQL) |
| **Media Storage** | Cloudflare R2 | S3-compatible, **$0 egress bandwidth cost**, zero infra management | ❌ None (Standard S3 API) |
| **Hosting** | Docker Containers (Hetzner / Render / Railway) | Standard Docker containerization | ❌ None (Can move anywhere in 5 mins) |

---

## 6. Developer Onboarding Quickstart

To set up and run the entire monorepo locally:

```bash
# 1. Install all dependencies across workspace
npm install

# 2. Start PostgreSQL & Prisma Studio
npm run db:studio

# 3. Start API & Frontend in parallel (Turborepo)
npm run dev
```

- **Frontend App:** http://localhost:3000 (or 3001)
- **Backend API:** http://localhost:5000/api/v1
