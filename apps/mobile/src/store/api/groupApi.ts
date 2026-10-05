import { baseApi } from './baseApi';

export interface GroupItem {
  id: string;
  title: string;
  description?: string;
  type: 'GROUP' | 'BROADCAST';
  communitySlug: string;
  createdById: string;
  maxCapacity: number;
  onlyAdminCanPost: boolean;
  hideMemberIdentity: boolean;
  membersCanSeeMemberList: boolean;
  currentMembersCount?: number;
  roleInGroup?: 'ADMIN' | 'MEMBER';
  createdAt: string;
}

export interface GroupMessageItem {
  id: string;
  groupId: string;
  senderId: string;
  text?: string;
  productCode?: string;
  mediaUrl?: string;
  status: string;
  reactions?: Array<{ userId: string; emoji: string }>;
  sender?: {
    id: string;
    fullName: string;
    avatar?: string;
  };
  createdAt: string;
}

export const groupApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGroups: builder.query<{ groups: GroupItem[] }, { communitySlug?: string }>({
      query: (params) => ({
        url: '/groups',
        params,
      }),
      providesTags: ['Groups'],
    }),

    getGroupById: builder.query<{ group: GroupItem }, string>({
      query: (id) => `/groups/${id}`,
      providesTags: (result, error, id) => [{ type: 'Groups', id }],
    }),

    getGroupMessages: builder.query<{ messages: GroupMessageItem[] }, { groupId: string; page?: number }>({
      query: ({ groupId, page = 1 }) => ({
        url: `/groups/${groupId}/messages`,
        params: { page },
      }),
      providesTags: (result, error, { groupId }) => [{ type: 'Messages', id: groupId }],
    }),

    sendGroupMessage: builder.mutation<
      { message: GroupMessageItem },
      { groupId: string; text?: string; productCode?: string; mediaUrl?: string; replyToId?: string }
    >({
      query: ({ groupId, ...data }) => ({
        url: `/groups/${groupId}/messages`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { groupId }) => [{ type: 'Messages', id: groupId }, 'Groups'],
    }),

    createGroup: builder.mutation<{ message: string; group: GroupItem }, Partial<GroupItem>>({
      query: (data) => ({
        url: '/groups',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Groups'],
    }),

    requestJoinGroup: builder.mutation<{ message: string }, string>({
      query: (groupId) => ({
        url: `/groups/${groupId}/join`,
        method: 'POST',
      }),
      invalidatesTags: ['Groups'],
    }),
  }),
});

export const {
  useGetGroupsQuery,
  useGetGroupByIdQuery,
  useGetGroupMessagesQuery,
  useSendGroupMessageMutation,
  useCreateGroupMutation,
  useRequestJoinGroupMutation,
} = groupApi;
