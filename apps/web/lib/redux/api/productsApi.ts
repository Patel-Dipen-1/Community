import { baseApi } from './baseApi';

export interface ProductFilterParams {
  communityId?: string;
  query?: string;
  isHotSelling?: boolean;
  businessId?: string;
}

export interface GlobalOptionsResponse {
  categories: string[];
  clothingCategories?: string[];
  hardwareCategories?: string[];
  jewelleryCategories?: string[];
  electronicsCategories?: string[];
  groceryCategories?: string[];
  fabrics: string[];
  genders: string[];
  fitTypes: string[];
  seasons: string[];
  sizes: string[];
  patterns: string[];
  hardwareMaterials?: string[];
  hardwareWarranties?: string[];
  hardwarePowerRatings?: string[];
  hardwareFinishes?: string[];
  hardwareApplications?: string[];
  jewelleryPurities?: string[];
  jewelleryGemstones?: string[];
  jewelleryCertifications?: string[];
  electronicsPowerSources?: string[];
  electronicsConnectivities?: string[];
  electronicsWarranties?: string[];
  groceryPackagings?: string[];
  groceryShelfLives?: string[];
  groceryCertifications?: string[];
}

export interface CategoryRequestData {
  id: string;
  userId: string;
  type: string;
  value: string;
  description?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED';
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

    getDynamicSchema: builder.query<any, void>({
      query: () => '/products/dynamic-schema',
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

    approveCategoryRequest: builder.mutation<
      { message: string; request: CategoryRequestData },
      string | { id: string; type?: string; value?: string }
    >({
      query: (arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        const body = typeof arg === 'string' ? {} : { type: arg.type, value: arg.value };
        return {
          url: `/products/admin/category-requests/${id}/approve`,
          method: 'PUT',
          body,
        };
      },
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

    deleteCategoryRequest: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/products/admin/category-requests/${id}`,
        method: 'DELETE',
        body: {},
      }),
      invalidatesTags: ['Products'],
    }),

    createAdminCategoryOption: builder.mutation<{ message: string; option: any }, { type: string; value: string; description?: string; communitySlug?: string }>({
      query: (body) => ({
        url: '/products/admin/category-requests/create',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Products'],
    }),

    updateCategoryOption: builder.mutation<{ message: string; option: any }, { id: string; value: string; type?: string; communitySlug?: string }>({
      query: ({ id, value, type, communitySlug }) => ({
        url: `/products/admin/category-requests/${id}`,
        method: 'PUT',
        body: { value, type, communitySlug },
      }),
      invalidatesTags: ['Products'],
    }),

    getCommunities: builder.query<any[], void>({
      query: () => '/products/admin/communities',
      providesTags: ['Products'],
    }),

    createCommunity: builder.mutation<{ message: string; community: any }, { name: string; description?: string }>({
      query: (body) => ({
        url: '/products/admin/communities',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Products'],
    }),

    updateCommunity: builder.mutation<{ message: string; community: any }, { id: string; name?: string; description?: string; isActive?: boolean }>({
      query: ({ id, ...body }) => ({
        url: `/products/admin/communities/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Products'],
    }),

    deleteCommunity: builder.mutation<{ message: string; community: any }, string>({
      query: (id) => ({
        url: `/products/admin/communities/${id}`,
        method: 'DELETE',
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
  useGetDynamicSchemaQuery,
  useSubmitCategoryRequestMutation,
  useGetCategoryRequestsQuery,
  useApproveCategoryRequestMutation,
  useRejectCategoryRequestMutation,
  useDeleteCategoryRequestMutation,
  useCreateAdminCategoryOptionMutation,
  useUpdateCategoryOptionMutation,
  useGetCommunitiesQuery,
  useCreateCommunityMutation,
  useUpdateCommunityMutation,
  useDeleteCommunityMutation,
} = productsApi;
