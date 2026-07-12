import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { X, Send } from 'lucide-react';

interface Msg { id: string; role: 'user' | 'throngling'; content: string; }
interface Props { throng: { id: string; name: string }; onClose: () => void; }

// stable per-browser id, used when no wallet is connected
function anonId(): string {
  let h = localStorage.getItem('throng_handle');
  if (!h) { h = 'sky-hand-' + Math.random().toString(36).slice(2, 8); localStorage.setItem('throng_handle', h); }
  return h;
}

export const ThrongChat = ({ throng, onClose }: Props) => {
  const { publicKey } = useWallet();
  // your identity — your wallet if connected, otherwise a stable per-browser id.
  // This is what your private chat history with each throng is tied to.
  const userId = publicKey ? publicKey.toString() : anonId();
  const senderName = publicKey ? publicKey.toString().slice(0, 4) + '…' + publicKey.toString().slice(-4) : 'you';

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  // load THIS user's saved thread with this throng, and continue it
  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase.from('chat_messages')
      .select('id, role, content')
      .eq('throngling_id', throng.id).eq('user_id', userId)
      .order('created_at', { ascending: true }).limit(100)
      .then(({ data }) => { if (active) { setMessages((data as Msg[]) || []); setLoading(false); } });
    return () => { active = false; };
  }, [throng.id, userId]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, { id: 'u-' + Date.now(), role: 'user', content: text }]);
    const { data, error } = await supabase.functions.invoke('throng-chat', {
      body: { throngId: throng.id, message: text, user_id: userId, sender_name: senderName, name: throng.name },
    });
    setSending(false);
    const reply = (data as any)?.reply;
    if (error || (data as any)?.error || !reply) {
      setMessages((prev) => [...prev, { id: 'e-' + Date.now(), role: 'throngling', content: '…(it went quiet)' }]);
    } else {
      setMessages((prev) => [...prev, { id: 't-' + Date.now(), role: 'throngling', content: reply }]);
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[26rem] max-w-[90vw] glass-panel rounded-xl overflow-hidden z-50 flex flex-col" style={{ maxHeight: '52vh' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan/20">
        <div className="text-sm font-bold text-cyan flex items-center gap-2">
          💬 {throng.name}
          {!publicKey && <span className="text-[9px] text-muted-foreground font-normal">— connect wallet to save across devices</span>}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div ref={logRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[8rem]">
        {loading ? (
          <div className="text-[11px] text-muted-foreground text-center py-6">…</div>
        ) : messages.length === 0 ? (
          <div className="text-[11px] text-muted-foreground text-center py-6">Say something to {throng.name}…</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-[12px] ${m.role === 'user' ? 'bg-cyan/20 text-cyan' : 'bg-black/40 text-primary-foreground'}`}>
                {m.role === 'throngling' && <div className="text-[9px] text-pink/80 mb-0.5">{throng.name}</div>}
                {m.content}
              </div>
            </div>
          ))
        )}
        {sending && <div className="flex justify-start"><div className="bg-black/40 rounded-lg px-3 py-1.5 text-[12px] text-muted-foreground">{throng.name} is thinking…</div></div>}
      </div>

      <div className="flex items-center gap-2 p-2 border-t border-cyan/20">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder={`Talk to ${throng.name}…`}
          maxLength={500}
          className="flex-1 bg-black/40 rounded px-3 py-2 text-[12px] text-primary-foreground outline-none border border-cyan/20 focus:border-cyan/50"
        />
        <button onClick={send} disabled={sending} className="glass-button rounded px-3 py-2 text-cyan disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
