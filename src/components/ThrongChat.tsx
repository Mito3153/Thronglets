import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Send } from 'lucide-react';

interface Msg { id: string; role: 'user' | 'throngling'; sender_name: string | null; content: string; pending?: boolean; }
interface Props { throng: { id: string; name: string }; onClose: () => void; }

// stable per-browser handle so the lock + chat attribute to "you"
function myHandle(): string {
  let h = localStorage.getItem('throng_handle');
  if (!h) { h = 'sky-hand-' + Math.random().toString(36).slice(2, 6); localStorage.setItem('throng_handle', h); }
  return h;
}

export const ThrongChat = ({ throng, onClose }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [readOnly, setReadOnly] = useState(false); // someone else is talking to it
  const logRef = useRef<HTMLDivElement>(null);
  const claimer = useRef(myHandle());

  // claim the one-talker lock + heartbeat + release
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let released = false;
    (async () => {
      const { data: got } = await supabase.rpc('claim_throngling_chat', {
        _throngling_id: throng.id, _claimer: claimer.current, _ttl_seconds: 30,
      });
      if (got) {
        interval = setInterval(() => {
          supabase.rpc('refresh_throngling_chat', { _throngling_id: throng.id, _claimer: claimer.current, _ttl_seconds: 30 });
        }, 15000);
      } else {
        setReadOnly(true);
      }
    })();
    return () => {
      released = true;
      if (interval) clearInterval(interval);
      supabase.rpc('release_throngling_chat', { _throngling_id: throng.id, _claimer: claimer.current });
    };
  }, [throng.id]);

  // load history + subscribe to live messages (so everyone sees the conversation)
  useEffect(() => {
    supabase.from('chat_messages').select('id, role, sender_name, content')
      .eq('throngling_id', throng.id).order('created_at', { ascending: true }).limit(50)
      .then(({ data }) => { if (data) setMessages(data as Msg[]); });

    const channel = supabase.channel(`chat-${throng.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `throngling_id=eq.${throng.id}` },
        (payload) => {
          const row = payload.new as Msg;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            // reconcile an optimistic message with its persisted version
            const i = prev.findIndex((m) => m.pending && m.role === row.role && m.content === row.content);
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
    if (!text || sending || readOnly) return;
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, { id: 'temp-' + Date.now(), role: 'user', sender_name: claimer.current, content: text, pending: true }]);
    const { data, error } = await supabase.functions.invoke('throng-chat', {
      body: { throngId: throng.id, message: text, sender_name: claimer.current, name: throng.name },
    });
    if (error || (data as any)?.error) {
      setSending(false);
      setMessages((prev) => [...prev, { id: 'err-' + Date.now(), role: 'throngling', sender_name: throng.name, content: '...(it went quiet)' }]);
    }
    // the reply arrives via realtime; sending clears when it lands
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[26rem] max-w-[90vw] glass-panel rounded-xl overflow-hidden z-50 flex flex-col" style={{ maxHeight: '52vh' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan/20">
        <div className="text-sm font-bold text-cyan flex items-center gap-2">
          💬 {throng.name}
          {readOnly && <span className="text-[10px] text-yellow-400 font-normal">— someone else is talking</span>}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div ref={logRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[8rem]">
        {messages.length === 0 && <div className="text-[11px] text-muted-foreground text-center py-6">Say something to {throng.name}...</div>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-[12px] ${m.role === 'user' ? 'bg-cyan/20 text-cyan' : 'bg-black/40 text-primary-foreground'}`}>
              {m.role === 'throngling' && <div className="text-[9px] text-pink/80 mb-0.5">{m.sender_name || throng.name}</div>}
              {m.content}
            </div>
          </div>
        ))}
        {sending && <div className="flex justify-start"><div className="bg-black/40 rounded-lg px-3 py-1.5 text-[12px] text-muted-foreground">{throng.name} is thinking…</div></div>}
      </div>

      {!readOnly && (
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
      )}
    </div>
  );
};
