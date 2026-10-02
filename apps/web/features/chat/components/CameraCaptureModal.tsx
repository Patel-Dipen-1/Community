import React, { useState, useRef, useEffect } from 'react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function CameraCaptureModal({ isOpen, onClose, onCapture }: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError('');
      setCapturedUrl(null);
      setCapturedBlob(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setError('Camera access denied or unavailable on this device.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedUrl(url);
          setCapturedBlob(blob);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleSendCaptured = () => {
    if (capturedBlob) {
      const file = new File([capturedBlob], `camera_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedUrl(null);
    setCapturedBlob(null);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 flex flex-col items-center">
        
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-sm">📷 In-Chat Camera</span>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="p-6 text-center text-xs text-rose-400 font-semibold bg-rose-950/40 border border-rose-800 rounded-2xl w-full">
            {error}
          </div>
        ) : (
          <div className="relative w-full h-80 bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {capturedUrl ? (
              <img src={capturedUrl} alt="Captured snap" className="w-full h-full object-cover" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="w-full flex items-center justify-center gap-4 pt-2">
          {capturedUrl ? (
            <>
              <button
                onClick={handleRetake}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
              >
                🔄 Retake
              </button>
              <button
                onClick={handleSendCaptured}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg transition"
              >
                ✓ Use Photo
              </button>
            </>
          ) : (
            <button
              onClick={handleSnapPhoto}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 border-4 border-slate-800 flex items-center justify-center text-xl shadow-xl transition transform hover:scale-105 active:scale-95"
              title="Snap Photo"
            >
              📸
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
