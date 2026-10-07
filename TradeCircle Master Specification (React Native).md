# TradeCircle Master Specification: Category-Wise B2B Platform (React Native)

**Version:** 2.0 (complete)  |  **Audience:** Developers and AI coding agents  |  **App:** React Native (Expo)  |  **Backend:** NestJS + PostgreSQL + Redis  |  **Admin:** Next.js

*TradeCircle is a working name. Rename it freely.*

---

## 0. How to Use This Document (Read First)

**For developers:** Read Sections 1 to 5 first. They define the rules everything else depends on. Then build module by module from Section 6.

**For an AI coding agent (Claude Code, Cursor, etc.):** Give the agent this document (export as PDF or Markdown from the doc menu) plus a short `RULES.md` made from Section 2, 4 and 5. Then give one task at a time from Section 17. Do not ask the agent to "build everything" in one go.

**Words used:** MUST means required. SHOULD means strongly recommended. MAY means optional.

**Glossary**

| Term | Meaning |
| --- | --- |
| Category | A trade type such as Clothing or Hardware |
| Space | The whole mini-platform of one category inside the app (its own chat, groups, products, feed, enquiries, directory) |
| Member | An approved user |
| Eligible | Two users are Eligible for each other when they share at least one approved and paid category |
| Shared category | A category in which both users are approved and active |
| Flag | A switch or limit that Admin can turn on, off or change without a new app release |
| Session | One logged-in device of one user |
| Scope | The category that a piece of data belongs to |

---

## 1. Product Vision

TradeCircle is a private business network where each trade (Clothing, Hardware, Electronics and so on) has its **own closed Space**. Inside a Space, verified business owners chat, make groups, post products, share catalogs, send enquiries and quotations. People from other trades cannot see anything of that Space.

Income comes from **subscriptions per category**. Everything is controlled from an **Admin Panel** with roles (Super Admin, Finance Admin, Category Admin and more), flags, session control and audit logs.

**Main promise to the user:** "Only the right people in my trade can see me and my products."

---

## 2. The Golden Rule (Applies to EVERY Module, Not Only Chat)

### 2.1 One sentence

> Every piece of data has a category. A user can see or touch it only if the user is Approved and Active in that category.

### 2.2 Two core checks (server side, always)

1. `canAccessCategory(user, category)` is true when: user status is approved, AND `user_categories.approval = approved`, AND `sub_status` is `trial`, `active` or `grace`.
2. `canInteract(userA, userB)` is true when both users are approved and there is at least one category where `canAccessCategory` is true for both. The result is the list of **shared categories**.

Every API, every WebSocket event, every search query, every file link and every push notification MUST pass through these checks. The mobile app and the admin screens are never trusted.

### 2.3 The three-user example (extended to all modules)

| User | Categories |
| --- | --- |
| User 1 | Clothing |
| User 2 | Clothing + Hardware |
| User 3 | Hardware |

- User 1 and User 2 chat, join Clothing groups, see each other's **Clothing** products and feed.
- User 2 and User 3 chat, join Hardware groups, see each other's **Hardware** products and feed.
- User 1 and User 3 are invisible to each other everywhere: search, directory, groups, member lists, mentions, forwards, product links, feed, status, enquiries, notifications.
- **User 1 must not even learn that User 2 is in Hardware.** User 1 sees only User 2's Clothing profile, Clothing products and the Clothing badge. The Hardware badge and products are hidden from User 1.
- User 2 uses a **Space switcher** (Clothing | Hardware) to move between the two Spaces.

### 2.4 Category scope of every module

| Module | Belongs to | Who can see or use it | Server check |
| --- | --- | --- | --- |
| One-to-one chat | Shared categories of both users | Only the two users, while at least one shared category is active | `canInteract` |
| Message | Its chat | Chat members | Chat membership plus category check |
| Group | Exactly 1 category | Members who are eligible for that category | `canAccessCategory` |
| Product | Exactly 1 category | Eligible members of that category | Product category check |
| Collection / Catalog | Exactly 1 category | Same as product | Same |
| Feed post (Updates) | Exactly 1 category | Eligible members of that category | Same |
| Status (24 hour story) | 1 or more categories chosen by poster | Eligible members of the chosen categories | Same, per category |
| Enquiry, Quotation, Order | Category of the product | Buyer, seller, category admins | Same |
| Directory and search | Per category | Only eligible members, only fields of the shared category | Query scope |
| Announcement | One category, or All (Super Admin only) | Eligible members | Same |
| Poll, Event, Pinned message | Inherits its chat or group | Same as parent | Same |
| Media and files | Inherits parent | Signed URL with expiry, checked on request | Parent check |
| Notification | Inherits source | Only eligible receivers; lock-screen preview can be hidden | Same |
| Calls (phase 2) | Inherits chat | Same as chat | Same |
| Subscription | Per category | The paying user | Owner check |

### 2.5 Profile filtering rule

A profile has a **common part** (name, photo, city, verified badge) and **category parts** (business name for that category, products, about, categories badge). When user X views user Y, the server returns the common part plus only the category parts of the **shared categories**.

### 2.6 Edge cases (MUST be handled)

1. User loses a category (expired, removed, banned): instantly removed from that category's groups; chats whose only shared category was that one become **locked and hidden**; history stays for audit.
2. User regains the category: chats and group memberships can be restored (group admin approval flag).
3. A message was forwarded earlier: receiver who is no longer eligible cannot open its media (signed URL check on every request).
4. Product shared in a chat that has two shared categories: allowed if the product's category is one of the shared categories.
5. Group invite link opened by an ineligible person: shows "Link not available", never the group name.
6. @mention: autocomplete shows only eligible members of that group.
7. Admin adds someone manually: they must still hold the category.
8. Search index (Meilisearch or database): every document stores `category_id`; every query adds a category filter from the server, never from the client.
9. Push notification text must not reveal data to the wrong person (e.g., after account switch).
10. Deleted or renamed category: soft delete; data is hidden but not destroyed.
11. Same phone or email used to register twice: rejected (unique).
12. Account on two phones: both sessions follow the same access rules instantly.
13. Real-time update: when approval or subscription changes, the server emits `access.changed` and the app refreshes lists within seconds.

### 2.7 Enforcement layers (defence in depth)

| Layer | What it does |
| --- | --- |
| Database | `category_id NOT NULL` on every scoped table. Optional PostgreSQL Row Level Security as a safety net |
| Service layer | Every query goes through a `ScopedRepository` that adds the category filter automatically |
| Guards | `@RequireCategory()` decorator on controllers; `AccessGuard` on socket events |
| Socket rooms | Rooms are named `cat:{categoryId}:chat:{chatId}`. A socket joins a room only after an access check |
| Search | Category filter injected on the server |
| Media | Short-lived signed URLs (5 to 15 minutes) generated after a check |
| Cache | Access results cached in Redis for 60 seconds and cleared on any approval or subscription change |

---

## 3. Roles and Permissions

### 3.1 Role list

| Role | Scope | Purpose |
| --- | --- | --- |
| **Super Admin** | Whole platform | Owner. Full control, creates other admins, roles, settings, theme, pricing |
| **Admin** | Whole platform | Daily operations: users, groups, moderation. No money settings, no role creation |
| **Finance Admin** | Whole platform, money only | Check payments, verify manual payments, refunds, plans, invoices, revenue |
| **Support Admin** | Whole platform, limited | Help users: view profile, reset password, revoke sessions, tickets |
| **Category Admin** | Assigned categories only | Approve users, moderate, announcements for own category |
| **Moderator** | Assigned categories only | Handle reports, remove content, mute users |
| **Auditor** | Read only | View logs and reports, change nothing |
| **Member (user)** | Own categories | Normal user (Trial, Basic, Pro, Business) |
| **Group Admin** | One group | A member who manages a group |

Super Admin can also create **custom roles** by choosing any set of permission keys.

