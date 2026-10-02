import React, { useState } from 'react';
import { API_CONFIG } from '../../../lib/api/config';

interface CreatePollModalProps {
  isOpen: boolean;
  conversationId?: string | null;
  groupId?: string | null;
  onClose: () => void;
  onPollCreated?: (poll: any) => void;
}

export function CreatePollModal({
  isOpen,
  conversationId,
  groupId,
  onClose,
  onPollCreated,
}: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanQuestion = question.trim();
    const cleanOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!cleanQuestion) {
      setError('Please enter a poll question');
      return;
    }

    if (cleanOptions.length < 2) {
      setError('Please provide at least 2 non-empty options');
      return;
    }

    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${API_CONFIG.BASE_URL}/chat/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question: cleanQuestion,
          options: cleanOptions,
          conversationId: conversationId || undefined,
          groupId: groupId || undefined,
          allowMultiple,
        }),
      });

      const data = await res.json();
      if (res.ok && data.poll) {
        if (onPollCreated) onPollCreated(data.poll);
        onClose();
        setQuestion('');
        setOptions(['', '']);
      } else {
        setError(data.error || 'Failed to create poll');
      }
    } catch (err: any) {
      setError('Network error creating poll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-white">Create Interactive Poll</h3>
            <p className="text-xs text-slate-400">Ask a question to chat participants or group members</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Question</label>
            <input
              type="text"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/80 transition"
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Options</label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/80 transition"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(i)}
                    className="w-8 h-8 rounded-xl bg-slate-950 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
              >
                + Add Option
              </button>
            )}
          </div>

          {/* Multiple Selection Switch */}
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div>
              <h5 className="text-xs font-bold text-white">Allow Multiple Answers</h5>
              <p className="text-[10px] text-slate-400">Voters can select more than one option</p>
            </div>
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg transition"
          >
            {loading ? 'Creating Poll...' : 'Create & Send Poll'}
          </button>
        </form>

      </div>
    </div>
  );
}
