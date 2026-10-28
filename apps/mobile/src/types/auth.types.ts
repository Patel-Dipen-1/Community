export interface RegisterBusinessInput {
  fullName: string;
  shopName: string;
  mobileNumber: string;
  email: string;
  password?: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber?: string;
  shopMediaUrls?: string[];
}

export interface LoginInput {
  username: string;
  password?: string;
}

export type UserRole =
  | 'MANUFACTURER'
  | 'DISTRIBUTOR'
  | 'WHOLESALER'
  | 'TRADER'
  | 'RETAILER'
  | 'SUPER_ADMIN';

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'BLOCKED'
  | 'BLACK';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  avatar?: string | null;
  googleId?: string | null;
  status: VerificationStatus;
  isVerified: boolean;
  isDeletionRequested?: boolean;
  deletionReason?: string | null;
  business?: {
    id: string;
    shopName: string;
    gstNumber?: string | null;
    streetAddress: string;
    city: string;
    state: string;
    pincode: string;
    assignedRole: UserRole;
    allowedCommunities: string[];
    verificationTag: boolean;
  } | null;
}

export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
  message?: string;
  sessionWarning?: string;
}
