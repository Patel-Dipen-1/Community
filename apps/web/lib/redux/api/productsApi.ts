import { baseApi } from './baseApi';

export interface ProductFilterParams {
  communityId?: string;
  query?: string;
  isHotSelling?: boolean;
  businessId?: string;
}

export interface GlobalOptionsResponse {
  categories: string[];
  fabrics: string[];
  genders: string[];
  fitTypes: string[];
  seasons: string[];
  sizes: string[];
  patterns: string[];
}

export interface CategoryRequestData {
  id: string;
  userId: string;
  type: 'CATEGORY' | 'FABRIC' | 'GENDER' | 'FIT' | 'SEASON' | 'SIZE' | 'PATTERN';
  value: string;
  description?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    mobileNumber: string;
    status: string;
    business?: { shopName: string } | null;
  };
}

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<{ communityId?: string; totalResults: number; products: any[] }, ProductFilterParams | undefined>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.communityId) queryParams.set('communityId', params.communityId);
        if (params?.query) queryParams.set('query', params.query);
        if (params?.isHotSelling) queryParams.set('isHotSelling', 'true');
        if (params?.businessId) queryParams.set('businessId', params.businessId);

        const queryString = queryParams.toString();
        return `/products/search${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['Products'],
    }),

    getProductById: builder.query<any, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Products', id }],
    }),

    createProduct: builder.mutation<{ message: string; product: any; error?: string; isUnapproved?: boolean }, any>({
      query: (productData) => ({
        url: '/products',
        method: 'POST',
        body: productData,
      }),
      invalidatesTags: ['Products'],
    }),

    updateProduct: builder.mutation<{ message: string; product: any }, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Products', id }, 'Products'],
    }),

    deleteProduct: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products'],
    }),

    getGlobalOptions: builder.query<GlobalOptionsResponse, void>({
      query: () => '/products/options',
      providesTags: ['Products'],
    }),

    submitCategoryRequest: builder.mutation<{ message: string; request: CategoryRequestData }, { type: string; value: string; description?: string }>({
      query: (body) => ({
        url: '/products/category-requests',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Products'],
    }),

    getCategoryRequests: builder.query<CategoryRequestData[], { status?: string } | void>({
      query: (params) => ({
        url: '/products/admin/category-requests',
        params: params || {},
      }),
      providesTags: ['Products'],
    }),

    approveCategoryRequest: builder.mutation<{ message: string; request: CategoryRequestData }, string>({
      query: (id) => ({
        url: `/products/admin/category-requests/${id}/approve`,
        method: 'PUT',
      }),
      invalidatesTags: ['Products'],
    }),

    rejectCategoryRequest: builder.mutation<{ message: string; request: CategoryRequestData }, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/products/admin/category-requests/${id}/reject`,
        method: 'PUT',
        body: { reason },
      }),
      invalidatesTags: ['Products'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetGlobalOptionsQuery,
  useSubmitCategoryRequestMutation,
  useGetCategoryRequestsQuery,
  useApproveCategoryRequestMutation,
  useRejectCategoryRequestMutation,
} = productsApi;
