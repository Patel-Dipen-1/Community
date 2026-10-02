import React, { useState, useEffect, useRef } from 'react';
import { ChatParticipant } from '../../../lib/redux/api/chatApi';
import { getSocket } from '../../../lib/socket/socketClient';
import { API_CONFIG } from '../../../lib/api/config';
import { LiveKitRoom, RoomAudioRenderer, VideoConference, ControlBar } from '@livekit/components-react';
import '@livekit/components-styles';

interface CallModalProps {
  isOpen: boolean;
  callType: 'AUDIO' | 'VIDEO' | null;
  role?: 'CALLER' | 'RECEIVER';
  callId?: string | null;
  targetUserId?: string | null;
  participant: ChatParticipant | null;
  onEndCall: (durationSeconds: number, isMissed: boolean) => void;
}

export function CallModal({
  isOpen,
  callType,
  role = 'CALLER',
  callId: initialCallId,
  targetUserId,
  participant,
  onEndCall,
}: CallModalProps) {
  const [callState, setCallState] = useState<
    'IDLE' | 'CALLING' | 'RINGING' | 'CONNECTING' | 'CONNECTED' | 'ENDED' | 'REJECTED' | 'FAILED' | 'TIMEOUT'
  >('IDLE');
  const [activeCallId, setActiveCallId] = useState<string | null>(initialCallId || null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Pure LiveKit Session State
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);

  // Fetch Short-Lived Access Token for LiveKit SFU Room
  const fetchLiveKitToken = async (roomName: string) => {
    try {
      setStatusMessage('Connecting to LiveKit SFU Server...');
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${API_CONFIG.BASE_URL}/chat/livekit-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ roomName, participantName: participant?.fullName }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setLivekitToken(data.token);
          setLivekitUrl(data.wsUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://rtc.yourdomain.com');
          setCallState('CONNECTED');
          setStatusMessage('Connected (LiveKit SFU)');
          return;
        }
      }
      setStatusMessage('Failed to obtain RTC room token');
      setCallState('FAILED');
    } catch (err: any) {
      console.error('LiveKit Token Fetch Error:', err);
      setStatusMessage('Network error connecting call');
      setCallState('FAILED');
    }
  };

  // Main Call Signaling Lifecycle
  useEffect(() => {
    if (!isOpen || !callType) return;

    const s = getSocket();
    let currentCallId = initialCallId || null;
    const peerTargetId = targetUserId || participant?.userId;

    setDurationSeconds(0);
    setLivekitToken(null);
    setLivekitUrl(null);

    if (role === 'CALLER' && peerTargetId) {
      setCallState('CALLING');
      setStatusMessage('Ringing recipient...');
      s.emit('call:invite', { targetUserId: peerTargetId, callType });
    } else if (role === 'RECEIVER' && currentCallId) {
      setCallState('CONNECTING');
      fetchLiveKitToken(currentCallId);
    }

    // Socket Event Handlers
    const handleRinging = (data: { callId: string }) => {
      currentCallId = data.callId;
      setActiveCallId(data.callId);
      setCallState('RINGING');
      setStatusMessage('Ringing recipient...');
    };

    const handleAccepted = (data: { callId: string; receiverUserId: string }) => {
      setCallState('CONNECTING');
      setActiveCallId(data.callId);
      fetchLiveKitToken(data.callId);
    };

    const handleRejected = () => {
      setCallState('REJECTED');
      setStatusMessage('Call Declined by Recipient');
      setTimeout(() => onEndCall(0, true), 2000);
    };

    const handleCancelled = () => {
      setCallState('ENDED');
      setStatusMessage('Call Cancelled');
      setTimeout(() => onEndCall(0, true), 1800);
    };

    const handleEnded = () => {
      setCallState('ENDED');
      setStatusMessage('Call Ended');
      setTimeout(() => onEndCall(durationSeconds, false), 1200);
    };

    const handleTimedOut = () => {
      setCallState('TIMEOUT');
      setStatusMessage('No Answer / Missed Call');
      setTimeout(() => onEndCall(0, true), 2000);
    };

    const handleError = (data: { message: string }) => {
      setCallState('FAILED');
      setStatusMessage(data.message || 'Call Connection Failed');
      setTimeout(() => onEndCall(0, true), 2200);
    };

    s.on('call:ringing', handleRinging);
    s.on('call:accepted', handleAccepted);
    s.on('call:rejected', handleRejected);
    s.on('call:cancelled', handleCancelled);
    s.on('call:ended', handleEnded);
    s.on('call:timed_out', handleTimedOut);
    s.on('call:error', handleError);

    return () => {
      s.off('call:ringing', handleRinging);
      s.off('call:accepted', handleAccepted);
      s.off('call:rejected', handleRejected);
      s.off('call:cancelled', handleCancelled);
      s.off('call:ended', handleEnded);
      s.off('call:timed_out', handleTimedOut);
      s.off('call:error', handleError);
    };
  }, [isOpen, callType, role, initialCallId, targetUserId, participant]);

  // Duration Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && callState === 'CONNECTED') {
      interval = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, callState]);

  const handleHangUp = () => {
    const s = getSocket();
    const peerTargetId = targetUserId || participant?.userId;

    if (activeCallId && peerTargetId) {
      if (callState === 'RINGING' || callState === 'CALLING') {
        s.emit('call:cancel', { callId: activeCallId, targetUserId: peerTargetId });
      } else {
        s.emit('call:end', { callId: activeCallId, targetUserId: peerTargetId });
      }
    }

    const wasMissed = callState === 'RINGING' || callState === 'CALLING' || callState === 'TIMEOUT';
    setLivekitToken(null);
    setLivekitUrl(null);
    onEndCall(durationSeconds, wasMissed);
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !callType) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full h-full sm:h-[92vh] sm:max-w-3xl bg-slate-950 sm:bg-slate-900 sm:border sm:border-slate-800 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
        
        {/* Top Call Header Bar */}
        <div className="w-full flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur border-b border-slate-800/80 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center font-extrabold text-white text-base shadow-lg">
              {participant?.fullName ? participant.fullName.charAt(0).toUpperCase() : '👤'}
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white leading-tight">
                {participant?.fullName || 'Business Member'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {participant?.shopName || 'Verified Vendor'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  callState === 'CONNECTED' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="font-mono font-bold text-emerald-400">
                {callState === 'CONNECTED' ? formatDuration(durationSeconds) : statusMessage || callState}
              </span>
            </div>

            <button
              onClick={handleHangUp}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-rose-600/30 transition transform hover:scale-105 active:scale-95"
            >
              📞 End Call
            </button>
          </div>
        </div>

        {/* LiveKit SFU Audio & Video Room View */}
        {livekitToken && livekitUrl ? (
          <div className="flex-1 w-full relative overflow-hidden bg-slate-950 flex flex-col [&_.lk-chat-toggle]:!hidden [&_.lk-chat]:!hidden">
            <LiveKitRoom
              video={callType === 'VIDEO'}
              audio={true}
              token={livekitToken}
              serverUrl={livekitUrl}
              connect={true}
              data-lk-theme="default"
              onDisconnected={handleHangUp}
              className="w-full h-full flex flex-col justify-between"
            >
              <VideoConference />
              <RoomAudioRenderer />
            </LiveKitRoom>
          </div>
        ) : (
          /* Calling / Ringing Waiting Overlay */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-600 via-teal-500 to-emerald-600 text-white font-extrabold text-5xl flex items-center justify-center shadow-2xl border-4 border-slate-800 animate-pulse">
                {participant?.fullName ? participant.fullName.charAt(0).toUpperCase() : '👤'}
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-emerald-400/40 animate-ping" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-white">
                {participant?.fullName || 'Business Member'}
              </h3>
              <p className="text-sm text-slate-400">
                {participant?.shopName || 'Verified Vendor'} • {participant?.mobileNumber}
              </p>
              <p className="text-sm font-semibold text-emerald-400 pt-2 animate-pulse">
                {statusMessage || 'Initializing LiveKit SFU Call...'}
              </p>
            </div>

            <div className="pt-8">
              <button
                onClick={handleHangUp}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-2xl shadow-xl shadow-rose-600/40 transform hover:scale-110 active:scale-95 transition"
                title="Cancel Call"
              >
                📞
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

