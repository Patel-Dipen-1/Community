import { prisma } from '@b2b/database';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Starting TradeCircle Complete Seed Database Script...');

  // 1. Clean existing seed data in correct order
  console.log('🧹 Cleaning existing test data...');
  await prisma.broadcastDelivery.deleteMany();
  await prisma.broadcastMessage.deleteMany();
  await prisma.broadcastRecipient.deleteMany();
  await prisma.broadcastList.deleteMany();
  await prisma.groupMessage.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.groupJoinRequest.deleteMany();
  await prisma.group.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationSetting.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.statusView.deleteMany();
  await prisma.status.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.leadCapture.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.communityMember.deleteMany();
  await prisma.community.deleteMany();
  await prisma.store.deleteMany();
  await prisma.verificationMedia.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.userSubscription.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userPushToken.deleteMany();
  await prisma.userPrivacy.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.dynamicPlatformSetting.deleteMany();

  console.log('✅ Cleaned up old records.');

  // 2. Hash default passwords
  const defaultPasswordHash = await bcrypt.hash('Password123', 10);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123', 10);

  // 3. Create Communities
  console.log('📦 Creating Trade Communities...');
  const clothingComm = await prisma.community.create({
    data: {
      slug: 'clothing',
      name: 'Clothing & Textiles',
      description: 'Private trade space for clothing manufacturers, wholesalers, and fabric suppliers.',
      isActive: true,
    },
  });

  const hardwareComm = await prisma.community.create({
    data: {
      slug: 'hardware',
      name: 'Hardware & Tools',
      description: 'Exclusive business network for hardware tools, fasteners, and industrial suppliers.',
      isActive: true,
    },
  });

  const electronicsComm = await prisma.community.create({
    data: {
      slug: 'electronics',
      name: 'Electronics & Gadgets',
      description: 'B2B hub for mobile accessories, consumer electronics, and circuit components.',
      isActive: true,
    },
  });

  const groceryComm = await prisma.community.create({
    data: {
      slug: 'grocery',
      name: 'Grocery & Staples',
      description: 'Bulk agricultural produce, spices, and FMCG wholesale directory.',
      isActive: true,
    },
  });

  // 4. Create Categories
  console.log('🏷️ Creating Product Categories...');
  const mensWearCat = await prisma.category.create({
    data: {
      communityId: clothingComm.id,
      slug: 'mens-wear',
      name: "Men's Wear",
      specFields: { fabric: ['Cotton', 'Denim', 'Polyester'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], gsm: [180, 220, 240] },
    },
  });

  const womensWearCat = await prisma.category.create({
    data: {
      communityId: clothingComm.id,
      slug: 'womens-wear',
      name: "Women's Wear",
      specFields: { fabric: ['Silk', 'Cotton', 'Georgette'], workType: ['Printed', 'Embroidery', 'Handloom'] },
    },
  });

  const fastenersCat = await prisma.category.create({
    data: {
      communityId: hardwareComm.id,
      slug: 'fasteners',
      name: 'Industrial Fasteners',
      specFields: { material: ['Stainless Steel SS304', 'Brass', 'Mild Steel'], hsnCode: '7318', grade: ['8.8', '10.9', '12.9'] },
    },
  });

  const powerToolsCat = await prisma.category.create({
    data: {
      communityId: hardwareComm.id,
      slug: 'power-tools',
      name: 'Power Tools',
      specFields: { brand: ['Bosch', 'DeWalt', 'Makita'], warranty: ['6 Months', '1 Year', '2 Years'] },
    },
  });

  // 5. Create Test Users & Business Profiles (Matching Master Specification 3-User Rule)
  console.log('👤 Creating Test Users & Business Profiles...');

  // User 1: Clothing Only
  const user1 = await prisma.user.create({
    data: {
      fullName: 'Rajesh Sharma',
      mobileNumber: '9876543210',
      email: 'rajesh.clothing@example.com',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'APPROVED',
      isVerified: true,
      business: {
        create: {
          shopName: 'Surat Garments Pvt Ltd',
          gstNumber: '24AAAAA0000A1Z5',
          streetAddress: '102 Ring Road Textile Market',
          city: 'Surat',
          state: 'Gujarat',
          pincode: '395002',
          tradeTerms: '30% Advance, Balance on Dispatch',
          assignedRole: 'MANUFACTURER',
          allowedCommunities: ['clothing'],
          verificationTag: true,
        },
      },
      subscription: {
        create: {
          planName: 'BUSINESS',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      privacy: {
        create: {
          lastSeen: 'EVERYONE',
          onlineStatus: 'EVERYONE',
          profilePhoto: 'EVERYONE',
        },
      },
    },
    include: { business: true },
  });

  // User 2: Clothing + Hardware (Multi-Community User)
  const user2 = await prisma.user.create({
    data: {
      fullName: 'Priya Patel',
      mobileNumber: '9876543211',
      email: 'priya.multi@example.com',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      status: 'APPROVED',
      isVerified: true,
      business: {
        create: {
          shopName: 'Patel Traders & Tools',
          gstNumber: '24BBBBB1111B1Z6',
          streetAddress: '45 GIDC Industrial Estate',
          city: 'Ahmedabad',
          state: 'Gujarat',
          pincode: '380015',
          tradeTerms: 'Full Payment before Loading',
          assignedRole: 'WHOLESALER',
          allowedCommunities: ['clothing', 'hardware'],
          verificationTag: true,
        },
      },
      subscription: {
        create: {
          planName: 'ENTERPRISE_PRO',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      },
      privacy: {
        create: {
          lastSeen: 'EVERYONE',
          onlineStatus: 'EVERYONE',
        },
      },
    },
    include: { business: true },
  });

  // User 3: Hardware Only
  const user3 = await prisma.user.create({
    data: {
      fullName: 'Amit Kumar',
      mobileNumber: '9876543212',
      email: 'amit.hardware@example.com',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      status: 'APPROVED',
      isVerified: true,
      business: {
        create: {
          shopName: 'Kumar Fasteners & Hardware',
          gstNumber: '27CCCCC2222C1Z7',
          streetAddress: '88 Lamington Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400004',
          tradeTerms: 'Net 15 Days Credit for Verified Buyers',
          assignedRole: 'DISTRIBUTOR',
          allowedCommunities: ['hardware'],
          verificationTag: true,
        },
      },
      subscription: {
        create: {
          planName: 'PRO',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        },
      },
    },
    include: { business: true },
  });

  // User 4: Super Admin
  const adminUser = await prisma.user.create({
    data: {
      fullName: 'Super Admin Operator',
      mobileNumber: '9999999999',
      email: 'admin@tradecircle.app',
      passwordHash: adminPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      status: 'APPROVED',
      isVerified: true,
      business: {
        create: {
          shopName: 'TradeCircle Corporate Admin Headquarters',
          streetAddress: 'Tower A, Tech Park',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560103',
          assignedRole: 'SUPER_ADMIN',
          allowedCommunities: ['clothing', 'hardware', 'electronics', 'grocery', 'furniture'],
          verificationTag: true,
        },
      },
    },
  });

  // Link Community Memberships
  await prisma.communityMember.createMany({
    data: [
      { businessId: user1.business!.id, communityId: clothingComm.id, role: 'MANUFACTURER' },
      { businessId: user2.business!.id, communityId: clothingComm.id, role: 'WHOLESALER' },
      { businessId: user2.business!.id, communityId: hardwareComm.id, role: 'DISTRIBUTOR' },
      { businessId: user3.business!.id, communityId: hardwareComm.id, role: 'TRADER' },
    ],
  });

  // 6. Create Seed Products
  console.log('🛍️ Seeding Products...');

  const product1 = await prisma.product.create({
    data: {
      code: 'SKU-CLOTH-001',
      businessId: user1.business!.id,
      communityId: clothingComm.id,
      categoryId: mensWearCat.id,
      title: 'Premium Combed Cotton Shirt Set (Box of 12)',
      description: '100% Super Combed Cotton Men Regular Fit Casual Shirts. Export quality stitching, pre-shrunk fabric.',
      moq: 12,
      priceTiers: [
        { minQty: 12, pricePerUnit: 450 },
        { minQty: 60, pricePerUnit: 410 },
        { minQty: 120, pricePerUnit: 380 },
      ],
      images: [
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600',
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600',
      ],
      specs: { fabric: '100% Cotton', pattern: 'Solid', gsm: 220, fit: 'Slim Fit' },
      isHotSelling: true,
      isActive: true,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      code: 'SKU-CLOTH-002',
      businessId: user2.business!.id,
      communityId: clothingComm.id,
      categoryId: womensWearCat.id,
      title: 'Designer Georgette Printed Anarkali Suit',
      description: 'Heavy Georgette Fabric with Digital Flower Print and Embroidery Work. Matching Dupatta included.',
      moq: 10,
      priceTiers: [
        { minQty: 10, pricePerUnit: 850 },
        { minQty: 50, pricePerUnit: 790 },
      ],
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
      ],
      specs: { fabric: 'Georgette', dupatta: 'Chiffon', length: 'Full Length' },
      isHotSelling: false,
      isActive: true,
    },
  });

  const product3 = await prisma.product.create({
    data: {
      code: 'SKU-HARD-001',
      businessId: user3.business!.id,
      communityId: hardwareComm.id,
      categoryId: fastenersCat.id,
      title: 'Stainless Steel Hex Head Bolt M8 x 50mm (Pack of 500)',
      description: 'Grade SS304 Corrosion Resistant Hexagon Bolts for Structural and Marine Fittings.',
      moq: 500,
      priceTiers: [
        { minQty: 500, pricePerUnit: 8.5 },
        { minQty: 2500, pricePerUnit: 7.2 },
      ],
      images: [
        'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=600',
      ],
      specs: { material: 'SS304', hsnCode: '73181500', thread: 'Full Thread' },
      isHotSelling: true,
      isActive: true,
    },
  });

  // 7. Create Groups & Group Members
  console.log('👥 Seeding Groups & Memberships...');

  const clothingGroup = await prisma.group.create({
    data: {
      title: 'Surat Textile Manufacturers Broadcast',
      description: 'Official wholesale broadcast group for Surat textile mill owners and bulk buyers.',
      type: 'BROADCAST',
      communitySlug: 'clothing',
      createdById: user1.id,
      maxCapacity: 100,
      onlyAdminCanPost: true,
      hideMemberIdentity: true,
      members: {
        create: [
          { userId: user1.id, roleInGroup: 'ADMIN' },
          { userId: user2.id, roleInGroup: 'MEMBER' },
        ],
      },
    },
  });

  const hardwareGroup = await prisma.group.create({
    data: {
      title: 'India Hardware & Fasteners Network',
      description: 'B2B Discussion group for industrial hardware tools and fastener traders.',
      type: 'GROUP',
      communitySlug: 'hardware',
      createdById: user3.id,
      maxCapacity: 50,
      onlyAdminCanPost: false,
      hideMemberIdentity: false,
      members: {
        create: [
          { userId: user3.id, roleInGroup: 'ADMIN' },
          { userId: user2.id, roleInGroup: 'MEMBER' },
        ],
      },
    },
  });

  // 8. Create One-to-One Conversations & Seed Messages
  console.log('💬 Seeding Conversations & Messages...');

  // Conversation 1: User 1 (Clothing) & User 2 (Clothing+Hardware) -> Shared Category: Clothing
  const conv1 = await prisma.conversation.create({
    data: {
      user1Id: user1.id,
      user2Id: user2.id,
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv1.id,
        senderId: user1.id,
        text: 'Hello Priya, welcome to TradeCircle! Check out our new Cotton Shirt collection for this season.',
        productCode: 'SKU-CLOTH-001',
        status: 'READ',
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        conversationId: conv1.id,
        senderId: user2.id,
        text: 'Hi Rajesh! Product looks great. What is the minimum order quantity for custom embroidery?',
        status: 'READ',
        createdAt: new Date(Date.now() - 1800000),
      },
      {
        conversationId: conv1.id,
        senderId: user1.id,
        text: 'For custom embroidery MOQ is 60 pcs. I can send you sample swatches tomorrow.',
        status: 'DELIVERED',
        createdAt: new Date(Date.now() - 300000),
      },
    ],
  });

  // Conversation 2: User 2 (Clothing+Hardware) & User 3 (Hardware Only) -> Shared Category: Hardware
  const conv2 = await prisma.conversation.create({
    data: {
      user1Id: user2.id,
      user2Id: user3.id,
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv2.id,
        senderId: user3.id,
        text: 'Hi Priya, we have fresh stock of M8 Hex Bolts in SS304 ready for dispatch from Mumbai.',
        productCode: 'SKU-HARD-001',
        status: 'READ',
        createdAt: new Date(Date.now() - 7200000),
      },
      {
        conversationId: conv2.id,
        senderId: user2.id,
        text: 'Please send formal quotation for 5,000 pcs delivered to Ahmedabad GIDC warehouse.',
        status: 'SENT',
        createdAt: new Date(Date.now() - 900000),
      },
    ],
  });

  // 9. Create 24-Hour Status Stories
  console.log('📸 Seeding 24-Hour Status Stories...');

  await prisma.status.create({
    data: {
      userId: user1.id,
      businessId: user1.business!.id,
      caption: '🚀 Fresh Cotton Shirt Stock Arrived in Surat Warehouse! DM for wholesale rate sheet.',
      mediaUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600',
      mediaType: 'IMAGE',
      categories: ['clothing'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.status.create({
    data: {
      userId: user3.id,
      businessId: user3.business!.id,
      caption: '⚡ Special Weekend Discount on Stainless Steel Fasteners Bulk Orders!',
      mediaUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=600',
      mediaType: 'IMAGE',
      categories: ['hardware'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  // 10. System Settings
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {
      subscriptionSystemEnabled: true,
      freeTrialEnabled: true,
      paymentEnabled: true,
      razorpayEnabled: true,
      manualPaymentEnabled: true,
    },
    create: {
      id: 'default',
      subscriptionSystemEnabled: true,
      freeTrialEnabled: true,
      paymentEnabled: true,
      razorpayEnabled: true,
      manualPaymentEnabled: true,
    },
  });

  console.log('\n✅ =======================================================');
  console.log('🎉 TRADECIRCLE SEED DATA CREATED SUCCESSFULLY!');
  console.log('=======================================================');
  console.log('🔑 TEST CREDENTIALS SUMMARY:');
  console.log('-------------------------------------------------------');
  console.log('1. User 1 (Clothing Only):');
  console.log('   Email: rajesh.clothing@example.com | Phone: 9876543210 | Pass: Password123');
  console.log('2. User 2 (Clothing + Hardware Multi-Space):');
  console.log('   Email: priya.multi@example.com | Phone: 9876543211 | Pass: Password123');
  console.log('3. User 3 (Hardware Only):');
  console.log('   Email: amit.hardware@example.com | Phone: 9876543212 | Pass: Password123');
  console.log('4. Super Admin:');
  console.log('   Email: admin@tradecircle.app | Phone: 9999999999 | Pass: AdminPassword123');
  console.log('-------------------------------------------------------');
  console.log('💡 Note: Golden Rule test case (Section 2.3):');
  console.log('   - User 1 & User 2 share "clothing" -> Can chat & see clothing products.');
  console.log('   - User 2 & User 3 share "hardware" -> Can chat & see hardware products.');
  console.log('   - User 1 & User 3 share NO categories -> Completely INVISIBLE to each other!');
  console.log('=======================================================\n');
}

seed()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
