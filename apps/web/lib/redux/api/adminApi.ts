import { baseApi } from './baseApi';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * RTK Query Admin API Endpoints
 * Defined locally within the feature slice for domain isolation.
 */
const ADMIN_ENDPOINTS = {
  VERIFICATION_QUEUE: '/admin/verification-queue',
  SESSIONS: '/admin/sessions',
  USERS: '/admin/users',
  DELETION_REQUESTS: '/admin/deletion-requests',
  APPROVE_VERIFICATION: '/admin/approve-verification',
  REJECT_VERIFICATION: '/admin/reject-verification',
  TERMINATE_SESSION: '/admin/terminate-session',
  DELETE_ACCOUNT: (userId: string) => `/admin/delete-account/${userId}`,
  UPDATE_USER: (userId: string) => `/admin/users/${userId}`,
} as const;

function buildQueryString(params?: ListQueryParams): string {
  if (!params) return '';
  const queryParams = new URLSearchParams();
  if (params.page !== undefined) queryParams.set('page', String(params.page));
  if (params.limit !== undefined) queryParams.set('limit', String(params.limit));
  if (params.search) queryParams.set('search', params.search);
  if (params.role) queryParams.set('role', params.role);
  if (params.status) queryParams.set('status', params.status);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  if (params.sortKey) queryParams.set('sortKey', params.sortKey);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
  const str = queryParams.toString();
  return str ? `?${str}` : '';
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ---------------- QUERIES (GET Data with Server-Side Pagination & Filtering) ----------------

    getVerificationQueue: builder.query<{ queue: any[]; data: any[]; totalPending?: number; pagination?: PaginationMeta }, ListQueryParams | void>({
      query: (params) => `${ADMIN_ENDPOINTS.VERIFICATION_QUEUE}${buildQueryString(params || undefined)}`,
      providesTags: ['VerificationQueue'],
    }),

    getLiveSessions: builder.query<{ sessions: any[]; data: any[]; totalActive?: number; pagination?: PaginationMeta }, ListQueryParams | void>({
      query: (params) => `${ADMIN_ENDPOINTS.SESSIONS}${buildQueryString(params || undefined)}`,
      providesTags: ['Sessions'],
    }),

    getAdminUsers: builder.query<{ users: any[]; data: any[]; totalUsers?: number; pagination?: PaginationMeta }, ListQueryParams | void>({
      query: (params) => `${ADMIN_ENDPOINTS.USERS}${buildQueryString(params || undefined)}`,
      providesTags: ['Users'],
    }),

    getDeletionRequests: builder.query<{ requests: any[]; data: any[]; totalRequests?: number; pagination?: PaginationMeta }, ListQueryParams | void>({
      query: (params) => `${ADMIN_ENDPOINTS.DELETION_REQUESTS}${buildQueryString(params || undefined)}`,
      providesTags: ['Deletions'],
    }),

    // ---------------- MUTATIONS (Actions / Updates) ----------------

    approveVerification: builder.mutation<{ message: string }, { userId: string; assignedRole: string; assignedCategory?: string }>({
      query: (body) => ({
        url: ADMIN_ENDPOINTS.APPROVE_VERIFICATION,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['VerificationQueue', 'Users'],
    }),

    rejectVerification: builder.mutation<{ message: string }, { userId: string }>({
      query: (body) => ({
        url: ADMIN_ENDPOINTS.REJECT_VERIFICATION,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['VerificationQueue'],
    }),

    terminateSession: builder.mutation<{ message?: string; error?: string }, { sessionId: string }>({
      query: (body) => ({
        url: ADMIN_ENDPOINTS.TERMINATE_SESSION,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Sessions'],
    }),

    deleteAccount: builder.mutation<{ message?: string; error?: string }, string>({
      query: (userId) => ({
        url: ADMIN_ENDPOINTS.DELETE_ACCOUNT(userId),
        method: 'DELETE',
      }),
      invalidatesTags: ['Users', 'Sessions', 'VerificationQueue', 'Deletions'],
    }),

    createUser: builder.mutation<{ message?: string; error?: string }, any>({
      query: (body) => ({
        url: ADMIN_ENDPOINTS.USERS,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users'],
    }),

    updateUser: builder.mutation<{ message?: string; error?: string }, { userId: string; [key: string]: any }>({
      query: ({ userId, ...body }) => ({
        url: ADMIN_ENDPOINTS.UPDATE_USER(userId),
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Users'],
    }),

    // ---------------- DYNAMIC COMMUNITY & CATEGORY ENDPOINTS ----------------

    getAdminCommunities: builder.query<{ communities: any[]; data: any[] }, void>({
      query: () => '/admin/communities',
      providesTags: ['Communities' as any],
    }),

    createCommunity: builder.mutation<{ message: string; community: any }, { name: string; slug?: string; description?: string; isActive?: boolean }>({
      query: (body) => ({
        url: '/admin/communities',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Communities' as any],
    }),

    updateCommunity: builder.mutation<{ message: string; community: any }, { id: string; name?: string; slug?: string; description?: string; isActive?: boolean }>({
      query: ({ id, ...body }) => ({
        url: `/admin/communities/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Communities' as any, 'Users'],
    }),

    deleteCommunity: builder.mutation<{ message: string; deletedId: string }, string>({
      query: (id) => ({
        url: `/admin/communities/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Communities' as any, 'Users'],
    }),

    allocateCommunities: builder.mutation<{ message: string; allowedCommunities: string[] }, { userId: string; allowedCommunities: string[] }>({
      query: ({ userId, allowedCommunities }) => ({
        url: `/admin/users/${userId}/allocate-categories`,
        method: 'POST',
        body: { allowedCommunities },
      }),
      invalidatesTags: ['Users'],
    }),
  }),
});

export const {
  useGetVerificationQueueQuery,
  useGetLiveSessionsQuery,
  useGetAdminUsersQuery,
  useGetDeletionRequestsQuery,
  useApproveVerificationMutation,
  useRejectVerificationMutation,
  useTerminateSessionMutation,
  useDeleteAccountMutation,
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetAdminCommunitiesQuery,
  useCreateCommunityMutation,
  useUpdateCommunityMutation,
  useDeleteCommunityMutation,
  useAllocateCommunitiesMutation,
} = adminApi;

