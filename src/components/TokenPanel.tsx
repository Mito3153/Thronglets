import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card } from '@/components/ui/card';
import { ExternalLink, Twitter, MessageCircle, Copy } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MinimizeButton } from '@/components/MinimizeButton';
import { TOKEN_LINKS, CONTRACT_ADDRESS } from '@/lib/tokenLinks';
import { toast } from '@/hooks/use-toast';

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
          
          <div className="glass-inset p-3 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[10px]">Contract Address</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(CONTRACT_ADDRESS);
                  toast({
                    title: "Copied!",
                    description: "Contract address copied to clipboard",
                  });
                }}
                className="glass-button px-2 py-1 text-[9px] flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <div className="text-cyan font-mono text-[10px] break-all">
              {CONTRACT_ADDRESS}
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground leading-relaxed">
            All actions are currently free with daily limits. Token utility coming soon!
          </div>

          <div className="pt-2 space-y-2">
            <button 
              onClick={() => TOKEN_LINKS.DEXSCREENER && window.open(TOKEN_LINKS.DEXSCREENER, '_blank')}
              disabled={!TOKEN_LINKS.DEXSCREENER}
              className={`glass-button w-full py-2 px-3 text-[10px] flex items-center justify-between group text-primary-foreground ${!TOKEN_LINKS.DEXSCREENER ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>Buy on Dexscreener</span>
              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button 
              onClick={() => TOKEN_LINKS.PUMP_FUN && window.open(TOKEN_LINKS.PUMP_FUN, '_blank')}
              disabled={!TOKEN_LINKS.PUMP_FUN}
              className={`glass-button w-full py-2 px-3 text-[10px] flex items-center justify-between group text-primary-foreground ${!TOKEN_LINKS.PUMP_FUN ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>Pump.Fun</span>
              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button 
              onClick={() => TOKEN_LINKS.SOLSCAN && window.open(TOKEN_LINKS.SOLSCAN, '_blank')}
              disabled={!TOKEN_LINKS.SOLSCAN}
              className={`glass-button w-full py-2 px-3 text-[10px] flex items-center justify-between group text-primary-foreground ${!TOKEN_LINKS.SOLSCAN ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>Solscan</span>
              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
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