### 3.2 Permission matrix (admin side)

*Yes = full. Own = only assigned categories. Read = view only. No = none.*

| Permission | Super Admin | Admin | Finance | Support | Category Admin | Moderator | Auditor |
| --- | --- | --- | --- | --- | --- | --- | --- |
| View dashboard | Yes | Yes | Finance only | Limited | Own | Own | Read |
| Approve or reject users | Yes | Yes | No | No | Own | No | No |
| Suspend or ban users | Yes | Yes | No | Suspend | Own | Mute only | No |
| Delete user permanently | Yes | No | No | No | No | No | No |
| Edit user categories | Yes | Yes | No | No | Own | No | No |
| View user private data | Yes | Yes | Payments | Yes | Own | No | Read |
| Reset password, revoke sessions | Yes | Yes | No | Yes | No | No | No |
| Change user flags and limits | Yes | Yes | No | Read | Own | No | No |
| View chat content (reason required, logged) | Yes | Yes | No | No | Reported only | Reported only | No |
| Delete messages or media | Yes | Yes | No | No | Own | Own | No |
| Manage groups | Yes | Yes | No | Read | Own | Lock or remove member | No |
| Manage products and catalogs | Yes | Yes | No | Read | Own | Remove | No |
| Announcements and broadcast | All | All | No | No | Own | No | No |
| Create or edit categories | Yes | No | No | No | No | No | No |
| Plans, prices, coupons | Yes | No | Yes | No | No | No | No |
| View and verify payments | Yes | Read | Yes | Read | No | No | Read |
| Refunds | Approve | No | Process up to limit | No | No | No | No |
| Create admins and roles | Yes | No | No | No | No | No | No |
| Theme and branding | Yes | No | No | No | Own accent | No | No |
| Platform settings and global flags | Yes | Limited | No | No | No | No | No |
| Audit logs | Yes | Read | Own actions | Own actions | Own actions | Own actions | Read |
| Export data | Yes | Yes | Payments | No | Own | No | By flag |
| Impersonate user (read-only view) | Yes | No | No | By flag | No | No | No |
| Server health and queues | Yes | Read | No | No | No | No | Read |

### 3.3 What each member level can do and share

All numbers below are **defaults**. Super Admin edits them in the panel (stored as plan flags).

| Item | Trial | Basic | Pro | Business |
| --- | --- | --- | --- | --- |
| Categories allowed | 1 | 1 | Up to 3 | Unlimited |
| Text, emoji, reply, forward, star | Yes | Yes | Yes | Yes |
| Photo and voice message | Yes | Yes | Yes | Yes |
| Video and documents | 10 MB | 25 MB | 64 MB | 100 MB |
| Products in catalog | 10 | 50 | 500 | Unlimited |
| Share product card in chat | Yes | Yes | Yes | Yes |
| Share full catalog link and PDF | No | Yes | Yes | Yes |
| Create groups | No (join only) | 2 | 10 | Unlimited |
| Group size | n/a | 100 | 256 | 1024 |
| Feed posts per day | 1 | 3 | 10 | 30 |
| Status per day | 3 | 5 | 10 | 20 |
| Broadcast list recipients | No | 20 | 100 | 500 |
| Send enquiry or quotation | Yes | Yes | Yes | Yes |
| Logged-in devices | 1 | 2 | 3 | 5 |
| Verified badge | By Admin | By Admin | By Admin | By Admin |

**Group Admin** can add or remove eligible members, rename group, set who can send, pin messages, remove messages in that group. A Group Admin can never add an ineligible person.

### 3.4 Role rules

- BR-R1: Only Super Admin creates admins and custom roles.
- BR-R2: An admin can never give another admin more permissions than they have.
- BR-R3: Category Admin access is always limited by `admin_categories`.
- BR-R4: Viewing private chat content needs the flag `can_view_chats`, a typed reason and creates an audit entry that cannot be edited.
- BR-R5: Money actions use maker-checker: refunds above the limit need Super Admin approval.
- BR-R6: Every admin must use two-factor authentication (TOTP).
- BR-R7: There must always be at least 2 Super Admins (one is a backup).

---

## 4. Flags: Central Control Without App Updates

Flags are switches and limits stored in the database and sent to apps. Changing a flag changes behaviour immediately. No new app release is needed.

### 4.1 Four levels

1. **Global flags:** the whole platform
2. **Category flags:** one category
3. **Plan flags:** one plan
4. **User flags:** one user (special cases)

**Resolution order (strongest first):** User flag, then Plan flag, then Category flag, then Global flag, then built-in default. A user flag of `false` can block something even if the plan allows it.

### 4.2 Global flags

| Key | Default | Meaning |
| --- | --- | --- |
| `registration_open` | true | New sign-ups allowed |
| `signup_requires_approval` | true | New users wait for approval |
| `login_email_enabled`, `login_phone_enabled` | true | Which identifiers can log in |
| `otp_login_enabled` | false | Allow OTP instead of password |
| `maintenance_mode` | false | Shows maintenance screen |
| `min_app_version`, `force_update` | 1.0.0, false | Force update |
| `module_chat`, `module_groups`, `module_catalog`, `module_feed`, `module_status`, `module_enquiry`, `module_calls`, `module_ai_tools` | on or off | Turn whole modules on or off |
| `default_trial_days`, `default_grace_days` | 7, 3 | Trial and grace period |
| `media_max_mb` | 100 | Upload cap |
| `theme_version` | 1 | Increase to make apps reload the theme |
| `message_edit_minutes` | 15 | Edit window |
| `delete_for_everyone_hours` | 48 | Delete window |

### 4.3 Category flags

`enabled`, `accent_color`, `icon`, `requires_gst`, `extra_register_fields`, `allow_feed`, `allow_status`, `max_group_size`, `price_monthly`, `trial_days`, `grace_days`, `catalog_fields` (extra product fields such as fabric, size chart, brand, HSN code).

### 4.4 User flags (Admin can set on one user)

| Key | Default | Meaning |
| --- | --- | --- |
| `can_login` | true | Block login |
| `can_send_message` | true | Mute sending |
| `muted_until` | null | Time-limited mute |
| `can_share_media`, `can_share_product`, `can_post_feed`, `can_post_status`, `can_broadcast` | per plan | Per feature permission |
| `can_create_group` | per plan | Group creation |
| `max_devices`, `max_products`, `max_groups` | per plan | Limits |
| `daily_message_cap` | null | Anti-spam limit |
| `is_verified` | false | Verified badge |
| `hidden_from_search` | false | Do not show in directory |
| `requires_reapproval` | false | Send back to Pending |
| `force_password_change` | false | Ask for new password at next login |
| `read_only_mode` | false | User can read but not send |
| `shadow_limited` | false | Messages delivered slowly to reduce spam impact |

### 4.5 Admin flags (control what each admin can do)

`require_2fa` (true), `ip_allowlist` (list), `can_view_chats`, `can_export_data`, `can_impersonate`, `can_manage_flags`, `can_approve_users`, `refund_limit_amount`, `single_session_only` (true), `session_idle_minutes` (15), `allowed_categories`, `login_hours` (optional time window).

### 4.6 How apps get flags

1. App calls `GET /config` after login and on app open. It receives merged flags for that user.
2. Flags are saved in local storage (MMKV) so the UI works offline.
3. Server emits socket event `config.changed` when anything changes; the app calls `/config` again.
4. The server checks flags again on every request. Hiding a button in the app is only a convenience.

---

## 5. Login, Registration and Session System

### 5.1 Registration flow (user)

