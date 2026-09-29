import { prisma } from '@b2b/database';

function addMonthsToDate(fromDate: Date, months: number): Date {
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getMonthlyCycleName(count: number): string {
  const num = count + 1;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  const ord = s[(v - 20) % 10] || s[v] || s[0];
  return `${num}${ord} Month Payment`;
}

export class SubscriptionService {
  // Fetch system-wide subscription settings
  static async getSystemSettings() {
    let settings = await prisma.systemSetting.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          id: 'default',
          subscriptionSystemEnabled: false, // Default is OFF as requested
          freeTrialEnabled: true,
          trialExpiryWarningEnabled: true,
          paymentEnabled: true,
          renewalEnabled: true,
          subscriptionNotificationsEnabled: true,
          subscriptionPopupEnabled: true,
          razorpayEnabled: true,
          stripeEnabled: true,
          manualPaymentEnabled: true,
          manualPaymentWhatsapp: '+919999999999',
        },
      });
    }

    return settings;
  }

  // Super Admin updates system settings
  static async updateSystemSettings(data: {
    subscriptionSystemEnabled?: boolean;
    freeTrialEnabled?: boolean;
    trialExpiryWarningEnabled?: boolean;
    paymentEnabled?: boolean;
    renewalEnabled?: boolean;
    subscriptionNotificationsEnabled?: boolean;
    subscriptionPopupEnabled?: boolean;
    razorpayEnabled?: boolean;
    stripeEnabled?: boolean;
    manualPaymentEnabled?: boolean;
    manualPaymentWhatsapp?: string;
  }) {
    await this.getSystemSettings();

    const updated = await prisma.systemSetting.update({
      where: { id: 'default' },
      data: {
        ...(data.subscriptionSystemEnabled !== undefined && { subscriptionSystemEnabled: data.subscriptionSystemEnabled }),
        ...(data.freeTrialEnabled !== undefined && { freeTrialEnabled: data.freeTrialEnabled }),
        ...(data.trialExpiryWarningEnabled !== undefined && { trialExpiryWarningEnabled: data.trialExpiryWarningEnabled }),
        ...(data.paymentEnabled !== undefined && { paymentEnabled: data.paymentEnabled }),
        ...(data.renewalEnabled !== undefined && { renewalEnabled: data.renewalEnabled }),
        ...(data.subscriptionNotificationsEnabled !== undefined && { subscriptionNotificationsEnabled: data.subscriptionNotificationsEnabled }),
        ...(data.subscriptionPopupEnabled !== undefined && { subscriptionPopupEnabled: data.subscriptionPopupEnabled }),
        ...(data.razorpayEnabled !== undefined && { razorpayEnabled: data.razorpayEnabled }),
        ...(data.stripeEnabled !== undefined && { stripeEnabled: data.stripeEnabled }),
        ...(data.manualPaymentEnabled !== undefined && { manualPaymentEnabled: data.manualPaymentEnabled }),
        ...(data.manualPaymentWhatsapp !== undefined && { manualPaymentWhatsapp: data.manualPaymentWhatsapp }),
      },
    });

    return updated;
  }

  // ============================================================
  // DYNAMIC PAYMENT CYCLES / PLANS CRUD
  // ============================================================

  // Get all payment cycles (Initializes default 1M, 3M, 6M, 12M plans if empty)
  static async getPaymentCycles(onlyActive: boolean = false) {
    let cycles = await prisma.paymentCycle.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { durationMonths: 'asc' },
    });

    if (cycles.length === 0 && !onlyActive) {
      // Seed default dynamic payment cycles
      await prisma.paymentCycle.createMany({
        data: [
          { name: '1 Month Plan', durationMonths: 1, amount: 4999, currency: 'INR', description: 'Standard 1-Month B2B Access', isActive: true },
          { name: '3 Months Plan', durationMonths: 3, amount: 12999, currency: 'INR', description: 'Quarterly Discounted Access', isActive: true },
          { name: '6 Months Plan', durationMonths: 6, amount: 22999, currency: 'INR', description: 'Half-Yearly Business Access', isActive: true },
          { name: '12 Months Annual Plan', durationMonths: 12, amount: 39999, currency: 'INR', description: 'Annual Enterprise Unlimited Access', isActive: true },
        ],
      });

      cycles = await prisma.paymentCycle.findMany({
        orderBy: { durationMonths: 'asc' },
      });
    }

    return cycles;
  }

  // Super Admin: Create new custom payment cycle
  static async createPaymentCycle(data: {
    name: string;
    durationMonths: number;
    amount: number;
    currency?: string;
    description?: string;
    isActive?: boolean;
  }) {
    if (!data.name || !data.durationMonths || !data.amount) {
      throw new Error('Cycle name, duration in months, and amount are required');
    }

    const cycle = await prisma.paymentCycle.create({
      data: {
        name: data.name,
        durationMonths: Number(data.durationMonths),
        amount: Number(data.amount),
        currency: data.currency || 'INR',
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return cycle;
  }

  // Super Admin: Update payment cycle
  static async updatePaymentCycle(cycleId: string, data: {
    name?: string;
    durationMonths?: number;
    amount?: number;
    currency?: string;
    description?: string;
    isActive?: boolean;
  }) {
    const updated = await prisma.paymentCycle.update({
      where: { id: cycleId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.durationMonths !== undefined && { durationMonths: Number(data.durationMonths) }),
        ...(data.amount !== undefined && { amount: Number(data.amount) }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return updated;
  }

  // Super Admin: Delete payment cycle
  static async deletePaymentCycle(cycleId: string) {
    await prisma.paymentCycle.delete({
      where: { id: cycleId },
    });
    return { success: true, message: 'Payment cycle deleted successfully' };
  }

  // Get user subscription details with exact timestamp & session revocation on expiry
  static async getUserSubscription(userId: string) {
    const settings = await this.getSystemSettings();

    let sub = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!sub) {
      const trialDays = settings.freeTrialEnabled ? 14 : 0;
      const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

      sub = await prisma.userSubscription.create({
        data: {
          userId,
          planName: 'ENTERPRISE_PRO',
          status: settings.freeTrialEnabled ? 'TRIAL' : 'EXPIRED',
          trialEndsAt: settings.freeTrialEnabled ? trialEndsAt : null,
          currentPeriodEnd: settings.freeTrialEnabled ? trialEndsAt : new Date(),
        },
      });
    }

    // Check exact timestamp expiration
    const expiryTimestamp = sub.status === 'TRIAL' ? sub.trialEndsAt : sub.currentPeriodEnd;
    if (
      settings.subscriptionSystemEnabled &&
      sub.status !== 'EXPIRED' &&
      expiryTimestamp &&
      new Date(expiryTimestamp) < new Date()
    ) {
      sub = await prisma.userSubscription.update({
        where: { userId },
        data: { status: 'EXPIRED' },
      });

      // Revoke all active sessions on subscription expiration!
      await prisma.session.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'REVOKED' },
      });
    }

    // Fetch user's payment transactions history with cycle info
    const transactions = await prisma.paymentTransaction.findMany({
      where: { userId },
      include: { cycle: true },
      orderBy: { createdAt: 'desc' },
    });

    const activeCycles = await this.getPaymentCycles(true);

    return {
      subscription: sub,
      settings,
      transactions,
      activeCycles,
    };
  }

  // Submit Manual Payment with Screenshot & Selected Payment Cycle
  static async submitManualPayment(userId: string, data: {
    screenshotUrl: string;
    cycleId?: string;
    amount?: number;
    cycleName?: string;
    transactionRef?: string;
  }) {
    const settings = await this.getSystemSettings();
    if (!settings.subscriptionSystemEnabled || !settings.paymentEnabled || !settings.manualPaymentEnabled) {
      throw new Error('Manual payment is currently disabled by Super Admin');
    }

    let cycleObj = null;
    if (data.cycleId) {
      cycleObj = await prisma.paymentCycle.findUnique({ where: { id: data.cycleId } });
    }

    const completedCount = await prisma.paymentTransaction.count({ where: { userId, status: 'COMPLETED' } });
    const cycleName = data.cycleName || cycleObj?.name || getMonthlyCycleName(completedCount);
    const amount = data.amount || cycleObj?.amount || 4999;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId,
        invoiceNumber,
        cycleId: cycleObj?.id || null,
        planName: 'ENTERPRISE_PRO',
        cycleName,
        amount,
        currency: cycleObj?.currency || 'INR',
        paymentMethod: 'MANUAL',
        status: 'PENDING_VERIFICATION',
        screenshotUrl: data.screenshotUrl,
        transactionRef: data.transactionRef || null,
      },
    });

    return transaction;
  }

  // Automatic Gateway Payment Process (Razorpay / Stripe) linked to selected cycle
  static async processPayment(userId: string, data: {
    planName?: string;
    paymentMethod?: 'RAZORPAY' | 'STRIPE' | 'MANUAL';
    cycleId?: string;
  }) {
    const settings = await this.getSystemSettings();
    const paymentMethod = data.paymentMethod || 'RAZORPAY';

    if (!settings.subscriptionSystemEnabled || !settings.paymentEnabled) {
      throw new Error('Payment functionality is currently disabled by Super Admin');
    }

    if (paymentMethod === 'RAZORPAY' && !settings.razorpayEnabled) {
      throw new Error('Razorpay payment method is currently disabled by Super Admin');
    }

    if (paymentMethod === 'STRIPE' && !settings.stripeEnabled) {
      throw new Error('Stripe payment method is currently disabled by Super Admin');
    }

    let cycleObj = null;
    if (data.cycleId) {
      cycleObj = await prisma.paymentCycle.findUnique({ where: { id: data.cycleId } });
    }

    const completedCount = await prisma.paymentTransaction.count({ where: { userId, status: 'COMPLETED' } });
    const durationMonths = cycleObj?.durationMonths || 1;
    const cycleName = cycleObj?.name || getMonthlyCycleName(completedCount);
    const amount = cycleObj?.amount || 4999;

    const now = new Date();
    const nextPeriodEnd = addMonthsToDate(now, durationMonths); // Exact timestamp dynamically calculated based on plan duration!
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Create completed payment transaction
    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId,
        invoiceNumber,
        cycleId: cycleObj?.id || null,
        planName: data.planName || 'ENTERPRISE_PRO',
        cycleName,
        amount,
        currency: cycleObj?.currency || 'INR',
        paymentMethod,
        status: 'COMPLETED',
        paymentDate: now,
        nextDueDate: nextPeriodEnd,
      },
    });

    // Update user subscription to ACTIVE
    const updatedSub = await prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planName: data.planName || 'ENTERPRISE_PRO',
        status: 'ACTIVE',
        currentPeriodEnd: nextPeriodEnd,
      },
      update: {
        planName: data.planName || 'ENTERPRISE_PRO',
        status: 'ACTIVE',
        currentPeriodEnd: nextPeriodEnd,
      },
    });

    return {
      subscription: updatedSub,
      transaction,
    };
  }

  // Super Admin: Payment Management Dashboard Metrics & Records List
  static async getPaymentDashboardData(filter?: {
    status?: 'ALL' | 'COMPLETED' | 'PENDING_VERIFICATION' | 'DUE' | 'REJECTED';
    search?: string;
  }) {
    const totalUsers = await prisma.user.count();

    const activePaidSubs = await prisma.userSubscription.findMany({
      where: { status: 'ACTIVE' },
      select: { userId: true },
    });

    const activePaidUserIds = new Set(activePaidSubs.map((s) => s.userId));

    const completedTransactions = await prisma.paymentTransaction.findMany({
      where: { status: 'COMPLETED' },
      select: { userId: true, amount: true },
    });

    const completedUsersCount = activePaidUserIds.size;
    const pendingVerificationCount = await prisma.paymentTransaction.count({
      where: { status: 'PENDING_VERIFICATION' },
    });

    const dueUsersCount = Math.max(0, totalUsers - completedUsersCount);
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    let transactions: any[] = [];

    if (filter?.status === 'DUE') {
      const dueUsers = await prisma.user.findMany({
        where: {
          id: { notIn: Array.from(activePaidUserIds) },
          ...(filter.search
            ? {
                OR: [
                  { fullName: { contains: filter.search, mode: 'insensitive' } },
                  { mobileNumber: { contains: filter.search, mode: 'insensitive' } },
                  { email: { contains: filter.search, mode: 'insensitive' } },
                  { business: { shopName: { contains: filter.search, mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
        include: {
          business: { select: { shopName: true } },
          subscription: true,
          paymentTransactions: { include: { cycle: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      });

      transactions = dueUsers.map((u) => {
        const latestTx = u.paymentTransactions[0];
        return {
          id: latestTx?.id || u.id,
          userId: u.id,
          invoiceNumber: latestTx?.invoiceNumber || `DUE-${u.mobileNumber.slice(-4)}`,
          planName: 'ENTERPRISE_PRO',
          cycleName: latestTx?.cycleName || 'Payment Pending / Due',
          amount: latestTx?.amount || 4999,
          currency: latestTx?.currency || 'INR',
          paymentMethod: latestTx?.paymentMethod || 'MANUAL',
          status: 'DUE',
          screenshotUrl: latestTx?.screenshotUrl || null,
          transactionRef: latestTx?.transactionRef || null,
          paymentDate: latestTx?.paymentDate || null,
          nextDueDate: u.subscription?.trialEndsAt || u.subscription?.currentPeriodEnd || u.createdAt,
          createdAt: u.createdAt.toISOString(),
          cycle: latestTx?.cycle || null,
          user: {
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            mobileNumber: u.mobileNumber,
            status: u.status,
            business: u.business,
          },
        };
      });
    } else {
      const whereClause: any = {};
      if (filter?.status && filter.status !== 'ALL') {
        whereClause.status = filter.status;
      }

      if (filter?.search) {
        whereClause.OR = [
          { invoiceNumber: { contains: filter.search, mode: 'insensitive' } },
          { user: { fullName: { contains: filter.search, mode: 'insensitive' } } },
          { user: { mobileNumber: { contains: filter.search, mode: 'insensitive' } } },
          { user: { business: { shopName: { contains: filter.search, mode: 'insensitive' } } } },
        ];
      }

      transactions = await prisma.paymentTransaction.findMany({
        where: whereClause,
        include: {
          cycle: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              mobileNumber: true,
              status: true,
              business: { select: { shopName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const cycles = await this.getPaymentCycles(false);

    return {
      metrics: {
        totalUsers,
        completedUsersCount,
        dueUsersCount,
        pendingVerificationCount,
        totalRevenue,
      },
      transactions,
      cycles,
    };
  }

  // Super Admin: Approve Payment Transaction or Approve Due User with Selected Cycle Plan
  static async approvePayment(identifier: string, cycleId?: string) {
    let transaction = await prisma.paymentTransaction.findUnique({
      where: { id: identifier },
      include: { cycle: true },
    });

    let targetUserId = transaction?.userId;
    const now = new Date();

    let cycleObj = null;
    if (cycleId) {
      cycleObj = await prisma.paymentCycle.findUnique({ where: { id: cycleId } });
    } else if (transaction?.cycle) {
      cycleObj = transaction.cycle;
    }

    if (!transaction) {
      const user = await prisma.user.findUnique({ where: { id: identifier } });
      if (user) {
        targetUserId = user.id;
        const durationMonths = cycleObj?.durationMonths || 1;
        const cycleName = cycleObj?.name || getMonthlyCycleName(0);
        const amount = cycleObj?.amount || 4999;
        const currency = cycleObj?.currency || 'INR';
        const invoiceNumber = `INV-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const nextDueDate = addMonthsToDate(now, durationMonths);

        transaction = await prisma.paymentTransaction.create({
          data: {
            userId: user.id,
            invoiceNumber,
            cycleId: cycleObj?.id || null,
            planName: 'ENTERPRISE_PRO',
            cycleName,
            amount,
            currency,
            paymentMethod: 'MANUAL',
            status: 'COMPLETED',
            paymentDate: now,
            nextDueDate,
          },
          include: { cycle: true },
        });
      } else {
        throw new Error('Payment transaction or target user record not found');
      }
    } else {
      const durationMonths = cycleObj?.durationMonths || transaction.cycle?.durationMonths || 1;
      const cycleName = cycleObj?.name || transaction.cycleName;
      const amount = cycleObj?.amount || transaction.amount;
      const currency = cycleObj?.currency || transaction.currency;
      const nextDueDate = addMonthsToDate(now, durationMonths);

      transaction = await prisma.paymentTransaction.update({
        where: { id: identifier },
        data: {
          status: 'COMPLETED',
          paymentDate: now,
          nextDueDate,
          ...(cycleObj && {
            cycleId: cycleObj.id,
            cycleName: cycleObj.name,
            amount: cycleObj.amount,
            currency: cycleObj.currency,
          }),
        },
        include: { cycle: true },
      });
    }

    const durationMonths = cycleObj?.durationMonths || transaction.cycle?.durationMonths || 1;
    const nextDueDate = addMonthsToDate(now, durationMonths);

    // Automatically update user subscription to ACTIVE with exact period end matching selected cycle!
    await prisma.userSubscription.upsert({
      where: { userId: targetUserId! },
      create: {
        userId: targetUserId!,
        planName: 'ENTERPRISE_PRO',
        status: 'ACTIVE',
        currentPeriodEnd: nextDueDate,
      },
      update: {
        planName: 'ENTERPRISE_PRO',
        status: 'ACTIVE',
        currentPeriodEnd: nextDueDate,
      },
    });

    return transaction;
  }

  // Super Admin: Reject Payment Transaction
  static async rejectPayment(transactionId: string, reason?: string) {
    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Invalid payment receipt or unverified transaction',
      },
    });

    return updatedTransaction;
  }
}
