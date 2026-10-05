import { baseApi } from './baseApi';
import { ProductItem } from './productApi';

export interface StoreProfile {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  bio?: string;
  logoUrl?: string;
  bannerUrl?: string;
  isActive: boolean;
  business?: {
    id: string;
    shopName: string;
    gstNumber?: string;
    streetAddress: string;
    city: string;
    state: string;
    pincode: string;
    verificationTag: boolean;
    assignedRole: string;
    allowedCommunities: string[];
    user?: {
      fullName: string;
      mobileNumber: string;
      email: string;
    };
  };
  products?: ProductItem[];
}

export const storeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStoreById: builder.query<{ store: StoreProfile }, string>({
      query: (businessId) => `/store/${businessId}`,
      providesTags: (result, error, businessId) => [{ type: 'Store', id: businessId }],
    }),

    getMyStore: builder.query<{ store: StoreProfile }, void>({
      query: () => '/store/me',
      providesTags: ['Store'],
    }),

    updateStore: builder.mutation<{ message: string; store: StoreProfile }, Partial<StoreProfile>>({
      query: (data) => ({
        url: '/store/me',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Store'],
    }),
  }),
});

export const {
  useGetStoreByIdQuery,
  useGetMyStoreQuery,
  useUpdateStoreMutation,
} = storeApi;
