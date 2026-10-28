import { baseApi } from './baseApi';

export interface StatusItem {
  id: string;
  userId: string;
  businessId: string;
  caption?: string;
  mediaUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'TEXT';
  bgColor?: string;
  categories: string[];
  user?: {
    id: string;
    fullName: string;
    avatar?: string;
  };
  business?: {
    shopName: string;
    city: string;
    verificationTag: boolean;
  };
  viewsCount?: number;
  views?: Array<{ viewerId: string; viewedAt?: string }>;
  likesCount?: number;
  createdAt: string;
}

export interface StatusViewer {
  viewerId: string;
  fullName: string;
  mobileNumber?: string;
  shopName?: string;
  allowedCommunities?: string[];
  viewedAt: string;
}

export interface StatusViewersResponse {
  success: boolean;
  statusId: string;
  totalViews: number;
  viewers: StatusViewer[];
}

export interface PosterConfigResponse {
  success: boolean;
  userId: string;
  fullName: string;
  shopName: string;
  isApproved: boolean;
  allowedCommunities: string[];
  canSelectMultipleCategories: boolean;
  defaultCategory: string;
}

export const statusApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStatuses: builder.query<{ statuses: StatusItem[] }, { category?: string } | void>({
      query: (params) => ({
        url: '/status/feed',
        params: params || undefined,
      }),
      providesTags: ['Status'],
    }),

    getPosterConfig: builder.query<PosterConfigResponse, void>({
      query: () => '/status/my-poster-config',
      providesTags: ['Status'],
    }),

    createStatus: builder.mutation<{ message: string; status: StatusItem }, Partial<StatusItem>>({
      query: (data) => ({
        url: '/status/create',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Status'],
    }),

    viewStatus: builder.mutation<{ message: string }, string>({
      query: (statusId) => ({
        url: `/status/${statusId}/view`,
        method: 'POST',
      }),
    }),

    getStatusViewers: builder.query<StatusViewersResponse, string>({
      query: (statusId) => `/status/${statusId}/viewers`,
    }),
  }),
});

export const {
  useGetStatusesQuery,
  useGetPosterConfigQuery,
  useCreateStatusMutation,
  useViewStatusMutation,
  useGetStatusViewersQuery,
} = statusApi;
