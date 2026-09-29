# Software Requirements Specification (SRS)
## Project Name: Business Communication & Store Platform
**Document Version:** 3.0.0  
**Date:** September 25, 2026  
**Target Platforms:** Web Application, Future iOS App, Future Android App  
**Architecture:** Unified Express + Socket.IO + PostgreSQL + Redis Engine with Multi-Community Isolation  

---

## 1. Product Overview & System Philosophy

### 1.1 Purpose
The **Business Communication & Store Platform** is a unified digital ecosystem designed for verified businesses (Manufacturers, Distributors, Wholesalers, Traders, and Retailers) to connect, showcase product stores/catalogs, communicate via a modern WhatsApp-style messaging experience, participate in category-specific trade communities, share products, create groups, and broadcast business updates.

### 1.2 Core Architectural Principles
1. **Approval-First Access**: Unverified users are restricted to onboarding. Access to community discovery, product search, group participation, and messaging is granted strictly after Super Admin verification.
2. **Strict Server-Side Category & Community Isolation**: Businesses belong to specific allowed trade categories (e.g., Clothing, Hardware, Electronics, Textile, Jewellery). Server-side authorization ensures users in one category cannot discover or message users in another unless explicitly granted multi-community authorization or invited.
3. **WhatsApp-Style Communication Experience**: High-performance direct and group messaging supporting text, images, videos, documents, audio files, message replies, reactions, forwarding, editing, deletion, delivery/read receipts, typing indicators, and presence tracking.
4. **Owner-Managed Stores & Product Catalogs**: Every approved business manages its own store catalog with SKU codes, price tiers, minimum order quantities (MOQ), and media previews.
5. **Interactive Product & Catalog Sharing**: Seamless in-chat product and catalog sharing via interactive message cards with direct "Inquire Now", "View Product", and "Open Store" actions.
6. **Mobile-Ready Single Unified Backend Engine**: All REST APIs, Socket.IO real-time events, JWT auth tokens, pagination parameters, and response structures are standardized to serve the current Web application and future native Android and iOS mobile applications without backend changes.
7. **Target Concurrency (5,000 Active Users)**: High-performance architecture leveraging PostgreSQL connection pool bounds, Prisma query optimization, Redis Socket.IO adapter scaling, LRU bounded memory caching, and static media offloading.

---

## 2. User Roles & Account Life Cycle

### 2.1 User Account Statuses
- `PENDING`: Newly registered account awaiting Super Admin document and shop verification. Restricted from browsing, search, chat, and groups.
- `APPROVED`: Fully verified business account granted access to permitted communities, direct messaging, groups, store catalog, and broadcast features.
- `REJECTED`: Application denied due to invalid credentials or unverified business documentation.
- `SUSPENDED`: Temporarily blocked by Super Admin due to terms violation or compliance issues.
- `DEACTIVATED`: User-initiated or admin-initiated soft deletion state.

### 2.2 User Registration & Verification Workflow
1. **User Registration**: User submits Full Name, Mobile Number, Email Address, Password, Shop Name, GST Number, Shop Address (Street, City, State, Pincode), and Shop Verification Photos/Videos.
2. **Pending Queue**: Account enters `UNVERIFIED` / `PENDING` state.
3. **Super Admin Review**: Super Admin inspects GST credentials, address, and uploaded verification media.
4. **Approval & Role/Community Assignment**: Super Admin approves account and assigns:
   - **Allowed Communities**: (e.g., `["clothing"]`, `["electronics"]`)
   - **Assigned Business Role**: (`MANUFACTURER`, `DISTRIBUTOR`, `WHOLESALER`, `TRADER`, `RETAILER`, or `SUPER_ADMIN`)
5. **Access Grant**: Prominent **"Verified Business"** tag granted, unlocking active community discovery, chat, and store features.

---

## 3. Category & Community Authorization Engine

### 3.1 Community Boundaries
- The platform hosts category-specific trade communities (Clothing, Hardware, Textile, Electronics, Machinery, Jewellery, Food, etc.).
- **Server-Side Authorization**: Every API query and Socket.IO event checks `req.user.allowedCommunities`.
- **Search & Discovery Boundaries**: A user approved only for "Clothing" receives zero results when searching for "Hardware" suppliers or products.
- **Multi-Community Authorization**: Super Admin can grant explicit multi-community access to authorized accounts (e.g. large distributors operating across multiple sectors).

---

## 4. WhatsApp-Style Messaging Engine

### 4.1 Direct Chat (1-to-1)
- **Messaging Types**: Text messages, images, videos, PDFs, documents, voice notes.
- **Message Interactions**:
  - **Reactions**: Add/remove emoji reactions (`👍`, `❤️`, `😂`, `😮`, `😢`, `🙏`) on any message.
  - **Replies**: Quote and reply to specific messages with a rich preview card.
  - **Forwarding**: Forward messages and shared product cards to single or multiple contacts/groups.
  - **Edit & Delete**: Edit text messages within allowed timeframes; support "Delete for Me" and "Delete for Everyone".
  - **Delivery & Read Status**: Real-time message status indicators (`SENT`, `DELIVERED`, `READ` double checks).
  - **Typing Indicator**: Real-time typing status broadcast via Socket.IO.
- **Conversation Actions**: Pin conversation, Archive conversation, Mute notifications, Block user, Report user.

### 4.2 Idempotency & Mobile Reliability
- Optional `clientMessageId` sent by client on message creation.
- PostgreSQL `@@unique([senderId, clientMessageId])` constraint prevents duplicate messages on mobile network retries.

