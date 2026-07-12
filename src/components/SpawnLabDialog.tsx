import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SPAWN_COST } from "@/lib/constants";

import normalSprite from '@/assets/throngling-right.png';
import adolfSprite from '@/assets/adolf-right.png';
import dogeSprite from '@/assets/doge-right.png';
import georgeSprite from '@/assets/george-right.png';
import epsteinSprite from '@/assets/epstein-right.png';
import pepeSprite from '@/assets/pepe-right.png';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpawn: (name: string, characterType: string, x?: number, y?: number) => void;
}

const THRONGLING_NAMES = [
  'Thrum', 'Pibble', 'Quark', 'Lumo', 'Nixie', 'Bix', 'Pippa', 'Nova',
  'Pixel', 'Kiko', 'Momo', 'Zazu', 'Tiko', 'Fizz', 'Bloop', 'Wisp',
  'Tinker', 'Zephyr', 'Pogo', 'Mellow', 'Jinx', 'Rolo', 'Tofu', 'Ziggy',
  'Koda', 'Nori', 'Boppo', 'Pika', 'Sprocket', 'Glimmer', 'Sudo', 'Taffy',
  'Miso', 'Orbit', 'Pebble', 'Waffle', 'Mango', 'Squeak', 'Rumi', 'Cosmo',
  'Fenn', 'Kiki', 'Voxel', 'Tiki', 'Echo', 'Nimbus', 'Puddle', 'Mochi',
  'Sprout', 'Astro', 'Lolly', 'Nugg', 'Doodle', 'Razzle', 'Quibble', 'Neko',
  'Lumen', 'Riff', 'Blip', 'Zing', 'Pippin', 'Noodle', 'Pudding', 'Zebo',
  'Quip', 'Sizzle', 'Nubbins', 'Orbitz', 'Frito', 'Chonk', 'Zuzu', 'Pippy',
  'Kubo', 'Bixby', 'Gigi', 'Toto', 'Fable', 'Yuzu', 'Droplet', 'Kumo',
  'Wobble', 'Dax', 'Zori', 'Tumble', 'Latch', 'Piko', 'Nix', 'Quill',
  'Sprig', 'Mallow', 'Ravi', 'Plink', 'Jello', 'Bristle', 'Nudge', 'Koru',
  'Tink', 'Gloop', 'Minty', 'Zippa'
];

const CHARACTER_TYPES = [
  { id: 'normal', name: 'Normal Thronglet', image: normalSprite },
  { id: 'adolf', name: 'Adolf', image: adolfSprite },
  { id: 'doge', name: 'Doge', image: dogeSprite },
  { id: 'george', name: 'George Droyd', image: georgeSprite },
  { id: 'epstein', name: 'Jeffrey', image: epsteinSprite },
  { id: 'pepe', name: 'Pepe', image: pepeSprite },
];

export const SpawnLabDialog = ({ open, onOpenChange, onSpawn }: Props) => {
  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [characterType, setCharacterType] = useState('normal');

  const handleSpawn = () => {
    // Generate random name if not provided
    const finalName = name.trim() || 
      (characterType === 'normal' 
        ? THRONGLING_NAMES[Math.floor(Math.random() * THRONGLING_NAMES.length)]
        : CHARACTER_TYPES.find(char => char.id === characterType)?.name || 'Thronglet'
      );
    
    // Validate name format only if user provided one
    if (name.trim()) {
      if (name.length < 2 || name.length > 16) {
        toast({
          title: "Invalid Name",
          description: "Name must be 2-16 characters",
          variant: "destructive",
        });
        return;
      }
      
      if (!/^[a-zA-Z0-9 ._-]+$/.test(name)) {
        toast({
          title: "Invalid Name",
          description: "Name can only contain letters, numbers, spaces, dots, dashes, and underscores",
          variant: "destructive",
        });
        return;
      }
    }

    if (!publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to spawn",
        variant: "destructive",
      });
      return;
    }

    // Trigger spawn location selection mode
    onSpawn(finalName, characterType);
    onOpenChange(false);
    setName('');
    setCharacterType('normal');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-w-md !bg-[rgba(10,20,18,0.95)]">
        <DialogHeader>
          <DialogTitle className="pixel-heading text-cyan">Spawn Lab</DialogTitle>
        </DialogHeader>
        
        {!connected ? (
          <div className="text-[10px] text-muted-foreground text-center py-8">
            Connect your wallet to spawn Thronglets
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] text-cyan">Name (optional)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 glass-inset text-primary-foreground font-pixel text-[10px]"
                placeholder="Leave empty for random name"
                maxLength={16}
              />
              <div className="text-[9px] text-muted-foreground mt-1">
                Letters, numbers, spaces, dots, dashes, underscores
              </div>
            </div>

            <div>
              <Label className="text-[10px] text-cyan">Character Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {CHARACTER_TYPES.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => setCharacterType(char.id)}
                    className={`glass-button p-3 flex flex-col items-center gap-1.5 ${
                      characterType === char.id ? '!border-cyan scale-105' : ''
                    } transition-all hover:scale-105`}
                  >
                    <img src={char.image} alt={char.name} className="w-12 h-12 object-contain pixelated" />
                    <span className="text-[8px] font-pixel text-center">{char.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-inset p-3 rounded-xl">
              <div className="text-[10px] text-muted-foreground mb-3">
                5 free spawns per day. Additional spawns cost {SPAWN_COST.toLocaleString()} $THRONG each.
              </div>
              
              <Button
                onClick={handleSpawn}
                className="w-full glass-button !bg-pink/80 hover:!bg-pink text-black font-bold"
              >
                Spawn Thronglet
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
