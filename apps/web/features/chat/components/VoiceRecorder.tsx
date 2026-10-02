'use client';

import React, { useState, useRef, useEffect } from 'react';
import { uploadSingleFile } from '../../../lib/utils/upload';
import { VoiceWaveformPlayer } from './VoiceWaveformPlayer';

interface VoiceRecorderProps {
  onSendVoiceNote: (mediaUrl: string) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSendVoiceNote, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      setRecorderError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Detect best supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : '';

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalType = mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      // Collect data every 100ms
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
      try {
        // Request any buffered chunks before stopping
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    try {
      const extension = audioBlob.type.includes('webm')
        ? 'webm'
        : audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')
        ? 'm4a'
        : audioBlob.type.includes('ogg')
        ? 'ogg'
        : 'webm';
      const filename = `voice_note_${Date.now()}.${extension}`;
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
    <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl w-full">
      {/* Recording State View */}
      {isRecording && (
        <div className="flex items-center gap-3 w-full justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono text-xs font-extrabold text-white">
              🎙️ Recording {formatTime(recordingSeconds)}
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1 h-3 bg-emerald-400 animate-pulse" />
              <span className="w-1 h-5 bg-emerald-400 animate-pulse delay-75" />
              <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-150" />
              <span className="w-1 h-4 bg-emerald-400 animate-pulse delay-200" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopRecordingCleanup();
                onCancel();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 transition text-xs font-bold"
              title="Cancel Recording"
            >
              🗑️ Cancel
            </button>
            <button
              type="button"
              onClick={handleStopRecording}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-slate-950 text-xs font-black hover:bg-emerald-500 transition shadow"
            >
              ⏹️ Finish
            </button>
          </div>
        </div>
      )}

      {/* Stopped / Preview View */}
      {!isRecording && audioUrl && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex-1 w-full max-w-xs">
            <VoiceWaveformPlayer audioUrl={audioUrl} duration={recordingSeconds} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                stopRecordingCleanup();
                onCancel();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 transition text-xs font-bold"
              title="Discard Voice Note"
            >
              🗑️
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={handleSend}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg transition flex items-center gap-1.5"
            >
              {isUploading ? 'Uploading...' : '📤 Send Voice Note'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
