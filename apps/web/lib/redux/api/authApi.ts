import { baseApi } from './baseApi';

/**
 * RTK Query Auth & User Profile API Endpoints
 * Defined locally within the feature slice for domain isolation.
 */
const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  PROFILE: '/auth/profile',
} as const;

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<{ token: string; user: any; error?: string }, { username: string; password: string }>({
      query: (credentials) => ({
        url: AUTH_ENDPOINTS.LOGIN,
        method: 'POST',
        body: credentials,
      }),
    }),

    register: builder.mutation<{ userId?: string; error?: any }, any>({
      query: (userData) => ({
        url: AUTH_ENDPOINTS.REGISTER,
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['VerificationQueue'],
    }),

    getProfile: builder.query<{ user: any }, void>({
      query: () => AUTH_ENDPOINTS.PROFILE,
      providesTags: ['UserProfile'],
    }),

    updateProfile: builder.mutation<{ message?: string; user?: any; error?: string }, any>({
      query: (body) => ({
        url: AUTH_ENDPOINTS.PROFILE,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['UserProfile', 'Users'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
} = authApi;
