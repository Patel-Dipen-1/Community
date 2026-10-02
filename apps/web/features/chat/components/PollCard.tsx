import React, { useState } from 'react';
import { API_CONFIG } from '../../../lib/api/config';

export interface PollOptionData {
  id: string;
  text: string;
  votes: { userId: string }[];
}

export interface PollData {
  id: string;
  question: string;
  allowMultiple: boolean;
  options: PollOptionData[];
  expiresAt?: string | null;
  creatorId: string;
}

interface PollCardProps {
  poll: PollData;
  currentUserId: string;
  onVoteSuccess?: (updatedPoll: PollData) => void;
}

export function PollCard({ poll: initialPoll, currentUserId, onVoteSuccess }: PollCardProps) {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [isVoting, setIsVoting] = useState(false);

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

  const handleVote = async (optionId: string) => {
    try {
      setIsVoting(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${API_CONFIG.BASE_URL}/chat/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ optionId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.poll) {
          setPoll(data.poll);
          if (onVoteSuccess) onVoteSuccess(data.poll);
        }
      }
    } catch (err) {
      console.error('Failed to vote on poll:', err);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-slate-200 my-2 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
          📊 Interactive Poll
        </span>
        {poll.allowMultiple && (
          <span className="text-[10px] text-slate-400 font-medium">Multiple choices allowed</span>
        )}
      </div>

      <h4 className="text-sm font-extrabold text-white leading-snug">{poll.question}</h4>

      <div className="space-y-2 pt-1">
        {poll.options.map((opt) => {
          const voteCount = opt.votes.length;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const hasVoted = opt.votes.some((v) => v.userId === currentUserId);

          return (
            <button
              key={opt.id}
              disabled={isVoting}
              onClick={() => handleVote(opt.id)}
              className={`w-full relative overflow-hidden rounded-xl p-3 border text-left transition flex flex-col justify-center ${
                hasVoted
                  ? 'border-emerald-500/80 bg-emerald-950/30'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              {/* Progress Bar background */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-emerald-500/15 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />

              <div className="relative z-10 flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2 text-white">
                  {hasVoted && <span className="text-emerald-400 font-bold">✓</span>}
                  {opt.text}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {percentage}% ({voteCount})
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-medium">
        <span>{totalVotes} total vote{totalVotes !== 1 ? 's' : ''}</span>
        {poll.expiresAt && (
          <span>Closes: {new Date(poll.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
    </div>
  );
}
