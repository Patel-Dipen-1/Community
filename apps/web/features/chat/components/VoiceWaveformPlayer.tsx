'use client';

import React, { useState, useRef, useEffect } from 'react';

interface VoiceWaveformPlayerProps {
  audioUrl: string;
  duration?: number;
  senderName?: string;
}

export function VoiceWaveformPlayer({ audioUrl, duration: durationProp }: VoiceWaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(durationProp && isFinite(durationProp) ? durationProp : 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // WhatsApp-style waveform bars
  const waveformHeights = [
    30, 45, 60, 35, 75, 90, 50, 65, 80, 40, 70, 85, 55, 30, 60, 75, 45, 90,
    65, 35, 80, 50, 70, 40, 60, 85, 30, 75, 50, 65, 40, 80, 55, 90, 35, 70
  ];

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const updateDuration = () => {
      const d = audio.duration;
      if (isFinite(d) && !isNaN(d) && d > 0) {
        setDuration(d);
      } else {
        // Chromium WebM duration resolution trick for recorded audio blobs
        if (audio.currentTime === 0) {
          audio.currentTime = 1e101;
        }
      }
    };

    const handleTimeUpdate = () => {
      // If we used 1e101 trick to determine duration
      if (!isFinite(duration) || duration === 0) {
        if (isFinite(audio.duration) && !isNaN(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
          audio.currentTime = 0;
          return;
        } else if (audio.currentTime > 0 && audio.currentTime < 1e100) {
          setDuration(audio.currentTime);
          audio.currentTime = 0;
          return;
        }
      }
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    };

    const handleDurationChange = () => {
      updateDuration();
    };

    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        if (audioRef.current.currentTime >= (duration || 1) - 0.1) {
          audioRef.current.currentTime = 0;
        }
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback error:', err);
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const effectiveDuration = isFinite(duration) && duration > 0 ? duration : durationProp || 1;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekPercentage = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = seekPercentage * effectiveDuration;

    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const effectiveDuration = isFinite(duration) && duration > 0 ? duration : durationProp || 0;
  const progressPercentage = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;

  return (
    <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 w-full max-w-[280px] sm:max-w-[320px] flex items-center gap-3 shadow-lg select-none">
      {/* Play/Pause Circle Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center text-base font-black shadow-md transition transform hover:scale-105 active:scale-95 shrink-0"
        title={isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Waveform & Progress Container */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Interactive Waveform Visualizer */}
        <div
          onClick={handleSeek}
          className="h-7 flex items-center gap-[2px] cursor-pointer group px-1 py-0.5"
          title="Click to seek"
        >
          {waveformHeights.map((height, i) => {
            const barPercentage = ((i + 1) / waveformHeights.length) * 100;
            const isPlayed = barPercentage <= progressPercentage;

            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-100 ${
                  isPlayed ? 'bg-emerald-400' : 'bg-slate-700 group-hover:bg-slate-600'
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        {/* Time Stamp & Micro-Mic Icon */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <span className="text-xs">🎙️</span>
            {formatTime(currentTime)}
          </span>
          <div className="flex items-center gap-2">
            <span>{effectiveDuration > 0 ? formatTime(effectiveDuration) : '0:00'}</span>
            <a
              href={audioUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="text-slate-500 hover:text-emerald-400 transition"
              title="Download Voice Note"
            >
              📥
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
