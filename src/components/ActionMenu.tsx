import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card } from '@/components/ui/card';
import { TOOLS } from '@/lib/constants';
import { Sparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MinimizeButton } from '@/components/MinimizeButton';

interface Props {
  onSelectTool: (toolId: string) => void;
  selectedTool: string | null;
  onOpenSpawnLab: () => void;
}

export const ActionMenu = ({ onSelectTool, selectedTool, onOpenSpawnLab }: Props) => {
  const { connected } = useWallet();
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <Collapsible open={!isMinimized} onOpenChange={() => setIsMinimized(!isMinimized)}>
      <Card className="absolute top-20 right-4 w-80 glass-panel p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <MinimizeButton isMinimized={isMinimized} />
          </CollapsibleTrigger>
            <h2 className="pixel-heading text-cyan">{isMinimized ? 'ACTIONS' : 'ACTION MENU'}</h2>
          </div>
          <CollapsibleContent>
            <div className="text-[10px] mt-1">
              {connected ? (
                <span className="text-cyan">Connected · 1 free tool, then 0.002 SOL each</span>
              ) : (
                <span className="text-muted-foreground">Connect your wallet to use tools.</span>
              )}
            </div>

            <div className="space-y-2 mt-3">
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => connected && onSelectTool(tool.id)}
                  disabled={!connected}
                  className={`glass-button w-full text-left p-2 ${
                    selectedTool === tool.id
                      ? '!bg-cyan/20 !border-cyan'
                      : ''
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold flex items-center gap-2">
                      <span>{tool.icon}</span>
                      <span>{tool.name}</span>
                    </span>
                    <span className="text-cyan text-[11px] font-bold">
                      {tool.id === 'snack' ? 'soon' : '0.002 SOL'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={onOpenSpawnLab}
              disabled={!connected}
              className="glass-button w-full py-3 px-4 text-[11px] font-bold !bg-pink/70 hover:!bg-pink/80 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-3"
            >
              <Sparkles className="w-4 h-4" />
              Open Spawn Lab
            </button>
          </CollapsibleContent>
        </div>
      </Card>
    </Collapsible>
  );
};
