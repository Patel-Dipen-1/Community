import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../../lib/api/config';

interface GroupRequestsModalProps {
  isOpen: boolean;
  groupId: string;
  onClose: () => void;
}

export function GroupRequestsModal({ isOpen, groupId, onClose }: GroupRequestsModalProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [inviteLink, setInviteLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !groupId) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    // Fetch Invite Link
    fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/invite-link`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.inviteToken) {
          setInviteLink(`${window.location.origin}/groups/join?token=${data.inviteToken}`);
        }
      })
      .catch(() => {});

    // Fetch Pending Join Requests
    setLoading(true);
    fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/join-requests`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.requests) setRequests(data.requests);
      })
      .finally(() => setLoading(false));
  }, [isOpen, groupId]);

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApprove = async (requestId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/join-requests/${requestId}/approve`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
  };

  const handleReject = async (requestId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${API_CONFIG.BASE_URL}/groups/${groupId}/join-requests/${requestId}/reject`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-white">Group Access & Invites</h3>
            <p className="text-xs text-slate-400">Manage invite links and member join approval queue</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Group Invite Link Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Group Invite Link</label>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2 rounded-xl">
            <input
              type="text"
              readOnly
              value={inviteLink || 'Generating link...'}
              className="flex-1 bg-transparent text-xs text-slate-300 outline-none px-2 font-mono truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold shadow transition"
            >
              {copied ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Pending Join Requests Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Pending Approval Queue ({requests.length})
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-slate-500 py-4 text-center">Loading requests...</p>
          ) : requests.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 text-center text-xs text-slate-500">
              No pending join requests.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-extrabold text-xs">
                      {req.user?.fullName?.charAt(0) || '👤'}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white leading-tight">{req.user?.fullName}</h5>
                      <p className="text-[10px] text-slate-400">{req.user?.mobileNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl text-xs font-extrabold transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
