# B2B Platform Documentation & Complete API Reference
**Document Version:** 2.5.0  
**Date:** September 22, 2026  
**Architecture:** Multi-Community Monorepo (Node.js API, Next.js Web, React Native Mobile, PostgreSQL + Prisma)

---

## 1. Project Overview & Completed Tasks Summary

| Task Category | Status | Description |
| :--- | :--- | :--- |
| **Monorepo Setup** | ✅ Completed | Turborepo workspace setup (`apps/api`, `apps/web`, `apps/mobile`, `packages/database`, `packages/shared-types`). |
| **Database Schema** | ✅ Completed | PostgreSQL Prisma schema with Users, Businesses, VerificationMedia, Sessions, Communities, Products (`SKU-001`), Leads, Conversations. |
| **Feature Monorepo API** | ✅ Completed | Self-contained module folders (`user`, `business`, `product`, `lead`, `admin`, `group`) with routes, controllers, services, models, and validation. |
| **Super Admin Group Capacity Decision** | ✅ Completed | Super Admin decides and configures maximum group member limits (e.g. 40, 100). Super Admin can update capacity for any group anytime. |
| **Groups & Broadcast Channels** | ✅ Completed | Configurable capacity limits, unique member check, leave/re-add controls, `onlyAdminCanPost` rule, and member identity privacy masking. |
| **Multi-Community Isolation** | ✅ Completed | Default strict isolation per user/community. Super Admin multi-community permission grants (`Clothing` + `Electronics`). |
| **5-Session Limit Guard** | ✅ Completed | Enforces a maximum of 5 concurrent active logins per business account. |
| **Lead Capture ("Chat With Us")** | ✅ Completed | Public shared product link visitor lead capture (capturing Name & Mobile Number). |
| **Product Code Deduplication** | ✅ Completed | Unique Product Codes (`SKU-001`) to eliminate duplicate image/video uploads. |
| **4-Section Profile Layout** | ✅ Completed | Verified business profile displaying Hot Selling Items, Catalogs by Product Code, 5 Shop Photos/Videos, and Credentials. |
| **Account Deletion Request** | ✅ Completed | Users request deletion; Super Admin approves permanent deletion. |
| **Next.js Web Portal** | ✅ Completed | Landing page, Directory, Registration, Login, Shared Product Page, Profile, and Super Admin Dashboard. |
| **React Native Mobile App** | ✅ Completed | Expo mobile app supporting Feed, Chat with Quick `$` Catalog Selector, Call CTAs, and Profile. |

---

## 2. Feature Architecture & Operational Flow

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│              SUPER ADMIN GROUP CAPACITY CONFIGURATION WORKFLOW                    │
└───────────────────────────────────────────────────────────────────────────────────┘

1. SUPER ADMIN DECISION ➔ Super Admin decides global default or group-specific capacity (e.g. 40 max).
2. CAPACITY UPDATING   ➔ Super Admin calls POST /api/v1/admin/groups/capacity to update limit.
3. ENFORCEMENT        ➔ Attempting to add a 41st user is BLOCKED automatically by the system.
```

---

## 3. Complete API Endpoint Reference & JSON Payloads

---

### Module E: Super Admin Control Panel (`/api/v1/admin`)

#### 1. Super Admin Decides & Updates Group Capacity Limit
- **HTTP Method**: `POST`
- **URL**: `/api/v1/admin/groups/capacity`
- **Headers**: `Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>`
- **Description**: Super Admin decides and updates the maximum member capacity for a group.

**Request Body (JSON):**
```json
{
  "groupId": "grp-1727026000000",
  "maxCapacity": 100
}
```

**Response Body (200 OK):**
```json
{
  "groupId": "grp-1727026000000",
  "title": "Surat Textile Manufacturers Broadcast",
  "newMaxCapacity": 100,
  "message": "Group capacity updated to 100 members by Super Admin."
}
```

---

### Module F: Groups & Broadcast Channels (`/api/v1/groups`)

#### 1. Create Group / Broadcast Channel (Capacity Decided by Super Admin)
- **HTTP Method**: `POST`
- **URL**: `/api/v1/groups`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`

**Request Body (JSON):**
```json
{
  "title": "Surat Textile Manufacturers Broadcast",
  "description": "Exclusive broadcast channel for Surat textile manufacturers.",
  "type": "BROADCAST",
  "onlyAdminCanPost": true,
  "memberPrivacyMode": true
}
```

**Response Body (201 Created):**
```json
{
  "message": "Group / Broadcast Channel created successfully",
  "group": {
    "id": "grp-1727026000000",
    "title": "Surat Textile Manufacturers Broadcast",
    "type": "BROADCAST",
    "maxCapacity": 40,
    "onlyAdminCanPost": true,
    "memberPrivacyMode": true,
    "currentMembersCount": 1,
    "createdAt": "2026-09-22T17:30:00.000Z"
  }
}
```
