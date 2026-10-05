import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDynamicSystem() {
  console.log('🌱 Starting Dynamic Authorization & Platform Seed...');

  // 1. Seed Feature Modules
  const modulesData = [
    { key: 'USER_MANAGEMENT', name: 'User & Business Management', description: 'User roles, business profiles, verification queue and account management.', icon: '👥', sortOrder: 1 },
    { key: 'COMMUNICATION', name: 'Direct Chat, Groups & Calling', description: 'Real-time 1-to-1 messaging, trade groups, voice notes and WebRTC calling.', icon: '💬', sortOrder: 2 },
    { key: 'COMMERCE', name: 'Products, Store Front & Catalogs', description: 'SKU catalog deduplication, store fronts, price tiers and SKU sharing.', icon: '📦', sortOrder: 3 },
    { key: 'LEAD_GEN', name: 'Leads & Public Inquiries', description: 'Visitor lead capture link distribution and batch rotation tracking.', icon: '🎯', sortOrder: 4 },
    { key: 'FEEDS_POSTS', name: 'Status Posts & Feed', description: '24-hour expiring status updates, image/video posts, likes and comments.', icon: '📱', sortOrder: 5 },
    { key: 'PAYMENTS_SUBSCRIPTION', name: 'Subscriptions, Payments & Invoices', description: 'Subscription plans, gateway integration, manual verification and invoices.', icon: '💳', sortOrder: 6 },
    { key: 'PLATFORM_SYSTEM', name: 'System Settings, Limits & Auditing', description: 'Platform configuration flags, usage limit management, audit logs.', icon: '⚙️', sortOrder: 7 },
  ];

  for (const mod of modulesData) {
    await prisma.featureModule.upsert({
      where: { key: mod.key },
      update: { name: mod.name, description: mod.description, icon: mod.icon, sortOrder: mod.sortOrder },
      create: mod,
    });
  }

  const userMod = await prisma.featureModule.findUnique({ where: { key: 'USER_MANAGEMENT' } });
  const commMod = await prisma.featureModule.findUnique({ where: { key: 'COMMUNICATION' } });
  const commerceMod = await prisma.featureModule.findUnique({ where: { key: 'COMMERCE' } });
  const leadMod = await prisma.featureModule.findUnique({ where: { key: 'LEAD_GEN' } });
  const feedMod = await prisma.featureModule.findUnique({ where: { key: 'FEEDS_POSTS' } });
  const payMod = await prisma.featureModule.findUnique({ where: { key: 'PAYMENTS_SUBSCRIPTION' } });
  const sysMod = await prisma.featureModule.findUnique({ where: { key: 'PLATFORM_SYSTEM' } });

  // 2. Seed Features
  const featuresData = [
    { moduleId: userMod!.id, key: 'USERS', name: 'User Management', description: 'View, search, verify, suspend and approve registered users.', sortOrder: 1 },
    { moduleId: userMod!.id, key: 'BUSINESSES', name: 'Business Profiles', description: 'Verified business showcase, shop credentials and GST tags.', sortOrder: 2 },
    { moduleId: userMod!.id, key: 'CATEGORIES_COMMUNITIES', name: 'Communities & Categories', description: 'Category hierarchies and trade community isolation rules.', sortOrder: 3 },
    { moduleId: commMod!.id, key: 'DIRECT_CHAT', name: 'Direct 1-to-1 Chat', description: 'WhatsApp-style 1-to-1 direct messaging.', sortOrder: 1 },
    { moduleId: commMod!.id, key: 'GROUP_CHAT', name: 'Group Chat & Broadcast Channels', description: 'Multi-user trade groups and admin broadcast channels.', sortOrder: 2 },
    { moduleId: commMod!.id, key: 'VOICE_CALLS', name: 'Voice Calling', description: 'Real-time WebRTC 1-to-1 voice calling.', sortOrder: 3 },
    { moduleId: commMod!.id, key: 'VIDEO_CALLS', name: 'Video Calling', description: 'Real-time WebRTC 1-to-1 video calling.', sortOrder: 4 },
    { moduleId: commMod!.id, key: 'VOICE_NOTES', name: 'Voice Notes', description: 'WhatsApp-style voice note recording and audio waveform player.', sortOrder: 5 },
    { moduleId: commerceMod!.id, key: 'PRODUCTS', name: 'Products Catalog', description: 'Product listings, SKU deduplication and price tiers.', sortOrder: 1 },
    { moduleId: commerceMod!.id, key: 'STORE_FRONT', name: 'Public Store Front', description: 'Store catalog profile view per business.', sortOrder: 2 },
    { moduleId: commerceMod!.id, key: 'PRODUCT_SHARING', name: 'In-Chat Product Sharing', description: 'Quick catalog attachment selector in chat.', sortOrder: 3 },
    { moduleId: leadMod!.id, key: 'LEADS', name: 'Lead Capture & Rotation', description: 'Public visitor lead capture and merchant distribution.', sortOrder: 1 },
    { moduleId: feedMod!.id, key: 'STATUS_POSTS', name: 'Status Stories & Posts', description: '24-hour status updates and poster feed.', sortOrder: 1 },
    { moduleId: feedMod!.id, key: 'COMMENTS_LIKES', name: 'Comments & Likes', description: 'Interactions on products and status posts.', sortOrder: 2 },
    { moduleId: payMod!.id, key: 'SUBSCRIPTIONS', name: 'Subscription Plans', description: 'User subscription lifecycle and trial management.', sortOrder: 1 },
    { moduleId: payMod!.id, key: 'PAYMENTS_RAZORPAY', name: 'Razorpay Online Gateway', description: 'Razorpay online payment processing.', sortOrder: 2 },
    { moduleId: payMod!.id, key: 'PAYMENTS_STRIPE', name: 'Stripe Online Gateway', description: 'Stripe online payment processing.', sortOrder: 3 },
    { moduleId: payMod!.id, key: 'PAYMENTS_MANUAL', name: 'Manual Offline Payments', description: 'Screenshot upload and admin payment verification queue.', sortOrder: 4 },
    { moduleId: payMod!.id, key: 'INVOICES_DUES', name: 'Invoices & Billing Dues', description: 'Unique invoice generation and next due date tracking.', sortOrder: 5 },
    { moduleId: sysMod!.id, key: 'FEATURE_FLAGS', name: 'Dynamic Feature Flags', description: 'System-wide feature toggle controls.', sortOrder: 1 },
    { moduleId: sysMod!.id, key: 'LIMITS_MANAGEMENT', name: 'Platform Usage Limits', description: 'Dynamic capacity, storage, and rate limit rules.', sortOrder: 2 },
    { moduleId: sysMod!.id, key: 'ROLES_PERMISSIONS', name: 'Roles & Permission Matrix', description: 'Custom roles and granular permission controls.', sortOrder: 3 },
    { moduleId: sysMod!.id, key: 'AUDIT_LOGS', name: 'Super Admin Audit Log', description: 'Immutable log of administrative actions.', sortOrder: 4 },
    { moduleId: sysMod!.id, key: 'PLATFORM_SETTINGS', name: 'Platform Settings', description: 'Global system variables and maintenance mode controls.', sortOrder: 5 },
  ];

  for (const feat of featuresData) {
    await prisma.feature.upsert({
      where: { key: feat.key },
      update: { name: feat.name, description: feat.description, sortOrder: feat.sortOrder },
      create: feat,
    });
  }

  // 3. Seed Granular Permissions
  const permissionsData = [
    { featureKey: 'PRODUCTS', key: 'PRODUCT.VIEW', name: 'View Products', action: 'VIEW', description: 'Search and view product catalog' },
    { featureKey: 'PRODUCTS', key: 'PRODUCT.CREATE', name: 'Create Product', action: 'CREATE', description: 'Add new product listing' },
    { featureKey: 'PRODUCTS', key: 'PRODUCT.UPDATE', name: 'Update Product', action: 'UPDATE', description: 'Edit owned product listing' },
    { featureKey: 'PRODUCTS', key: 'PRODUCT.DELETE', name: 'Delete Product', action: 'DELETE', description: 'Delete product listing' },
    { featureKey: 'PRODUCTS', key: 'PRODUCT.EXPORT', name: 'Export Products', action: 'EXPORT', description: 'Export product catalog to CSV' },
    
    { featureKey: 'USERS', key: 'USER.VIEW', name: 'View Users', action: 'VIEW', description: 'View user profile directory' },
    { featureKey: 'USERS', key: 'USER.APPROVE', name: 'Approve User', action: 'APPROVE', description: 'Approve pending user application' },
    { featureKey: 'USERS', key: 'USER.REJECT', name: 'Reject User', action: 'REJECT', description: 'Reject user application' },
    { featureKey: 'USERS', key: 'USER.VERIFY', name: 'Verify Business', action: 'VERIFY', description: 'Assign verified business badge' },
    { featureKey: 'USERS', key: 'USER.SUSPEND', name: 'Suspend User', action: 'UPDATE', description: 'Suspend user account' },

    { featureKey: 'DIRECT_CHAT', key: 'CHAT.SEND', name: 'Send Message', action: 'CREATE', description: 'Send direct messages' },
    { featureKey: 'GROUP_CHAT', key: 'GROUP.CREATE', name: 'Create Group', action: 'CREATE', description: 'Create trade group' },
    { featureKey: 'GROUP_CHAT', key: 'GROUP.MANAGE', name: 'Manage Group', action: 'MANAGE', description: 'Manage group members and settings' },

    { featureKey: 'VOICE_CALLS', key: 'CALL.VOICE_INITIATE', name: 'Place Voice Call', action: 'CREATE', description: 'Initiate 1-to-1 audio call' },
    { featureKey: 'VIDEO_CALLS', key: 'CALL.VIDEO_INITIATE', name: 'Place Video Call', action: 'CREATE', description: 'Initiate 1-to-1 video call' },

    { featureKey: 'LEADS', key: 'LEAD.VIEW', name: 'View Leads', action: 'VIEW', description: 'View captured business leads' },
    { featureKey: 'LEADS', key: 'LEAD.CAPTURE', name: 'Capture Lead', action: 'CREATE', description: 'Submit public product lead' },

    { featureKey: 'PAYMENTS_MANUAL', key: 'PAYMENT.APPROVE', name: 'Approve Payment', action: 'APPROVE', description: 'Approve manual offline payment' },
    { featureKey: 'PLATFORM_SETTINGS', key: 'SYSTEM.MANAGE', name: 'Manage System', action: 'MANAGE', description: 'Manage global platform configuration' },
  ];

  for (const perm of permissionsData) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, action: perm.action, description: perm.description },
      create: perm,
    });
  }

  // 4. Seed Platform Limits
  const limitsData = [
    { featureKey: 'GROUP_CHAT', limitKey: 'GROUP.MAX_MEMBERS', name: 'Maximum Group Members', description: 'Maximum members allowed in a group', limitType: 'MEMBER', defaultValue: 40, unit: 'COUNT' },
    { featureKey: 'GROUP_CHAT', limitKey: 'GROUP.MAX_PER_USER', name: 'Max Groups per User', description: 'Maximum groups a user can create', limitType: 'LIFETIME', defaultValue: 10, unit: 'COUNT' },
    { featureKey: 'PRODUCTS', limitKey: 'PRODUCT.MAX_COUNT', name: 'Max Products Count', description: 'Maximum products a merchant can list', limitType: 'LIFETIME', defaultValue: 50, unit: 'COUNT' },
    { featureKey: 'STATUS_POSTS', limitKey: 'POST.DAILY_MAX', name: 'Daily Max Status Posts', description: 'Maximum status updates per 24h', limitType: 'DAILY', defaultValue: 20, unit: 'COUNT' },
    { featureKey: 'VOICE_NOTES', limitKey: 'VOICE_NOTE.MAX_DURATION_SECS', name: 'Max Voice Note Duration', description: 'Maximum duration in seconds', limitType: 'DURATION', defaultValue: 120, unit: 'SECONDS' },
    { featureKey: 'DIRECT_CHAT', limitKey: 'FILE.MAX_SIZE_MB', name: 'Max File Attachment Size', description: 'Maximum file size in MB', limitType: 'FILE_SIZE', defaultValue: 50, unit: 'MB' },
    { featureKey: 'PRODUCTS', limitKey: 'STORAGE.MAX_MB', name: 'Max Merchant Media Storage', description: 'Maximum total media storage in MB', limitType: 'STORAGE', defaultValue: 1024, unit: 'MB' },
    { featureKey: 'USERS', limitKey: 'SESSION.MAX_CONCURRENT', name: 'Max Active Logins', description: 'Maximum concurrent active sessions per account', limitType: 'CONCURRENT', defaultValue: 5, unit: 'COUNT' },
  ];

  for (const lim of limitsData) {
    await prisma.platformLimit.upsert({
      where: { limitKey: lim.limitKey },
      update: { name: lim.name, defaultValue: lim.defaultValue, unit: lim.unit, limitType: lim.limitType },
      create: lim,
    });
  }

  // 5. Seed Custom Roles
  const rolesData = [
    { name: 'SUPER_ADMIN', description: 'Super Administrator with unrestricted platform access', isSystemRole: true },
    { name: 'ADMIN', description: 'Administrator with platform management rights', isSystemRole: true },
    { name: 'MODERATOR', description: 'Content and community moderator', isSystemRole: false },
    { name: 'BUSINESS', description: 'Verified merchant business account', isSystemRole: true },
    { name: 'USER', description: 'Standard user account', isSystemRole: true },
    { name: 'SALES', description: 'Sales and lead management team', isSystemRole: false },
    { name: 'SUPPORT', description: 'Customer support agent', isSystemRole: false },
  ];

  for (const r of rolesData) {
    const roleObj = await prisma.customRole.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });

    // Grant all permissions to SUPER_ADMIN role
    if (r.name === 'SUPER_ADMIN') {
      const allPerms = await prisma.permission.findMany();
      for (const p of allPerms) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionKey: { roleId: roleObj.id, permissionKey: p.key } },
          update: {},
          create: { roleId: roleObj.id, permissionKey: p.key, featureKey: p.featureKey },
        });
      }
    }
  }

  // 6. Seed Dynamic Subscription Plans
  const plansData = [
    { name: 'Free Trial Plan', slug: 'free', description: 'Basic trial plan for new business registrants.', price: 0, durationMonths: 1, isDefault: true },
    { name: 'Pro Merchant Plan', slug: 'pro', description: 'Standard merchant plan with products, leads, and group chat.', price: 2499, durationMonths: 1, isDefault: false },
    { name: 'Enterprise Pro Plan', slug: 'enterprise', description: 'Full access including Voice/Video calls, high media limits, and priority support.', price: 4999, durationMonths: 12, isDefault: false },
  ];

  for (const plan of plansData) {
    const pObj = await prisma.dynamicSubscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: { price: plan.price, durationMonths: plan.durationMonths },
      create: plan,
    });

    // Assign all features enabled for enterprise plan
    const allFeatures = await prisma.feature.findMany();
    for (const f of allFeatures) {
      await prisma.planFeature.upsert({
        where: { planId_featureKey: { planId: pObj.id, featureKey: f.key } },
        update: { isEnabled: true },
        create: { planId: pObj.id, featureKey: f.key, isEnabled: true },
      });
    }
  }

  // 7. Seed Dynamic Platform Settings
  const defaultSettings = [
    { key: 'PLATFORM_NAME', category: 'GENERAL', value: 'Multi-Community B2B Platform', description: 'Platform display name' },
    { key: 'REGISTRATION_ENABLED', category: 'AUTH', value: true, description: 'Allow new user registration' },
    { key: 'USER_APPROVAL_REQUIRED', category: 'AUTH', value: true, description: 'Super Admin approval required for onboarding' },
    { key: 'BUSINESS_APPROVAL_REQUIRED', category: 'AUTH', value: true, description: 'Super Admin verification required for business features' },
    { key: 'MAINTENANCE_MODE', category: 'MAINTENANCE', value: false, description: 'System-wide maintenance mode' },
    { key: 'CHAT_ENABLED', category: 'CHAT', value: true, description: 'Global 1-to-1 direct chat toggle' },
    { key: 'CALLING_ENABLED', category: 'CALLING', value: true, description: 'Global WebRTC voice and video calling toggle' },
    { key: 'VOICE_NOTES_ENABLED', category: 'CHAT', value: true, description: 'Global voice note recording toggle' },
    { key: 'MAX_GROUP_MEMBERS', category: 'GROUPS', value: 40, description: 'Global default group member limit' },
    { key: 'SESSION_LIMIT', category: 'AUTH', value: 5, description: 'Concurrent login session limit per business account' },
  ];

  // 8. Seed API Route Flags & Dynamic Rate Limit Controls
  const apiRoutesData = [
    { path: '/api/v1/auth/login', name: 'Authentication Login API', method: 'POST', module: 'AUTH', isEnabled: true, isRateLimitEnabled: true, rateLimitPerMin: 10 },
    { path: '/api/v1/auth/register', name: 'User Registration API', method: 'POST', module: 'AUTH', isEnabled: true, isRateLimitEnabled: true, rateLimitPerMin: 5 },
    { path: '/api/v1/auth/me', name: 'Current User Identity API', method: 'GET', module: 'AUTH', isEnabled: true, isRateLimitEnabled: false },

    { path: '/api/v1/users', name: 'User Directory & Profile API', method: 'ALL', module: 'USER', isEnabled: true },
    { path: '/api/v1/businesses', name: 'Business Showcase API', method: 'ALL', module: 'BUSINESS', isEnabled: true },

    { path: '/api/v1/messages', name: 'Direct & Group Message API', method: 'ALL', module: 'CHAT', isEnabled: true, isRateLimitEnabled: true, rateLimitPerMin: 120 },
    { path: '/api/v1/messages/voice-note', name: 'Voice Note Attachment API', method: 'POST', module: 'CHAT', isEnabled: true, isRateLimitEnabled: true, rateLimitPerMin: 30 },

    { path: '/api/v1/groups', name: 'Trade Group Management API', method: 'ALL', module: 'GROUPS', isEnabled: true },

    { path: '/api/v1/calls/voice', name: 'Voice Calling Signaling API', method: 'ALL', module: 'CALLS', isEnabled: true },
    { path: '/api/v1/calls/video', name: 'Video Calling Signaling API', method: 'ALL', module: 'CALLS', isEnabled: true },

    { path: '/api/v1/upload', name: 'Media & File Upload API', method: 'POST', module: 'STORAGE', isEnabled: true, isRateLimitEnabled: true, rateLimitPerMin: 20 },

    { path: '/api/v1/posts', name: 'Status Poster & Feed API', method: 'ALL', module: 'POSTS', isEnabled: true },
    { path: '/api/v1/products', name: 'Product Catalog API', method: 'ALL', module: 'PRODUCTS', isEnabled: true },
    { path: '/api/v1/leads', name: 'Lead Distribution API', method: 'ALL', module: 'LEADS', isEnabled: true },

    { path: '/api/v1/categories', name: 'Category Hierarchy API', method: 'ALL', module: 'CATEGORIES', isEnabled: true },
    { path: '/api/v1/subscriptions', name: 'Subscription Engine API', method: 'ALL', module: 'PAYMENTS', isEnabled: true },
    { path: '/api/v1/payments', name: 'Payment Transactions API', method: 'ALL', module: 'PAYMENTS', isEnabled: true },
    { path: '/api/v1/admin', name: 'Super Admin Control Center API', method: 'ALL', module: 'ADMIN', isEnabled: true },
  ];

  for (const route of apiRoutesData) {
    await prisma.apiRouteFlag.upsert({
      where: { path: route.path },
      update: { name: route.name, module: route.module, isEnabled: route.isEnabled, isRateLimitEnabled: route.isRateLimitEnabled, rateLimitPerMin: route.rateLimitPerMin },
      create: route,
    });
  }

  console.log('✅ Dynamic System Seed completed successfully!');
}

seedDynamicSystem()
  .catch((e) => {
    console.error('Seed error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
