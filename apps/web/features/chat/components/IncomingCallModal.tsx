'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../../../lib/socket/socketClient';

interface IncomingCallData {
  callId: string;
  callerUserId: string;
  callerName: string;
  callerShopName: string;
  callerMobile: string;
  callType: 'AUDIO' | 'VIDEO';
}

interface IncomingCallModalProps {
  onAccept: (callData: IncomingCallData) => void;
}

export function IncomingCallModal({ onAccept }: IncomingCallModalProps) {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneTimerRef = useRef<any>(null);

  // Web Audio API Ringtone Generator (Browser Autoplay Safe)
  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      audioCtxRef.current = new AudioCtx();

      const playPulse = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;

        const osc1 = audioCtxRef.current.createOscillator();
        const osc2 = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(440, audioCtxRef.current.currentTime); // A4
        osc2.frequency.setValueAtTime(480, audioCtxRef.current.currentTime);

        gain.gain.setValueAtTime(0.15, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtxRef.current.destination);

        osc1.start();
        osc2.start();

        osc1.stop(audioCtxRef.current.currentTime + 1.8);
        osc2.stop(audioCtxRef.current.currentTime + 1.8);
      };

      playPulse();
      ringtoneTimerRef.current = setInterval(playPulse, 2500);
    } catch (err) {
      // Graceful fallback if Web Audio is restricted
    }
  };

  const stopRingtone = () => {
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  useEffect(() => {
    const s = getSocket();

    const handleIncomingCall = (data: IncomingCallData) => {
      setIncomingCall(data);
      startRingtone();
    };

    const handleCallDismiss = (data: { callId: string }) => {
      if (incomingCall && incomingCall.callId === data.callId) {
        setIncomingCall(null);
        stopRingtone();
      }
    };

    const handleCallHandled = (data: { callId: string }) => {
      if (incomingCall && incomingCall.callId === data.callId) {
        setIncomingCall(null);
        stopRingtone();
      }
    };

    s.on('call:incoming', handleIncomingCall);
    s.on('call:cancelled', handleCallDismiss);
    s.on('call:ended', handleCallDismiss);
    s.on('call:timed_out', handleCallDismiss);
    s.on('call:handled', handleCallHandled);

    return () => {
      s.off('call:incoming', handleIncomingCall);
      s.off('call:cancelled', handleCallDismiss);
      s.off('call:ended', handleCallDismiss);
      s.off('call:timed_out', handleCallDismiss);
      s.off('call:handled', handleCallHandled);
      stopRingtone();
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const handleAcceptCall = () => {
    const s = getSocket();
    s.emit('call:accept', {
      callId: incomingCall.callId,
      callerUserId: incomingCall.callerUserId,
    });
    stopRingtone();
    const dataCopy = { ...incomingCall };
    setIncomingCall(null);
    onAccept(dataCopy);
  };

  const handleRejectCall = () => {
    const s = getSocket();
    s.emit('call:reject', {
      callId: incomingCall.callId,
      callerUserId: incomingCall.callerUserId,
    });
    stopRingtone();
    setIncomingCall(null);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-emerald-500/40 rounded-3xl overflow-hidden shadow-2xl p-6 text-center space-y-6 relative">
        
        {/* Ringing Visual Pulse */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-xl border-4 border-slate-800">
              {incomingCall.callerName ? incomingCall.callerName.charAt(0).toUpperCase() : '👤'}
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-75" />
          </div>
        </div>

        {/* Incoming Call Badge & Caller Info */}
        <div className="space-y-2">
          <span className="px-3.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {incomingCall.callType === 'VIDEO' ? '📹 Incoming Video Call' : '📞 Incoming Audio Call'}
          </span>

          <h3 className="text-xl font-extrabold text-white leading-tight">
            {incomingCall.callerName}
          </h3>
          <p className="text-xs text-slate-300 font-semibold">
            {incomingCall.callerShopName}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            {incomingCall.callerMobile}
          </p>
        </div>

        {/* Accept / Decline Action Buttons */}
        <div className="pt-2 flex items-center justify-around gap-6">
          {/* Decline / Reject Button */}
          <button
            onClick={handleRejectCall}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex flex-col items-center justify-center font-bold text-xs shadow-lg shadow-rose-600/30 transform hover:scale-105 transition"
            title="Decline Call"
          >
            <span className="text-xl">✕</span>
            <span className="text-[9px] uppercase tracking-wider">Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAcceptCall}
            className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex flex-col items-center justify-center font-extrabold text-xs shadow-lg shadow-emerald-500/30 transform hover:scale-105 transition animate-bounce"
            title="Accept Call"
          >
            <span className="text-xl">✓</span>
            <span className="text-[9px] uppercase tracking-wider">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
