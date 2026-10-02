'use client';

import React, { useState } from 'react';
import { useSearchApprovedUsersQuery, ChatParticipant } from '../../../lib/redux/api/chatApi';
import { useCreateBroadcastListMutation } from '../../../lib/redux/api/broadcastApi';

interface NewBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newListId: string) => void;
}

export function NewBroadcastModal({ isOpen, onClose, onCreated }: NewBroadcastModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<ChatParticipant[]>([]);

  const { data: searchRes, isLoading: isSearching } = useSearchApprovedUsersQuery(searchQuery, {
    skip: !searchQuery.trim(),
  });

  const searchResults = searchRes?.users || [];

  const [createBroadcastList, { isLoading: isCreating }] = useCreateBroadcastListMutation();

  if (!isOpen) return null;

  const handleToggleSelectUser = (user: ChatParticipant) => {
    if (selectedUsers.some((u) => u.userId === user.userId)) {
      setSelectedUsers(selectedUsers.filter((u) => u.userId !== user.userId));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleSelectAllSearchResults = () => {
    const newSelected = [...selectedUsers];
    searchResults.forEach((user) => {
      if (!newSelected.some((u) => u.userId === user.userId)) {
        newSelected.push(user);
      }
    });
    setSelectedUsers(newSelected);
  };

  const handleRemoveSelectedUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.userId !== userId));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a title for your broadcast list.');
      return;
    }
    if (selectedUsers.length === 0) {
      alert('Please select at least 1 contact for your broadcast list.');
      return;
    }

    try {
      const res = await createBroadcastList({
        title: title.trim(),
        description: description.trim() || undefined,
        recipientIds: selectedUsers.map((u) => u.userId),
      }).unwrap();

      if (res.success && res.broadcastList) {
        setTitle('');
        setDescription('');
        setSelectedUsers([]);
        setSearchQuery('');
        onClose();
        if (onCreated) {
          onCreated(res.broadcastList.id);
        }
      }
    } catch (err: any) {
      alert(err?.data?.error || err?.message || 'Failed to create broadcast list.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 bg-emerald-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📢</span>
            <div>
              <h3 className="font-bold text-lg leading-tight">New Broadcast List</h3>
              <p className="text-xs text-emerald-100">
                {selectedUsers.length} of contacts selected
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

        <form onSubmit={handleCreate} className="flex-1 flex flex-col overflow-hidden">
          {/* List Title Input */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-800/40">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Broadcast Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Suppliers, Customers, Ahmedabad Buyers..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Selected User Chips */}
          {selectedUsers.length > 0 && (
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 max-h-28 overflow-y-auto">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                <span>Selected Contacts ({selectedUsers.length})</span>
                <button
                  type="button"
                  onClick={() => setSelectedUsers([])}
                  className="text-rose-600 hover:underline font-semibold"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((user) => (
                  <span
                    key={user.userId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700/50 rounded-full text-xs font-medium text-slate-800 dark:text-slate-200 shadow-sm"
                  >
                    <span>{user.fullName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedUser(user.userId)}
                      className="text-slate-400 hover:text-rose-600 font-bold ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact Search & Selection */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search contacts by name, mobile, shop name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {searchResults.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllSearchResults}
                className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 text-xs font-bold rounded-xl whitespace-nowrap transition-colors"
              >
                Select All
              </button>
            )}
          </div>

          {/* Contact List Results */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
            {!searchQuery.trim() ? (
              <div className="text-center py-10 text-slate-400 text-xs px-4">
                <p className="text-2xl mb-2">📱</p>
                <p className="font-semibold text-slate-600 dark:text-slate-300">Search to select broadcast recipients</p>
                <p className="mt-1">Type a contact name, mobile number, or shop name above.</p>
              </div>
            ) : isSearching ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Searching contacts...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No eligible contacts found matching &quot;{searchQuery}&quot;.
              </div>
            ) : (
              searchResults.map((user) => {
                const isSelected = selectedUsers.some((u) => u.userId === user.userId);
                return (
                  <div
                    key={user.userId}
                    onClick={() => handleToggleSelectUser(user)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {user.fullName}
                          </span>
                          {user.isVerified && (
                            <span className="text-emerald-500 text-xs" title="Verified Account">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {user.shopName} • {user.mobileNumber}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div onClick
                        className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {selectedUsers.length} recipients selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || selectedUsers.length === 0 || !title.trim()}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {isCreating ? 'Creating...' : 'Create Broadcast List'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
