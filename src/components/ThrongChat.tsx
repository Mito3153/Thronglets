import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { X, Send } from 'lucide-react';

interface Msg { id: string; role: 'user' | 'throngling'; content: string; sender_name: string | null; user_id: string | null; pending?: boolean; }
interface Props { throng: { id: string; name: string }; onClose: () => void; }

function anonId(): string {
  let h = localStorage.getItem('throng_handle');
  if (!h) { h = 'sky-hand-' + Math.random().toString(36).slice(2, 8); localStorage.setItem('throng_handle', h); }
  return h;
}

export const ThrongChat = ({ throng, onClose }: Props) => {
  const { publicKey } = useWallet();
  const userId = publicKey ? publicKey.toString() : anonId();
  const senderName = publicKey ? publicKey.toString().slice(0, 4) + '…' + publicKey.toString().slice(-4) : 'a sky-hand';

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // load the throng's ONE shared conversation, and follow it live
  useEffect(() => {
    supabase.from('chat_messages')
      .select('id, role, content, sender_name, user_id')
      .eq('throngling_id', throng.id)
      .order('created_at', { ascending: true }).limit(200)
      .then(({ data }) => { if (data) setMessages(data as Msg[]); });

    const channel = supabase.channel(`chat-${throng.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `throngling_id=eq.${throng.id}` },
        (payload) => {
          const row = payload.new as Msg;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const i = prev.findIndex((m) => m.pending && m.role === row.role && m.content === row.content && m.user_id === row.user_id);
            if (i >= 0) { const copy = [...prev]; copy[i] = { ...row }; return copy; }
            return [...prev, row];
          });
          if (row.role === 'throngling') setSending(false);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [throng.id]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, { id: 'temp-' + Date.now(), role: 'user', content: text, sender_name: senderName, user_id: userId, pending: true }]);
    const { data, error } = await supabase.functions.invoke('throng-chat', {
      body: { throngId: throng.id, message: text, user_id: userId, sender_name: senderName, name: throng.name },
    });
    if (error || (data as any)?.error) {
      setSending(false);
      setMessages((prev) => [...prev, { id: 'e-' + Date.now(), role: 'throngling', content: '…(it went quiet)', sender_name: throng.name, user_id: null }]);
    }
    // reply arrives via realtime; sending clears when it lands
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[26rem] max-w-[90vw] glass-panel rounded-xl overflow-hidden z-50 flex flex-col" style={{ maxHeight: '52vh' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan/20">
        <div className="text-sm font-bold text-cyan flex items-center gap-2">💬 {throng.name}</div>
        <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div ref={logRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[8rem]">
        {messages.length === 0 && <div className="text-[11px] text-muted-foreground text-center py-6">Be the first to talk to {throng.name}…</div>}
        {messages.map((m) => {
          const mine = m.role === 'user' && m.user_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-[12px] ${mine ? 'bg-cyan/20 text-cyan' : m.role === 'throngling' ? 'bg-black/40 text-primary-foreground' : 'bg-white/5 text-primary-foreground'}`}>
                {m.role === 'throngling'
                  ? <div className="text-[9px] text-pink/80 mb-0.5">{throng.name}</div>
                  : !mine && <div className="text-[9px] text-cyan/70 mb-0.5">{m.sender_name || 'a sky-hand'}</div>}
                {m.content}
              </div>
            </div>
          );
        })}
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
