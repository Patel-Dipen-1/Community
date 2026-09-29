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
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // LiveKit Session State
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // Fetch LiveKit Short-Lived Access Token for Room
  const fetchLiveKitToken = async (roomName: string) => {
    try {
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
        }
      }
    } catch (err) {
      console.warn('LiveKit Token fetch fallback:', err);
    }
  };


  // Initialize WebRTC PeerConnection
  const createPeerConnection = (targetUser: string, currentCallId: string): RTCPeerConnection => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pcRef.current = pc;

    // Attach local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const s = getSocket();
        s.emit('call:ice-candidate', {
          callId: currentCallId,
          targetUserId: targetUser,
          candidate: event.candidate,
        });
      }
    };

    // Remote Track Received
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
        setCallState('CONNECTED');
        setStatusMessage('Connected');
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setStatusMessage('Connection Lost');
      }
    };

    return pc;
  };

  // Main Call Lifecycle & Socket Signaling Listener
  useEffect(() => {
    if (!isOpen || !callType) return;

    const s = getSocket();
    let currentCallId = initialCallId || null;
    const peerTargetId = targetUserId || participant?.userId;

    setDurationSeconds(0);
    setIsMuted(false);
    setIsVideoOff(false);

    // Request Media Permissions
    const setupLocalMedia = async (): Promise<MediaStream | null> => {
      try {
        const isVideo = callType === 'VIDEO';
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        return stream;
      } catch (err: any) {
        setStatusMessage('Microphone / Camera Permission Denied');
        setCallState('FAILED');
        return null;
      }
    };

    setupLocalMedia().then((stream) => {
      if (!stream) return;

      if (role === 'CALLER' && peerTargetId) {
        setCallState('CALLING');
        setStatusMessage('Calling vendor...');
        s.emit('call:invite', { targetUserId: peerTargetId, callType });
      } else if (role === 'RECEIVER' && currentCallId && peerTargetId) {
        setCallState('CONNECTING');
        setStatusMessage('Connecting LiveKit SFU...');
        fetchLiveKitToken(currentCallId);
        createPeerConnection(peerTargetId, currentCallId);
      }
    });

    // Socket Event Handlers
    const handleRinging = (data: { callId: string }) => {
      currentCallId = data.callId;
      setActiveCallId(data.callId);
      setCallState('RINGING');
      setStatusMessage('Ringing...');
    };

    const handleAccepted = async (data: { callId: string; receiverUserId: string }) => {
      setCallState('CONNECTING');
      setStatusMessage('Connecting LiveKit SFU...');
      fetchLiveKitToken(data.callId);
      if (!peerTargetId) return;

      const pc = createPeerConnection(peerTargetId, data.callId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        s.emit('call:offer', {
          callId: data.callId,
          targetUserId: peerTargetId,
          sdp: offer,
        });
      } catch (err) {
        setCallState('FAILED');
        setStatusMessage('Offer Failed');
      }
    };


    const handleOffer = async (data: { callId: string; callerUserId: string; sdp: any }) => {
      if (!peerTargetId) return;
      let pc = pcRef.current;
      if (!pc) {
        pc = createPeerConnection(peerTargetId, data.callId);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit('call:answer', {
          callId: data.callId,
          targetUserId: peerTargetId,
          sdp: answer,
        });
      } catch (err) {
        setCallState('FAILED');
      }
    };

    const handleAnswer = async (data: { callId: string; receiverUserId: string; sdp: any }) => {
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (err) {
          // Ignore SDP state error if already set
        }
      }
    };

    const handleIceCandidate = async (data: { candidate: any }) => {
      if (pcRef.current && data.candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          // Ignore candidate timing mismatch
        }
      }
    };

    const handleRejected = () => {
      setCallState('REJECTED');
      setStatusMessage('Call Declined by Receiver');
      cleanupMedia();
      setTimeout(() => onEndCall(0, true), 2200);
    };

    const handleCancelled = () => {
      setCallState('ENDED');
      setStatusMessage('Call Cancelled by Caller');
      cleanupMedia();
      setTimeout(() => onEndCall(0, true), 2200);
    };

    const handleEnded = () => {
      setCallState('ENDED');
      setStatusMessage('Call Ended');
      cleanupMedia();
      setTimeout(() => onEndCall(0, false), 1500);
    };

    const handleTimedOut = () => {
      setCallState('TIMEOUT');
      setStatusMessage('No Answer / Missed Call');
      cleanupMedia();
      setTimeout(() => onEndCall(0, true), 2200);
    };

    const handleError = (data: { message: string }) => {
      setCallState('FAILED');
      setStatusMessage(data.message || 'Call Failed');
      cleanupMedia();
      setTimeout(() => onEndCall(0, true), 2500);
    };

    s.on('call:ringing', handleRinging);
    s.on('call:accepted', handleAccepted);
    s.on('call:offer', handleOffer);
    s.on('call:answer', handleAnswer);
    s.on('call:ice-candidate', handleIceCandidate);
    s.on('call:rejected', handleRejected);
    s.on('call:cancelled', handleCancelled);
    s.on('call:ended', handleEnded);
    s.on('call:timed_out', handleTimedOut);
    s.on('call:error', handleError);

    return () => {
      s.off('call:ringing', handleRinging);
      s.off('call:accepted', handleAccepted);
      s.off('call:offer', handleOffer);
      s.off('call:answer', handleAnswer);
      s.off('call:ice-candidate', handleIceCandidate);
      s.off('call:rejected', handleRejected);
      s.off('call:cancelled', handleCancelled);
      s.off('call:ended', handleEnded);
      s.off('call:timed_out', handleTimedOut);
      s.off('call:error', handleError);
      cleanupMedia();
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

  const cleanupMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

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
    cleanupMedia();
    onEndCall(durationSeconds, wasMissed);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
    }
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
    }
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !callType) return null;

  if (livekitToken && livekitUrl) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950 p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="relative w-full h-full sm:h-[90vh] sm:max-w-2xl bg-slate-950 sm:bg-slate-900 sm:border sm:border-slate-800 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
          
          {/* Top Header Bar */}
          <div className="w-full flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur border-b border-slate-800/80 z-20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center font-extrabold text-white text-sm shadow">
                {participant?.fullName ? participant.fullName.charAt(0).toUpperCase() : '👤'}
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white leading-tight">
                  {participant?.fullName || 'Business Member'}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>🟢 Connected (LiveKit SFU)</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleHangUp}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold shadow-lg transition"
            >
              📞 End Call
            </button>
          </div>

          {/* LiveKit SFU Video & Audio Grid Container */}
          <div className="flex-1 w-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
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
        </div>
      </div>
    );
  }


  return (

    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-4 animate-in fade-in duration-200">
      {/* Hidden Audio Element for Remote Stream in Audio Calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-between p-6 min-h-[500px]">

        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${callState === 'CONNECTED' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'
                }`}
            />
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
              {callType === 'VIDEO' ? '📹 Video Call' : '📞 Audio Call'}
            </span>
          </div>

          <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
            {callState === 'CONNECTED'
              ? formatDuration(durationSeconds)
              : statusMessage || callState}
          </span>
        </div>

        {/* Center Calling Body & Media Feed */}
        <div className="flex-1 flex flex-col items-center justify-center my-6 w-full relative">
          {callType === 'VIDEO' ? (
            <div className="relative w-full h-72 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
              {/* Remote Video Feed */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local PiP Video Feed */}
              <div className="absolute bottom-3 right-3 w-24 h-32 rounded-xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl bg-black">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              </div>

              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-lg border border-slate-800 text-[10px] text-emerald-400 font-bold">
                ● Live WebRTC Stream
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-600 via-teal-500 to-emerald-600 text-white font-extrabold text-4xl flex items-center justify-center shadow-2xl border-4 border-slate-800 animate-pulse">
                  {participant?.fullName ? participant.fullName.charAt(0).toUpperCase() : '👤'}
                </div>
                {(callState === 'RINGING' || callState === 'CALLING') && (
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-400/40 animate-ping" />
                )}
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-extrabold text-white">
                  {participant?.fullName || 'Business Member'}
                </h3>
                <p className="text-xs text-slate-400">
                  {participant?.shopName || 'Verified Vendor'} • {participant?.mobileNumber}
                </p>
                <p className="text-xs font-semibold text-emerald-400 pt-1">
                  {statusMessage || callState}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Call Action Controls */}
        <div className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-around gap-4 z-10">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition ${isMuted ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? '🎙️' : '🎤'}
          </button>

          {/* Camera Button (Video Call) */}
          {callType === 'VIDEO' && (
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition ${isVideoOff ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoOff ? '🚫' : '📹'}
            </button>
          )}

          {/* Speaker Button */}
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition ${isSpeakerOn ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-200'
              }`}
            title="Toggle Speaker"
          >
            🔊
          </button>

          {/* End Call / Hang Up Button */}
          <button
            onClick={handleHangUp}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-xl shadow-lg shadow-rose-600/30 transform hover:scale-105 transition"
            title="End Call"
          >
            📞
          </button>
        </div>
      </div>
    </div>
  );
}
