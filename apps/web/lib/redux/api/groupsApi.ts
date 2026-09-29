import { baseApi } from './baseApi';

export interface GroupSummary {
  id: string;
  title: string;
  description?: string;
  type: 'GROUP' | 'BROADCAST';
  maxCapacity: number;
  currentMembersCount: number;
  isFull: boolean;
  onlyAdminCanPost: boolean;
  hideMemberIdentity: boolean;
  membersCanSeeMemberList: boolean;
  createdById: string;
  isMember: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  fullName: string;
  mobileNumber?: string;
  roleInGroup: 'ADMIN' | 'MEMBER';
  joinedAt?: string;
}

export interface GroupMessage {
  id: string;
  text?: string;
  productCode?: string;
  mediaUrl?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  isSelf?: boolean;
  senderId?: string;
  senderName: string;
}

export interface GroupDetails {
  id: string;
  title: string;
  description?: string;
  type: 'GROUP' | 'BROADCAST';
  onlyAdminCanPost: boolean;
  hideMemberIdentity: boolean;
  membersCanSeeMemberList: boolean;
  maxCapacity: number;
  currentMembersCount: number;
  isFull: boolean;
  isMember: boolean;
  isViewerAdmin: boolean;
  members: GroupMember[];
  messages: GroupMessage[];
}

export interface SuggestedMemberCandidate {
  userId: string;
  fullName: string;
  mobileNumber?: string;
  shopName?: string;
  communities: string[];
  isAlreadyMember: boolean;
}

export interface MemberSuggestionsResponse {
  groupId: string;
  groupTitle: string;
  currentMembersCount: number;
  maxCapacity: number;
  isFull: boolean;
  remainingSeats: number;
  chatContacts: SuggestedMemberCandidate[];
  adminCommunities: string[];
  communityCounts: { category: string; label: string; count: number }[];
  suggestions: SuggestedMemberCandidate[];
}

export const groupsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGroups: builder.query<GroupSummary[], void>({
      query: () => '/groups',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Groups' as const, id })), { type: 'Groups', id: 'LIST' }]
          : [{ type: 'Groups', id: 'LIST' }],
    }),
    getGroupDetails: builder.query<GroupDetails, string>({
      query: (groupId) => `/groups/${groupId}`,
      providesTags: (_result, _error, id) => [{ type: 'Groups', id }],
    }),
    getSuggestedMembers: builder.query<MemberSuggestionsResponse, { groupId: string; search?: string; category?: string }>({
      query: ({ groupId, search, category }) => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        return `/groups/${groupId}/suggested-members?${params.toString()}`;
      },
      providesTags: (_result, _error, { groupId }) => [{ type: 'Groups', id: groupId }],
    }),
    createGroup: builder.mutation<
      { message: string; group: GroupSummary },
      {
        title: string;
        description?: string;
        type?: string;
        maxCapacity?: number;
        onlyAdminCanPost?: boolean;
        hideMemberIdentity?: boolean;
        membersCanSeeMemberList?: boolean;
      }
    >({
      query: (data) => ({
        url: '/groups',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Groups', id: 'LIST' }],
    }),
    joinGroup: builder.mutation<{ message: string; currentMembersCount: number; maxCapacity: number }, string>({
      query: (groupId) => ({
        url: `/groups/${groupId}/join`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, groupId) => [{ type: 'Groups', id: groupId }, { type: 'Groups', id: 'LIST' }],
    }),
    leaveGroup: builder.mutation<{ message: string }, string>({
      query: (groupId) => ({
        url: `/groups/${groupId}/leave`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, groupId) => [{ type: 'Groups', id: groupId }, { type: 'Groups', id: 'LIST' }],
    }),
    sendGroupMessage: builder.mutation<{ message: string; data: GroupMessage }, { groupId: string; text?: string; productCode?: string; mediaUrl?: string }>({
      query: ({ groupId, ...data }) => ({
        url: `/groups/${groupId}/messages`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Groups', id: groupId }],
    }),
    editGroupMessage: builder.mutation<{ message: string; data: GroupMessage }, { messageId: string; text: string }>({
      query: ({ messageId, text }) => ({
        url: `/groups/messages/${messageId}`,
        method: 'PUT',
        body: { text },
      }),
      invalidatesTags: ['Groups'],
    }),
    bulkAddMembers: builder.mutation<
      { message: string; addedCount: number; currentMembersCount: number; maxCapacity: number },
      { groupId: string; userIds: string[] }
    >({
      query: ({ groupId, userIds }) => ({
        url: `/groups/${groupId}/members/bulk`,
        method: 'POST',
        body: { userIds },
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Groups', id: groupId }, { type: 'Groups', id: 'LIST' }],
    }),
    updateGroupSettings: builder.mutation<
      { message: string; group: any },
      {
        groupId: string;
        hideMemberIdentity?: boolean;
        membersCanSeeMemberList?: boolean;
        onlyAdminCanPost?: boolean;
        maxCapacity?: number;
        title?: string;
        description?: string;
      }
    >({
      query: ({ groupId, ...body }) => ({
        url: `/groups/${groupId}/settings`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Groups', id: groupId }, { type: 'Groups', id: 'LIST' }],
    }),
    updateGroupCapacity: builder.mutation<{ message: string; newMaxCapacity: number }, { groupId: string; maxCapacity: number }>({
      query: ({ groupId, maxCapacity }) => ({
        url: `/groups/${groupId}/capacity`,
        method: 'PUT',
        body: { maxCapacity },
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Groups', id: groupId }, { type: 'Groups', id: 'LIST' }],
    }),
    deleteGroup: builder.mutation<{ message: string }, string>({
      query: (groupId) => ({
        url: `/groups/${groupId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, groupId) => [{ type: 'Groups', id: groupId }, { type: 'Groups', id: 'LIST' }],
    }),
    promoteMember: builder.mutation<{ message: string }, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({
        url: `/groups/${groupId}/members/${userId}/promote`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Groups', id: groupId }, { type: 'Groups', id: 'LIST' }],
    }),
    demoteMember: builder.mutation<{ message: string }, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({
        url: `/groups/${groupId}/members/${userId}/demote`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Groups', id: groupId }, { type: 'Groups', id: 'LIST' }],
    }),
    removeMember: builder.mutation<{ message: string }, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({
        url: `/groups/${groupId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Groups', id: groupId }, { type: 'Groups', id: 'LIST' }],
    }),
    getGlobalGroupCapacity: builder.query<{ maxCapacity: number }, void>({
      query: () => '/groups/global-capacity',
      providesTags: [{ type: 'Groups', id: 'GLOBAL_CAPACITY' }],
    }),
    updateGlobalGroupCapacity: builder.mutation<{ message: string; maxCapacity: number }, { maxCapacity: number }>({
      query: (body) => ({
        url: '/groups/global-capacity',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Groups', id: 'GLOBAL_CAPACITY' }, { type: 'Groups', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetGroupsQuery,
  useGetGroupDetailsQuery,
  useGetSuggestedMembersQuery,
  useCreateGroupMutation,
  useJoinGroupMutation,
  useLeaveGroupMutation,
  useSendGroupMessageMutation,
  useEditGroupMessageMutation,
  useBulkAddMembersMutation,
  useUpdateGroupSettingsMutation,
  useUpdateGroupCapacityMutation,
  useDeleteGroupMutation,
  usePromoteMemberMutation,
  useDemoteMemberMutation,
  useRemoveMemberMutation,
  useGetGlobalGroupCapacityQuery,
  useUpdateGlobalGroupCapacityMutation,
} = groupsApi;
