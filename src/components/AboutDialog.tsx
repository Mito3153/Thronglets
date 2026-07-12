import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { TOKEN_LINKS } from '@/lib/tokenLinks';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AboutDialog = ({ open, onOpenChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-w-2xl !bg-[rgba(10,20,18,0.95)] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pixel-heading text-cyan">About Us</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 text-[10px] leading-relaxed">
          {/* Mission */}
          <div className="glass-inset p-3 rounded-xl">
            <h3 className="text-cyan font-bold mb-1.5">Mission</h3>
            <p className="text-muted-foreground">
              Build the first community-funded AI city on-chain: a persistent world of digital lifeforms where citizens learn, remember, and act; the map expands over time; community tools shape every moment; and ongoing network activity responsibly grows capacity and intelligence as we move toward a shared multiverse that thinks for itself.
            </p>
          </div>

          {/* AI Plan */}
          <div className="glass-inset p-3 rounded-xl">
            <h3 className="text-cyan font-bold mb-1.5">AI Plan</h3>
            <p className="text-muted-foreground">
              Each Thronglet will connect to an AI API so every citizen can think, remember, and talk. Over time, they'll learn routines, react to the city, and even hold short conversations. We'll start with lightweight behaviors and scale up to per-Thronglet memory, personality, and goals.
            </p>
          </div>

          {/* Roadmap */}
          <div className="glass-inset p-3 rounded-xl">
            <h3 className="text-cyan font-bold mb-2">Roadmap</h3>
            
            <div className="space-y-2">
              <div>
                <h4 className="text-cyan font-semibold text-[9px] mb-1">Near-term</h4>
                <ul className="text-muted-foreground space-y-0.5 list-disc list-inside text-[9px]">
                  <li>Hotbar interactions (live) + daily free quotas per wallet</li>
                  <li>Spawn Lab v1 with custom names (5 free/day)</li>
                  <li>Clickable Live Events that fly the camera to the action</li>
                  <li>Population cap + performance polish</li>
                  <li>A fully synced map, enough cloud storage to show actions to all users at once instead of having to host in manually for each user</li>
                </ul>
              </div>

              <div>
                <h4 className="text-cyan font-semibold text-[9px] mb-1">Mid-term</h4>
                <ul className="text-muted-foreground space-y-0.5 list-disc list-inside text-[9px]">
                  <li>AI API integration pilot for a small set of Thronglets</li>
                  <li>Global chat + city announcements</li>
                  <li>Accessory system and seasonal events</li>
                  <li>Server-verified receipts for paid actions</li>
                </ul>
              </div>

              <div>
                <h4 className="text-cyan font-semibold text-[9px] mb-1">Long-term</h4>
                <ul className="text-muted-foreground space-y-0.5 list-disc list-inside text-[9px]">
                  <li>Per-Thronglet AI agents with memory/personality</li>
                  <li>Player factions and territory control</li>
                  <li>Creator tools for community-made events and tiles</li>
                  <li>Mobile-first client and multi-map districts</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Token Utility */}
          <div className="glass-inset p-3 rounded-xl">
            <h3 className="text-cyan font-bold mb-1.5">Token Utility ($THRONG)</h3>
            <p className="text-muted-foreground">
              Use $THRONG to trigger city events (Rock, Lightning, Tornado, Fire, Snack Rain, Mini Festival) and for extra spawns. Quotas reset daily at 00:00 UTC. Prices shown in the UI; on-chain amounts will be finalized as we scale.
            </p>
          </div>

          {/* Funding & Scaling */}
          <div className="glass-inset p-3 rounded-xl">
            <h3 className="text-cyan font-bold mb-1.5">Funding & Scaling</h3>
            <p className="text-muted-foreground">
              Creator fees from Pump.fun fund servers and development. As treasury grows, we upgrade infrastructure (more AI capacity per Thronglet, faster map updates, richer effects) and roll out new features. We publish capacity changes and cost breakdowns as we go.
            </p>
          </div>

          {/* Transparency */}
          <div className="glass-inset p-3 rounded-xl">
            <h3 className="text-cyan font-bold mb-1.5">Transparency</h3>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside mb-2">
              <li>Public changelog with every deploy</li>
              <li>Weekly treasury snapshot and basic cost report</li>
              <li>Clear rules: wallet-gated actions, daily free quotas, and a fixed population cap</li>
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="glass-inset p-3 rounded-xl text-center">
            <h3 className="text-cyan font-bold mb-2">Jump In</h3>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={() => onOpenChange(false)}
                variant="pixel"
                size="sm"
              >
                Open Observatory
              </Button>
              <Button
                onClick={() => window.open(TOKEN_LINKS.DEXSCREENER || TOKEN_LINKS.PUMP_FUN, '_blank')}
                variant="pixel"
                size="sm"
              >
                Buy $THRONG
              </Button>
            </div>
          </div>

          <div className="glass-inset p-2 rounded-lg text-[9px] text-muted-foreground text-center">
            Experimental art project. Cartoon violence only. Not investment advice.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
