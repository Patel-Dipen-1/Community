# TradeCircle Phased Implementation Plan & Remaining Features Audit Report

**Date:** October 7, 2026  
**Target Specification Document:** `TradeCircle Master Specification (React Native).md`  
**Execution Strategy:** Phased, chunked development in small, testable steps. Fix partially built features first, then build new features step-by-step.

---

## PART 1: Feature Categorization & Current Status

### Group A: 1st-Half Developed (Partially Built - Needs Fixing & Finishing First)

These features already have database tables, initial API routes, or UI mockups in place, but are missing critical spec rules, security checks, or real-time event wiring:

| Feature / Subsystem | Current Status in Codebase | What is Left / Missing to Fix |
| :--- | :--- | :--- |
| **1. Category Access Guarding (`canAccessCategory` & `canInteract`)** | Basic `allowedCommunities` array on Business model & simple middleware. | ScopedRepository query wrapping, 60s Redis caching (`access:{userId}`), socket room naming `cat:{categoryId}:chat:{chatId}`, auto category loss chat lock / group eviction. |
| **2. Hierarchical Control Flags System** | DB models `FeatureModule`, `Feature`, `ApiRouteFlag`. | Resolution order engine (User -> Plan -> Category -> Global -> Default), `GET /config` merged endpoint, client MMKV caching, real-time `config.changed` socket listener. |
| **3. Session Management & Disconnection** | `Session` DB model, basic JWT auth. | User Settings "Devices" screen (list, revoke CTA), Redis `sess:{sessionId}` deletion with `session.revoked` pub/sub to force socket disconnect within 1 second. |
| **4. One-to-One Chat Enhancements** | `ChatDetailScreen.tsx` with basic text/image message sending. | 4-step tick status engine (pending clock -> 1 grey tick -> 2 grey ticks -> 2 blue ticks), 5-hop max forward limit with "Forwarded Many Times" badge, quoted reply snapshot preview, voice message waveform + 1x/1.5x/2x speed, pin message expiry timer (24h/7d/30d), clear/export chat. |
| **5. Group Controls** | `GroupDetailScreen.tsx` with max capacity & `onlyAdminCanPost`. | Category invite link eligibility check, group message expiry timer, auto-eviction of users losing category approval. |
| **6. Product Catalog & Sharing** | Basic product CRUD in `product.routes.ts`, product code text sharing in chat. | Custom category spec fields (fabric, HSN, sizes), product variants grid (color/size table with individual pricing/stock), `#` quick product search inside chat input, watermarked PDF catalog builder. |
| **7. Status / Stories** | `CreateStatusScreen.tsx` and basic status routes. | 24-hour Redis TTL story expiration, target category story visibility selector, story reply opening a chat. |
| **8. Admin Dashboard (Web)** | Basic overview, Roles/Permissions panel, Feature Flags panel, Limits panel, Settings panel, Audit Logs panel. | Approvals Queue panel (#2), User details tabs (#3) with sessions revoke/block & flags tab, Groups Moderation panel (#7), Product Moderation panel (#9). |

---

### Group B: Full Feature Developing Left (Completely Unimplemented)

These features are entirely missing from the codebase and need to be built from scratch:

| Feature / Subsystem | Spec Section | Key Requirements |
| :--- | :--- | :--- |
| **1. Auth Security Hardening** | Section 5 | Argon2id password hashing, common 10k password blocker, 30-day rotated refresh token family revocation with server hash storage, Redis lockout (`fail:{identifier}`, 5 fails in 15m = 15m lock), CAPTCHA trigger. |
| **2. In-Chat Quotation & Order Workflow** | Section 6.9 | "Send Enquiry" CTA creating enquiry card in chat & seller Enquiries list; seller interactive Quotation card builder; buyer Accept / Reject / Counter-Offer workflow; Order status tracking (Pending -> Delivered). |
| **3. Bulk Product Importer & AI Processing** | Section 6.6 | Bulk 20-photo draft product generator; WebP image compression queue (`media-process`); voice product creator & Anthropic AI title/description generator. |
| **4. BullMQ FCM Push Notification Engine** | Section 6.13 | BullMQ `push` queue sending FCM alerts across Android notification channels (Messages, Business, Account) with lock-screen privacy hide toggle. |
| **5. Razorpay Webhooks & Financial Automation** | Section 8 | Razorpay HMAC SHA256 Webhook handler (`captured`, `failed`); Manual UTR payment verification queue; Nightly reconciliation queue; Finance maker-checker refund threshold approval; GST PDF invoice auto-generator; 02:00 daily subscription lifecycle job (`trial` -> `active` -> `grace` -> `expired`) & dunning alerts. |
| **6. Mobile Polish: Security, Storage & i18n** | Section 6.15-6.17 | Biometric App Lock (`expo-local-authentication`); Storage usage inspector & "Clear Cache" tool; Multi-language support (i18n for EN, HI, GU); User report queue with auto-mute after 5 reports in 24h; Support ticket submission engine with screenshots. |
| **7. Remaining 9 Admin Web Modules** | Section 7 | Categories builder (#4); Chat audit & moderation queue (#8) with mandatory reason logging; Feed & status moderation (#10); Enquiries & orders audit (#11); Reports queue & repeat offender scoring (#12); Central theme builder (#15) with `theme_version` sync; Content & policies dynamic editor (#16); Support tickets inbox (#18); System health BullMQ queue monitor (#20). |
| **8. Dynamic Theme Sync Engine** | Section 9.4 | Mobile `GET /config/theme?v={version}` endpoint, MMKV theme caching, dynamic `useTheme()` hook reading server overrides without hardcoded colors. |
| **9. Offline WatermelonDB SQLite Sync & Data Wipe** | Section 10 | Encrypted local SQLite database strategy; Logout data wipe & category access revocation data purge rule on `access.changed`. |

---

## PART 2: Step-by-Step Phased Implementation Roadmap

Development will proceed phase-by-phase. Each phase is broken down into **small, self-contained, testable chunks**.

---

### PHASE 1: Security, Auth & Core Access Isolation (Fix & Finish First)

#### Chunk 1.1: `canAccessCategory` & `canInteract` Scoped Repository Guards
* **Goal:** Enforce strict category isolation across backend APIs and Redis caching.
* **Tasks:**
  1. Build `AccessService` in `apps/api/src/access/access.service.ts` implementing `canAccessCategory(user, category)` and `canInteract(userA, userB)`.
  2. Implement 60-second Redis caching key `access:{userId}`.
  3. Create `ScopedRepository` wrapper auto-injecting category filters on Prisma database queries.
  4. Format socket room names as `cat:{categoryId}:chat:{chatId}`.
* **Testing & Verification:**
  * Unit test: Create 3 users (User 1 = Clothing, User 2 = Clothing + Hardware, User 3 = Hardware). Verify User 1 cannot access Hardware endpoints, User 3 cannot access Clothing endpoints, and User 1 & 3 return empty for `canInteract`.

#### Chunk 1.2: Session Revocation Engine & Devices Screen
* **Goal:** Enable instant remote session revocation across API, Redis, Sockets, and Mobile UI.
* **Tasks:**
  1. Update backend login/token generation to store active session in Redis as `sess:{sessionId}`.
  2. Implement `DELETE /api/v1/user/sessions/:id` endpoint: deletes Redis key and publishes `session.revoked` on Redis pub/sub.
  3. Add socket listener: when `session.revoked` is received, disconnect matching socket within 1 second.
  4. Build Mobile "Devices" screen in Settings: list active sessions with OS, IP, city, and "Logout" buttons.
* **Testing & Verification:**
  * Login on two devices/tabs. Trigger logout from Device A for Device B. Verify Device B's WebSocket disconnects within 1s and subsequent API calls return HTTP 401.

#### Chunk 1.3: Dynamic Flags & Resolution Engine (`GET /config`)
* **Goal:** Allow Super Admin to toggle features globally, per-category, per-plan, or per-user without app updates.
* **Tasks:**
  1. Create `FlagsService` in backend executing resolution hierarchy: **User Flag -> Plan Flag -> Category Flag -> Global Flag -> Default**.
  2. Implement `GET /api/v1/config` endpoint returning merged flags payload.
  3. Wire socket event `config.changed` on backend flag updates.
  4. Integrate MMKV storage in mobile app to cache `/config` flags locally and refresh on `config.changed`.
* **Testing & Verification:**
  * Toggle `module_catalog` flag off in database/admin. Verify mobile app receives `config.changed`, re-fetches `/config`, and dynamically hides Catalog tab without app restart.

#### Chunk 1.4: Password Security, Argon2id & Brute Force Lockout
* **Goal:** Protect authentication against brute force and token reuse attacks.
* **Tasks:**
  1. Replace bcrypt/MD5 with Argon2id for password hashing in `user.service.ts`.
  2. Add 10,000 top common password rejection check during registration.
  3. Implement Redis login failure counter (`fail:{identifier}`, 5 failures in 15m -> 15m lockout with generic error message).
  4. Implement 30-day rotated refresh token family with server hash storage and automatic family revocation on token reuse.
* **Testing & Verification:**
  * Attempt 5 failed logins with wrong password. Verify 6th attempt returns lockout message regardless of correct password for 15 minutes. Test refresh token reuse to ensure full family revocation.

---

### PHASE 2: One-to-One Chat & Groups Enhancements (Fix & Finish First)

#### Chunk 2.1: 4-Step Tick Message Status Engine [COMPLETED]
* **Goal:** Deliver real-time message status indicators (Pending -> Sent -> Delivered -> Read).
* **Tasks:**
  1. Update Socket gateway to emit `message.sent` ACK (1 grey tick) on server receive.
  2. Emit `message.delivered` ACK (2 grey ticks) when recipient socket receives payload.
  3. Emit `message.read` ACK (2 blue ticks) when recipient opens chat view.
  4. Update `ChatDetailScreen.tsx` & `ChatModule.tsx` UI to display 4-step state icons next to message timestamps.
* **Testing & Verification:**
  * Verified end-to-end status flow: `PENDING` (🕒 clock) -> `SENT` (✓ 1 grey check) -> `DELIVERED` (✓✓ 2 grey checks) -> `READ` (✓✓ 2 blue checks). Fully typed and verified across backend socket gateway, Web (`apps/web`), and Mobile (`apps/mobile`).

#### Chunk 2.2: Forwarding Rules & Quoted Reply Preview
* **Goal:** Restrict spam forwarding and enhance in-chat replies.
* **Tasks:**
  1. Implement forward recipient picker capped at 5 eligible chats.
  2. Track forward count per message: after 5 hops, display "Forwarded Many Times" badge with double-arrow icon and restrict forwarding to 1 target chat at a time.
  3. Implement swipe-to-reply gesture in `ChatDetailScreen.tsx` generating quoted preview snapshot.
* **Testing & Verification:**
  * Verify message forwarded 5 times displays double-arrow badge and blocks multi-selecting 2+ chats on next forward attempt.

#### Chunk 2.3: Voice Messaging Enhancements
* **Goal:** Complete voice recording and audio playback tools.
* **Tasks:**
  1. Build voice recorder overlay with slide-to-cancel and slide-to-lock actions using `expo-audio`.
  2. Implement audio playback speed toggles (1x, 1.5x, 2x) and waveform progress bar.
  3. Upload voice audio files as `.m4a` / `.ogg` to `/uploads` server storage.
* **Testing & Verification:**
  * Record a 10s voice note, lock recording, cancel recording, send, and play back at 1.5x speed.

#### Chunk 2.4: WatermelonDB Local Encrypted SQLite Offline Storage
* **Goal:** Enable full offline chat viewing and outbox message queueing.
* **Tasks:**
  1. Configure WatermelonDB schema for `chats`, `messages`, and `outbox`.
  2. Store SQLite database key using `expo-secure-store` and `react-native-quick-crypto`.
  3. Queue outgoing offline messages in `outbox` table with client-generated `clientMsgId` and auto-sync when netinfo returns online.
* **Testing & Verification:**
  * Enable Airplane Mode, send 3 chat messages (stored in local outbox with clock icon). Disable Airplane Mode -> messages automatically transmit to server with single ACK.

#### Chunk 2.5: Category Loss Auto-Eviction & Chat Lock System
* **Goal:** Handle access revocation gracefully without data leakage.
* **Tasks:**
  1. Build BullMQ job `category-revocation-processor`.
  2. When a user loses a category: auto-remove user from category groups with system log, and lock one-to-one chats with zero remaining shared categories.
  3. Emit `access.changed` socket event to trigger mobile client local cache purge of that category's data.
* **Testing & Verification:**
  * Revoke User 1's Clothing category from Admin Panel. Verify User 1 receives `access.changed` socket notification, Clothing chats become locked, and Clothing groups are removed from list.

---

### PHASE 3: Catalog, Products & Quotation/Order Workflow

#### Chunk 3.1: Category-Specific Spec Fields & Product Variants Grid [COMPLETED]
* **Goal:** Support trade-specific product specifications and variant inventory across Web & Mobile with 100% feature parity.
* **Tasks:**
  1. Built [`ClothingProductCreateModal.tsx`](file:///e:/1st/apps/mobile/src/components/ClothingProductCreateModal.tsx) on Mobile matching Web [`ClothingProductCreateModal.tsx`](file:///e:/1st/apps/web/features/products/components/ClothingProductCreateModal.tsx) 1-to-1.
  2. Implemented strict seller verification check (`user.isVerified || user.status === 'APPROVED'`), showing custom approval guard banner when locked.
  3. Integrated full clothing specifications (Fabric Type, Target Gender, Fit Type, Season, Available Sizes chip selector).
  4. Integrated Hot Selling Offer status toggle with custom offer text input.
  5. Integrated Wholesale Bulk Pricing Tiers matrix (`Min Qty + pcs @ ₹ Price`).
  6. Integrated device storage photo picker (`expo-image-picker`) and showcase video picker with thumbnail previews & server upload.
  7. Integrated Custom Option / Attribute Request Modal popup submitting new Category/Fabric/Fit/Season/Size requests directly to Super Admin.
* **Testing & Verification:**
  * Verified full parity across Web & Mobile apps. Clean compilation across `apps/api`, `apps/web`, and `apps/mobile` with **0 errors**.

#### Chunk 3.2: `#` Quick Product Search in Chat & Watermarked PDF Catalog Generator
* **Goal:** Enable fast catalog sharing during chat conversations.
* **Tasks:**
  1. Add inline `#` trigger to `ChatDetailScreen.tsx` input box opening product search dropdown.
  2. Tap product -> inserts product card into chat input.
  3. Build PDF catalog builder using `pdfkit`: allows seller to select products, add business logo watermark, and export downloadable/shareable PDF.
* **Testing & Verification:**
  * Type `#Cotton` in chat input -> product search dropdown lists matching products. Select product -> transmits product card in chat. Test PDF catalog generation.

#### Chunk 3.3: Interactive Quotation Cards, Counter-Offers & Order Lifecycle
* **Goal:** Enable end-to-end B2B trade negotiation within chat.
* **Tasks:**
  1. Add "Send Enquiry" CTA on product page -> generates Enquiry record and chat enquiry card.
  2. Build Seller Quotation Card form: item details, unit price, quantity, GST %, validity date, terms.
  3. Build Buyer Actions on Quotation card: "Accept", "Reject", "Counter-Offer".
  4. Counter-Offer -> opens editable pricing card for seller review.
  5. Acceptance -> generates Order record with status tracking (Pending -> Confirmed -> Dispatched -> Delivered -> Cancelled).
* **Testing & Verification:**
  * Buyer sends enquiry -> Seller replies with Quotation card -> Buyer taps Counter-Offer -> Seller accepts counter-offer -> Status transitions to Order Confirmed.

#### Chunk 3.4: Bulk 20-Photo Importer & WebP Image Compression Queue
* **Goal:** Streamline product catalog creation for sellers.
* **Tasks:**
  1. Build multi-photo picker accepting up to 20 images simultaneously.
  2. Auto-generate 20 draft product rows with names pre-filled from filenames.
  3. Create BullMQ `media-process` queue on backend converting uploaded images to WebP (1080px max width) and generating thumbnails.
* **Testing & Verification:**
  * Select 15 photos in mobile app -> displays draft list screen -> submit -> verify backend converts images to WebP and creates products.

---

### PHASE 4: Finance, Payments & Subscription Automation

#### Chunk 4.1: Razorpay Webhooks & Manual UTR Verification Queue
* **Goal:** Automate subscription payment verification and manual payment handling.
* **Tasks:**
  1. Implement Razorpay webhook endpoint (`POST /api/v1/subscription/webhook`) with HMAC SHA256 signature verification.
  2. Make webhook handling idempotent using event IDs.
  3. Build Manual Payment submission flow: user inputs UTR transaction number and uploads payment screenshot.
  4. Build Finance Admin "Manual Payments Queue" panel to Approve/Reject manual transfers.
* **Testing & Verification:**
  * Trigger mock Razorpay `payment.captured` webhook -> verify user subscription automatically transitions to `ACTIVE`. Submit manual UTR screenshot -> Approve from Admin panel -> verify subscription activation.

#### Chunk 4.2: GST PDF Invoice Auto-Generator & Refund Maker-Checker Workflow
* **Goal:** Automate tax compliance and financial controls.
* **Tasks:**
  1. Build GST Tax split engine (CGST 9% + SGST 9% for intra-state; IGST 18% for inter-state based on state pincodes).
  2. Generate PDF tax invoices using `pdfkit` and send via email (AWS SES).
  3. Build Refund Request workflow: Finance Admin can approve up to `refund_limit_amount`; refunds exceeding limit require Super Admin authorization.
* **Testing & Verification:**
  * Complete payment -> verify downloadable GST invoice PDF displays correct tax split. Initiate refund above limit -> verify status becomes `PENDING_SUPER_ADMIN_APPROVAL`.

#### Chunk 4.3: 02:00 Daily Subscription Lifecycle Cron Job & Dunning Alerts
* **Goal:** Automate subscription status transitions and renewal reminders.
* **Tasks:**
  1. Create BullMQ cron job running daily at 02:00.
  2. Transition subscriptions: `TRIAL` -> `ACTIVE` -> `GRACE` -> `EXPIRED`.
  3. Send automated push and email dunning reminders at 7 days, 3 days, 1 day prior to expiry, and on expiry day.
  4. Emit `access.changed` for expired subscriptions.
* **Testing & Verification:**
  * Set subscription end date to yesterday -> run 02:00 job -> verify status updates to `GRACE`, expiry email is queued, and user receives warning push notification.

---

### PHASE 5: Push Notifications, Privacy & Client Polish

#### Chunk 5.1: BullMQ FCM Push Notification Engine & Android Channels
* **Goal:** Reliable mobile push notification delivery with privacy controls.
* **Tasks:**
  1. Set up BullMQ `push` processor using `firebase-admin` (FCM).
  2. Configure Android Notification Channels: `Messages`, `Business`, `Account`.
  3. Implement lock-screen privacy hide toggle: hides sender name and message body when enabled.
  4. Add Redis push rate limiter (`rl:push:{userId}`) grouping notifications to avoid spam floods.
* **Testing & Verification:**
  * Trigger 5 rapid chat notifications -> verify recipient receives grouped notification on Android channel `Messages`. Enable lock-screen privacy toggle -> verify notification displays "New Message".

#### Chunk 5.2: Biometric App Lock & Storage Clear Cache Tool
* **Goal:** Mobile client security and storage management.
* **Tasks:**
  1. Implement local biometric authentication (Fingerprint / Face ID) using `expo-local-authentication`.
  2. Add App Lock toggle in Settings with customizable auto-lock timer (Immediate, 1 min, 5 min).
  3. Build Storage Usage screen showing media cache size with a "Clear Cache" CTA.
* **Testing & Verification:**
  * Enable Biometric Lock -> place app in background -> re-open -> verify fingerprint prompt appears. Tap Clear Cache -> verify temporary media files are deleted.

#### Chunk 5.3: Multi-Language Support (i18n: EN, HI, GU)
* **Goal:** Localization for Indian B2B markets.
* **Tasks:**
  1. Integrate `i18next`, `react-i18next`, and `expo-localization`.
  2. Create translation files: `en.json`, `hi.json`, `gu.json`.
  3. Add Language Switcher selector in Settings.
* **Testing & Verification:**
  * Select Hindi in Settings -> verify tab bar, buttons, titles, and headers instantly change to Hindi text.

#### Chunk 5.4: Help & Support Ticket Submission Engine
* **Goal:** User support channel inside the mobile app.
* **Tasks:**
  1. Build Mobile Help screen: topic selector, description input, screenshot attachment picker.
  2. Create `POST /api/v1/support/tickets` API endpoint saving ticket record.
  3. Build Support Admin Inbox screen in Next.js web portal with reply capabilities.
* **Testing & Verification:**
  * Submit support ticket with screenshot from mobile app -> verify ticket appears in Admin Support Inbox -> reply from Admin -> verify mobile user receives notification and reply.

---

### PHASE 6: Admin Panel Complete Build (Missing 13 Modules)

#### Chunk 6.1: Approvals Queue (#2) with Document Viewer & SLA Timers
* **Goal:** Streamline business onboarding approvals.
* **Tasks:**
  1. Build Approvals Queue table in Next.js web portal filterable by category and status.
  2. Build Approval Detail Modal: displaying submitted GST details, shop photos, visiting card, and SLA waiting timer.
  3. Add decision actions: Approve, Reject (with pre-defined reason templates), and Request More Info.
* **Testing & Verification:**
  * Submit registration from mobile app -> verify record appears in Admin Approvals Queue with SLA timer -> tap Approve -> verify mobile user receives approval push notification.

#### Chunk 6.2: User Details Management Tabs (#3)
* **Goal:** Complete 360-degree user administration.
* **Tasks:**
  1. Build User Detail view with tabs: Profile, Category Approvals, Subscription History, **Sessions List**, **Flags Editor**, Activity Timeline, and Reports.
  2. Sessions tab: list active devices with Revoke Session and Block Device ID buttons.
  3. Flags tab: toggle user-specific override flags (`can_send_message`, `is_verified`, `read_only_mode`, etc.).
* **Testing & Verification:**
  * Open user details in Admin -> Revoke session -> verify user device is logged out. Toggle `is_verified` flag -> verify blue checkmark appears on mobile user profile.

#### Chunk 6.3: Categories Builder (#4) & Central Theme Builder (#15)
* **Goal:** Dynamic category management and platform branding control.
* **Tasks:**
  1. Build Category Manager screen: create/edit category, set accent color, upload icon, define custom registration fields, and define product spec fields.
  2. Build Central Theme Builder screen: primary color picker, category accent palette live light/dark preview, and "Publish Theme" button.
  3. "Publish Theme" -> increments `theme_version` and emits `config.changed`.
* **Testing & Verification:**
  * Modify accent color for Clothing category in Theme Builder -> click Publish Theme -> verify mobile app downloads new theme JSON and updates Clothing accent colors.

#### Chunk 6.4: Moderation Queues: Chat Audit (#8), Reports (#12) & Offender Scoring
* **Goal:** Maintain platform safety and compliance.
* **Tasks:**
  1. Build Reported Items queue listing reported messages, products, and feed posts.
  2. Build Audit Mode Chat Viewer: requires admin to type a mandatory justification reason before opening chat logs (creates immutable audit log entry).
  3. Implement Decision Actions: Dismiss, Warn, Mute 24h, Suspend, Ban.
  4. Calculate Repeat Offender Score (auto-flags users with 5+ reports in 24 hours).
* **Testing & Verification:**
  * Report a message from mobile app -> opens in Admin Moderation queue -> open in audit mode with justification reason -> verify action creates entry in `AuditLog` table.

#### Chunk 6.5: Remaining Admin Modules (Content #16, Tickets #18, System Health #20)
* **Goal:** Complete remaining web portal administration modules.
* **Tasks:**
  1. Build Policy Content Editor (#16): dynamic markdown editor for Terms, Privacy Policy, FAQ, and email/SMS templates.
  2. Build Support Tickets Inbox (#18): ticket assignment, filter by status, canned response selector.
  3. Build System Health Dashboard (#20): API latency, active WebSocket connections count, Redis memory usage, DB connection pool stats, and BullMQ queue board (`@bull-board/nestjs`).
* **Testing & Verification:**
  * Edit Terms of Service in Policy Editor -> verify mobile app loads updated terms text. Check System Health panel to view live Redis memory usage and BullMQ job counts.

---

## Summary of Next Steps

We are ready to begin implementation phase by phase.

1. **Phase 1 (Chunk 1.1)** is the starting point: Implementing `canAccessCategory` & `canInteract` Scoped Repository Guards + Redis 60s Cache.
2. We will implement **one chunk at a time**, test and verify it thoroughly, and then proceed to the next chunk.
