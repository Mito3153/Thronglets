import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card } from '@/components/ui/card';
import { Twitter, MessageCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MinimizeButton } from '@/components/MinimizeButton';
import { TOKEN_LINKS } from '@/lib/tokenLinks';

export const TokenPanel = () => {
  const { connected } = useWallet();
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <Collapsible open={!isMinimized} onOpenChange={() => setIsMinimized(!isMinimized)}>
      <Card className="absolute top-4 left-4 w-80 glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="pixel-heading text-cyan">DASHBOARD</h2>
          <CollapsibleTrigger asChild>
            <MinimizeButton isMinimized={isMinimized} />
          </CollapsibleTrigger>
        </div>
      
        <CollapsibleContent>
          <div className="text-xs opacity-80 -mt-1">Observatory v1.0</div>
          
          <div className="glass-inset p-3 rounded-xl text-[10px] text-muted-foreground leading-relaxed">
            $THRONG launching soon 🔜 — all actions are free for now.
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => TOKEN_LINKS.TWITTER && window.open(TOKEN_LINKS.TWITTER, '_blank')}
              disabled={!TOKEN_LINKS.TWITTER}
              className={`glass-button w-full py-2 px-3 text-[10px] flex items-center justify-between group text-primary-foreground ${!TOKEN_LINKS.TWITTER ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>X (Twitter)</span>
              <Twitter className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button 
              onClick={() => TOKEN_LINKS.TELEGRAM && window.open(TOKEN_LINKS.TELEGRAM, '_blank')}
              disabled={!TOKEN_LINKS.TELEGRAM}
              className={`glass-button w-full py-2 px-3 text-[10px] flex items-center justify-between group text-primary-foreground ${!TOKEN_LINKS.TELEGRAM ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>Telegram</span>
              <MessageCircle className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="text-[9px] text-muted-foreground pt-2 leading-relaxed">
            Experimental art project. Not investment advice.
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
