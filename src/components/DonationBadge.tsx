import { Heart, Copy, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const DonationBadge = () => {
  const DONATION_ADDRESS = "FoUH7K3JaHRaJzaX9hKzb4rhwrNYdL7mFCqAy1XJ6e7w";
  
  const handleCopy = () => {
    navigator.clipboard.writeText(DONATION_ADDRESS);
    toast.success("Copied!", {
      description: "Donation address copied to clipboard",
    });
  };

  return (
    <div className="glass-panel rounded-xl px-4 py-3 flex items-center gap-3">
      <Heart className="w-6 h-6 text-red-500 shrink-0" />
      <div className="flex flex-col">
        <div className="text-xs font-semibold text-muted-foreground">
          Fuel the city.
        </div>
        <div className="flex items-center gap-2">
          <div className="text-yellow-400 font-mono text-[9px] break-all">
            {DONATION_ADDRESS}
          </div>
          <button
            onClick={handleCopy}
            className="border border-cyan/30 bg-black/40 rounded px-2 py-1 flex items-center gap-1.5 hover:bg-black/60 transition-colors shrink-0"
          >
            <Copy className="w-3 h-3 text-cyan" />
            <span className="text-[10px] text-cyan">Copy</span>
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="border border-cyan/30 bg-black/40 rounded px-2 py-1 flex items-center gap-1.5 hover:bg-black/60 transition-colors shrink-0">
                <Info className="w-3 h-3 text-cyan" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 text-[10px] text-muted-foreground leading-tight">
              Community donations + Pump.fun fees keep the Observatory running. Developer holdings reserved for future listings.
              <div className="mt-2">
                Together we are <span className="text-yellow-400 font-semibold">THRONG</span>.
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};
