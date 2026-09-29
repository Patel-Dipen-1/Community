'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRegisterMutation } from '../../../lib/redux/api/authApi';
import { API_CONFIG } from '../../../lib/api/config';

interface MediaPreview {
  file: File;
  previewUrl: string;
  isVideo: boolean;
}

export function RegisterForm() {
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedMediaPreviews, setSelectedMediaPreviews] = useState<MediaPreview[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [registerApi] = useRegisterMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setErrorMsg(null);

    const newFiles = Array.from(e.target.files).slice(0, 5);
    const newPreviews: MediaPreview[] = newFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isVideo: file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|avi)$/i) !== null,
    }));

    selectedMediaPreviews.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setSelectedMediaPreviews(newPreviews);
  };

  const removeSelectedFile = (index: number) => {
    const updated = [...selectedMediaPreviews];
    const removed = updated.splice(index, 1);
    if (removed[0]) {
      URL.revokeObjectURL(removed[0].previewUrl);
    }
    setSelectedMediaPreviews(updated);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      let uploadedUrls: string[] = [];

      if (selectedMediaPreviews.length > 0) {
        const formData = new FormData();
        selectedMediaPreviews.forEach((item) => {
          formData.append('files', item.file);
        });

        const uploadRes = await fetch(`${API_CONFIG.BASE_URL}/upload/multiple`, {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.urls) {
          throw new Error(uploadData.error || 'Failed to upload media files to server');
        }

        uploadedUrls = uploadData.urls;
      } else {
        uploadedUrls = [
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
          'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600',
        ];
      }

      const regData = await registerApi({
        fullName,
        shopName,
        mobileNumber,
        email,
        password,
        streetAddress,
        city,
        state,
        pincode,
        gstNumber: gstNumber || undefined,
        shopMediaUrls: uploadedUrls,
      }).unwrap();

      if (regData.userId) {
        selectedMediaPreviews.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        setSubmitted(true);
      } else {
        const formattedErr = typeof regData.error === 'string'
          ? regData.error
          : Array.isArray(regData.error)
          ? regData.error.map((err: any) => `${err.path?.join('.') ? err.path.join('.') + ': ' : ''}${err.message}`).join(', ')
          : regData.error?.message || 'Registration failed';
        setErrorMsg(formattedErr);
      }
    } catch (err: any) {
      setErrorMsg(err?.data?.error || err.message || 'Error submitting registration to server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card max-w-xl w-full p-8 rounded-3xl border-indigo-500/30">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">Register Your Business Shop</h1>
        <p className="text-xs text-slate-400 mt-1">Super Admin Verification Required to Unlock Community Access</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {!submitted ? (
        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Owner Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dipen Patel"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Shop / Business Name *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Royal Textiles"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@royaltextiles.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Account Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className="block text-slate-300 font-semibold mb-1">Shop Street Address *</label>
              <input
                type="text"
                required
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="102 Ring Road Textile Market"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">City *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Surat"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">State *</label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Gujarat"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Pincode *</label>
              <input
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="395002"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">GST Registration Number</label>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              placeholder="24AAAAA0000A1Z5"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="border border-dashed border-indigo-500/40 p-4 rounded-2xl bg-slate-900/50 text-center space-y-3">
            <span className="text-3xl block">📸 📹</span>
            <div>
              <label className="block text-slate-200 font-bold">
                Select Shop Inspection Photos & Videos (Up to 5 Files)
              </label>
              <p className="text-slate-400 text-[11px] mt-0.5">
                🛡️ Files stay on your local device and are <strong className="text-indigo-300">ONLY sent to the server when you click Submit</strong> below.
              </p>
            </div>

            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="text-slate-400 text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
            />

            {selectedMediaPreviews.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center justify-center gap-1">
                  ✓ {selectedMediaPreviews.length} local file(s) ready to submit:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                  {selectedMediaPreviews.map((item, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                      {item.isVideo ? (
                        <video src={item.previewUrl} className="w-full h-24 object-cover" />
                      ) : (
                        <img src={item.previewUrl} alt={`Selected file ${idx + 1}`} className="w-full h-24 object-cover" />
                      )}

                      <button
                        type="button"
                        onClick={() => removeSelectedFile(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center shadow"
                        title="Remove file"
                      >
                        ✕
                      </button>

                      <div className="p-1.5 bg-slate-900/90 text-[10px] text-slate-300 truncate font-mono">
                        {item.isVideo ? '🎥 Video' : '📷 Image'} • {item.file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition text-sm shadow-xl shadow-indigo-600/30 mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>⏳ Submitting Profile & Inspection Media...</>
            ) : (
              <>Submit Business for Verification ➔</>
            )}
          </button>
        </form>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-500/30">
            ✓
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Registration Submitted Successfully!</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            Your business profile and inspection media files have been uploaded to the server and sent to Super Admin for verification. You will be notified once approved.
          </p>
          <Link href="/login" className="px-6 py-2.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 inline-block">
            Go to Sign In ➔
          </Link>
        </div>
      )}
    </div>
  );
}
