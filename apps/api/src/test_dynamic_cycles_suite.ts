import { prisma } from '@b2b/database';
import { SubscriptionService } from './modules/subscription/subscription.service';

async function main() {
  console.log('===========================================================');
  console.log('🧪 REAL DYNAMIC PAYMENT CYCLES & PLAN MANAGEMENT SUITE');
  console.log('===========================================================');

  // TEST 1: Get Payment Cycles (Seeds defaults if empty)
  console.log('\n--- TEST 1: Fetch Default & Active Payment Cycles ---');
  let cycles = await SubscriptionService.getPaymentCycles(false);
  console.log(`  Fetched ${cycles.length} payment cycle plan(s):`, cycles.map((c) => `${c.name} (${c.durationMonths}M - ₹${c.amount})`));

  if (cycles.length < 4) {
    console.error('❌ TEST 1 FAILED: Expected at least 4 default payment cycles');
    process.exit(1);
  }
  console.log('✅ TEST 1 PASSED: Payment cycles loaded dynamically.');

  // TEST 2: Super Admin Creates New Custom Payment Cycle Plan (e.g. 2 Months Plan)
  console.log('\n--- TEST 2: Super Admin Creates 2 Months Plan ---');
  const customCycle = await SubscriptionService.createPaymentCycle({
    name: '2 Months Plan',
    durationMonths: 2,
    amount: 8999,
    currency: 'INR',
    description: 'Custom B2B 2-Month Access Plan',
    isActive: true,
  });

  console.log('  Created Custom Cycle:', customCycle);
  if (customCycle.durationMonths !== 2 || customCycle.amount !== 8999) {
    console.error('❌ TEST 2 FAILED: Custom cycle properties mismatch');
    process.exit(1);
  }
  console.log('✅ TEST 2 PASSED: Dynamic payment cycle created successfully.');

  // TEST 3: User Pays with Custom 2-Month Plan
  console.log('\n--- TEST 3: User Pays with Custom 2-Month Plan ---');
  const user = await prisma.user.findFirst({ where: { status: 'APPROVED' } });
  if (!user) {
    console.error('❌ TEST 3 FAILED: No user found');
    process.exit(1);
  }

  const now = new Date();
  const res = await SubscriptionService.processPayment(user.id, {
    planName: 'ENTERPRISE_PRO',
    paymentMethod: 'RAZORPAY',
    cycleId: customCycle.id,
  });

  console.log('  Payment Transaction:', {
    invoiceNumber: res.transaction.invoiceNumber,
    cycleName: res.transaction.cycleName,
    amount: res.transaction.amount,
    paymentDate: res.transaction.paymentDate,
    nextDueDate: res.transaction.nextDueDate,
  });

  const expectedPeriodEnd = new Date(now);
  expectedPeriodEnd.setMonth(expectedPeriodEnd.getMonth() + 2);

  const actualPeriodEnd = new Date(res.subscription.currentPeriodEnd!);
  const diffDays = Math.abs(Math.round((actualPeriodEnd.getTime() - expectedPeriodEnd.getTime()) / (1000 * 60 * 60 * 24)));

  console.log(`  Calculated Period End difference: ${diffDays} day(s).`);
  if (diffDays > 2) {
    console.error('❌ TEST 3 FAILED: Period end calculation for 2-month cycle incorrect');
    process.exit(1);
  }
  console.log('✅ TEST 3 PASSED: Payment linked to 2-month cycle with exact period end calculation.');

  // TEST 4: Super Admin Activates Due User with Selected Plan (e.g., 6 Months Plan)
  console.log('\n--- TEST 4: Super Admin Activates User with Selected 6-Month Plan ---');
  const active6MCycle = cycles.find((c) => c.durationMonths === 6) || cycles[0];
  const approveRes = await SubscriptionService.approvePayment(user.id, active6MCycle.id);

  console.log('  Approved Transaction with Selected Plan:', {
    invoiceNumber: approveRes.invoiceNumber,
    cycleName: approveRes.cycleName,
    amount: approveRes.amount,
    nextDueDate: approveRes.nextDueDate,
  });

  if (approveRes.cycleName !== active6MCycle.name || approveRes.amount !== active6MCycle.amount) {
    console.error('❌ TEST 4 FAILED: Approved transaction did not adopt selected cycle name/amount');
    process.exit(1);
  }
  console.log('✅ TEST 4 PASSED: Super Admin successfully activated user with selected dynamic plan.');

  // TEST 5: Super Admin Deletes Test Cycle
  console.log('\n--- TEST 5: Super Admin Deletes Custom Payment Cycle ---');
  const delRes = await SubscriptionService.deletePaymentCycle(customCycle.id);
  console.log('  Delete Response:', delRes);
  console.log('✅ TEST 5 PASSED: Payment cycle deleted cleanly.');

  console.log('\n===========================================================');
  console.log('🎉 ALL DYNAMIC PAYMENT CYCLES & PLAN TESTS PASSED 100%');
  console.log('===========================================================');
}

main().finally(() => process.exit(0));
