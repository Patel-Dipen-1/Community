import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface StoreProfile {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  bio: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDetails {
  id: string;
  userId?: string;
  shopName: string;
  assignedRole: string;
  allowedCommunities: string[];
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string | null;
  verificationTag: boolean;
  ownerName: string;
  mobileNumber: string;
  status: string;
  media: Array<{ id: string; url: string; mediaType: string }>;
}

export interface StoreResponse {
  success: boolean;
  store: StoreProfile;
  business: BusinessDetails;
  isOwner?: boolean;
  products: any[];
  stats?: {
    totalProducts: number;
    activeProducts: number;
  };
}

export const storeApi = createApi({
  reducerPath: 'storeApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
    prepareHeaders: (headers) => {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('b2b_auth_token')) : null;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Store', 'Products'],
  endpoints: (builder) => ({
    getOwnerStore: builder.query<StoreResponse, void>({
      query: () => '/store/me',
      providesTags: ['Store'],
    }),
    updateOwnerStore: builder.mutation<
      { success: boolean; message: string; store: StoreProfile },
      { name?: string; bio?: string; logoUrl?: string; bannerUrl?: string; isActive?: boolean }
    >({
      query: (body) => ({
        url: '/store/me',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Store'],
    }),
    getPublicStore: builder.query<StoreResponse, string>({
      query: (storeIdOrSlug) => `/store/${encodeURIComponent(storeIdOrSlug)}`,
      providesTags: (_result, _error, id) => [{ type: 'Store', id }],
    }),
    toggleProductStatus: builder.mutation<
      { success: boolean; message: string; product: any },
      { productId: string; isActive: boolean }
    >({
      query: ({ productId, isActive }) => ({
        url: `/products/${productId}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      invalidatesTags: ['Store', 'Products'],
    }),
  }),
});

export const {
  useGetOwnerStoreQuery,
  useUpdateOwnerStoreMutation,
  useGetPublicStoreQuery,
  useToggleProductStatusMutation,
} = storeApi;
