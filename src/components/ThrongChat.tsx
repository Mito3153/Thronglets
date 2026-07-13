import { useEffect, useRef, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';
import { getOwnershipProof } from '@/lib/ownershipProof';
import { X, Send } from 'lucide-react';

interface Msg { id: string; role: 'user' | 'throngling'; content: string; sender_name: string | null; user_id: string | null; pending?: boolean; }
interface NeedPay { kind: string; price: number; credits: number; treasury: string; }
interface Props { throng: { id: string; name: string }; onClose: () => void; }

export const ThrongChat = ({ throng, onClose }: Props) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const userId = publicKey ? publicKey.toString() : null;
  const senderName = publicKey ? publicKey.toString().slice(0, 4) + '…' + publicKey.toString().slice(-4) : '';

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [paying, setPaying] = useState(false);
  const [needPay, setNeedPay] = useState<NeedPay | null>(null);
  const heldText = useRef('');
  const logRef = useRef<HTMLDivElement>(null);

  // one shared conversation per throng, followed live
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

  const sendText = async (text: string) => {
    if (!text || sending || !publicKey) return;
    setSending(true);
    let proof;
    try {
      proof = await getOwnershipProof(wallet);
    } catch {
      setSending(false);
      return;
    }
    setMessages((prev) => [...prev, { id: 'temp-' + Date.now(), role: 'user', content: text, sender_name: senderName, user_id: userId, pending: true }]);
    const { data, error } = await supabase.functions.invoke('throng-chat', {
      body: { throngId: throng.id, message: text, user_id: userId, ownerMsg: proof.ownerMsg, ownerSig: proof.ownerSig, sender_name: senderName, name: throng.name },
    });
    const d = data as any;
    if (d?.error === 'payment_required') {
      setSending(false);
      setMessages((prev) => prev.filter((m) => !m.pending));
      heldText.current = text;
      setNeedPay({ kind: d.kind, price: d.price_sol, credits: d.credits, treasury: d.treasury });
      return;
    }
    if (error || d?.error) { setSending(false); setMessages((prev) => [...prev, { id: 'e-' + Date.now(), role: 'throngling', content: '…(it went quiet)', sender_name: throng.name, user_id: null }]); return; }
    if (d?.rateLimited) { setSending(false); setMessages((prev) => [...prev, { id: 'rl-' + Date.now(), role: 'throngling', content: d.reply, sender_name: throng.name, user_id: null }]); return; }
    // normal reply arrives via realtime
  };

  const onSend = () => { const t = input.trim(); if (!t) return; setInput(''); sendText(t); };

  const payAndRetry = async () => {
    if (!needPay || !publicKey) return;
    setPaying(true);
    try {
      const lamports = Math.round(needPay.price * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(needPay.treasury), lamports }));
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');
      const { data } = await supabase.functions.invoke('verify-payment', { body: { txSig: sig, wallet: publicKey.toString(), kind: needPay.kind } });
      if ((data as any)?.success) {
        setNeedPay(null);
        const t = heldText.current; heldText.current = '';
        if (t) await sendText(t);
      } else {
        setMessages((prev) => [...prev, { id: 'pv-' + Date.now(), role: 'throngling', content: "(couldn't verify that payment — give it a second and try again)", sender_name: throng.name, user_id: null }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: 'pc-' + Date.now(), role: 'throngling', content: '(payment cancelled)', sender_name: throng.name, user_id: null }]);
    }
    setPaying(false);
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

      {!publicKey ? (
        <div className="p-3 border-t border-cyan/20 flex flex-col items-center gap-2">
          <div className="text-[11px] text-muted-foreground">Connect your wallet to talk to the throngs.</div>
          <WalletMultiButton style={{ height: 34, fontSize: 12 }} />
        </div>
      ) : needPay ? (
        <div className="p-3 border-t border-cyan/20 flex flex-col items-center gap-2">
          <div className="text-[11px] text-muted-foreground text-center">You've used your free messages. Feed {throng.name} to keep talking.</div>
          <button onClick={payAndRetry} disabled={paying} className="glass-button rounded px-4 py-2 text-[12px] font-bold text-cyan disabled:opacity-50">
            {paying ? 'confirming payment…' : `Pay ${needPay.price} SOL → ${needPay.credits} more messages`}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 border-t border-cyan/20">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
            placeholder={`Talk to ${throng.name}…`}
            maxLength={500}
            className="flex-1 bg-black/40 rounded px-3 py-2 text-[12px] text-primary-foreground outline-none border border-cyan/20 focus:border-cyan/50"
          />
          <button onClick={onSend} disabled={sending} className="glass-button rounded px-3 py-2 text-cyan disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
