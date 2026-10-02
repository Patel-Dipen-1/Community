import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../../lib/api/config';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacySettingsModal({ isOpen, onClose }: PrivacySettingsModalProps) {
  const [privacy, setPrivacy] = useState({
    lastSeen: 'EVERYONE',
    onlineStatus: 'EVERYONE',
    profilePhoto: 'EVERYONE',
    aboutStatus: 'EVERYONE',
    groupAdd: 'EVERYONE',
    callPrivacy: 'EVERYONE',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    fetch(`${API_CONFIG.BASE_URL}/user/privacy`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.privacy) {
          setPrivacy({
            lastSeen: data.privacy.lastSeen || 'EVERYONE',
            onlineStatus: data.privacy.onlineStatus || 'EVERYONE',
            profilePhoto: data.privacy.profilePhoto || 'EVERYONE',
            aboutStatus: data.privacy.aboutStatus || 'EVERYONE',
            groupAdd: data.privacy.groupAdd || 'EVERYONE',
            callPrivacy: data.privacy.callPrivacy || 'EVERYONE',
          });
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${API_CONFIG.BASE_URL}/user/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(privacy),
      });

      if (res.ok) {
        setMessage('Privacy settings updated successfully!');
        setTimeout(() => onClose(), 1200);
      }
    } catch (err) {
      setMessage('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-white">Privacy Controls</h3>
            <p className="text-xs text-slate-400">Configure who can see your info and activity</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {message && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-bold rounded-xl text-center">
            {message}
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Last Seen */}
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div>
              <h5 className="font-bold text-white">Last Seen</h5>
              <p className="text-[10px] text-slate-400">Who can see when you were last online</p>
            </div>
            <select
              value={privacy.lastSeen}
              onChange={(e) => setPrivacy({ ...privacy, lastSeen: e.target.value })}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2 py-1 outline-none text-xs"
            >
              <option value="EVERYONE">Everyone</option>
              <option value="MY_CONTACTS">My Contacts</option>
              <option value="NOBODY">Nobody</option>
            </select>
          </div>

          {/* Profile Photo */}
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div>
              <h5 className="font-bold text-white">Profile Photo</h5>
              <p className="text-[10px] text-slate-400">Who can view your profile picture</p>
            </div>
            <select
              value={privacy.profilePhoto}
              onChange={(e) => setPrivacy({ ...privacy, profilePhoto: e.target.value })}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2 py-1 outline-none text-xs"
            >
              <option value="EVERYONE">Everyone</option>
              <option value="MY_CONTACTS">My Contacts</option>
              <option value="NOBODY">Nobody</option>
            </select>
          </div>

          {/* Group Add Permissions */}
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div>
              <h5 className="font-bold text-white">Who can add me to groups</h5>
              <p className="text-[10px] text-slate-400">Control group invitation privileges</p>
            </div>
            <select
              value={privacy.groupAdd}
              onChange={(e) => setPrivacy({ ...privacy, groupAdd: e.target.value })}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2 py-1 outline-none text-xs"
            >
              <option value="EVERYONE">Everyone</option>
              <option value="MY_CONTACTS">My Contacts</option>
              <option value="NOBODY">Nobody</option>
            </select>
          </div>

          {/* Call Privacy */}
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div>
              <h5 className="font-bold text-white">Call Privacy</h5>
              <p className="text-[10px] text-slate-400">Who can initiate audio/video calls with you</p>
            </div>
            <select
              value={privacy.callPrivacy}
              onChange={(e) => setPrivacy({ ...privacy, callPrivacy: e.target.value })}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2 py-1 outline-none text-xs"
            >
              <option value="EVERYONE">Everyone</option>
              <option value="MY_CONTACTS">My Contacts</option>
              <option value="NOBODY">Nobody</option>
            </select>
          </div>
        </div>

        <button
          disabled={saving}
          onClick={handleSave}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg transition"
        >
          {saving ? 'Saving...' : 'Save Privacy Settings'}
        </button>
      </div>
    </div>
  );
}
