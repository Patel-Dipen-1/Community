import { baseApi } from './baseApi';

export interface ProductItem {
  id: string;
  code: string;
  businessId: string;
  communityId: string;
  categoryId: string;
  title: string;
  description: string;
  moq: number;
  priceTiers: Array<{ minQty: number; maxQty?: number; price: number }>;
  images: string[];
  videoUrl?: string;
  specs: Record<string, string>;
  isHotSelling: boolean;
  isActive: boolean;
  business?: {
    id: string;
    shopName: string;
    city: string;
    state: string;
    verificationTag: boolean;
    assignedRole: string;
    user?: {
      id: string;
      fullName: string;
    };
  };
  createdAt: string;
}

export interface ProductsResponse {
  products: ProductItem[];
  total: number;
  page: number;
  totalPages: number;
}

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<
      ProductsResponse,
      { communitySlug?: string; categoryId?: string; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/products',
        params,
      }),
      providesTags: ['Products'],
    }),

    getProductById: builder.query<{ product: ProductItem }, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Products', id }],
    }),

    createProduct: builder.mutation<{ message: string; product: ProductItem }, Partial<ProductItem>>({
      query: (data) => ({
        url: '/products',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Products', 'Store'],
    }),

    updateProduct: builder.mutation<{ message: string; product: ProductItem }, { id: string; data: Partial<ProductItem> }>({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Products', id }, 'Products', 'Store'],
    }),

    deleteProduct: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products', 'Store'],
    }),

    getGlobalOptions: builder.query<{
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
    }, void>({
      query: () => '/products/options',
      providesTags: ['Products'],
    }),

    submitCategoryRequest: builder.mutation<{ message: string; request: any }, { type: string; value: string; description?: string }>({
      query: (body) => ({
        url: '/products/category-requests',
        method: 'POST',
        body,
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
} = productApi;
