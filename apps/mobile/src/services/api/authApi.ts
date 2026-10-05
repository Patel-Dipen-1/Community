import { baseApi } from '../../store/api/baseApi';
import { LoginResponse, UserProfile, RegisterBusinessInput, LoginInput } from '../../types/auth.types';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginInput>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    register: builder.mutation<{ message: string; user?: UserProfile }, RegisterBusinessInput>({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    getProfile: builder.query<{ user: UserProfile }, void>({
      query: () => '/user/profile',
      providesTags: ['User'],
    }),

    updateProfile: builder.mutation<{ message: string; user: UserProfile }, Partial<UserProfile>>({
      query: (data) => ({
        url: '/user/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useUpdateProfileMutation,
} = authApi;