1. **Welcome screen:** Login or Create account.
2. **Create account:** full name, business name, **email**, **phone**, password, confirm password. Terms and privacy checkbox.
3. **Verify phone:** 6-digit OTP by SMS (MSG91). **Verify email:** 6-digit code or link. Both are required before approval (flag can relax email).
4. **Choose categories:** one or more (chips with category icon and accent colour).
5. **Business details per category:** business address, city, GST number (if the category flag requires), shop photo or visiting card, optional website.
6. **Submit:** status becomes **Pending**. User sees the "Waiting for approval" screen with the submitted data and expected time.
7. **Admin decision per category:** Approved, Rejected (with reason), or Needs more info (user can edit and resubmit).
8. **After approval:** push notification and email. User enters the Space of the approved category and sees plan options (trial starts automatically if enabled).

### 5.2 Login methods

- **Email + password** or **Phone + password** (one field detects which; flags decide if each is enabled).
- Optional **OTP login** (flag `otp_login_enabled`).
- Optional **biometric app lock** after login (fingerprint or face) stored on the device only.
- Social login is NOT included (keeps business identity clear).

### 5.3 Password rules

- Minimum 8 characters, at least 1 letter and 1 number (admin password: 12 characters plus a symbol).
- Stored with **Argon2id** hash. Never stored or logged in plain text.
- Block very common passwords (top 10,000 list).
- Password change asks the old password and then logs out other sessions (option).

### 5.4 Tokens

| Token | Life | Stored where |
| --- | --- | --- |
| Access token (JWT) | 15 minutes (admin: 10 minutes) | Memory only in the app |
| Refresh token (random 256-bit) | 30 days, rotated on every use (admin: 8 hours idle) | App: secure storage (Keychain or Keystore). Server: only the hash |

**Reuse detection:** if an old refresh token is used again, the whole token family is revoked and the user must log in again.

### 5.5 Session management

Each login creates a row in `sessions` with: device id, device name, OS, app version, IP, city (approximate), created, last active, expiry, revoked at, revoked by, reason.

**User side (Settings, then Devices):** list of logged-in devices with last active time and city; button "Log out this device"; "Log out all other devices".

**Admin side (User profile, then Sessions tab):** same list; Admin can revoke one or all sessions, block a device id, force password change. Every action is audited.

**Instant revoke:** active sessions are also kept in Redis as `sess:{sessionId}` with expiry. Revoke deletes the key and publishes `session.revoked` on Redis pub/sub. The socket gateway disconnects that device within about 1 second and the next API call returns 401.

**Device limit:** `max_devices` flag. When exceeded, the oldest session is signed out (or login is blocked, by flag).

### 5.6 Protection against attacks

- 5 wrong passwords in 15 minutes locks the account for 15 minutes (counter in Redis per identifier and per IP).
- Rate limit OTP: 3 per hour per phone.
- CAPTCHA (hCaptcha or Cloudflare Turnstile) after 3 failed attempts and on admin login.
- Generic error text ("Email or password is wrong") so no one can discover which emails exist.
- Alert email on login from a new device.

### 5.7 Forgot password

1. User enters email or phone.
2. Server sends a one-time code (email) or OTP (SMS), valid 10 minutes, used once.
3. User sets a new password. All sessions are revoked. Confirmation email is sent.

### 5.8 Admin login rules

- Separate login page on the admin domain, email + password + TOTP code (Google Authenticator).
- Optional IP allowlist per admin.
- Idle timeout 15 minutes.
- Single session per admin by default.
- Failed admin logins notify Super Admin.

### 5.9 Auth screens (UI)

| Screen | Elements |
| --- | --- |
| Splash | Logo, version, loading bar. Checks `/config` (maintenance, force update) |
| Welcome | Logo, tagline, buttons **Login** and **Create account** |
| Login | One input (Email or phone), password input with eye icon, **Forgot password?** link, Login button, link to Create account |
| Create account | Multi-step form with progress bar (Details, Verify, Categories, Business info, Review) |
| OTP | 6 boxes, resend timer 30 seconds, change number link |
| Pending | Illustration, status chips per category, edit details button, contact support button |
| Rejected | Reason text, Edit and resubmit, Contact support |
| Suspended or Banned | Reason and appeal button |
| Subscription expired | Plan cards, Renew button, remaining grace days |

---

## 6. Feature Specification (Every Feature: How It Works, UI, Rules, Local and Redis)

Format for each feature: **How it works**, **UI**, **Rules**, **Local** (on the phone), **Redis** (server memory), **Flag** (Admin control). PostgreSQL is the permanent store for everything, so it is not repeated. MMKV = fast key-value storage on the phone. SQLite = local database on the phone (WatermelonDB).

### 6.1 Space Switcher and Home

- **How it works:** After login the app loads `/me/spaces` (categories where the user is approved). Each Space has its own accent colour. The user taps a Space chip at the top to switch. The last chosen Space is remembered.
- **UI:** Top bar: Space chips (Clothing, Hardware, All). Bottom tabs: **Chats, Groups, Catalog, Updates, Profile**. A small coloured dot on every chat row shows its category. "All" shows a combined inbox with category chips.
- **Rules:** A Space appears only if `canAccessCategory` is true. If subscription is in Grace, a yellow banner shows days left. If expired, the Space shows the Renew screen.
- **Local:** MMKV `ui.lastSpace`, `config.flags`, `me.spaces`.
- **Redis:** `access:{userId}` (cached categories, 60 s).
- **Flag:** `category.enabled`, `module_*`.

### 6.2 Profile and Business Profile

- **How it works:** Common part (name, photo, about, city) plus one business card per category (business name, address, GST, categories, product highlights, working hours, shop photos).
- **UI:** Profile tab: avatar, name, verified tick, category chips, **Edit**, **My products**, **Subscription**, **Devices**, **Settings**. Viewing another person's profile shows only the shared-category cards, with buttons **Message**, **View catalog**, **Send enquiry**, **Block**, **Report**.
- **Rules:** Edits to business name or GST can set `requires_reapproval` (flag). Photo max 5 MB.
- **Local:** SQLite `users` cache (only people the user can see).
- **Redis:** `profile:{id}:{viewerCategoryHash}` for 5 minutes.
- **Flag:** `is_verified`, `requires_reapproval`.

### 6.3 Directory and Search

- **How it works:** Inside a Space the user opens **Directory** to find members of the same category by name, business, city or product. Global search finds chats, messages, products and people, but only inside accessible categories.
- **UI:** Search bar with filter chips (City, Verified, Category). Result rows: avatar, business name, city, verified tick, **Message** button.
- **Rules:** Server adds `category_id IN (user's categories)`. Hidden users (`hidden_from_search`) never appear. Phone and email are NEVER shown in directory. **Do not sync the phone's contact book** (it would leak cross-category links).
- **Local:** Recent searches in MMKV. Cached results in memory only.
- **Redis:** Rate limit `rl:search:{userId}` (30 per minute).
- **Flag:** `module_directory`, `hidden_from_search`.

### 6.4 One-to-One Chat (Complete)

**Chat list**

- **UI:** Row = avatar, name, last message preview, time, unread badge, category dot, mute and pin icons. Swipe left: Archive, Mute. Long press: Pin, Mark unread, Delete chat. Top filters: All, Unread, Groups, Archived.
- **Local:** SQLite `chats`, `messages`. **Redis:** `unread:{userId}` hash counters.

**Message sending**

- **How it works:** App writes the message to SQLite with state `pending` (clock icon), sends over the WebSocket with a client-generated `clientMsgId`. Server checks access, saves to PostgreSQL, answers `ack` (one tick). Receiver's app confirms delivery (two grey ticks) and read (two blue ticks). If offline, the message waits in the local outbox and is retried with the same `clientMsgId` (no duplicates).
- **Redis:** `presence:{userId}`, `typing:{chatId}` (3 s expiry), `offline_queue:{userId}` (messages waiting for push), `idem:{clientMsgId}` (dedupe, 24 h).
- **Rules:** Every send passes `canInteract` and the flags `can_send_message`, `read_only_mode`, `daily_message_cap`.

**Message actions (long press bar)**

