import { baseApi } from './baseApi';

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

export interface StatusItem {
  id: string;
  userId: string;
  businessId: string;
  caption?: string;
  mediaUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'TEXT';
  bgColor?: string;
  categories: string[];
  createdAt: string;
  expiresAt?: string;
  user?: {
    id: string;
    fullName: string;
    mobileNumber: string;
  };
  business?: {
    id: string;
    shopName: string;
    allowedCommunities: string[];
  };
  views?: { viewerId: string; viewedAt: string }[];
}

export interface StatusFeedResponse {
  success: boolean;
  isSuperAdmin?: boolean;
  isApproved?: boolean;
  viewerCategories?: string[];
  totalStatuses: number;
  statuses: StatusItem[];
}

export interface StatusViewerItem {
  viewerId: string;
  fullName: string;
  mobileNumber: string;
  shopName: string;
  allowedCommunities: string[];
  viewedAt: string;
}

export interface StatusViewersResponse {
  success: boolean;
  statusId: string;
  totalViews: number;
  viewers: StatusViewerItem[];
}

export const statusApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPosterStatusConfig: builder.query<PosterConfigResponse, void>({
      query: () => '/status/my-poster-config',
    }),

    createStatus: builder.mutation<
      any,
      {
        caption?: string;
        mediaUrl?: string;
        mediaType?: string;
        bgColor?: string;
        categories?: string[];
      }
    >({
      query: (body) => ({
        url: '/status/create',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Status'],
    }),

    getStatusFeed: builder.query<StatusFeedResponse, void>({
      query: () => '/status/feed',
      providesTags: ['Status'],
    }),

    recordStatusView: builder.mutation<any, string>({
      query: (id) => ({
        url: `/status/${id}/view`,
        method: 'POST',
      }),
    }),

    getStatusViewers: builder.query<StatusViewersResponse, string>({
      query: (id) => `/status/${id}/viewers`,
    }),

    deleteStatus: builder.mutation<any, string>({
      query: (id) => ({
        url: `/status/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Status'],
    }),
  }),
});

export const {
  useGetPosterStatusConfigQuery,
  useCreateStatusMutation,
  useGetStatusFeedQuery,
  useRecordStatusViewMutation,
  useGetStatusViewersQuery,
  useDeleteStatusMutation,
} = statusApi;
