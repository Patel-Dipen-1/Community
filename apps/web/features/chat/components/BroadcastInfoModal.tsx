'use client';

import React, { useState } from 'react';
import {
  useGetBroadcastDetailsQuery,
  useUpdateBroadcastListMutation,
  useAddBroadcastRecipientsMutation,
  useRemoveBroadcastRecipientsMutation,
  useDuplicateBroadcastListMutation,
  useDeleteBroadcastListMutation,
} from '../../../lib/redux/api/broadcastApi';
import { useSearchApprovedUsersQuery, ChatParticipant } from '../../../lib/redux/api/chatApi';

interface BroadcastInfoModalProps {
  isOpen: boolean;
  broadcastListId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

export function BroadcastInfoModal({ isOpen, broadcastListId, onClose, onDeleted }: BroadcastInfoModalProps) {
  const { data: detailsRes, isLoading, refetch } = useGetBroadcastDetailsQuery(broadcastListId, {
    skip: !isOpen || !broadcastListId,
  });

  const broadcastList = detailsRes?.broadcastList;

  const [updateList] = useUpdateBroadcastListMutation();
  const [addRecipients] = useAddBroadcastRecipientsMutation();
  const [removeRecipients] = useRemoveBroadcastRecipientsMutation();
  const [duplicateList] = useDuplicateBroadcastListMutation();
  const [deleteList] = useDeleteBroadcastListMutation();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleText, setEditTitleText] = useState('');
  const [isAddingContacts, setIsAddingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  const { data: searchRes } = useSearchApprovedUsersQuery(contactSearch, {
    skip: !contactSearch.trim(),
  });
  const searchResults = searchRes?.users || [];

  if (!isOpen || !broadcastListId) return null;

  const handleSaveRename = async () => {
    if (!editTitleText.trim()) return;
    try {
      await updateList({ id: broadcastListId, title: editTitleText.trim() }).unwrap();
      setIsEditingTitle(false);
      refetch();
    } catch (err: any) {
      alert(err?.data?.error || 'Failed to rename broadcast list');
    }
  };

  const handleRemoveContact = async (userId: string) => {
    if (!confirm('Remove this recipient from your broadcast list?')) return;
    try {
      await removeRecipients({ id: broadcastListId, recipientIds: [userId] }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.error || 'Failed to remove recipient');
    }
  };

  const handleAddContact = async (user: ChatParticipant) => {
    try {
      await addRecipients({ id: broadcastListId, recipientIds: [user.userId] }).unwrap();
      setContactSearch('');
      setIsAddingContacts(false);
      refetch();
    } catch (err: any) {
      alert(err?.data?.error || 'Failed to add recipient');
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateList(broadcastListId).unwrap();
      alert('Broadcast list duplicated successfully!');
      onClose();
    } catch (err: any) {
      alert(err?.data?.error || 'Failed to duplicate list');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete broadcast list "${broadcastList?.title}"?`)) return;
    try {
      await deleteList(broadcastListId).unwrap();
      onClose();
      if (onDeleted) onDeleted();
    } catch (err: any) {
      alert(err?.data?.error || 'Failed to delete list');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-4 bg-emerald-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <h3 className="font-bold text-lg leading-tight">Broadcast Info</h3>
              <p className="text-xs text-emerald-100">
                {broadcastList?.recipientCount || 0} recipients
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-emerald-700 rounded-full transition-colors text-white text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading broadcast details...</div>
        ) : !broadcastList ? (
          <div className="py-12 text-center text-slate-400 text-xs">Broadcast list not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {/* Title & Rename Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-500 rounded-lg text-sm text-slate-900 dark:text-white font-bold"
                    />
                    <button
                      onClick={handleSaveRename}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingTitle(false)}
                      className="px-2 py-1.5 text-xs text-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-lg">
                        {broadcastList.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Created {new Date(broadcastList.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditTitleText(broadcastList.title);
                        setIsEditingTitle(true);
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      ✎ Edit Title
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Recipient Management Header */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Recipients ({broadcastList.recipients.length})
                </span>
                <button
                  onClick={() => setIsAddingContacts(!isAddingContacts)}
                  className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg hover:bg-emerald-200"
                >
                  ➕ Add Contacts
                </button>
              </div>

              {/* Add Contacts Search Dropdown */}
              {isAddingContacts && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                  <input
                    type="text"
                    placeholder="Search contact to add..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                  {searchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {searchResults.map((user) => (
                        <div
                          key={user.userId}
                          className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{user.fullName}</span>
                            <span className="text-slate-400 ml-1">({user.shopName})</span>
                          </div>
                          <button
                            onClick={() => handleAddContact(user)}
                            className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recipients List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {broadcastList.recipients.map((rec) => (
                  <div
                    key={rec.userId}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                        {rec.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {rec.fullName}
                          </span>
                          {rec.isVerified && <span className="text-emerald-500 text-[10px]">✓</span>}
                        </div>
                        <p className="text-[11px] text-slate-500">{rec.shopName} • {rec.mobileNumber}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveContact(rec.userId)}
                      className="p-1 text-slate-400 hover:text-rose-600 text-sm font-bold"
                      title="Remove contact"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions (Duplicate / Delete) */}
            <div className="p-4 space-y-2 bg-slate-50 dark:bg-slate-900">
              <button
                onClick={handleDuplicate}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>📋</span> Duplicate Broadcast List
              </button>
              <button
                onClick={handleDelete}
                className="w-full py-2.5 px-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>🗑️</span> Delete Broadcast List
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
