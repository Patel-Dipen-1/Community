import { IBusinessProfile } from './business.model';

const mockProfilesStore: Record<string, IBusinessProfile> = {
  'biz-101': {
    businessId: 'biz-101',
    shopName: 'Royal Textiles & Fashion Hub',
    verificationTag: true,
    gstNumber: '24AAAAA0000A1Z5',
    city: 'Surat',
    state: 'Gujarat',
    address: '102 Ring Road Textile Market, Surat, Gujarat - 395002',
    assignedRole: 'MANUFACTURER',
    category: 'Clothing & Textiles',
    contactOptions: {
      directCallButton: true,
      inAppChatButton: true,
      mobileNumber: '+91 98765 43210',
    },
    section1_HotSellingItems: [
      {
        id: 'prod-101',
        code: 'SKU-CLOTH-001',
        title: 'Premium Cotton Kurti Collection',
        moq: 50,
        startingPrice: 350.0,
        images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'],
      },
    ],
    section2_Catalogs: [
      {
        catalogId: 'cat-201',
        catalogCode: 'CAT-SUMMER-2026',
        title: 'Summer Cotton Printed Catalogs 2026',
        totalDesigns: 12,
        moq: 100,
        coverImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600',
      },
    ],
    section3_VerifiedShopMedia: [
      { id: 'm1', type: 'IMAGE', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600', label: 'Shopfront Premises' },
      { id: 'm2', type: 'IMAGE', url: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600', label: 'Stock & Warehouse' },
    ],
    section4_BusinessDetails: {
      ownerName: 'Dipen Patel',
      memberSince: '2026-01-15',
      verifiedByAdmin: true,
      operatingCommunities: ['Clothing'],
    },
  }
};

export class BusinessService {
  static async getProfile(businessId: string): Promise<IBusinessProfile> {
    if (mockProfilesStore[businessId]) {
      return mockProfilesStore[businessId];
    }
    return {
      businessId,
      shopName: 'New Business Shop',
      verificationTag: false,
      city: 'Default City',
      state: 'Default State',
      address: 'Address Line',
      contactOptions: { directCallButton: true, inAppChatButton: true, mobileNumber: '+91 00000 00000' },
      section1_HotSellingItems: [],
      section2_Catalogs: [],
      section3_VerifiedShopMedia: [],
      section4_BusinessDetails: {},
    };
  }

  // Update Business Profile
  static async updateProfile(businessId: string, updateData: any): Promise<IBusinessProfile> {
    const profile = await this.getProfile(businessId);
    const updated = {
      ...profile,
      ...updateData,
      contactOptions: {
        ...profile.contactOptions,
        ...(updateData.contactOptions || {}),
      },
    };
    mockProfilesStore[businessId] = updated;
    return updated;
  }
}