| Feature | How it works | UI |
| --- | --- | --- |
| **Reply** | Swipe a bubble right (or Reply icon). Stores `reply_to_id` plus a snapshot (sender, type, first 100 characters, thumbnail) | Preview strip above the input with close (X); quoted block with coloured bar inside the bubble; tap quote scrolls to original and flashes it |
| **Forward** | Arrow icon, choose up to 5 chats from eligible chats and groups | Label "Forwarded" with arrow icon; after 5 hops "Forwarded many times" with double arrow and only 1 chat at a time. Server blocks ineligible targets |
| **Star (Save)** | Star icon, personal and private | Star next to time; **Starred** list in Profile, filterable by category |
| **React** | Pick emoji, one per user per message | Small bubble under the message with count |
| **Edit** | Own text only, within `message_edit_minutes` | "Edited" label |
| **Delete** | For me, or for everyone within `delete_for_everyone_hours` | "This message was deleted" |
| **Copy / Select many** | Text copy; multi-select for bulk forward, star, delete | Top bar changes to selection mode |
| **Message info** | Delivered and read times | Bottom sheet |
| **Pin message** | In a chat, 24 h, 7 days or 30 days | Pinned banner at the top |
| **Report** | Sends message to moderation queue | Reason picker |

**Other chat features**

- Voice message: hold mic to record, slide left to cancel, slide up to lock, playback 1x, 1.5x, 2x, waveform.
- Media: photo (compress, crop, caption), video (trim, compress), document, location, contact card, **product card**, **catalog card**, **quotation card**.
- Link preview, typing indicator, online and last seen (privacy setting), in-chat search, mute (8 h, 1 week, always), archive, block, clear chat, export chat (flag).
- Scroll: pagination 30 messages at a time from SQLite; older messages fetched from server by cursor.
- **Local:** SQLite messages (encrypted DB key in secure storage), media cache folder with size limit and "Clear cache" button, draft text per chat in MMKV `draft:{chatId}`.
- **Flag:** `module_chat`, `message_edit_minutes`, `can_share_media`, `media_max_mb`.

### 6.5 Groups

- **How it works:** A group belongs to **one** category. Creator becomes Group Admin. Members are added only from eligible people of that category. If a member loses the category, a background job removes them and posts "X left" (or a silent removal by flag).
- **UI:** Groups tab lists groups of the current Space. Create group wizard: category (locked to current Space), name, icon, description, add members (list shows only eligible members), settings. Group info screen: members, media, products shared, pinned, settings, report, leave.
- **Settings:** who can send (all or admins), who can edit info, approval to join, invite link (only works for eligible users), message expiry, member limit.
- **Rules:** `max_groups`, `max_group_size`, `can_create_group`. Group name and member list are never visible to ineligible people. Admin-created official groups are possible (Category Admin).
- **Local:** SQLite `groups`, `group_members`. **Redis:** `grp:{id}:members` set (for fast fan-out), socket room `cat:{c}:chat:{g}`.
- **Flag:** `module_groups`, `can_create_group`.

### 6.6 Product Create (Easy and Fast)

- **Quick Add (10 seconds):** Tap **+** in Catalog, take or pick photo(s), type name and price, tap **Save**. Category is the current Space. All other fields are optional and can be filled later.
- **Full form fields:** Photos (up to 8, drag to reorder, first is cover), name, price, price unit (piece, dozen, kg, metre), MOQ (minimum order), stock status (In stock, Low, Out), description, tags, brand, **category-specific fields** from `catalog_fields` (Clothing: fabric, sizes, colours, GSM, set size. Hardware: material, size, grade, HSN code, warranty).
- **Variants:** add colour and size rows, each with its own price and stock.
- **Bulk add:** pick up to 20 photos at once, app creates 20 draft products with names from file names; user fills names and prices in a quick list screen.
- **Voice add (optional, flag):** speak the product details, the app sends audio text to the AI endpoint and fills the form.
- **AI helper (optional, flag `module_ai_tools`):** from a photo, suggest name, description and tags (Claude API via backend only; never call from the phone).
- **Status:** Draft, Published, Hidden, Out of stock. Only Published products are visible to others.
- **Rules:** `max_products`, image max 5 MB each (auto-compressed to about 1080 px, WebP), price must be a positive number, prohibited-word filter, category is fixed after creation (to move a product, create a copy).
- **Local:** Draft products saved in SQLite so work is not lost; images queued in an upload queue and retried in the background.
- **Redis:** `rl:product:create:{userId}` (rate limit), job queue `media-process` (thumbnails, WebP).
- **UI:** Catalog tab: grid of product cards (cover, name, price, stock chip), floating **+** button, filter by collection, search. Product detail: image carousel with pinch zoom, price, MOQ, variants, description, **Share**, **Edit**, **Hide**, **Duplicate**.

### 6.7 Product Easy Send

