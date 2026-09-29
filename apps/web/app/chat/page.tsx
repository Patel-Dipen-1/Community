import { Suspense } from 'react';
import { ChatModule } from '../../features/chat/ChatModule';

export const metadata = {
  title: 'Real-Time B2B Chat | Verified Business Platform',
  description: 'Secure real-time chat between approved business members, manufacturers, wholesalers, and retailers.',
};

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-semibold">Loading chat module...</div>}>
      <ChatModule />
    </Suspense>
  );
}