---

## 5. Group Communication System

### 5.1 Business & Trade Groups
- **Group Creation & Roles**: Super Admin approved vendors can create groups with defined capacity limits (default max 40 members, overrideable up to 500 by Super Admin).
- **Group Privacy & Settings**:
  - `onlyAdminCanPost`: Restricts posting to Group Admins (Broadcast Channels).
  - `hideMemberIdentity`: Protects member phone numbers and full names from non-admin members.
  - `membersCanSeeMemberList`: Controls member list visibility.
- **Group Management**: Add members, remove members, leave group, delete group, promote to admin, demote to member, suggested member discovery by community.

---

## 6. Business Profile & Store Product Catalog

### 6.1 Business Profile Layout
- 4-Section Business Showcase:
  1. **Hot Selling Items**: Top trending products and inquired inventory.
  2. **Catalogs & Collections**: Organized product collections searchable by SKU code.
  3. **Verified Shop Photos & Videos**: Showcase of verification media submitted during registration.
  4. **Business Information & Direct Contact**: Shop Name, Address, GST Tag, Verified Badge, and **Direct Call / Chat** buttons.

### 6.2 Store Catalog & Product Management
- Each approved business maintains an independent Store Catalog (`/store/[businessId]`).
- **Product Attributes**: Title, Description, SKU Code, Category, Subcategory, Price Tiers (e.g., 1-10 units, 10-100 units), Minimum Order Quantity (MOQ), Images, Video URL, Stock Status, Active Toggle.
- **Store Controls**: Owner can create, edit, delete, enable/disable products, and share store catalog link/card directly into conversations.

---

## 7. Interactive Product & Catalog Sharing in Chat

- **In-Chat Attachment Selector**: Users can browse their own catalog or saved products directly inside the chat interface.
- **Product Cards**: Shared products render as rich interactive message cards containing:
  - Product Image & Title
  - SKU Code & Price Tiers / MOQ
  - **"Inquire Now"** button (pre-fills product inquiry context)
  - **"View Details"** button (opens product detail modal)
  - **"Open Store Catalog"** button (navigates to seller's full store)

---

## 8. Restricted Business Invitation System

- **Invitation Links**: Approved businesses can generate single-use or multi-use invitation tokens/links for outside suppliers or buyers.
- **Restricted Recipient Access**: Invited users who register via invitation link are granted restricted access to view the inviter's business profile/catalog and initiate direct chat with the inviter.
- **Isolation Boundary**: Invited users do NOT automatically receive platform-wide community discovery or group access until verified by Super Admin.

---

## 9. WhatsApp-Style Business Broadcast System

- **Broadcast Lists**: Business owners can create targeted recipient lists from their approved contacts.
- **Broadcast Cards**: Dispatch product catalog cards, promotional offers, or store updates simultaneously to all list recipients.
- **Recipient Privacy**: Recipients receive individual 1-to-1 direct message cards without visibility into other recipients on the broadcast list.
- **Anti-Spam & Rate Limiting**: Strict daily broadcast limits and per-minute message dispatches to prevent spam.

---

## 10. Real-Time Notification Architecture

- In-app notification center tracking:
  - Direct & Group Messages
  - Group Invitations & Mentions
  - Product Inquiry Requests
  - Account Verification Approval/Rejection
  - Broadcast Deliveries
- Standardized payload format prepared for Web Push Notifications and native Firebase Cloud Messaging (FCM) / Apple Push Notification Service (APNs) for future mobile apps.

---

## 11. Super Admin Control & Operations Center

Centralized oversight dashboard providing:
- **User Management**: Approve, reject, suspend, or deactivate users; view registration dates, last active status, and business credentials.
- **Session Manager**: View live sessions, IP addresses, platform devices (Web, Android, iOS), and terminate unauthorized sessions.
- **Community & Group Moderation**: Manage category hierarchies, override group capacity limits, delete inappropriate groups/products.
- **System Health Monitor**: Live metrics for PostgreSQL pool, Redis connection status, Socket.IO adapter status, memory usage, and error logs.

---

## 12. Non-Goals & Future Modules

- **AI Assistance**: Excluded from current project scope.
- **Audio/Video Calling (Future)**: Prepared WebRTC architecture for future 1-to-1 voice/video calls (non-priority for initial core deployment).
- **Subscription / Payment Gateway (Future)**: Schema designed for future recurring subscription fees (e.g., ₹300/month), invoice generation, and revenue analytics (non-priority for initial core deployment).

---

## 13. System Architecture & Concurrency Blueprint

```text
                                  CLIENT LAYER
                      ┌─────────────────────────────────┐
                      │  Web App / Android / iOS Native │
                      └────────────────┬────────────────┘
                                       │ HTTPS / WSS
                                       ▼
                                 NGINX REVERSE PROXY
                  ┌────────────────────┴────────────────────┐
                  │ - SSL Termination                       │
                  │ - Static Media Uploads (/uploads/)      │
                  │ - WebSocket Upgrade Headers             │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                            PM2 CLUSTER NODE BACKEND
                  ┌────────────────────┴────────────────────┐
                  │  Express API Engine + Socket.IO Server  │
                  └─────────┬─────────────────────┬─────────┘
                            │                     │
                            ▼                     ▼
                     POSTGRESQL DB           REDIS SERVER
                 (Prisma Pool Bounded)   (Socket.IO Adapter &
                                          TTL Presence Cache)
```