| Way to send | Steps |
| --- | --- |
| From inside a chat | Attach (+) then **Catalog** then tick one or many products then **Send**. Sent as a **product card** (photo, name, price, MOQ) with buttons **View** and **Send enquiry** |
| From the product page | **Share** then choose chats and groups (up to 5 at a time, only eligible targets) then Send |
| Send as album | Many products become one horizontal carousel message |
| Share full catalog or collection | Creates a deep link `tradecircle.app/c/{code}`. Opens the app for eligible logged-in users; others see "Join TradeCircle" only, with no data |
| PDF catalog | Choose products, template (with or without price), app generates a PDF and attaches it to the chat (watermarked with the sender's business name) |
| Recents | The attach menu shows the last 10 products shared and a **Send last product again** shortcut |
| Quick reply with product | Type `#` in the message box and search a product by name to insert its card |

- **Rules:** The product's category must be one of the **shared categories** of the chat or group; otherwise the server rejects the send. Prices can be hidden per share ("Ask price"). The receiver cannot forward a product to an ineligible chat.
- **Local:** Recent shares in MMKV `recent.products`. **Redis:** `shortlink:{code}` (resolves link to product or catalog, 24 h cache).
- **Flag:** `can_share_product`, plan flag `can_share_catalog_pdf`.

### 6.8 Catalog and Collections

- Collections group products (for example "Summer 2026", "Fasteners"). One product can be in many collections of the same category.
- Catalog page of a seller (seen by eligible members): banner, about, collections, products, **Message** and **Send enquiry** buttons.
- Share a collection link or PDF (Section 6.7).
- **Local:** cached seller catalogs for 10 minutes. **Redis:** `catalog:{ownerId}:{categoryId}` cache cleared on any product change.

### 6.9 Enquiry, Quotation and Order

- **Enquiry:** Buyer taps **Send enquiry** on a product, enters quantity and note. An enquiry card appears in the chat with the seller and in the seller's **Enquiries** list. Status: New, Replied, Closed.
- **Quotation:** Seller replies with a quotation card (items, price, GST, validity date, terms). Buyer can **Accept**, **Reject** or **Counter**.
- **Order (simple):** Accepted quotation becomes an order record (Pending, Confirmed, Dispatched, Delivered, Cancelled). Payment between users happens outside the app in version 1.
- **UI:** Tab inside the Profile area: **Enquiries** and **Orders** with status filters; each opens the linked chat.
- **Rules:** Category from the product; both users must be eligible; edits are logged.
- **Flag:** `module_enquiry`.

### 6.10 Updates Feed (Category Feed)

- **How it works:** Members post short updates (new arrivals, offers, stock news) into the feed of **one category**. Eligible members see the feed of their Spaces. Like, comment (flag), share to chat, report.
- **UI:** Updates tab: vertical list of posts (author, time, text, images, linked products). **+** button to post. Pull to refresh.
- **Rules:** Per-day post limits by plan, prohibited-word filter, Category Admin can pin or remove posts.
- **Redis:** `feed:{categoryId}` sorted set of recent post ids. **Local:** last 50 posts cached.
- **Flag:** `module_feed`, `can_post_feed`, `category.allow_feed`.

### 6.11 Status (24 Hour Stories)

- Post photo, video or text; choose which of your categories can see it (default: current Space). Expires after 24 hours. Owner sees the viewers list. Reply opens a chat with the quote (the reply is allowed only if still eligible).
- **Redis:** `status:{categoryId}` with TTL 24 h; `status:views:{statusId}`.
- **Flag:** `module_status`, `can_post_status`.

### 6.12 Announcements and Broadcast Lists

- **Announcement:** Admin message to one category or everyone (Super Admin only). Shows as a banner and a pinned item in the Updates tab. Optional push.
- **Broadcast list (user):** One message sent individually to up to N eligible contacts of one category (limit by plan). Receivers see it as a normal one-to-one message.
- **Flag:** `can_broadcast`.

### 6.13 Notifications

- Types: new message, group message, enquiry, quotation update, approval result, subscription reminder, announcement, report outcome, security alert (new device login).
- **How it works:** Backend enqueues a BullMQ job, sends via FCM (Android and iOS). Notification channels on Android: Messages, Business, Account.
- **Rules:** Content preview can be turned off. Muted chats do not notify. Do-not-disturb hours. The server re-checks eligibility before sending.
- **Local:** notification settings in MMKV. **Redis:** `rl:push:{userId}` grouping to avoid spam.

### 6.14 Subscription (User Side)

- Screens: **My plan** (category, plan, expiry, auto-renew), **Plans** (cards per category with price, features), **Checkout** (Razorpay: UPI, card, net banking, autopay), **Invoices** (download PDF with GST), **Coupon** field.
- Banners: trial ending (3 days), grace period (red), expired. Add another category from the same screen (goes to approval first, then payment).
- Rules in Section 2 and 8.

### 6.15 Settings and Privacy

- Account: edit profile, change password, change email or phone (needs OTP), devices, delete account.
- Privacy: last seen, online, profile photo, read receipts, who can add me to groups (only among eligible).
- Notifications, chat settings (wallpaper, font size, auto-download, media quality), storage usage and **Clear cache**, language (English, Hindi, Gujarati), theme (Light, Dark, System), app lock, help and support, terms and privacy, app version.

### 6.16 Block, Report and Safety

- Block hides the person from chat and group lists for the blocker and stops messages.
- Report reasons: spam, fake business, abusive, wrong category, scam. Goes to Moderator or Category Admin queue.
- Auto actions by flag: 5 reports in 24 hours leads to automatic mute and review.

### 6.17 Help and Support Tickets

- User opens **Help**, picks a topic, writes a message with optional screenshot. A ticket is created and shown to Support Admin. Replies come as notifications and in the Help screen.

### 6.18 Later Phase

- Voice and video calls (WebRTC with LiveKit), AI tools (product description, reply suggestions, translation), multi-language product titles, bulk import of products from Excel, seller analytics (views, enquiries per product).

---

## 7. Admin Panel (Complete Module List)

Built with Next.js. Left sidebar shows only the modules the logged-in admin is allowed to see. Every table has search, filters, sort, pagination, column chooser and Export (CSV or Excel, if permitted). Every write action asks for confirmation and writes an audit log.

| # | Module | Screens and features |
| --- | --- | --- |
| 1 | **Dashboard** | Cards: total users, pending approvals, active subscriptions, today and month revenue, new sign-ups, online now, messages today, open reports, expiring this week. Charts: sign-ups, revenue, users per category, messages per day. Filter by date and category |
| 2 | **Approvals queue** | List by category with submitted details and documents; Approve, Reject (reason from templates), Ask more info; bulk approve; SLA timer (waiting hours); assign to an admin |
| 3 | **Users** | List with filters (category, status, plan, city, verified, flagged). **User detail tabs:** Profile, Categories (approve or remove each), Subscription and payments, **Sessions** (list, revoke, block device), **Flags** (all user flags with reset to default), Groups, Products, Activity timeline, Reports against user, Internal notes. Actions: suspend, ban, unban, mute, verify badge, reset password, force logout, change email or phone, impersonate (read-only, by flag), delete |
| 4 | **Categories** | Create, edit, enable or disable; icon, accent colour, description, rules text; registration extra fields; catalog fields; price, trial and grace days; assign Category Admins; per-category module switches |
| 5 | **Admins and Roles** | Create admin accounts, assign role and categories; **Role builder** (tick permission keys); admin flags (2FA, IP allowlist, refund limit, session timeout); admin sessions; disable admin |
| 6 | **Flags Center** | Tabs: Global, Category, Plan, User. Search by key; change value; see who changed it and when; schedule a change; rollback to a previous value; bumping a flag emits `config.changed` |
| 7 | **Groups** | All groups with category, members, owner, size, activity; open group; lock, rename, remove member, change group admin, delete; search by name |
| 8 | **Chats and Messages (Moderation)** | Reported items queue; open conversation in audit mode (needs `can_view_chats` and a reason); delete message or media; mute or ban sender; keyword search (reason required) |
| 9 | **Products and Catalogs** | List by category and seller; view product; hide or remove; flag prohibited items; limits per plan |
| 10 | **Feed and Status moderation** | Posts list; pin, remove; report queue |
| 11 | **Enquiries and Orders (read)** | Overview for disputes: list, status, chat link (audit mode) |
| 12 | **Reports** | Queue with filters (type, category, status); decision buttons: Dismiss, Warn, Mute 24 h, Suspend, Ban; decision templates; repeat offender score |
| 13 | **Announcements** | Compose (title, body, image, link), choose all or category, schedule, push on or off, history and read counts |
| 14 | **Plans, Coupons and Payments** | See Section 8 |
| 15 | **Theme and Branding (central control)** | App name, logo, splash, primary colour, accent per category, light and dark preview, font choice; **Publish theme** raises `theme_version`; apps download the new theme within seconds |
| 16 | **Content and Policies** | Terms, privacy policy, help articles, FAQ, onboarding slides, rejection reason templates, notification templates (email, SMS, push) in 3 languages |
| 17 | **Platform Settings** | OTP and SMS provider keys, email (SES) settings, storage, limits, maintenance mode, force update, registration open, allowed countries |
| 18 | **Support Tickets** | Inbox, assign, reply, status, canned replies |
| 19 | **Audit Logs** | Search by admin, action, entity, date; before and after values; IP; export. Logs are append-only |
| 20 | **System Health** | API latency, errors, socket connections, Redis memory, DB connections, queue sizes (BullMQ board), storage use, recent deploys; alert thresholds (Section 15) |

---

## 8. Payments and Subscription Control (Finance)

### 8.1 Payment flow

1. User picks plan and category. App calls `POST /subscriptions/checkout`; server creates a Razorpay order or subscription and a `payments` row with state `created`.
2. App opens the Razorpay checkout (react-native-razorpay).
3. On success the app sends the payment details to the server for **signature verification**. The final truth comes from the **Razorpay webhook** (HMAC SHA256 with the webhook secret). Webhook handling is idempotent (same event id is processed once).
4. On `captured`: payment becomes `paid`, subscription becomes `active` with new end date, invoice is created, `access.changed` is emitted.
5. On `failed`: state `failed`, reminder is sent, subscription goes to Grace and then Expired by the daily job.

### 8.2 Payment states

`created`, `authorized`, `paid`, `failed`, `refund_pending`, `refunded`, `partially_refunded`, `manual_pending`, `manual_verified`, `manual_rejected`, `disputed`.

### 8.3 Finance Admin screens

| Screen | Features |
| --- | --- |
| **Payments list** | Filters: date, status, category, plan, method, amount; search by user, order id or payment id; totals row; export |
| **Payment detail** | Gateway ids, amount, tax split, user, subscription, webhook log, timeline, invoice, **Refund** button |
| **Manual payment check** | For bank transfer or UPI outside the gateway: user uploads UTR number and screenshot, Finance sees it in a queue, Verify or Reject, on Verify the subscription is activated and an audit entry is saved |
| **Mismatch queue** | Nightly reconciliation compares Razorpay settlement reports with the database. Differences land here for review |
| **Refunds** | Request, approve, process. Up to `refund_limit_amount` Finance can approve alone; above that Super Admin approval is required (maker-checker) |
| **Plans** | Create or edit plans per category or bundle: price, duration, GST percent, trial days, feature limits (same flags as Section 3.3), active dates |
| **Coupons** | Code, percent or flat, validity, usage limit, categories, first-time only |
| **Invoices** | GST invoice PDF (CGST and SGST or IGST by state), numbering series, resend by email |
| **Revenue reports** | Daily, monthly, by category and plan, MRR, churn, renewals due, failed payments, GST summary export |
| **Manual subscription tools** | Extend end date, give free access with reason, pause, cancel, change plan (all audited) |
| **Dunning** | Auto reminders at 7, 3, 1 day before expiry and on failure; templates editable |

### 8.4 Subscription status rules

`trial`, `active`, `grace`, `expired`, `cancelled`, `paused`. A daily job (BullMQ, 02:00) moves subscriptions between states and emits `access.changed` for every change. `canAccessCategory` treats `trial`, `active` and `grace` as allowed.

---

## 9. UI, Colour Combination and Central Theme Control

### 9.1 Colour palette (brand)

The look is calm, trustworthy and business-like. It is deliberately **not green**, so it does not look like WhatsApp. Deep teal is the brand; amber is for highlights and paid features.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `primary` | #0E7490 | #22D3EE | Main buttons, links, active tab, send button |
| `primaryDark` | #155E75 | #0891B2 | Pressed state, headers |
| `accent` | #F59E0B | #FBBF24 | Highlights, premium and subscription badges |
| `bg` | #F8FAFC | #0B1220 | Screen background |
| `surface` | #FFFFFF | #111A2C | Cards, sheets, inputs |
| `surfaceAlt` | #F1F5F9 | #172036 | Chat background, section headers |
| `border` | #E2E8F0 | #243049 | Dividers, input borders |
| `text` | #0F172A | #E5E7EB | Main text |
| `textMuted` | #64748B | #94A3B8 | Secondary text, timestamps |
| `success` | #16A34A | #4ADE80 | Approved, paid, delivered |
| `warning` | #D97706 | #FBBF24 | Grace period, pending |
| `danger` | #DC2626 | #F87171 | Errors, delete, ban |
| `info` | #2563EB | #60A5FA | Info banners, read ticks |
| `bubbleSent` | #D6F3F8 | #134E5E | My message bubble |
| `bubbleReceived` | #FFFFFF | #1B2740 | Other person's bubble |
| `tickRead` | #2563EB | #60A5FA | Blue ticks |
| `tickNormal` | #94A3B8 | #64748B | Grey ticks |
| `overlay` | rgba(15,23,42,0.5) | rgba(0,0,0,0.6) | Modal backdrop |

### 9.2 Category accent colours (each Space has its own)

| Category | Accent |
| --- | --- |
| Clothing | #DB2777 (rose) |
| Hardware | #EA580C (orange) |
| Electronics | #2563EB (blue) |
| Grocery | #16A34A (green) |
| Furniture | #92400E (brown) |
| Stationery | #7C3AED (violet) |
| Auto parts | #475569 (slate) |
| Default | #0E7490 (brand teal) |

**Where the accent is used:** category chip, the dot on chat rows, the active tab underline while inside that Space, product card category badge and the Space switcher highlight. **Never** use the accent as large background or as body text colour (contrast problems).

### 9.3 Typography, spacing and shape

- Font: **Inter** (Latin) with **Noto Sans Devanagari** (Hindi) and **Noto Sans Gujarati** as fallback. Admin can switch fonts only from the allowed list.
- Sizes: caption 12, body 15, body-large 17, title 20, headline 24, display 30. Weights 400, 500, 600, 700. Respect the phone's font scaling up to 1.3x.
- Spacing grid 4 pt: 4, 8, 12, 16, 24, 32. Screen side padding 16.
- Corner radius: input and button 12, card 16, chat bubble 16 (tail corner 4), avatar full circle.
- Elevation: cards use a 1 px border in light mode and a softer surface in dark mode (no heavy shadows).
- Minimum touch target 44 x 44 pt. Text contrast at least 4.5:1.
- Icons: `lucide-react-native` (one icon set only). Illustrations: simple line style in brand colours.
- Motion: 150 to 250 ms ease-out; swipe-to-reply uses a spring; respect "reduce motion".

### 9.4 Central theme control (Admin changes the look without a new release)

1. Super Admin opens **Theme and Branding** and edits colours, logo, fonts, category accents. A live preview shows light and dark.
2. Clicking **Publish theme** saves a JSON file and raises `theme_version`.
3. App calls `GET /config/theme?v={localVersion}` on open and on `config.changed`. If the version is newer, it downloads and saves the theme in MMKV.
4. The app has a **built-in default theme** in the code. If the download fails, the default is used, so the app never breaks.
5. All screens read colours only from `useTheme()`. **No hard-coded colour values in components.**

```json
{
  "version": 7,
  "fonts": { "family": "Inter" },
  "light": { "primary": "#0E7490", "accent": "#F59E0B", "bg": "#F8FAFC" },
  "dark":  { "primary": "#22D3EE", "accent": "#FBBF24", "bg": "#0B1220" },
  "categories": { "clothing": "#DB2777", "hardware": "#EA580C" },
  "logoUrl": "https://cdn.example.com/brand/logo.png"
}
```

Native parts that cannot change without a release: app icon, splash image, Android and iOS app name. Decide these before launch.

### 9.5 Reusable UI components (build these first)

`Button` (primary, secondary, ghost, danger; loading and disabled states), `Input` (label, error, eye icon, clear), `PasswordInput`, `OtpInput`, `Chip`, `CategoryChip`, `Avatar` (image, initials, online dot), `Badge` (unread, verified), `ListRow`, `SearchBar`, `Tabs`, `SpaceSwitcher`, `BottomSheet`, `Modal`, `ConfirmDialog`, `Toast`, `EmptyState`, `ErrorState` with retry, `SkeletonLoader`, `Banner` (info, warning, danger), `Header`, `FAB`, `MessageBubble` (text, image, video, doc, voice, product card, catalog card, quotation card, system message), `ReplyPreview`, `ReactionBar`, `ProductCard`, `ProductForm`, `ImageCarousel`, `PlanCard`, `StatusRing`.

### 9.6 Navigation map

```
Auth stack: Splash -> Welcome -> Login | Register (steps) -> OTP -> Pending
App (bottom tabs)
  Chats    -> ChatList -> Chat -> UserProfile | MediaViewer | ProductView
  Groups   -> GroupList -> Group -> GroupInfo | CreateGroup
  Catalog  -> MyCatalog -> ProductDetail | ProductNew | Collections | PdfBuilder
  Updates  -> Feed | Status | Announcements
  Profile  -> MyProfile -> Edit | Enquiries | Orders | Starred | Subscription | Invoices | Devices | Settings | Help
Global: Space switcher (top), Search, Notifications
```

### 9.7 Key screen layouts

```
CHAT SCREEN                          PRODUCT CARD IN CHAT
+-----------------------------+      +-----------------------+
| <  Avatar  Name  [dot]  ... |      | [ cover photo ]       |
|  pinned message banner      |      | Cotton Shirt Set      |
|-----------------------------|      | Rs 450 / pc  MOQ 12   |
|        (messages)           |      | [View] [Send enquiry] |
|  +---------------+          |      +-----------------------+
|  | reply quote   |  14:02   |
|  | text          |  v/vv    |      CATALOG GRID
|  +---------------+          |      +-------+ +-------+
|-----------------------------|      | photo | | photo |
| reply strip (X)             |      | name  | | name  |
| [+] [ message....  ] [mic]  |      | Rs    | | Rs    |
+-----------------------------+      +-------+ +-------+  (+) FAB
```

### 9.8 Required states for every screen

Loading (skeleton), Empty (message and action), Error (message and Retry), Offline (banner, cached data), No permission (flag off: friendly text), Subscription expired (renew prompt).

---

## 10. Where Data Lives: Phone, Redis, Database, Storage

### 10.1 Rule of thumb

- **Phone:** only what is needed for speed and offline use. Never store anything the user is no longer allowed to see (wipe on logout and on `access.changed` for that category).
- **Redis:** fast, temporary, shared state (online status, counters, caches, queues, rate limits).
- **PostgreSQL:** the permanent truth.
- **S3 (object storage):** files only.

### 10.2 Feature-wise table

| Feature | On the phone | Redis (server) | Permanent |
| --- | --- | --- | --- |
| Tokens | Secure store (Keychain or Keystore): refresh token. Memory: access token | `sess:{sid}` active flag | `sessions` table (hashed token) |
| Flags and config | MMKV `config.flags` | `cfg:{userId}` merged flags (5 min) | `flags` tables |
| Theme | MMKV `theme.json`, `theme.version` | `theme:current` | `theme` table |
| Profile cache | SQLite `users` | `profile:{id}:{hash}` (5 min) | `users`, `user_categories` |
| Chats and messages | SQLite (offline) | `unread:{uid}`, `typing:{chat}`, `offline_queue:{uid}` | `messages`, `chats` |
| Outgoing queue | SQLite `outbox` | `idem:{clientMsgId}` | Message row |
| Drafts | MMKV `draft:{chatId}` | none | none |
| Presence (online) | in memory | `presence:{uid}` TTL 60 s | `last_seen_at` |
| Media | File cache folder (size limit) | job queue `media-process` | S3 plus `media` table |
| Products (own) | SQLite (drafts and published) | `catalog:{owner}:{cat}` | `products`, S3 images |
| Products (others) | Cache 10 minutes | same cache key | same |
| Collections and PDFs | PDF file in temp cache | PDF job queue | S3 (7 days) |
| Recent shares | MMKV `recent.products` | none | `share_events` |
| Enquiry, quotation, order | SQLite cache | none | `enquiries`, `orders` |
| Feed | SQLite last 50 | `feed:{cat}` sorted set | `posts` |
| Status | In memory | `status:{cat}` TTL 24 h | `statuses` |
| Search | Recent terms in MMKV | `rl:search:{uid}` | search index (Meilisearch) |
| Access result | Spaces list in MMKV | `access:{uid}` (60 s) | `user_categories` |
| OTP codes | none | `otp:{phoneOrEmail}` (10 min, hashed) | none |
| Login attempts | none | `fail:{identifier}`, `fail:ip:{ip}` (15 min) | `login_logs` |
| Rate limits | none | `rl:*` counters | none |
| Push notifications | Settings in MMKV | BullMQ queue `push` | `notifications` |
| Short links | none | `shortlink:{code}` | `short_links` |
| Subscription state | MMKV `me.subscription` | `sub:{uid}` (5 min) | `subscriptions`, `payments` |
| Language and theme mode | MMKV | none | `user_settings` |

### 10.3 What must NEVER be stored on the phone

Plain passwords, refresh token outside secure store, other users' phone numbers or emails, anything of a category the user lost access to, admin data.

### 10.4 Wipe rules

- **Logout:** delete SQLite, MMKV (except language), media cache, secure store.
- **`access.changed` (category lost):** delete local rows with that `category_id` (chats, groups, products, posts) and refresh Spaces.
- **Account deleted or banned:** same as logout.

### 10.5 Redis key catalogue

| Key | Type | TTL | Purpose |
| --- | --- | --- | --- |
| `sess:{sid}` | string | token life | Instant session revoke |
| `access:{uid}` | JSON | 60 s | Allowed categories |
| `cfg:{uid}` | JSON | 5 min | Merged flags |
| `presence:{uid}` | string | 60 s, refreshed by heartbeat | Online status |
| `typing:{chatId}:{uid}` | string | 3 s | Typing indicator |
| `unread:{uid}` | hash | none | Unread counters |
| `idem:{clientMsgId}` | string | 24 h | No duplicate messages |
| `otp:{target}` | hash | 10 min | OTP hash and attempts |
| `fail:{identifier}` | counter | 15 min | Login lock |
| `rl:{scope}:{id}` | counter | window | Rate limits |
| `grp:{id}:members` | set | none | Fast group fan-out |
| `feed:{cat}` | sorted set | none (trimmed) | Recent post ids |
| `status:{cat}` | sorted set | 24 h | Active statuses |
| `shortlink:{code}` | string | 24 h | Deep link lookup |
| BullMQ queues | internal | n/a | `push`, `media-process`, `pdf`, `email`, `sms`, `subscription-expiry`, `reconcile`, `cleanup` |
| Pub/Sub channels | n/a | n/a | `session.revoked`, `access.changed`, `config.changed`, socket adapter |

---

## 11. Technology Stack and Every Library

**Rule for versions:** use the latest stable release at project start, pin exact versions in the lockfile, and upgrade deliberately. For the mobile app use **Expo with a development build** (not Expo Go), because native modules are needed.

### 11.1 Mobile app (React Native)

| Area | Choice and libraries |
| --- | --- |
| Core | React Native with New Architecture and Hermes, **Expo SDK** (dev client, EAS Build, EAS Update for over-the-air fixes), TypeScript strict |
| Navigation | `expo-router` (file based) on top of React Navigation |
| Client state | `zustand` |
| Server state | `@tanstack/react-query` |
| Forms | `react-hook-form`, `zod`, `@hookform/resolvers` |
| Network | `axios` (with refresh-token interceptor), `socket.io-client`, `@react-native-community/netinfo` |
| Local storage | `react-native-mmkv` (key-value), `@nozbe/watermelondb` (SQLite, offline chat and sync), `expo-secure-store` (tokens), `react-native-quick-crypto` (database key) |
| Lists and speed | `@shopify/flash-list` (chat list, inverted message list), `expo-image` (cached images) |
| Gestures and animation | `react-native-gesture-handler` (swipe to reply), `react-native-reanimated`, `lottie-react-native` |
| UI helpers | `@gorhom/bottom-sheet`, `react-native-keyboard-controller`, `react-native-safe-area-context`, `react-native-svg`, `lucide-react-native`, `sonner-native` (toasts), `expo-haptics`, `rn-emoji-keyboard` |
| Theming | Custom `ThemeProvider` and `useTheme()` reading tokens (Section 9); optional `nativewind` |
| Media | `expo-image-picker`, `expo-document-picker`, `expo-image-manipulator`, `react-native-compressor` (video and image), `expo-audio` (voice record and play), `expo-video`, `expo-file-system`, `expo-media-library`, `expo-sharing`, `expo-print` (PDF catalog), `react-native-pdf`, `expo-location` |
| Notifications | `@react-native-firebase/app`, `@react-native-firebase/messaging`, `@notifee/react-native` (channels, grouping) |
| Payments | `react-native-razorpay` |
| Security | `expo-local-authentication` (app lock), `react-native-device-info`, `expo-crypto`, optional `jail-monkey` (root check) |
| Language | `i18next`, `react-i18next`, `expo-localization` |
| Utilities | `date-fns`, `libphonenumber-js`, `linkify-it`, `expo-linking` (deep links), `expo-clipboard`, `react-native-url-polyfill`, `expo-application` |
| Monitoring | `@sentry/react-native`, `posthog-react-native` (product analytics) |
| Testing and quality | `jest`, `@testing-library/react-native`, **Maestro** (end-to-end flows), `eslint`, `prettier`, `husky`, `lint-staged` |

For the chat screen build a **custom** list with FlashList. `react-native-gifted-chat` may be used for a quick prototype only.

### 11.2 Backend

| Area | Choice and libraries |
| --- | --- |
| Runtime | Node.js LTS, **NestJS** with the Fastify adapter, TypeScript |
| Database | PostgreSQL, **Prisma** (or Drizzle), **PgBouncer** for connections |
| Cache, pub/sub, queues | Redis, `ioredis`, `bullmq`, `@bull-board/nestjs` (queue dashboard) |
| Real time | `@nestjs/websockets`, `@nestjs/platform-socket.io`, `@socket.io/redis-adapter` |
| Auth and security | `@nestjs/jwt`, `argon2`, `@casl/ability` (permissions), `otplib` and `qrcode` (admin 2FA), `helmet`, `@nestjs/throttler` with Redis storage, `ua-parser-js`, `maxmind` (IP to city) |
| Validation | `zod` (shared with the apps) or `class-validator` and `class-transformer` |
| Files and media | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp` (images to WebP), `fluent-ffmpeg` with `ffmpeg-static` (video and audio) |
| Documents | `pdfkit` (invoices and PDF catalogs) |
| Messaging services | `firebase-admin` (FCM), `@aws-sdk/client-ses` or `nodemailer` (email), MSG91 over HTTPS (SMS OTP), `razorpay` SDK |
| Search | `meilisearch` client (phase 2; start with PostgreSQL full text) |
| API docs and health | `@nestjs/swagger`, `@nestjs/terminus`, `prom-client` |
| Logs and errors | `nestjs-pino`, `@sentry/node` |
| AI features (optional) | Anthropic SDK (`@anthropic-ai/sdk`), called only from the backend with a rate limit and flag |
| Testing | `jest`, `supertest`, `testcontainers` (real Postgres and Redis in tests), `k6` or `artillery` (load tests) |

### 11.3 Admin panel

| Area | Choice and libraries |
| --- | --- |
| Framework | **Next.js** (App Router), React, TypeScript |
| UI | `tailwindcss`, **shadcn/ui** (Radix), `lucide-react`, `next-themes`, `sonner`, `cmdk` (command search) |
| Data | `@tanstack/react-query`, `@tanstack/react-table`, `nuqs` (filters in URL) |
| Forms | `react-hook-form`, `zod` |
| Charts | `recharts` |
| Theme editor | `react-colorful` (colour picker), `@dnd-kit/core` (reorder) |
| Auth | httpOnly secure cookies (access and refresh handled by the API), `otpauth` and `qrcode.react` for 2FA setup |
| Live data | `socket.io-client` (live dashboard counters, new reports) |
| Export | `xlsx`, `papaparse` |
| Quality | `vitest`, `playwright`, `eslint`, `@sentry/nextjs` |

Optional shortcut: **Refine** framework can speed up CRUD tables, but the role and flag screens should still be custom.

### 11.4 Infrastructure and third-party services

| Need | Service |
| --- | --- |
| Cloud | AWS (EC2 or ECS, RDS PostgreSQL, ElastiCache Redis, S3, CloudFront, SES) in the **Mumbai region**. Cheaper start: DigitalOcean or Hetzner with managed Postgres |
| DNS, CDN, firewall | Cloudflare (WAF, DDoS, rate limiting) |
| SMS OTP | MSG91 (India), Twilio as backup |
| Email | AWS SES |
| Push | Firebase Cloud Messaging |
| Payments | Razorpay (UPI, cards, net banking, autopay, GST invoices) |
| CI/CD | GitHub Actions, EAS Build and EAS Submit |
| Containers | Docker, Docker Compose (local), Kubernetes later |
| Infrastructure as code | Terraform |
| Monitoring | Sentry, Prometheus, Grafana, Loki, uptime checks (UptimeRobot or Better Stack) |
| Secrets | AWS Secrets Manager or Doppler. Never commit `.env` files |

---

## 12. Folder Structure (Monorepo)

Use **pnpm workspaces** with **Turborepo**. One repository holds the app, API, admin and shared code, so a rule written once is used everywhere.

```
tradecircle/
  apps/
    mobile/        React Native (Expo)
    api/           NestJS backend
    admin/         Next.js admin panel
  packages/
    shared/        permission keys, flag keys and defaults, zod schemas,
                   enums, error codes, socket event names, theme types
    eslint-config/ tsconfig/
  infra/           docker, terraform, nginx, github workflows
  docs/            this specification, API docs, runbooks
  RULES.md         rules for AI agents (from Sections 2, 4, 5)
  CLAUDE.md        project instructions for Claude Code
  turbo.json  pnpm-workspace.yaml  package.json
```

### 12.1 Mobile app

```
apps/mobile/
  app/                       expo-router screens (thin, only routing)
    (auth)/ login.tsx register.tsx verify-otp.tsx pending.tsx forgot-password.tsx
    (app)/
      (tabs)/ chats/ groups/ catalog/ updates/ profile/
      chat/[id].tsx  group/[id].tsx  user/[id].tsx
      product/[id].tsx  product/new.tsx  collections/  pdf-builder.tsx
      enquiries/  orders/  subscription/  settings/  help/
  src/
    core/
      api/        axios client, interceptors, endpoints
      socket/     socket client, event handlers, reconnect
      db/         WatermelonDB schema, models, sync, migrations
      storage/    mmkv.ts, secure.ts, wipe.ts
      config/     flags store, /config loader
      theme/      tokens, ThemeProvider, useTheme, default theme
      i18n/       en.json, hi.json, gu.json
      access/     useSpaces, category guards for UI
      push/       FCM setup, channels, handlers
      utils/      date, format, validators
    features/                each feature has the same shape
      auth/ spaces/ directory/ chat/ groups/ catalog/ enquiries/
      feed/ status/ notifications/ subscription/ settings/ support/
        components/ hooks/ screens/ api.ts store.ts types.ts
    components/ui/           shared UI components (Section 9.5)
  assets/ fonts/ images/ lottie/
  app.config.ts  eas.json  babel.config.js  tsconfig.json  .env.example
```

### 12.2 Backend

```
apps/api/
  prisma/ schema.prisma  migrations/  seed.ts
  src/
    main.ts  app.module.ts
    common/        guards, decorators, filters, interceptors, pipes, utils
    access/        AccessService (canAccessCategory, canInteract), ScopedRepository,
                   AccessGuard, RequireCategory decorator
    flags/         FlagsService (resolution order), config controller
    gateway/       chat.gateway.ts, presence, typing, rooms, socket auth
    modules/
      auth/ sessions/ users/ categories/ approvals/ spaces/ directory/
      chats/ messages/ groups/ catalog/ (products, collections, shares)
      enquiries/ feed/ status/ announcements/ notifications/
      subscriptions/ payments/ invoices/ reports/ support/ media/ search/
      admin/ (admin-auth, roles, permissions, flags, audit, theme, dashboard, system)
    jobs/          processors: push, media, pdf, email, sms,
                   subscription-expiry, reconcile, cleanup
    integrations/  razorpay, msg91, ses, fcm, s3, anthropic
  test/            unit, integration (testcontainers), e2e, load (k6)
  Dockerfile  .env.example
```

### 12.3 Admin panel

```
apps/admin/
  src/app/
    (auth)/login/ 2fa/
    (dashboard)/
      dashboard/ approvals/ users/[id]/ categories/ admins/ roles/ flags/
      groups/ moderation/ products/ feed/ enquiries/ reports/
      announcements/ finance/ (payments, refunds, plans, coupons, invoices, reports)
      theme/ content/ settings/ tickets/ audit/ system/
  src/components/ (ui from shadcn, data-table, filters, permission-gate)
  src/lib/ api client, auth, permissions (from shared), formatters
  src/hooks/ usePermission, useFlags, useSocket
```

`PermissionGate` hides a button when the admin lacks the permission, but the API always enforces it again.
