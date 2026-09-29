export interface IBusinessProfile {
  businessId: string;
  shopName: string;
  verificationTag: boolean;
  gstNumber?: string;
  city: string;
  state: string;
  address: string;
  assignedRole?: string;
  category?: string;
  contactOptions: {
    directCallButton: boolean;
    inAppChatButton: boolean;
    mobileNumber: string;
  };
  section1_HotSellingItems: any[];
  section2_Catalogs: any[];
  section3_VerifiedShopMedia: any[];
  section4_BusinessDetails: any;
}
