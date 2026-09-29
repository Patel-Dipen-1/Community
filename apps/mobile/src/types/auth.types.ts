import { RegisterBusinessInput, LoginInput } from '@b2b/shared-types';

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
}

export type { RegisterBusinessInput, LoginInput };
