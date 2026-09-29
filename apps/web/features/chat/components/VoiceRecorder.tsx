'use client';

import React, { useState, useRef, useEffect } from 'react';
import { uploadSingleFile } from '../../../lib/utils/upload';

interface VoiceRecorderProps {
  onSendVoiceNote: (mediaUrl: string) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSendVoiceNote, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Start recording immediately when mounted
  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      setRecorderError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setRecorderError('Microphone access denied or not supported by your browser.');
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const togglePlayback = () => {
    if (!audioPreviewRef.current || !audioUrl) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    try {
      const filename = `voice_note_${Date.now()}.${audioBlob.type.includes('webm') ? 'webm' : 'mp3'}`;
      const file = new File([audioBlob], filename, { type: audioBlob.type || 'audio/webm' });
      const uploadedUrl = await uploadSingleFile(file);
      onSendVoiceNote(uploadedUrl);
    } catch (err: any) {
      setRecorderError(err.message || 'Failed to upload voice note');
      setIsUploading(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  if (recorderError) {
    return (
      <div className="p-3 bg-slate-950 border border-rose-500/40 rounded-2xl flex items-center justify-between text-xs text-rose-300">
        <span>⚠️ {recorderError}</span>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-xl">
      {/* Audio element preview */}
      {audioUrl && (
        <audio
          ref={audioPreviewRef}
          src={audioUrl}
          onEnded={() => setIsPlayingPreview(false)}
          className="hidden"
        />
      )}

      {/* Left Timer & Pulse Indicator */}
      <div className="flex items-center gap-3">
        {isRecording ? (
          <div className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
        ) : (
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
        )}
        <span className="font-mono text-xs font-extrabold text-white">
          🎙️ {formatTime(recordingSeconds)}
        </span>
        {isRecording && (
          <div className="flex items-center gap-1">
            <span className="w-1 h-3 bg-emerald-400 animate-pulse" />
            <span className="w-1 h-5 bg-emerald-400 animate-pulse delay-75" />
            <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-150" />
            <span className="w-1 h-4 bg-emerald-400 animate-pulse delay-200" />
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Cancel / Trash */}
        <button
          type="button"
          onClick={() => {
            stopRecordingCleanup();
            onCancel();
          }}
          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 transition text-xs font-bold"
          title="Cancel Recording"
        >
          🗑️
        </button>

        {/* Stop Recording */}
        {isRecording && (
          <button
            type="button"
            onClick={handleStopRecording}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500 hover:text-slate-950 transition"
          >
            ⏹️ Stop
          </button>
        )}

        {/* Preview Play/Pause (when stopped) */}
        {!isRecording && audioUrl && (
          <button
            type="button"
            onClick={togglePlayback}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-600 hover:text-white transition flex items-center gap-1"
          >
            {isPlayingPreview ? '⏸️ Pause' : '▶️ Play Preview'}
          </button>
        )}

        {/* Send Voice Note */}
        {!isRecording && audioBlob && (
          <button
            type="button"
            disabled={isUploading}
            onClick={handleSend}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-extrabold shadow-lg transition flex items-center gap-1"
          >
            {isUploading ? 'Uploading...' : '📤 Send Voice Note'}
          </button>
        )}
      </div>
    </div>
  );
}
