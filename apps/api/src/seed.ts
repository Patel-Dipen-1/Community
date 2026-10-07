import { prisma } from '@b2b/database';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Starting TradeCircle Rich Seed Database Script (60+ Products, 8 Users, 4 Communities)...');

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
      name: 'Grocery & FMCG',
      description: 'Bulk agricultural produce, spices, and FMCG wholesale directory.',
      isActive: true,
    },
  });

  // 4. Create Categories
  console.log('🏷️ Creating Product Categories...');

  // Clothing Categories
  const mensWearCat = await prisma.category.create({
    data: {
      communityId: clothingComm.id,
      slug: 'mens-wear',
      name: "Men's Wear & Shirts",
      specFields: { fabric: ['Cotton', 'Denim', 'Polyester', 'Linen'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], gsm: [180, 220, 240] },
    },
  });

  const womensWearCat = await prisma.category.create({
    data: {
      communityId: clothingComm.id,
      slug: 'womens-wear',
      name: "Ethnic & Women's Wear",
      specFields: { fabric: ['Silk', 'Cotton', 'Georgette', 'Chiffon'], workType: ['Printed', 'Embroidery', 'Handloom', 'Zari'] },
    },
  });

  const fabricRollsCat = await prisma.category.create({
    data: {
      communityId: clothingComm.id,
      slug: 'fabric-rolls',
      name: 'Fabric Rolls & Raw Materials',
      specFields: { weave: ['Plain', 'Twill', 'Satin'], width: ["44 inches", "58 inches", "60 inches"] },
    },
  });

  // Hardware Categories
  const fastenersCat = await prisma.category.create({
    data: {
      communityId: hardwareComm.id,
      slug: 'fasteners',
      name: 'Industrial Fasteners & Bolts',
      specFields: { material: ['Stainless Steel SS304', 'Brass', 'Mild Steel'], hsnCode: '7318', grade: ['8.8', '10.9', '12.9'] },
    },
  });

  const powerToolsCat = await prisma.category.create({
    data: {
      communityId: hardwareComm.id,
      slug: 'power-tools',
      name: 'Heavy Duty Power Tools',
      specFields: { brand: ['Bosch', 'DeWalt', 'Makita', 'Stanley'], warranty: ['6 Months', '1 Year', '2 Years'] },
    },
  });

  // Electronics Categories
  const mobileAccCat = await prisma.category.create({
    data: {
      communityId: electronicsComm.id,
      slug: 'mobile-accessories',
      name: 'Mobile Accessories & Cases',
      specFields: { compatibility: ['Universal', 'iPhone 15/16', 'Samsung Galaxy'], packaging: ['Retail Box', 'Bulk Pack'] },
    },
  });

  const chargersCat = await prisma.category.create({
    data: {
      communityId: electronicsComm.id,
      slug: 'cables-chargers',
      name: 'Fast Chargers & Power Cables',
      specFields: { wattage: ['20W PD', '33W Fast', '65W GaN', '100W Cable'], connector: ['Type-C', 'Lightning'] },
    },
  });

  // Grocery Categories
  const spicesCat = await prisma.category.create({
    data: {
      communityId: groceryComm.id,
      slug: 'spices-dryfruits',
      name: 'Whole Spices & Dry Fruits',
      specFields: { origin: ['Kerala', 'Kashmir', 'California', 'Rajasthan'], grade: ['Grade A Premium', 'Export Quality'] },
    },
  });

  const pulsesCat = await prisma.category.create({
    data: {
      communityId: groceryComm.id,
      slug: 'pulses-grains',
      name: 'Grains & Pulses Wholesale',
      specFields: { packaging: ['25kg Jute Bag', '50kg HDPE Bag'], organic: ['Yes', 'No'] },
    },
  });

  // 5. Create Test Users & Business Profiles
  console.log('👤 Creating Test Users & Business Profiles...');

  // User 1: Rajesh (Clothing Only)
  const user1 = await prisma.user.create({
    data: {
      fullName: 'Rajesh Sharma',
      mobileNumber: '9876543210',
      email: 'rajesh.clothing@example.com',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
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
      subscription: { create: { planName: 'BUSINESS', status: 'ACTIVE' } },
    },
    include: { business: true },
  });

  // User 2: Priya (Clothing + Hardware)
  const user2 = await prisma.user.create({
    data: {
      fullName: 'Priya Patel',
      mobileNumber: '9876543211',
      email: 'priya.multi@example.com',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200',
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
      subscription: { create: { planName: 'ENTERPRISE_PRO', status: 'ACTIVE' } },
    },
    include: { business: true },
  });

  // User 3: Amit (Hardware Only)
  const user3 = await prisma.user.create({
    data: {
      fullName: 'Amit Kumar',
      mobileNumber: '9876543212',
      email: 'amit.hardware@example.com',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
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
      subscription: { create: { planName: 'PRO', status: 'ACTIVE' } },
    },
    include: { business: true },
  });

  // User 4: Vikram (Electronics Only)
  const user4 = await prisma.user.create({
    data: {
      fullName: 'Vikram Shah',
      mobileNumber: '9876543213',
      email: 'vikram.elec@example.com',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
      status: 'APPROVED',
      isVerified: true,
      business: {
        create: {
          shopName: 'Shah Electronics & Accessories Hub',
          gstNumber: '07DDDDD3333D1Z8',
          streetAddress: '12 Nehru Place Electronics Market',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110019',
          tradeTerms: '100% Advance Payment via Bank Transfer',
          assignedRole: 'MANUFACTURER',
          allowedCommunities: ['electronics'],
          verificationTag: true,
        },
      },
      subscription: { create: { planName: 'BUSINESS', status: 'ACTIVE' } },
    },
    include: { business: true },
  });

  // User 5: Ananya (Grocery Only)
  const user5 = await prisma.user.create({
    data: {
      fullName: 'Ananya Gupta',
      mobileNumber: '9876543214',
      email: 'ananya.grocery@example.com',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200',
      status: 'APPROVED',
      isVerified: true,
      business: {
        create: {
          shopName: 'Gupta Wholesale Spices & FMCG',
          gstNumber: '09EEEEE4444E1Z9',
          streetAddress: '78 APMC Grain Market',
          city: 'Kanpur',
          state: 'Uttar Pradesh',
          pincode: '208001',
          tradeTerms: 'Cash on Delivery for Local APMC Pickups',
          assignedRole: 'WHOLESALER',
          allowedCommunities: ['grocery'],
          verificationTag: true,
        },
      },
      subscription: { create: { planName: 'BUSINESS', status: 'ACTIVE' } },
    },
    include: { business: true },
  });

  // User 6: Suresh (Clothing Wholesale)
  const user6 = await prisma.user.create({
    data: {
      fullName: 'Suresh Singhania',
      mobileNumber: '9876543215',
      email: 'suresh.singhania@example.com',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200',
      status: 'APPROVED',
      isVerified: true,
      business: {
        create: {
          shopName: 'Singhania Silk Mills & Sarees',
          gstNumber: '19FFFFF5555F1ZA',
          streetAddress: '204 Burrabazar Textile Hub',
          city: 'Kolkata',
          state: 'West Bengal',
          pincode: '700007',
          tradeTerms: '50% Booking, 50% Before Delivery',
          assignedRole: 'MANUFACTURER',
          allowedCommunities: ['clothing'],
          verificationTag: true,
        },
      },
      subscription: { create: { planName: 'ENTERPRISE_PRO', status: 'ACTIVE' } },
    },
    include: { business: true },
  });

  // User 7: Super Admin
  const adminUser = await prisma.user.create({
    data: {
      fullName: 'Super Admin Operator',
      mobileNumber: '9999999999',
      email: 'admin@tradecircle.app',
      passwordHash: adminPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
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
          allowedCommunities: ['clothing', 'hardware', 'electronics', 'grocery'],
          verificationTag: true,
        },
      },
    },
    include: { business: true },
  });

  // Link Community Memberships
  await prisma.communityMember.createMany({
    data: [
      { businessId: user1.business!.id, communityId: clothingComm.id, role: 'MANUFACTURER' },
      { businessId: user2.business!.id, communityId: clothingComm.id, role: 'WHOLESALER' },
      { businessId: user2.business!.id, communityId: hardwareComm.id, role: 'DISTRIBUTOR' },
      { businessId: user3.business!.id, communityId: hardwareComm.id, role: 'TRADER' },
      { businessId: user4.business!.id, communityId: electronicsComm.id, role: 'MANUFACTURER' },
      { businessId: user5.business!.id, communityId: groceryComm.id, role: 'WHOLESALER' },
      { businessId: user6.business!.id, communityId: clothingComm.id, role: 'MANUFACTURER' },
    ],
  });

  // 6. Generate 60+ Products (15+ items per community category)
  console.log('🛍️ Generating 60+ B2B Catalog Products across communities...');

  const clothingItemsData = [
    { title: '60s Combed Cotton Plain T-Shirt (Pack of 50)', cat: mensWearCat.id, code: 'SKU-CLOTH-001', fabric: '100% Combed Cotton', moq: 50, price: 185, hot: true, img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600' },
    { title: 'Heavyweight Fleece Hoodies Bulk Lot', cat: mensWearCat.id, code: 'SKU-CLOTH-002', fabric: 'Cotton Fleece 320 GSM', moq: 30, price: 550, hot: false, img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600' },
    { title: 'Slim Fit Stretch Denim Jeans (Bundle of 20)', cat: mensWearCat.id, code: 'SKU-CLOTH-003', fabric: '98% Cotton 2% Spandex Denim', moq: 20, price: 620, hot: true, img: 'https://images.unsplash.com/photo-1542272604-780c36856d60?w=600' },
    { title: 'Formal Linen Check Buttoned Shirt (Set of 15)', cat: mensWearCat.id, code: 'SKU-CLOTH-004', fabric: 'Pure Linen', moq: 15, price: 790, hot: false, img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600' },
    { title: 'Casual Printed Oversized Drop Shoulder Tee', cat: mensWearCat.id, code: 'SKU-CLOTH-005', fabric: '240 GSM Heavy Cotton', moq: 40, price: 290, hot: true, img: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600' },
    { title: 'Designer Banarasi Silk Saree with Zari Border', cat: womensWearCat.id, code: 'SKU-CLOTH-006', fabric: 'Banarasi Pure Silk', moq: 10, price: 1850, hot: true, img: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600' },
    { title: 'Heavy Embroidery Anarkali Kurti Set with Dupatta', cat: womensWearCat.id, code: 'SKU-CLOTH-007', fabric: 'Rayon Viscose', moq: 15, price: 890, hot: false, img: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600' },
    { title: 'Chanderi Handloom Cotton Dupatta Wholesale Set', cat: womensWearCat.id, code: 'SKU-CLOTH-008', fabric: 'Chanderi Silk Cotton', moq: 25, price: 340, hot: false, img: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600' },
    { title: 'Festive Georgette Printed Lehenga Choli', cat: womensWearCat.id, code: 'SKU-CLOTH-009', fabric: 'Pure Georgette', moq: 8, price: 2400, hot: true, img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600' },
    { title: 'Casual Dailywear Cotton Printed Nightsuit Set', cat: womensWearCat.id, code: 'SKU-CLOTH-010', fabric: 'Soft Alpine Cotton', moq: 30, price: 420, hot: false, img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600' },
    { title: 'Organic Unbleached Raw Cotton Fabric Roll (100m)', cat: fabricRollsCat.id, code: 'SKU-CLOTH-011', fabric: '100% Organic Cotton', moq: 1, price: 9500, hot: false, img: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=600' },
    { title: 'Printed Rayon Kurti Fabric Roll (58 Inches Width)', cat: fabricRollsCat.id, code: 'SKU-CLOTH-012', fabric: 'Liva Approved Rayon', moq: 2, price: 8200, hot: true, img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600' },
    { title: 'Heavy Jacquard Brocade Fabric for Sherwani', cat: fabricRollsCat.id, code: 'SKU-CLOTH-013', fabric: 'Silk Jacquard', moq: 1, price: 14500, hot: false, img: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600' },
    { title: 'Lycra Stretch Activewear Track Pant Fabric Roll', cat: fabricRollsCat.id, code: 'SKU-CLOTH-014', fabric: 'Polyester Spandex Lycra', moq: 2, price: 11000, hot: false, img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600' },
    { title: 'Pure Chiffon Digital Print Dupatta Fabric Roll', cat: fabricRollsCat.id, code: 'SKU-CLOTH-015', fabric: 'Pure Chiffon', moq: 1, price: 12500, hot: true, img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600' },
  ];

  for (const item of clothingItemsData) {
    await prisma.product.create({
      data: {
        code: item.code,
        businessId: user1.business!.id,
        communityId: clothingComm.id,
        categoryId: item.cat,
        title: item.title,
        description: `Export-grade wholesale lot. Premium stitching, high durability, inspected quality for bulk trade buyers.`,
        moq: item.moq,
        priceTiers: [
          { minQty: item.moq, price: item.price },
          { minQty: item.moq * 5, price: Math.round(item.price * 0.88) },
        ],
        images: [item.img],
        isHotSelling: item.hot,
        specs: { category: 'Clothing & Textiles', fabric: item.fabric, sizes: ['M', 'L', 'XL'], gsm: '220 GSM' },
      },
    });
  }

  const hardwareItemsData = [
    { title: 'Hex Head Stainless Steel SS304 Bolts (Box of 500)', cat: fastenersCat.id, code: 'SKU-HARD-001', moq: 5, price: 1250, hot: true, img: 'https://images.unsplash.com/photo-1508873696983-2df515122519?w=600' },
    { title: 'Grade 8.8 High Tensile Structural Fasteners', cat: fastenersCat.id, code: 'SKU-HARD-002', moq: 10, price: 1800, hot: false, img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600' },
    { title: 'Brass Threaded Inserts for Plastic Moulding', cat: fastenersCat.id, code: 'SKU-HARD-003', moq: 20, price: 850, hot: true, img: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600' },
    { title: 'Self Tapping Drywall Screws (Zinc Plated 1000 Pcs)', cat: fastenersCat.id, code: 'SKU-HARD-004', moq: 8, price: 620, hot: false, img: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600' },
    { title: 'Heavy Duty Anchor Expansion Bolts (M12 x 100mm)', cat: fastenersCat.id, code: 'SKU-HARD-005', moq: 15, price: 1400, hot: true, img: 'https://images.unsplash.com/photo-1508873696983-2df515122519?w=600' },
    { title: '26mm Heavy Duty Rotary Hammer Drill Machine 800W', cat: powerToolsCat.id, code: 'SKU-HARD-006', moq: 2, price: 3800, hot: true, img: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600' },
    { title: '4-Inch Angle Grinder 850W Heavy Duty Motor', cat: powerToolsCat.id, code: 'SKU-HARD-007', moq: 4, price: 1950, hot: false, img: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600' },
    { title: 'Cordless Brushless Impact Driver Drill Kit 20V', cat: powerToolsCat.id, code: 'SKU-HARD-008', moq: 2, price: 5400, hot: true, img: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600' },
    { title: 'Commercial Woodworking Circular Saw 7-1/4 Inch', cat: powerToolsCat.id, code: 'SKU-HARD-009', moq: 3, price: 4200, hot: false, img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600' },
    { title: 'Portable Inverter ARC Welding Machine 250A', cat: powerToolsCat.id, code: 'SKU-HARD-010', moq: 1, price: 6800, hot: true, img: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600' },
    { title: 'Stainless Steel SS316 Pipe Fittings Elbow Set', cat: fastenersCat.id, code: 'SKU-HARD-011', moq: 10, price: 2100, hot: false, img: 'https://images.unsplash.com/photo-1508873696983-2df515122519?w=600' },
    { title: 'Industrial Hydraulic Jack 10 Ton Capacity', cat: powerToolsCat.id, code: 'SKU-HARD-012', moq: 2, price: 3200, hot: false, img: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600' },
    { title: 'High Pressure Car Washer Motor 2200W', cat: powerToolsCat.id, code: 'SKU-HARD-013', moq: 2, price: 7900, hot: true, img: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600' },
    { title: 'Spring Lock Washers Stainless Steel (Pack of 1000)', cat: fastenersCat.id, code: 'SKU-HARD-014', moq: 10, price: 780, hot: false, img: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600' },
    { title: 'Heavy Duty Bench Vise Cast Iron 6 Inch', cat: powerToolsCat.id, code: 'SKU-HARD-015', moq: 2, price: 2900, hot: true, img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600' },
  ];

  for (const item of hardwareItemsData) {
    await prisma.product.create({
      data: {
        code: item.code,
        businessId: user3.business!.id,
        communityId: hardwareComm.id,
        categoryId: item.cat,
        title: item.title,
        description: `Industrial grade B2B hardware item certified for heavy machinery, construction, and engineering applications.`,
        moq: item.moq,
        priceTiers: [
          { minQty: item.moq, price: item.price },
          { minQty: item.moq * 4, price: Math.round(item.price * 0.85) },
        ],
        images: [item.img],
        isHotSelling: item.hot,
        specs: { category: 'Hardware & Tools', material: 'Stainless Steel SS304', hsnCode: '7318' },
      },
    });
  }

  const electronicsItemsData = [
    { title: 'Transparent Magnetic MagSafe iPhone Cases (Lot of 100)', cat: mobileAccCat.id, code: 'SKU-ELEC-001', moq: 100, price: 65, hot: true, img: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600' },
    { title: 'Tempered Glass Screen Protectors 9H Hardness (200 Pcs)', cat: mobileAccCat.id, code: 'SKU-ELEC-002', moq: 200, price: 18, hot: true, img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600' },
    { title: 'Bluetooth TWS Earbuds ENC Noise Cancelling', cat: mobileAccCat.id, code: 'SKU-ELEC-003', moq: 30, price: 420, hot: true, img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600' },
    { title: 'Rugged Shockproof Armor Case for Samsung S24', cat: mobileAccCat.id, code: 'SKU-ELEC-004', moq: 50, price: 85, hot: false, img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600' },
    { title: 'Magnetic Ring Holder Phone Stand Accessory Box', cat: mobileAccCat.id, code: 'SKU-ELEC-005', moq: 100, price: 35, hot: false, img: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600' },
    { title: '65W GaN Fast Charger Type-C Dual Port Adapter', cat: chargersCat.id, code: 'SKU-ELEC-006', moq: 25, price: 580, hot: true, img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600' },
    { title: '100W Braided Nylon Fast Charging Type-C Cable 2m', cat: chargersCat.id, code: 'SKU-ELEC-007', moq: 50, price: 95, hot: true, img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600' },
    { title: '20W PD Apple Fast Charger Adapter (Bulk Pack)', cat: chargersCat.id, code: 'SKU-ELEC-008', moq: 40, price: 240, hot: false, img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600' },
    { title: 'Wireless 3-in-1 Charging Dock Station for Desk', cat: chargersCat.id, code: 'SKU-ELEC-009', moq: 20, price: 890, hot: true, img: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600' },
    { title: '20000mAh Power Bank 22.5W Fast Charge Output', cat: chargersCat.id, code: 'SKU-ELEC-010', moq: 15, price: 720, hot: true, img: 'https://images.unsplash.com/photo-1609592424074-ed779b5c3639?w=600' },
    { title: 'Smart Watch AMOLED Display Zinc Alloy Body', cat: mobileAccCat.id, code: 'SKU-ELEC-011', moq: 20, price: 1150, hot: true, img: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600' },
    { title: 'Car Wireless FM Transmitter & Fast Car Charger', cat: chargersCat.id, code: 'SKU-ELEC-012', moq: 30, price: 290, hot: false, img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600' },
    { title: 'OTG USB 3.0 Pen Drive Dual Type-C Flash Drive 64GB', cat: mobileAccCat.id, code: 'SKU-ELEC-013', moq: 40, price: 310, hot: false, img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600' },
    { title: 'Portable Bluetooth Party Speaker RGB Light 20W', cat: mobileAccCat.id, code: 'SKU-ELEC-014', moq: 10, price: 1280, hot: true, img: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600' },
    { title: 'Aux Audio Extension Cable Gold Plated 3.5mm', cat: chargersCat.id, code: 'SKU-ELEC-015', moq: 100, price: 28, hot: false, img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600' },
  ];

  for (const item of electronicsItemsData) {
    await prisma.product.create({
      data: {
        code: item.code,
        businessId: user4.business!.id,
        communityId: electronicsComm.id,
        categoryId: item.cat,
        title: item.title,
        description: `B2B consumer electronics & mobile accessories. Factory tested, CE/RoHS compliant, wholesale pricing.`,
        moq: item.moq,
        priceTiers: [
          { minQty: item.moq, price: item.price },
          { minQty: item.moq * 5, price: Math.round(item.price * 0.88) },
        ],
        images: [item.img],
        isHotSelling: item.hot,
        specs: { category: 'Electronics & Gadgets', warranty: '6 Months Replacement', compatibility: 'Universal' },
      },
    });
  }

  const groceryItemsData = [
    { title: 'Organic Whole Green Cardamom (5kg Wholesale Pouch)', cat: spicesCat.id, code: 'SKU-GROC-001', moq: 2, price: 11500, hot: true, img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600' },
    { title: 'Premium Kashmir Mongra Saffron 10g Pack', cat: spicesCat.id, code: 'SKU-GROC-002', moq: 5, price: 1950, hot: true, img: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600' },
    { title: 'California Jumbo Almonds Badam (10kg Carton)', cat: spicesCat.id, code: 'SKU-GROC-003', moq: 1, price: 6800, hot: false, img: 'https://images.unsplash.com/photo-1508061252966-dfd30f67ea55?w=600' },
    { title: 'W240 Grade Premium Whole Cashews Kaju (10kg Pack)', cat: spicesCat.id, code: 'SKU-GROC-004', moq: 1, price: 7400, hot: true, img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600' },
    { title: 'Bold Red Chilli Powder Teja Quality (25kg Bag)', cat: spicesCat.id, code: 'SKU-GROC-005', moq: 2, price: 5200, hot: false, img: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600' },
    { title: 'Royal Traditional Basmati Rice 1121 Raw (50kg Bag)', cat: pulsesCat.id, code: 'SKU-GROC-006', moq: 5, price: 4200, hot: true, img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600' },
    { title: 'Unpolished Toor Dal Arhar Wholesale (50kg HDPE Bag)', cat: pulsesCat.id, code: 'SKU-GROC-007', moq: 4, price: 6100, hot: false, img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600' },
    { title: 'Premium Organic Moong Dal Unpolished (25kg Bag)', cat: pulsesCat.id, code: 'SKU-GROC-008', moq: 4, price: 2900, hot: false, img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600' },
    { title: 'Kabuli Chana Chickpeas 8mm Grade A (50kg Bag)', cat: pulsesCat.id, code: 'SKU-GROC-009', moq: 3, price: 5800, hot: true, img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600' },
    { title: 'Refined Cold Pressed Mustard Oil 15L Tin', cat: pulsesCat.id, code: 'SKU-GROC-010', moq: 10, price: 1850, hot: true, img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600' },
    { title: 'Whole Black Pepper Malabar Garbled (10kg Bag)', cat: spicesCat.id, code: 'SKU-GROC-011', moq: 2, price: 5900, hot: false, img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600' },
    { title: 'Pure Turmeric Powder High Curcumin 5% (25kg Bag)', cat: spicesCat.id, code: 'SKU-GROC-012', moq: 2, price: 3400, hot: true, img: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600' },
    { title: 'Whole Cumin Seeds Jeera Uncleaned (50kg Bag)', cat: spicesCat.id, code: 'SKU-GROC-013', moq: 2, price: 14500, hot: true, img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600' },
    { title: 'Organic Jaggery Powder Gur Bulk Box (20kg)', cat: pulsesCat.id, code: 'SKU-GROC-014', moq: 5, price: 1100, hot: false, img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600' },
    { title: 'Dry Cloves Clove Laung Premium Grade (5kg Pouch)', cat: spicesCat.id, code: 'SKU-GROC-015', moq: 2, price: 4200, hot: true, img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600' },
  ];

  for (const item of groceryItemsData) {
    await prisma.product.create({
      data: {
        code: item.code,
        businessId: user5.business!.id,
        communityId: groceryComm.id,
        categoryId: item.cat,
        title: item.title,
        description: `Direct APMC mandi wholesale rates. Laboratory tested for moisture and purity, export packaging available.`,
        moq: item.moq,
        priceTiers: [
          { minQty: item.moq, price: item.price },
          { minQty: item.moq * 4, price: Math.round(item.price * 0.90) },
        ],
        images: [item.img],
        isHotSelling: item.hot,
        specs: { category: 'Grocery & FMCG', origin: 'Direct APMC Mandi', packaging: 'Bulk Sealed HDPE Bags' },
      },
    });
  }

  // 7. Create Trade Groups
  console.log('💬 Creating Trade Groups...');
  const clothingGroup = await prisma.group.create({
    data: {
      title: 'Surat Wholesale Kurtis & Fabrics Hub',
      description: 'Official B2B network for Verified Surat Garment Manufacturers & Distributors.',
      communitySlug: 'clothing',
      createdById: user1.id,
      maxCapacity: 50,
      onlyAdminCanPost: false,
    },
  });

  const hardwareGroup = await prisma.group.create({
    data: {
      title: 'GIDC Industrial Fasteners & Hardware Guild',
      description: 'Verified suppliers and buyers of bolts, screws, power tools, and industrial hardware.',
      communitySlug: 'hardware',
      createdById: user2.id,
      maxCapacity: 50,
      onlyAdminCanPost: false,
    },
  });

  await prisma.groupMember.createMany({
    data: [
      { groupId: clothingGroup.id, userId: user1.id, roleInGroup: 'ADMIN' },
      { groupId: clothingGroup.id, userId: user2.id, roleInGroup: 'MEMBER' },
      { groupId: clothingGroup.id, userId: user6.id, roleInGroup: 'MEMBER' },
      { groupId: hardwareGroup.id, userId: user2.id, roleInGroup: 'ADMIN' },
      { groupId: hardwareGroup.id, userId: user3.id, roleInGroup: 'MEMBER' },
    ],
  });

  // 8. Create Sample Group Messages
  await prisma.groupMessage.create({
    data: {
      groupId: clothingGroup.id,
      senderId: user1.id,
      text: 'Welcome everyone! We have just listed 15 new 60s Combed Cotton kurti sets in our showroom. Check catalog!',
    },
  });

  await prisma.groupMessage.create({
    data: {
      groupId: clothingGroup.id,
      senderId: user2.id,
      text: 'Great collection Rajesh bhai! What is the MOQ for Surat local delivery?',
    },
  });

  // 9. Create 1-to-1 Sample Direct Conversation
  console.log('📩 Creating 1-to-1 Direct Conversation...');
  const conversation = await prisma.conversation.create({
    data: {
      user1Id: user1.id,
      user2Id: user2.id,
    },
  });

  const msg1 = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: user2.id,
      text: 'Hello Rajesh Ji, can you share quote for SKU-CLOTH-001 (50 packs)?',
      status: 'READ',
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: user1.id,
      replyToId: msg1.id,
      text: 'Namaste Priya Ji! For 50 packs, rate is ₹185/unit with 30% advance deposit. Dispatch tomorrow!',
      status: 'DELIVERED',
    },
  });

  // 10. Create Status Stories (24h TTL)
  console.log('📸 Creating Status Stories...');
  await prisma.status.create({
    data: {
      userId: user1.id,
      businessId: user1.business!.id,
      caption: '🔥 New Festive Banarasi Silk Collection Available! Tap to Chat.',
      mediaUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
      mediaType: 'IMAGE',
      categories: ['clothing'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.status.create({
    data: {
      userId: user3.id,
      businessId: user3.business!.id,
      caption: '⚡ Bosch 800W Rotary Hammer Drills in Stock! Special Wholesale Price for 10+ Units.',
      mediaUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600',
      mediaType: 'IMAGE',
      categories: ['hardware'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  console.log('🎉 Rich Seed Data Generation Completed Successfully!');
  console.log('📊 Summary:');
  console.log('   - 4 Trade Communities');
  console.log('   - 8 Product Categories');
  console.log('   - 7 Verified Business Users & Accounts (+ Super Admin)');
  console.log('   - 60+ B2B Products with Prices, Photos, Specs & MOQs');
  console.log('   - 2 Trade Groups with Messages');
  console.log('   - 1 Direct Chat Conversation');
  console.log('   - 2 Active Status Stories');
}

seed()
  .catch((e) => {
    console.error('❌ Seed Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
