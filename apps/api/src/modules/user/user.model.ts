export interface IUser {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  passwordHash: string;
  isVerified: boolean;
  status: 'UNVERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  business?: {
    id: string;
    shopName: string;
    gstNumber?: string;
    streetAddress: string;
    city: string;
    state: string;
    pincode: string;
    verificationMedia: string[];
    verificationTag: boolean;
    assignedRole?: string | null;
  };
  createdAt: Date;
}

export interface ISession {
  id: string;
  userId: string;
  token: string;
  platform: 'WEB' | 'MOBILE';
  ipAddress?: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  lastActive: Date;
}
