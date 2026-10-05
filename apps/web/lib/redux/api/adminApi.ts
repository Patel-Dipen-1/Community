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

    terminateAllSessions: builder.mutation<{ message?: string; count?: number; error?: string }, void>({
      query: () => ({
        url: '/admin/terminate-all-sessions',
        method: 'POST',
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

    // ---------------- DYNAMIC FEATURES, ROLES, PERMISSIONS & LIMITS ----------------
    getModulesAndFeatures: builder.query<{ success: boolean; modules: any[] }, void>({
      query: () => '/admin/modules',
      providesTags: ['Features' as any],
    }),

    toggleFeature: builder.mutation<{ success: boolean; feature: any }, { key: string; isEnabled: boolean }>({
      query: ({ key, isEnabled }) => ({
        url: `/admin/features/${key}/toggle`,
        method: 'PUT',
        body: { isEnabled },
      }),
      invalidatesTags: ['Features' as any],
    }),

    updateFeature: builder.mutation<{ success: boolean; feature: any }, { key: string; [key: string]: any }>({
      query: ({ key, ...body }) => ({
        url: `/admin/features/${key}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Features' as any],
    }),

    getPermissions: builder.query<{ success: boolean; permissions: any[] }, void>({
      query: () => '/admin/permissions',
      providesTags: ['Permissions' as any],
    }),

    getCustomRoles: builder.query<{ success: boolean; roles: any[] }, void>({
      query: () => '/admin/roles',
      providesTags: ['Roles' as any],
    }),

    createOrUpdateCustomRole: builder.mutation<{ success: boolean; role: any }, any>({
      query: (body) => ({
        url: '/admin/roles',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Roles' as any, 'Permissions' as any],
    }),

    assignUserRole: builder.mutation<{ success: boolean; message: string }, { userId: string; roleId: string }>({
      query: (body) => ({
        url: '/admin/roles/assign',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users', 'Roles' as any],
    }),

    getUserPermissionsAndOverrides: builder.query<{ success: boolean; user: any; overrides: any[]; userRoles: any[]; limitOverrides: any[] }, string>({
      query: (userId) => `/admin/users/${userId}/permissions`,
      providesTags: ['Permissions' as any],
    }),

    setUserPermissionOverride: builder.mutation<{ success: boolean; override: any }, { userId: string; permissionKey: string; featureKey: string; isGranted: boolean }>({
      query: ({ userId, ...body }) => ({
        url: `/admin/users/${userId}/override-permission`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Permissions' as any],
    }),

    removeUserPermissionOverride: builder.mutation<{ success: boolean; message: string }, { userId: string; permissionKey: string }>({
      query: ({ userId, permissionKey }) => ({
        url: `/admin/users/${userId}/override-permission/${permissionKey}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Permissions' as any],
    }),

    getPlatformLimits: builder.query<{ success: boolean; limits: any[] }, void>({
      query: () => '/admin/limits',
      providesTags: ['Limits' as any],
    }),

    updatePlatformLimit: builder.mutation<{ success: boolean; limit: any }, { limitKey: string; defaultValue: number }>({
      query: ({ limitKey, defaultValue }) => ({
        url: `/admin/limits/${limitKey}`,
        method: 'PUT',
        body: { defaultValue },
      }),
      invalidatesTags: ['Limits' as any],
    }),

    setRoleLimit: builder.mutation<{ success: boolean; limit: any }, { roleId: string; limitKey: string; value: number }>({
      query: ({ roleId, limitKey, value }) => ({
        url: `/admin/roles/${roleId}/limits`,
        method: 'POST',
        body: { limitKey, value },
      }),
      invalidatesTags: ['Limits' as any, 'Roles' as any],
    }),

    setUserLimitOverride: builder.mutation<{ success: boolean; limit: any }, { userId: string; limitKey: string; value: number }>({
      query: ({ userId, limitKey, value }) => ({
        url: `/admin/users/${userId}/override-limit`,
        method: 'POST',
        body: { limitKey, value },
      }),
      invalidatesTags: ['Limits' as any],
    }),

    getDynamicSubscriptionPlans: builder.query<{ success: boolean; plans: any[] }, void>({
      query: () => '/admin/subscription-plans',
      providesTags: ['Plans' as any],
    }),

    createOrUpdateSubscriptionPlan: builder.mutation<{ success: boolean; plan: any }, any>({
      query: (body) => ({
        url: '/admin/subscription-plans',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Plans' as any],
    }),

    getDynamicPlatformSettings: builder.query<{ success: boolean; settings: any[] }, void>({
      query: () => '/admin/settings',
      providesTags: ['Settings' as any],
    }),

    updateDynamicPlatformSetting: builder.mutation<{ success: boolean; setting: any }, { key: string; value: any }>({
      query: ({ key, value }) => ({
        url: `/admin/settings/${key}`,
        method: 'PUT',
        body: { value },
      }),
      invalidatesTags: ['Settings' as any],
    }),

    getAuditLogs: builder.query<{ success: boolean; logs: any[] }, number | void>({
      query: (limit) => `/admin/audit-logs${limit ? `?limit=${limit}` : ''}`,
      providesTags: ['AuditLogs' as any],
    }),

    getRealTimeDashboardStats: builder.query<{ success: boolean; stats: any }, void>({
      query: () => '/admin/dashboard-stats',
      providesTags: ['DashboardStats' as any],
    }),

    getSystemHealthMetrics: builder.query<{ success: boolean; health: any }, void>({
      query: () => '/admin/system-health',
      providesTags: ['SystemHealth' as any],
    }),

    getApiRouteFlags: builder.query<{ success: boolean; routes: any[] }, void>({
      query: () => '/admin/api-routes',
      providesTags: ['ApiRoutes' as any],
    }),

    updateApiRouteFlag: builder.mutation<{ success: boolean; route: any }, { path: string; [key: string]: any }>({
      query: ({ path, ...body }) => ({
        url: `/admin/api-routes/update?path=${encodeURIComponent(path)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ApiRoutes' as any],
    }),

    setUserFeatureOverride: builder.mutation<{ success: boolean; override: any }, { userId: string; featureKey: string; isEnabled: boolean }>({
      query: ({ userId, featureKey, isEnabled }) => ({
        url: `/admin/users/${userId}/override-feature`,
        method: 'POST',
        body: { featureKey, isEnabled },
      }),
      invalidatesTags: ['Features' as any],
    }),

    setUserApiOverride: builder.mutation<{ success: boolean; override: any }, { userId: string; routePath: string; method?: string; isEnabled: boolean }>({
      query: ({ userId, routePath, method, isEnabled }) => ({
        url: `/admin/users/${userId}/override-api`,
        method: 'POST',
        body: { routePath, method, isEnabled },
      }),
      invalidatesTags: ['ApiRoutes' as any],
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
  useTerminateAllSessionsMutation,
  useDeleteAccountMutation,
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetAdminCommunitiesQuery,
  useCreateCommunityMutation,
  useUpdateCommunityMutation,
  useDeleteCommunityMutation,
  useAllocateCommunitiesMutation,
  useGetModulesAndFeaturesQuery,
  useToggleFeatureMutation,
  useUpdateFeatureMutation,
  useGetPermissionsQuery,
  useGetCustomRolesQuery,
  useCreateOrUpdateCustomRoleMutation,
  useAssignUserRoleMutation,
  useGetUserPermissionsAndOverridesQuery,
  useSetUserPermissionOverrideMutation,
  useRemoveUserPermissionOverrideMutation,
  useGetPlatformLimitsQuery,
  useUpdatePlatformLimitMutation,
  useSetRoleLimitMutation,
  useSetUserLimitOverrideMutation,
  useGetDynamicSubscriptionPlansQuery,
  useCreateOrUpdateSubscriptionPlanMutation,
  useGetDynamicPlatformSettingsQuery,
  useUpdateDynamicPlatformSettingMutation,
  useGetAuditLogsQuery,
  useGetRealTimeDashboardStatsQuery,
  useGetSystemHealthMetricsQuery,
  useGetApiRouteFlagsQuery,
  useUpdateApiRouteFlagMutation,
  useSetUserFeatureOverrideMutation,
  useSetUserApiOverrideMutation,
} = adminApi;


