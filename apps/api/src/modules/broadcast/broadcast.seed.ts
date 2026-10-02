import { prisma } from '@b2b/database';

export async function seedBroadcastDefaults() {
  try {
    // 1. Ensure COMMUNICATION Module exists
    let moduleObj = await prisma.featureModule.findUnique({
      where: { key: 'COMMUNICATION' },
    });

    if (!moduleObj) {
      moduleObj = await prisma.featureModule.create({
        data: {
          key: 'COMMUNICATION',
          name: 'Communication & Messaging',
          description: 'Direct Chat, Group Chat, Audio/Video Calling & Broadcast Messaging',
          icon: '💬',
          sortOrder: 1,
        },
      });
    }

    // 2. Ensure BROADCAST Feature exists
    const subFlagsConfig = {
      'broadcast.enabled': true,
      'broadcast.create': true,
      'broadcast.edit': true,
      'broadcast.delete': true,
      'broadcast.addRecipients': true,
      'broadcast.removeRecipients': true,
      'broadcast.text': true,
      'broadcast.image': true,
      'broadcast.video': true,
      'broadcast.document': true,
      'broadcast.audio': true,
      'broadcast.voice': true,
      'broadcast.product': true,
      'broadcast.post': true,
      'broadcast.groupSelection': true,
    };

    let feature = await prisma.feature.findUnique({
      where: { key: 'BROADCAST' },
    });

    if (!feature) {
      feature = await prisma.feature.create({
        data: {
          moduleId: moduleObj.id,
          key: 'BROADCAST',
          name: 'WhatsApp-Style Broadcast Messaging',
          description: 'Create private broadcast lists and send individual 1-to-1 messages to multiple recipients',
          isEnabled: true,
          webEnabled: true,
          mobileEnabled: true,
          config: subFlagsConfig,
        },
      });
    } else {
      // Update config if needed
      await prisma.feature.update({
        where: { key: 'BROADCAST' },
        data: {
          config: {
            ...subFlagsConfig,
            ...(typeof feature.config === 'object' ? feature.config : {}),
          },
        },
      });
    }

    // 3. Ensure Permissions exist
    const permissionsToSeed = [
      { key: 'BROADCAST.CREATE', name: 'Create Broadcast List', action: 'CREATE' },
      { key: 'BROADCAST.EDIT', name: 'Edit Broadcast List', action: 'UPDATE' },
      { key: 'BROADCAST.DELETE', name: 'Delete Broadcast List', action: 'DELETE' },
      { key: 'BROADCAST.SEND', name: 'Send Broadcast Message', action: 'CREATE' },
      { key: 'BROADCAST.TEXT', name: 'Send Broadcast Text', action: 'CREATE' },
      { key: 'BROADCAST.IMAGE', name: 'Send Broadcast Image', action: 'CREATE' },
      { key: 'BROADCAST.VIDEO', name: 'Send Broadcast Video', action: 'CREATE' },
      { key: 'BROADCAST.DOCUMENT', name: 'Send Broadcast Document/PDF', action: 'CREATE' },
      { key: 'BROADCAST.AUDIO', name: 'Send Broadcast Audio', action: 'CREATE' },
      { key: 'BROADCAST.VOICE', name: 'Send Broadcast Voice Note', action: 'CREATE' },
      { key: 'BROADCAST.PRODUCT', name: 'Send Broadcast Product Card', action: 'CREATE' },
      { key: 'BROADCAST.POST', name: 'Send Broadcast Post Card', action: 'CREATE' },
    ];

    for (const perm of permissionsToSeed) {
      await prisma.permission.upsert({
        where: { key: perm.key },
        update: { name: perm.name, action: perm.action },
        create: {
          featureKey: 'BROADCAST',
          key: perm.key,
          name: perm.name,
          action: perm.action,
        },
      });
    }

    // 4. Ensure Platform Limits exist (Dynamic limit flag: isEnabled = true)
    const platformLimitsToSeed = [
      { limitKey: 'BROADCAST.MAX_LISTS', name: 'Max Broadcast Lists Per User', limitType: 'LIFETIME', defaultValue: 10, unit: 'COUNT' },
      { limitKey: 'BROADCAST.MAX_RECIPIENTS_PER_LIST', name: 'Max Recipients Per Broadcast List', limitType: 'MEMBER', defaultValue: 256, unit: 'COUNT' },
      { limitKey: 'BROADCAST.MAX_RECIPIENTS_PER_DAY', name: 'Max Daily Broadcast Recipients', limitType: 'DAILY', defaultValue: 1000, unit: 'COUNT' },
      { limitKey: 'BROADCAST.MAX_BROADCASTS_PER_DAY', name: 'Max Daily Broadcast Messages', limitType: 'DAILY', defaultValue: 50, unit: 'COUNT' },
      { limitKey: 'BROADCAST.MAX_BROADCASTS_PER_MONTH', name: 'Max Monthly Broadcast Messages', limitType: 'MONTHLY', defaultValue: 1000, unit: 'COUNT' },
      { limitKey: 'BROADCAST.MAX_MESSAGE_RATE', name: 'Max Message Rate (per min)', limitType: 'CONCURRENT', defaultValue: 100, unit: 'COUNT' },
      { limitKey: 'BROADCAST.MAX_MEDIA_SIZE', name: 'Max Media File Size', limitType: 'FILE_SIZE', defaultValue: 25, unit: 'MB' },
      { limitKey: 'BROADCAST.MAX_VIDEO_SIZE', name: 'Max Video File Size', limitType: 'FILE_SIZE', defaultValue: 50, unit: 'MB' },
      { limitKey: 'BROADCAST.MAX_DOCUMENT_SIZE', name: 'Max Document File Size', limitType: 'FILE_SIZE', defaultValue: 50, unit: 'MB' },
      { limitKey: 'BROADCAST.MAX_AUDIO_SIZE', name: 'Max Audio File Size', limitType: 'FILE_SIZE', defaultValue: 25, unit: 'MB' },
      { limitKey: 'BROADCAST.MAX_VOICE_NOTE_DURATION', name: 'Max Voice Note Duration', limitType: 'DURATION', defaultValue: 120, unit: 'SECONDS' },
      { limitKey: 'BROADCAST.MAX_CONCURRENT_SENDING', name: 'Max Concurrent Broadcast Deliveries', limitType: 'CONCURRENT', defaultValue: 5, unit: 'COUNT' },
    ];

    for (const lim of platformLimitsToSeed) {
      await prisma.platformLimit.upsert({
        where: { limitKey: lim.limitKey },
        update: { name: lim.name, defaultValue: lim.defaultValue },
        create: {
          featureKey: 'BROADCAST',
          limitKey: lim.limitKey,
          name: lim.name,
          limitType: lim.limitType,
          defaultValue: lim.defaultValue,
          unit: lim.unit,
          isEnabled: true,
        },
      });
    }

    // 5. Ensure API Route Flags exist
    const apiRoutesToSeed = [
      { path: '/api/v1/broadcast/broadcasts', name: 'Create & Get Broadcast Lists', method: 'ALL', module: 'CHAT' },
      { path: '/api/v1/broadcast/broadcasts/:id', name: 'Manage Broadcast List', method: 'ALL', module: 'CHAT' },
      { path: '/api/v1/broadcast/broadcasts/:id/recipients', name: 'Manage Broadcast Recipients', method: 'ALL', module: 'CHAT' },
      { path: '/api/v1/broadcast/broadcasts/:id/duplicate', name: 'Duplicate Broadcast List', method: 'POST', module: 'CHAT' },
      { path: '/api/v1/broadcast/broadcasts/:id/send', name: 'Send Broadcast Message', method: 'POST', module: 'CHAT' },
    ];

    for (const route of apiRoutesToSeed) {
      await prisma.apiRouteFlag.upsert({
        where: { path: route.path },
        update: { name: route.name, isEnabled: true },
        create: {
          path: route.path,
          name: route.name,
          method: route.method,
          module: route.module,
          isEnabled: true,
          webEnabled: true,
          mobileEnabled: true,
        },
      });
    }

    // 6. Ensure Default Subscription Plans contain Broadcast Limits
    const plans = await prisma.dynamicSubscriptionPlan.findMany();
    if (plans.length === 0) {
      // Create standard Free, Basic, Pro, Enterprise plans
      const freePlan = await prisma.dynamicSubscriptionPlan.create({
        data: { name: 'Free Tier', slug: 'free', price: 0, isDefault: true },
      });
      const basicPlan = await prisma.dynamicSubscriptionPlan.create({
        data: { name: 'Basic Plan', slug: 'basic', price: 999 },
      });
      const proPlan = await prisma.dynamicSubscriptionPlan.create({
        data: { name: 'Pro Plan', slug: 'pro', price: 2999 },
      });
      const enterprisePlan = await prisma.dynamicSubscriptionPlan.create({
        data: { name: 'Enterprise Plan', slug: 'enterprise', price: 9999 },
      });

      // Free Plan: Broadcast Off
      await prisma.planFeature.create({
        data: { planId: freePlan.id, featureKey: 'BROADCAST', isEnabled: false },
      });
      await prisma.planLimit.createMany({
        data: [
          { planId: freePlan.id, limitKey: 'BROADCAST.MAX_LISTS', value: 0 },
          { planId: freePlan.id, limitKey: 'BROADCAST.MAX_RECIPIENTS_PER_LIST', value: 0 },
        ],
      });

      // Basic Plan: 5 lists, 100 recipients/list
      await prisma.planFeature.create({
        data: { planId: basicPlan.id, featureKey: 'BROADCAST', isEnabled: true },
      });
      await prisma.planLimit.createMany({
        data: [
          { planId: basicPlan.id, limitKey: 'BROADCAST.MAX_LISTS', value: 5 },
          { planId: basicPlan.id, limitKey: 'BROADCAST.MAX_RECIPIENTS_PER_LIST', value: 100 },
        ],
      });

      // Pro Plan: 20 lists, 1000 recipients/list
      await prisma.planFeature.create({
        data: { planId: proPlan.id, featureKey: 'BROADCAST', isEnabled: true },
      });
      await prisma.planLimit.createMany({
        data: [
          { planId: proPlan.id, limitKey: 'BROADCAST.MAX_LISTS', value: 20 },
          { planId: proPlan.id, limitKey: 'BROADCAST.MAX_RECIPIENTS_PER_LIST', value: 1000 },
        ],
      });

      // Enterprise Plan: 100 lists, 5000 recipients/list
      await prisma.planFeature.create({
        data: { planId: enterprisePlan.id, featureKey: 'BROADCAST', isEnabled: true },
      });
      await prisma.planLimit.createMany({
        data: [
          { planId: enterprisePlan.id, limitKey: 'BROADCAST.MAX_LISTS', value: 100 },
          { planId: enterprisePlan.id, limitKey: 'BROADCAST.MAX_RECIPIENTS_PER_LIST', value: 5000 },
        ],
      });
    }

    console.log('✅ Broadcast default features, permissions, limits & API route flags seeded successfully.');
  } catch (err: any) {
    console.error('Error seeding broadcast defaults:', err.message);
  }
}
