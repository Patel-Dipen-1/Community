import { baseApi } from './baseApi';

export interface CallLogItem {
  id: string;
  callerId: string;
  receiverId: string;
  callType: 'AUDIO' | 'VIDEO';
  status: 'CONNECTED' | 'MISSED' | 'REJECTED' | 'BUSY';
  durationSecs: number;
  livekitRoom?: string;
  startedAt: string;
  endedAt?: string;
  caller?: {
    id: string;
    fullName: string;
    mobileNumber: string;
    avatar?: string;
  };
  receiver?: {
    id: string;
    fullName: string;
    mobileNumber: string;
    avatar?: string;
  };
}

export interface CallHistoryResponse {
  success: boolean;
  calls: CallLogItem[];
}

export interface LogCallRequest {
  receiverId: string;
  callType: 'AUDIO' | 'VIDEO';
  status: 'CONNECTED' | 'MISSED' | 'REJECTED' | 'BUSY';
  durationSecs?: number;
  livekitRoom?: string;
}

export interface LiveKitTokenResponse {
  success: boolean;
  token: string;
  wsUrl: string;
  roomName: string;
}

export const callApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCallHistory: builder.query<CallHistoryResponse, void>({
      query: () => '/user/calls/history',
      providesTags: ['Calls'],
    }),
    logCall: builder.mutation<{ success: boolean; log: CallLogItem }, LogCallRequest>({
      query: (body) => ({
        url: '/user/calls/log',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Calls'],
    }),
    getLiveKitToken: builder.mutation<LiveKitTokenResponse, { roomName: string; participantName?: string }>({
      query: (body) => ({
        url: '/chat/livekit-token',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useGetCallHistoryQuery, useLogCallMutation, useGetLiveKitTokenMutation } = callApi;
