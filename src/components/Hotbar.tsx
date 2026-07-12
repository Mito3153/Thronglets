import { useWallet } from '@solana/wallet-adapter-react';
import { TOOLS } from '@/lib/constants';

interface Props {
  onSelectTool: (toolId: string) => void;
  selectedTool: string | null;
}

export const Hotbar = ({ onSelectTool, selectedTool }: Props) => {
  const { connected } = useWallet();

  if (!connected) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-panel p-3">
      <div className="flex items-center gap-2">
        {TOOLS.map((tool, index) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`glass-button relative w-16 h-16 transition-all ${
              selectedTool === tool.id
                ? '!bg-cyan/20 !border-cyan scale-110'
                : ''
            } flex flex-col items-center justify-center`}
            title={`${tool.name} - 1 free/day`}
          >
            <span className="text-2xl">{tool.icon}</span>
            <span className="text-[8px] mt-1 opacity-80">{index + 1}</span>
          </button>
        ))}
      </div>
      <div className="text-[9px] text-center text-muted-foreground mt-2">
        Select a tool → click the map to deploy (1 free/day)
      </div>
    </div>
  );
};
