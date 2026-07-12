import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HowItWorksDialog = ({ open, onOpenChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-w-md !bg-[rgba(10,20,18,0.95)]">
        <DialogHeader>
          <DialogTitle className="pixel-heading text-cyan">How It Works</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-[10px] leading-relaxed">
          <div className="glass-inset p-3 rounded-xl">
            <h3 className="text-cyan font-bold mb-1.5">1. Watch a living pixel city</h3>
            <p className="text-muted-foreground">
              Thronglets wander, work, and play on a cozy map.
            </p>
          </div>

          <div className="glass-inset p-3 rounded-xl">
            <h3 className="text-cyan font-bold mb-1.5">2. Connect your Solana wallet</h3>
            <p className="text-muted-foreground">
              Use Phantom or Solflare to connect and interact with the city.
            </p>
          </div>

          <div className="glass-inset p-3 rounded-xl">
            <h3 className="text-cyan font-bold mb-1.5">3. Spend $THRONG for special events</h3>
            <p className="text-muted-foreground">
              Meteor, Lightning, Tornado, Fire, Snack Rain, or a Mini Festival. Open Spawn Lab to create and name your own.
            </p>
          </div>

          <div className="glass-inset p-2 rounded-lg text-[9px] text-muted-foreground text-center">
            Cartoon violence only. Not investment advice.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
