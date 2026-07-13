import { useEffect, useRef, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Throngling, Camera, GameEvent, WeaponEffect, DeathAnimation, Particle, ScreenShake } from '@/types/game';
import { MAP_SIZE, SPAWN_AREA, SPAWN_AREA_SECOND, ISLAND_POSITIONS, HALLOWEEN_ISLAND_WIDTH, THRONGLING_SPEED, WEAPON_CONFIG, DEATH_ANIMATION_DURATION, BLOOD_SPLASH_DURATION, MAX_POPULATION, THRONG_NAMES } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getOwnershipProof } from '@/lib/ownershipProof';
import { useAudio } from '@/contexts/AudioContext';
import mapImage from '@/assets/floating_map.png';
import mapMask from '@/assets/floating_map_mask.png';
import halloweenMapImage from '@/assets/halloween_map.png';
import halloweenMapMask from '@/assets/halloween_map_mask.png';
import thronglingAlive from '@/assets/throngling.png';
import thronglingLeft from '@/assets/throngling-left.png';
import thronglingRight from '@/assets/throngling-right.png';
import thronglingUp from '@/assets/throngling-up.png';
import thronglingDead from '@/assets/dead-throngling.png';
import bloodSplash from '@/assets/bloodsplash.png';
import lightningImg from '@/assets/lightning.png';
import meteorImg from '@/assets/meteor.png';
import tornadoImg from '@/assets/tornado.png';
import fireImg from '@/assets/fire.png';
// Character sprites
import adolfRight from '@/assets/adolf-right.png';
import adolfLeft from '@/assets/adolf-left.png';
import adolfUp from '@/assets/adolf-up.png';
import dogeRight from '@/assets/doge-right.png';
import georgeRight from '@/assets/george-right.png';
import epsteinRight from '@/assets/epstein-right.png';
import epsteinLeft from '@/assets/epstein-left.png';
import epsteinUp from '@/assets/epstein-up.png';
import pepeRight from '@/assets/pepe-right.png';
import pepeLeft from '@/assets/pepe-left.png';
import pepeUp from '@/assets/pepe-up.png';
import dogeLeft from '@/assets/doge-left.png';
import dogeUp from '@/assets/doge-up.png';
import georgeLeft from '@/assets/george-left.png';
import georgeUp from '@/assets/george-up.png';

interface Props {
  onEventCreate: (event: Omit<GameEvent, 'id' | 'timestamp'>) => void;
  selectedTool: string | null;
  onToolUsed: () => void;
  onCountChange: (count: number) => void;
  isSelectingSpawnLocation: boolean;
  onSpawnLocationSelected: (x: number, y: number) => void;
  onCancelSpawnSelection: () => void;
  onThrongClick?: (throng: { id: string; name: string }) => void;
}

export const GameCanvas = ({ onEventCreate, selectedTool, onToolUsed, onCountChange, isSelectingSpawnLocation, onSpawnLocationSelected, onCancelSpawnSelection, onThrongClick }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { playSound } = useAudio();
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const { connection } = useConnection();
  const [thronglings, setThronglings] = useState<Throngling[]>([]);
  const [weaponEffects, setWeaponEffects] = useState<WeaponEffect[]>([]);
  const [deathAnimations, setDeathAnimations] = useState<DeathAnimation[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [screenShake, setScreenShake] = useState<ScreenShake | null>(null);
  const [camera, setCamera] = useState<Camera>({
    x: 0,
    y: 0,
    zoom: 1,
    targetX: 0,
    targetY: 0,
    velocityX: 0,
    velocityY: 0,
  });
  const cameraRef = useRef(camera);
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const pointerDownPos = useRef({ x: 0, y: 0 });

  // Sync camera ref whenever camera state changes
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  // Load images including mask
  useEffect(() => {
    const loadImage = (src: string, key: string) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImages(prev => ({ ...prev, [key]: img }));
      };
    };

    loadImage(mapImage, 'map');
    loadImage(mapMask, 'mask');
    loadImage(halloweenMapImage, 'halloweenMap');
    loadImage(halloweenMapMask, 'halloweenMask');
    loadImage(thronglingAlive, 'alive');
    loadImage(thronglingLeft, 'left');
    loadImage(thronglingRight, 'right');
    loadImage(thronglingUp, 'up');
    loadImage(thronglingDead, 'dead');
    loadImage(bloodSplash, 'blood');
    loadImage(lightningImg, 'lightning');
    loadImage(meteorImg, 'rock');
    loadImage(tornadoImg, 'tornado');
    loadImage(fireImg, 'fire');
    loadImage('/src/assets/festival.png', 'festival');
    // Load character sprites
    loadImage(thronglingRight, 'normal-right');
    loadImage(thronglingLeft, 'normal-left');
    loadImage(thronglingUp, 'normal-up');
    loadImage(adolfRight, 'adolf-right');
    loadImage(adolfLeft, 'adolf-left');
    loadImage(adolfUp, 'adolf-up');
    loadImage(dogeRight, 'doge-right');
    loadImage(dogeLeft, 'doge-left');
    loadImage(dogeUp, 'doge-up');
    loadImage(georgeRight, 'george-right');
    loadImage(georgeLeft, 'george-left');
    loadImage(georgeUp, 'george-up');
    loadImage(epsteinRight, 'epstein-right');
    loadImage(epsteinLeft, 'epstein-left');
    loadImage(epsteinUp, 'epstein-up');
    loadImage(pepeRight, 'pepe-right');
    loadImage(pepeLeft, 'pepe-left');
    loadImage(pepeUp, 'pepe-up');
  }, []);

  // Create mask canvas when both masks are loaded
  useEffect(() => {
    if (images.mask && images.halloweenMask && !maskCanvasRef.current) {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = MAP_SIZE;
      maskCanvas.height = 768;
      const ctx = maskCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(images.mask, 0, 0, 768, 768);
        ctx.drawImage(images.halloweenMask, ISLAND_POSITIONS.second.x, 0, HALLOWEEN_ISLAND_WIDTH, 768);
        maskCanvasRef.current = maskCanvas;
        console.log('✅ Mask canvas created successfully');
      }
    }
  }, [images.mask, images.halloweenMask]);

  // Initialize thronglings from database
  useEffect(() => {
    const initThronglings = async () => {
      // Wait for mask to load
      if (!maskCanvasRef.current) {
        setTimeout(initThronglings, 100);
        return;
      }

      // Fetch existing thronglings from database (only alive ones)
      const { data: existing, error } = await supabase
        .from('thronglings')
        .select('*')
        .eq('is_alive', true);

      if (error) {
        console.error('Error fetching thronglings:', error);
        return;
      }

      if (existing && existing.length > 0) {
        console.log('Loaded thronglings from DB:', existing.length);
        // Load existing thronglings
        const loadedThronglings: Throngling[] = existing.map(t => ({
          id: t.id,
          x: t.x,
          y: t.y,
          vx: t.vx,
          vy: t.vy,
          state: t.state as Throngling['state'],
          isAlive: t.is_alive,
          isDragging: false,
          bodyColor: t.body_color,
          accentColor: t.accent_color,
          name: t.name || undefined,
          direction: 'right',
          characterType: (t.character_type as Throngling['characterType']) || 'normal',
        }));
        setThronglings(loadedThronglings);
      } else {
        // Empty island. We deliberately do NOT seed from the client anymore:
        // anon writes to thronglings are blocked by RLS (all spawns must go
        // through the wallet-gated spawn-throng function), and client-only
        // seeds would be phantom throngs that don't persist or sync. The world
        // is whatever real, wallet-backed spawns have created.
        console.log('No thronglings yet — waiting for the first wallet-backed spawn.');
        setThronglings([]);
      }
    };

    initThronglings();
  }, []);

  // Update count whenever thronglings change
  useEffect(() => {
    const aliveCount = thronglings.filter(t => t.isAlive).length;
    onCountChange(aliveCount);
  }, [thronglings, onCountChange]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key.toLowerCase())) {
        keysPressed.current.add(e.key.toLowerCase());
      }
      
      // Hotbar shortcuts (1-6)
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const toolIndex = parseInt(e.key) - 1;
        const tool = ['rock', 'lightning', 'tornado', 'fire', 'snack', 'festival'][toolIndex];
        if (tool) {
          window.dispatchEvent(new CustomEvent('selectTool', { detail: { toolId: tool } }));
        }
      }
      
      // Escape to cancel tool selection or spawn location selection
      if (e.key === 'Escape') {
        if (selectedTool) {
          onToolUsed();
        } else if (isSelectingSpawnLocation) {
          onCancelSpawnSelection();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedTool, onToolUsed, isSelectingSpawnLocation, onCancelSpawnSelection]);

  // Realtime subscription for database changes
  useEffect(() => {
    const channel = supabase
      .channel('thronglings-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'thronglings'
        },
        (payload) => {
          const newData = payload.new as any;
          const newThrongling: Throngling = {
            id: newData.id,
            x: newData.x,
            y: newData.y,
            vx: newData.vx,
            vy: newData.vy,
            state: newData.state,
            isAlive: newData.is_alive,
            isDragging: false,
            bodyColor: newData.body_color,
            accentColor: newData.accent_color,
            name: newData.name || undefined,
            direction: 'right',
            characterType: newData.character_type || 'normal',
          };
          
          setThronglings(prev => {
            // Check if already exists
            if (prev.find(t => t.id === newThrongling.id)) return prev;
            return [...prev, newThrongling];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'thronglings'
        },
        (payload) => {
          const updatedData = payload.new as any;
          setThronglings(prev => {
            // If throngling is now dead, remove it from state entirely
            if (!updatedData.is_alive) {
              return prev.filter(t => t.id !== updatedData.id);
            }
            // Otherwise update its properties
            return prev.map(t => {
              if (t.id === updatedData.id) {
                return {
                  ...t,
                  x: updatedData.x,
                  y: updatedData.y,
                  vx: updatedData.vx,
                  vy: updatedData.vy,
                  state: updatedData.state,
                  isAlive: updatedData.is_alive,
                  bodyColor: updatedData.body_color,
                  accentColor: updatedData.accent_color,
                  name: updatedData.name || undefined,
                };
              }
              return t;
            });
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'thronglings'
        },
        (payload) => {
          const oldData = payload.old as any;
          setThronglings(prev => prev.filter(t => t.id !== oldData.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper function to determine direction based on velocity - simplified with clear thresholds
  const getThronglingDirection = (vx: number, vy: number): 'left' | 'right' | 'up' => {
    const MIN_VELOCITY = 0.8;
    
    const absVx = Math.abs(vx);
    const absVy = Math.abs(vy);
    
    // Standing/idle - always show right sprite
    if (absVx < MIN_VELOCITY && absVy < MIN_VELOCITY) {
      return 'right';
    }
    
    // Moving down - always show right sprite
    if (vy > 0 && absVy > absVx) {
      return 'right';
    }
    
    // Clearly moving up (vertical dominates by 1.5x)
    if (vy < 0 && absVy > absVx * 1.5) {
      return 'up';
    }
    
    // Horizontal movement or ambiguous - use horizontal direction
    return vx >= 0 ? 'right' : 'left';
  };

  // Fly to location handler
  useEffect(() => {
    const handleFlyTo = (e: CustomEvent) => {
      const { x, y } = e.detail;
      console.log('[GameCanvas] Flying to location:', x, y);
      setCamera(prev => ({
        ...prev,
        x: x - window.innerWidth / 2 / prev.zoom,
        y: y - window.innerHeight / 2 / prev.zoom,
      }));
    };

    window.addEventListener('flyToLocation', handleFlyTo as EventListener);
    return () => window.removeEventListener('flyToLocation', handleFlyTo as EventListener);
  }, []);

  // Spawn Throngling handler
  useEffect(() => {
    const handleSpawnThrongling = async (e: CustomEvent) => {
      const { name, characterType, x, y } = e.detail;

      // Wallet is REQUIRED. Every spawn goes through the spawn-throng edge
      // function, which enforces the free tier (5/wallet) + SOL payment and
      // INSERTS into the shared thronglings table — so it persists across
      // refresh and appears live for every other player via realtime.
      if (!publicKey) {
        toast({ title: "Connect your wallet", description: "You need a wallet to spawn throngs.", variant: "destructive" });
        return;
      }
      const walletAddr = publicKey.toString();
      let proof;
      try {
        proof = await getOwnershipProof(wallet);
      } catch {
        toast({ title: "Wallet proof needed", description: "Sign the one-time ownership message to play.", variant: "destructive" });
        return;
      }
      const doSpawn = () => supabase.functions.invoke('spawn-throng', {
        body: { ...proof, name, characterType, x, y },
      });

      try {
        let { data, error } = await doSpawn();
        const d = data as any;

        // Free spawns used up -> collect 0.001 SOL, verify on-chain, then retry.
        if (d?.error === 'payment_required') {
          toast({ title: "5 free spawns used", description: `Approve ${d.price_sol} SOL to spawn another.` });
          try {
            const lamports = Math.round(d.price_sol * LAMPORTS_PER_SOL);
            const tx = new Transaction().add(SystemProgram.transfer({
              fromPubkey: publicKey, toPubkey: new PublicKey(d.treasury), lamports,
            }));
            tx.feePayer = publicKey;
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            const sig = await sendTransaction(tx, connection);
            await connection.confirmTransaction(sig, 'confirmed');
            const v = await supabase.functions.invoke('verify-payment', { body: { txSig: sig, wallet: walletAddr, kind: 'spawn' } });
            if (!(v.data as any)?.success) {
              toast({ title: "Payment not verified", description: "Give it a second and try again.", variant: "destructive" });
              return;
            }
          } catch {
            toast({ title: "Payment cancelled", variant: "destructive" });
            return;
          }
          ({ data, error } = await doSpawn());
        }

        const r = data as any;
        if (error || r?.error) {
          const msg = r?.message || r?.error || 'Spawn failed';
          toast({ title: "Spawn Failed", description: String(msg), variant: "destructive" });
          return;
        }
        // Success — the new throng arrives for everyone (including us) via the
        // realtime subscription, so we don't touch local state here.
        toast({ title: "Thronglet Spawned!", description: `${r.throngling?.name || 'A new throng'} joined the island.` });
      } catch (err) {
        toast({ title: "Spawn Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
      }
    };

    window.addEventListener('spawnThrongling', handleSpawnThrongling as EventListener);
    return () => window.removeEventListener('spawnThrongling', handleSpawnThrongling as EventListener);
  }, [publicKey, sendTransaction, connection]);

  // Helper function to create particles
  const createParticles = (type: string, x: number, y: number, count: number) => {
    const newParticles: Particle[] = [];
    
    switch (type) {
      case 'rock_dust': // Rock impact dust
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          newParticles.push({
            id: `particle-${Date.now()}-${i}`,
            x,
            y,
            vx: Math.cos(angle) * (50 + Math.random() * 30),
            vy: Math.sin(angle) * (50 + Math.random() * 30),
            size: 3 + Math.random() * 3,
            color: `hsl(30, ${20 + Math.random() * 20}%, ${40 + Math.random() * 20}%)`,
            life: 1,
            decay: 0.02,
            type: 'dust',
          });
        }
        break;
        
      case 'lightning_spark': // Electric sparks
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 80 + Math.random() * 60;
          newParticles.push({
            id: `particle-${Date.now()}-${i}`,
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 2,
            color: Math.random() > 0.5 ? '#00D9FF' : '#FFFFFF',
            life: 1,
            decay: 0.03,
            type: 'spark',
          });
        }
        break;
        
      case 'tornado_debris': // Tornado debris
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          const orbitRadius = 30 + Math.random() * 15;
          newParticles.push({
            id: `particle-${Date.now()}-${i}`,
            x: x + Math.cos(angle) * orbitRadius,
            y: y + Math.sin(angle) * orbitRadius,
            vx: 0,
            vy: 0,
            size: 4 + Math.random() * 4,
            color: `hsl(${Math.random() * 60 + 20}, 30%, 40%)`,
            life: 1,
            decay: 0.005,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            type: 'debris',
          });
        }
        break;
        
      case 'fire_ember': // Fire embers
        for (let i = 0; i < count; i++) {
          newParticles.push({
            id: `particle-${Date.now()}-${i}`,
            x: x + (Math.random() - 0.5) * 20,
            y,
            vx: (Math.random() - 0.5) * 10,
            vy: -30 - Math.random() * 30,
            size: 2 + Math.random() * 3,
            color: Math.random() > 0.5 ? '#FF6B00' : '#FFD700',
            life: 1,
            decay: 0.015,
            type: 'ember',
          });
        }
        break;
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Helper function to check if position is walkable
  const isWalkable = (x: number, y: number): boolean => {
    if (!maskCanvasRef.current) return true; // No mask loaded yet, allow movement
    
    // Check bounds
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
    
    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return true;
    
    try {
      // Get pixel data at position
      const pixelData = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
      
      // Check if pixel is white (walkable) - white pixels have high RGB values
      const isWhite = pixelData[0] > 128;
      return isWhite;
    } catch (e) {
      return true; // If error reading pixel, allow movement
    }
  };

  // Helper function to get random walkable position
  const getRandomWalkablePosition = (): { x: number; y: number } => {
    const maxAttempts = 100;
    
    // Randomly choose which island to spawn on (50/50 chance)
    const useSecondIsland = Math.random() > 0.5;
    const spawnArea = useSecondIsland ? SPAWN_AREA_SECOND : SPAWN_AREA;
    
    for (let i = 0; i < maxAttempts; i++) {
      const x = spawnArea.x + Math.random() * spawnArea.w;
      const y = spawnArea.y + Math.random() * spawnArea.h;
      
      if (isWalkable(x, y)) {
        return { x, y };
      }
    }
    
    // Fallback to center of chosen spawn area
    return {
      x: spawnArea.x + spawnArea.w / 2,
      y: spawnArea.y + spawnArea.h / 2,
    };
  };

  // Helper function to trigger screen shake
  const triggerScreenShake = (intensity: number, duration: number) => {
    setScreenShake({
      intensity,
      duration,
      startTime: Date.now(),
    });
  };

  // Mouse controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
      if (e.button === 0 && !selectedTool && !isSelectingSpawnLocation) {
        isPanning.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning.current) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        
        setCamera(prev => ({
          ...prev,
          x: prev.x - dx / prev.zoom,
          y: prev.y - dy / prev.zoom,
        }));

        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isPanning.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      setCamera(prev => ({
        ...prev,
        zoom: Math.max(0.5, Math.min(2, prev.zoom + delta)),
      }));
    };

    const handleClick = async (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) / camera.zoom + camera.x;
      const worldY = (e.clientY - rect.top) / camera.zoom + camera.y;

      // Click a throng (no tool, not placing a spawn, and it was a click not a pan) -> chat with it
      if (!isSelectingSpawnLocation && !selectedTool && onThrongClick) {
        const cam = cameraRef.current;
        const wX = (e.clientX - rect.left) / cam.zoom + cam.x;
        const wY = (e.clientY - rect.top) / cam.zoom + cam.y;
        const moved = Math.hypot(e.clientX - pointerDownPos.current.x, e.clientY - pointerDownPos.current.y);
        if (moved < 6) {
          let hitT: Throngling | null = null;
          for (const t of thronglings) {
            if (t.isAlive && Math.hypot(t.x - wX, t.y - wY) < 40) { hitT = t; break; }
          }
          if (hitT) { onThrongClick({ id: hitT.id, name: hitT.name || 'a throng' }); return; }
        }
      }

      // Handle spawn location selection
      if (isSelectingSpawnLocation) {
        if (!isWalkable(worldX, worldY)) {
          toast({
            title: "Invalid Location",
            description: "Please click on a walkable grass area",
            variant: "destructive"
          });
          return;
        }
        
        onSpawnLocationSelected(worldX, worldY);
        return;
      }

      // Handle tool usage
      if (selectedTool) {
        const x = worldX;
        const y = worldY;

        if (!publicKey) {
          toast({
            title: "Wallet Not Connected",
            description: "Please connect your wallet to use tools",
            variant: "destructive",
          });
          onToolUsed();
          return;
        }

        // Call edge function to validate tool use
        try {
          // Gate the tool: 1 free per wallet, then 0.002 SOL. The use-tool edge
          // function counts per-wallet uses server-side; verify-payment confirms
          // the on-chain SOL before a paid use is granted.
          const toolWallet = publicKey.toString();
          let toolProof;
          try {
            toolProof = await getOwnershipProof(wallet);
          } catch {
            toast({ title: "Wallet proof needed", description: "Sign the one-time ownership message to use tools.", variant: "destructive" });
            onToolUsed();
            return;
          }
          const callUseTool = () => supabase.functions.invoke('use-tool', {
            body: { ...toolProof, toolId: selectedTool },
          });
          let { data, error } = await callUseTool();
          let td = data as any;

          if (td?.error === 'payment_required') {
            toast({ title: "1 free tool used", description: `Approve ${td.price_sol} SOL to use a tool.` });
            try {
              const lamports = Math.round(td.price_sol * LAMPORTS_PER_SOL);
              const tx = new Transaction().add(SystemProgram.transfer({
                fromPubkey: publicKey, toPubkey: new PublicKey(td.treasury), lamports,
              }));
              tx.feePayer = publicKey;
              tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
              const sig = await sendTransaction(tx, connection);
              await connection.confirmTransaction(sig, 'confirmed');
              const v = await supabase.functions.invoke('verify-payment', { body: { txSig: sig, wallet: toolWallet, kind: 'tool' } });
              if (!(v.data as any)?.success) {
                toast({ title: "Payment not verified", description: "Give it a second and try again.", variant: "destructive" });
                onToolUsed();
                return;
              }
            } catch {
              toast({ title: "Payment cancelled", variant: "destructive" });
              onToolUsed();
              return;
            }
            ({ data, error } = await callUseTool());
            td = data as any;
          }

          // Any other error -> silently stop (never apply the effect unpaid)
          if (error || td?.error) {
            console.log('Tool use failed (silent):', error || td);
            onToolUsed();
            return;
          }

          // Tool use validated - proceed with applying effects
          
          // Handle snack (coming soon)
          if (selectedTool === 'snack') {
            toast({
              title: "Coming Soon!",
              description: "Snack Rain will be available soon.",
            });
            onToolUsed();
            return;
          }

          // Handle festival
          if (selectedTool === 'festival') {
            const config = WEAPON_CONFIG.festival;
            
            // Create festival effect
            const festivalEffect: WeaponEffect = {
              id: `festival-${Date.now()}`,
              type: 'festival',
              x,
              y,
              startTime: Date.now(),
              duration: config.duration,
              radius: config.radius,
            };
            
            setWeaponEffects(prev => [...prev, festivalEffect]);
            
            // Find thronglings in festival area
            const hitThronglings = thronglings.filter(t => {
              if (!t.isAlive) return false;
              const dx = t.x - x;
              const dy = t.y - y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance <= config.radius;
            });
            
            // Mark them with festival buff
            const now = Date.now();
            setThronglings(prev => prev.map(t => {
              if (hitThronglings.find(ht => ht.id === t.id)) {
                return {
                  ...t,
                  festivalBuff: true,
                  festivalBuffStartTime: now,
                };
              }
              return t;
            }));
            
            // Duplicate thronglings
            if (hitThronglings.length > 0) {
              const aliveThrongs = thronglings.filter(t => t.isAlive).length;
              const maxDuplicates = Math.min(hitThronglings.length, MAX_POPULATION - aliveThrongs);
              
              if (maxDuplicates > 0) {
                const duplicates = hitThronglings.slice(0, maxDuplicates).map(t => ({
                  id: `${t.id}-dup-${Date.now()}-${Math.random()}`,
                  x: t.x + (Math.random() - 0.5) * 40,
                  y: t.y + (Math.random() - 0.5) * 40,
                  vx: (Math.random() - 0.5) * THRONGLING_SPEED,
                  vy: (Math.random() - 0.5) * THRONGLING_SPEED,
                  state: t.state,
                  is_alive: true,
                  body_color: t.bodyColor,
                  accent_color: t.accentColor,
                  name: t.name,
                }));
                
                // Spawn duplicates via edge function
                console.log('Spawning festival thronglings:', { count: duplicates.length, duplicates });
                supabase.functions.invoke('spawn-festival-thronglings', {
                  body: {
                    walletAddress: publicKey.toString(),
                    message: signedMessage.message,
                    signature: signedMessage.signature,
                    timestamp: signedMessage.timestamp,
                    thronglings: duplicates
                  }
                }).then(({ data, error }) => {
                  if (error) {
                    console.error('Error spawning festival thronglings:', error);
                    console.error('Request payload:', { thronglings: duplicates });
                    toast({
                      title: "Festival Duplication Failed",
                      description: `Could not duplicate Thronglings: ${error.message}`,
                      variant: "destructive",
                    });
                  } else if (data?.thronglings) {
                    console.log('Successfully spawned festival thronglings:', data);
                    // Add to local state
                    const newThronglings = data.thronglings.map((t: any) => ({
                      id: t.id,
                      x: t.x,
                      y: t.y,
                      vx: t.vx,
                      vy: t.vy,
                      state: t.state,
                      isAlive: t.is_alive,
                      isDragging: false,
                      bodyColor: t.body_color,
                      accentColor: t.accent_color,
                      name: t.name,
                      festivalBuff: true,
                      festivalBuffStartTime: now,
                      direction: 'right',
                    }));
                    
                    setThronglings(prev => [...prev, ...newThronglings]);
                    playSound('split');
                    toast({
                      title: "Festival Success! 🎉",
                      description: `${newThronglings.length} Thronglings duplicated!`,
                    });
                  }
                });
                
                // Create confetti particles
                const confettiColors = ['#FF6B9D', '#C44569', '#FFA07A', '#98D8C8', '#6C5CE7', '#FD79A8'];
                const confetti = Array.from({ length: 40 }, () => ({
                  id: `confetti-${Math.random()}`,
                  x: x + (Math.random() - 0.5) * config.radius * 2,
                  y: y + (Math.random() - 0.5) * config.radius * 2,
                  vx: (Math.random() - 0.5) * 60,
                  vy: (Math.random() - 0.5) * 60 - 30,
                  size: 4 + Math.random() * 4,
                  color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                  life: 1,
                  decay: 0.02,
                  rotation: Math.random() * Math.PI * 2,
                  rotationSpeed: (Math.random() - 0.5) * 0.3,
                  type: 'confetti',
                }));
                
                setParticles(prev => [...prev, ...confetti]);
                
                // Trigger screen shake
                triggerScreenShake(5, 300);
                
                // Create event
                onEventCreate({
                  type: 'festival',
                  x,
                  y,
                  description: `Festival! ${maxDuplicates} Thronglings multiplied!`,
                });
                
                toast({
                  title: "🎉 Festival!",
                  description: `${maxDuplicates} Thronglings multiplied!`,
                });
              } else {
                toast({
                  title: "Population Limit!",
                  description: `Can't multiply - population at maximum (${MAX_POPULATION})`,
                  variant: "destructive",
                });
              }
            }
            
            onToolUsed();
            return;
          }
          
          // Handle lethal weapons
          if (selectedTool === 'rock' || selectedTool === 'lightning' || selectedTool === 'tornado' || selectedTool === 'fire') {
            const weaponType = selectedTool as 'rock' | 'lightning' | 'tornado' | 'fire';
            const config = WEAPON_CONFIG[weaponType];
            
            // Create weapon effect
            const weaponEffect: WeaponEffect = {
              id: `weapon-${Date.now()}`,
            type: weaponType,
            x,
            y,
            startTime: Date.now(),
            duration: config.duration,
            radius: config.radius,
          };
          
          setWeaponEffects(prev => [...prev, weaponEffect]);
          
          // Rock weapon - delay hit detection until impact (400ms fall animation)
          if (weaponType === 'rock') {
            setTimeout(() => {
              // Create dust particles on impact
              createParticles('rock_dust', x, y, 6);
              
              // Check for hits after rock has landed
              const hitThronglings: Throngling[] = [];
              thronglings.forEach(t => {
                if (!t.isAlive) return;
                
                const dx = t.x - x;
                const dy = t.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= config.radius) {
                  hitThronglings.push(t);
                }
              });
              
              // Kill hit thronglings and create death animations
              if (hitThronglings.length > 0) {
                // Optimistic update: immediately mark as dead locally
                setThronglings(prev => prev.map(t => 
                  hitThronglings.find(ht => ht.id === t.id) 
                    ? { ...t, isAlive: false } 
                    : t
                ));
                
                // Update database via edge function (using service role)
                // Realtime listener will confirm when database completes the kill
                const thronglingIds = hitThronglings.map(t => t.id);
                console.log('🔪 Calling kill-throngling edge function with IDs:', thronglingIds);
                supabase.functions.invoke('kill-throngling', {
                  body: { thronglingIds }
                }).then(({ data, error }) => {
                  if (error) {
                    console.error('❌ Error killing thronglings:', error);
                  } else {
                    console.log('✅ Kill thronglings response:', data);
                  }
                });
                
                // Create death animations
                const newDeathAnims = hitThronglings.map(t => ({
                  id: `death-${t.id}-${Date.now()}`,
                  thronglingId: t.id,
                  x: t.x,
                  y: t.y,
                  startTime: Date.now(),
                }));
                
                setDeathAnimations(prev => [...prev, ...newDeathAnims]);
                triggerScreenShake(5, 200);
                
                // Create death events
                hitThronglings.forEach(t => {
                  onEventCreate({
                    type: 'death',
                    x: t.x,
                    y: t.y,
                    description: `${t.name || 'Thronglet'} was killed by ${weaponType}`,
                    thronglingName: t.name,
                  });
                });
              }
            }, 400); // Match the fall animation duration
          } else {
            // Other weapons - instant hit detection
            if (weaponType === 'lightning') {
              createParticles('lightning_spark', x, y, 8);
            } else if (weaponType === 'tornado') {
              createParticles('tornado_debris', x, y, 12);
            } else if (weaponType === 'fire') {
              // Fire embers spawn continuously in the render loop
            }
            
            // Check for hits immediately
            const hitThronglings: Throngling[] = [];
            thronglings.forEach(t => {
              if (!t.isAlive) return;
              
              const dx = t.x - x;
              const dy = t.y - y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance <= config.radius) {
                hitThronglings.push(t);
              }
            });
            
            // Kill hit thronglings and create death animations
            if (hitThronglings.length > 0) {
              // Optimistic update: immediately mark as dead locally
              setThronglings(prev => prev.map(t => 
                hitThronglings.find(ht => ht.id === t.id) 
                  ? { ...t, isAlive: false } 
                  : t
              ));
              
              // Update database via edge function (using service role)
              // Realtime listener will confirm when database completes the kill
              const thronglingIds = hitThronglings.map(t => t.id);
              console.log('🔪 Calling kill-throngling edge function with IDs:', thronglingIds);
              supabase.functions.invoke('kill-throngling', {
                body: { thronglingIds }
              }).then(({ data, error }) => {
                if (error) {
                  console.error('❌ Error killing thronglings:', error);
                } else {
                  console.log('✅ Kill thronglings response:', data);
                }
              });
              
              // Create death animations
              const newDeathAnims = hitThronglings.map(t => ({
                id: `death-${t.id}-${Date.now()}`,
                thronglingId: t.id,
                x: t.x,
                y: t.y,
                startTime: Date.now(),
              }));
              
              setDeathAnimations(prev => [...prev, ...newDeathAnims]);
              
              // Trigger screen shake for multiple kills
              if (hitThronglings.length >= 3) {
                triggerScreenShake(5, 200);
              }
              
              // Create death events
              hitThronglings.forEach(t => {
                onEventCreate({
                  type: 'death',
                  x: t.x,
                  y: t.y,
                  description: `${t.name || 'Thronglet'} was killed by ${weaponType}`,
                  thronglingName: t.name,
                });
              });
            }
          }
          
          // Create weapon deployment event
          onEventCreate({
            type: selectedTool as any,
            x,
            y,
            description: `${selectedTool} deployed`,
          });
        }
        
        onToolUsed();
        
        } catch (err) {
          console.error('Tool use error:', err);
          toast({
            title: "Tool Use Failed",
            description: err instanceof Error ? err.message : "Unknown error occurred",
            variant: "destructive",
          });
          onToolUsed();
        }
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('click', handleClick);
    };
  }, [selectedTool, camera.zoom, onEventCreate, onToolUsed, thronglings, onThrongClick]);

  // Reset camera handler
  useEffect(() => {
    const handleReset = () => {
      // recenter on the first island (the home meadow)
      const cx = 384 - window.innerWidth / 2;
      const cy = 384 - window.innerHeight / 2;
      setCamera({
        x: cx,
        y: cy,
        zoom: 1,
        targetX: cx,
        targetY: cy,
        velocityX: 0,
        velocityY: 0,
      });
    };

    window.addEventListener('resetCamera', handleReset);
    return () => window.removeEventListener('resetCamera', handleReset);
  }, []);

  // Cleanup expired effects, animations, and particles
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Remove expired weapon effects
      setWeaponEffects(prev => 
        prev.filter(effect => now - effect.startTime < effect.duration)
      );
      
      // Remove expired death animations
      setDeathAnimations(prev => 
        prev.filter(anim => 
          now - anim.startTime < BLOOD_SPLASH_DURATION + DEATH_ANIMATION_DURATION
        )
      );
      
      // Remove dead Thronglings after animation completes
      setThronglings(prev => 
        prev.filter(t => {
          if (t.isAlive) return true;
          
          const deathAnim = deathAnimations.find(a => a.thronglingId === t.id);
          if (!deathAnim) return false;
          
          return now - deathAnim.startTime < BLOOD_SPLASH_DURATION + DEATH_ANIMATION_DURATION;
        })
      );
      
      // Remove dead particles
      setParticles(prev => prev.filter(p => p.life > 0));
      
      // Clear expired screen shake
      if (screenShake && now - screenShake.startTime >= screenShake.duration) {
        setScreenShake(null);
      }
      
      // Clear expired festival buffs (3-5 seconds after being applied)
      setThronglings(prev => prev.map(t => {
        if (t.festivalBuff && t.festivalBuffStartTime) {
          const buffDuration = 4000; // 4 seconds
          if (now - t.festivalBuffStartTime >= buffDuration) {
            const { festivalBuff, festivalBuffStartTime, ...rest } = t;
            return rest as Throngling;
          }
        }
        return t;
      }));
    }, 100);
    
    return () => clearInterval(interval);
  }, [deathAnimations, screenShake]);

  // Update particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => {
        let newX = p.x + p.vx * 0.016;
        let newY = p.y + p.vy * 0.016;
        
        // Apply gravity to embers and confetti
        if (p.type === 'ember') {
          p.vy -= 0.5; // Slight upward deceleration
        }
        if (p.type === 'confetti') {
          p.vy += 0.3; // Slight downward gravity
        }
        
        // Update rotation
        let newRotation = p.rotation;
        if (p.rotationSpeed !== undefined && p.rotation !== undefined) {
          newRotation = p.rotation + p.rotationSpeed;
        }
        
        // Tornado debris orbits
        if (p.type === 'debris') {
          const effect = weaponEffects.find(e => e.type === 'tornado');
          if (effect) {
            const elapsed = Date.now() - effect.startTime;
            const angle = (elapsed / 500) * Math.PI * 2; // Full rotation every 500ms
            const radius = 30 + Math.sin(elapsed / 200) * 10;
            newX = effect.x + Math.cos(angle + (p.rotation || 0)) * radius;
            newY = effect.y + Math.sin(angle + (p.rotation || 0)) * radius;
          }
        }
        
        return {
          ...p,
          x: newX,
          y: newY,
          life: Math.max(0, p.life - p.decay),
          rotation: newRotation,
        };
      }));
    }, 16);
    
    return () => clearInterval(interval);
  }, [weaponEffects]);

  // Spawn fire embers continuously
  useEffect(() => {
    const interval = setInterval(() => {
      weaponEffects.forEach(effect => {
        if (effect.type === 'fire') {
          const elapsed = Date.now() - effect.startTime;
          if (elapsed < effect.duration) {
            createParticles('fire_ember', effect.x, effect.y, 2);
          }
        }
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [weaponEffects]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !images.map) return;

    let animationFrameId: number;

    const render = () => {
      // Handle keyboard input
      const panSpeed = 5;
      let dx = 0;
      let dy = 0;

      if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dy -= panSpeed;
      if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dy += panSpeed;
      if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx -= panSpeed;
      if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx += panSpeed;

      if (dx !== 0 || dy !== 0) {
        setCamera(prev => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
        }));
      }

      // Get current camera from ref (always up-to-date)
      const currentCamera = cameraRef.current;
      
      // Calculate screen shake offset
      let shakeX = 0;
      let shakeY = 0;
      if (screenShake) {
        const elapsed = Date.now() - screenShake.startTime;
        const progress = elapsed / screenShake.duration;
        if (progress < 1) {
          const currentIntensity = screenShake.intensity * (1 - progress);
          shakeX = (Math.random() - 0.5) * currentIntensity * 2;
          shakeY = (Math.random() - 0.5) * currentIntensity * 2;
        }
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save context
      ctx.save();

      // Apply camera transform with shake
      ctx.translate(
        -currentCamera.x * currentCamera.zoom + shakeX, 
        -currentCamera.y * currentCamera.zoom + shakeY
      );
      ctx.scale(currentCamera.zoom, currentCamera.zoom);

      // Draw both islands
      ctx.drawImage(images.map, ISLAND_POSITIONS.first.x, ISLAND_POSITIONS.first.y, 768, 768);
      if (images.halloweenMap) {
        ctx.drawImage(images.halloweenMap, ISLAND_POSITIONS.second.x, ISLAND_POSITIONS.second.y, HALLOWEEN_ISLAND_WIDTH, 768);
      }

      // Draw bottom layer particles (dust, debris)
      particles.forEach(p => {
        if (p.type === 'dust' || p.type === 'debris') {
          ctx.save();
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          
          if (p.rotation !== undefined) {
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.restore();
        }
      });

      // Draw weapon effects with animations
      weaponEffects.forEach(effect => {
        const elapsed = Date.now() - effect.startTime;
        if (elapsed < effect.duration && images[effect.type]) {
          const img = images[effect.type];
          const progress = elapsed / effect.duration;
          
          ctx.save();
          
          // Weapon-specific animations
          if (effect.type === 'rock') {
            // Falling and rotating meteor
            const fallProgress = Math.min(1, elapsed / 400);
            const fallDistance = 200;
            const currentY = effect.y - fallDistance * (1 - fallProgress);
            
            // Impact burst scaling
            let scale = 1;
            if (elapsed > 400 && elapsed < 550) {
              const burstProgress = (elapsed - 400) / 150;
              scale = 1 + Math.sin(burstProgress * Math.PI) * 0.3;
            }
            
            ctx.globalAlpha = fallProgress;
            ctx.translate(effect.x, currentY);
            ctx.scale(scale, scale);
            ctx.drawImage(img, -effect.radius, -effect.radius, effect.radius * 2, effect.radius * 2);
          } else if (effect.type === 'lightning') {
            // Multi-phase lightning strike
            let alpha = 1;
            let scale = 1;
            
            if (elapsed < 100) {
              // Warning phase
              alpha = 0.3;
              scale = 0.3;
            } else if (elapsed < 300) {
              // Main bolt appears
              alpha = 1;
              scale = 1 + (300 - elapsed) / 300 * 0.2;
            } else if (elapsed < 600) {
              // Hold with flicker
              alpha = 0.7 + Math.random() * 0.3;
              scale = 1;
            } else {
              // Fade out with flicker
              alpha = Math.max(0, (1 - progress)) * (0.7 + Math.random() * 0.3);
            }
            
            // Glow pulse
            if (elapsed < 600) {
              ctx.shadowColor = '#FFFFFF';
              ctx.shadowBlur = 20 + Math.sin(elapsed / 50) * 10;
            }
            
            ctx.globalAlpha = alpha;
            ctx.translate(effect.x, effect.y);
            ctx.scale(scale, scale);
            ctx.drawImage(img, -effect.radius, -effect.radius, effect.radius * 2, effect.radius * 2);
          } else if (effect.type === 'tornado') {
            // Spinning vortex with scale pulse
            const rotation = (elapsed / 500) * Math.PI * 2; // Full rotation every 500ms
            const scalePulse = 0.95 + Math.sin(elapsed / 200) * 0.15;
            
            // Circular drift
            const driftRadius = 15;
            const driftAngle = (elapsed / 1000) * Math.PI * 2;
            const driftX = Math.cos(driftAngle) * driftRadius;
            const driftY = Math.sin(driftAngle) * driftRadius;
            
            ctx.globalAlpha = Math.max(0, 1 - progress);
            ctx.translate(effect.x + driftX, effect.y + driftY);
            ctx.rotate(rotation);
            ctx.scale(scalePulse, scalePulse);
            ctx.drawImage(img, -effect.radius, -effect.radius, effect.radius * 2, effect.radius * 2);
          } else if (effect.type === 'fire') {
            // Flickering flames with color shifts
            const scaleX = 0.95 + Math.random() * 0.2;
            const scaleY = 0.9 + Math.random() * 0.3;
            const alpha = 0.85 + Math.random() * 0.15;
            
            ctx.globalAlpha = alpha * Math.max(0, 1 - progress);
            ctx.translate(effect.x, effect.y);
            ctx.scale(scaleX, scaleY);
            
            // Color tint overlay
            const tintIndex = Math.floor(elapsed / 100) % 3;
            if (tintIndex === 1) {
              ctx.globalCompositeOperation = 'lighter';
            }
            
            ctx.drawImage(img, -effect.radius, -effect.radius, effect.radius * 2, effect.radius * 2);
          } else if (effect.type === 'festival') {
            // Festival fireworks with pulsing glow
            const scale = 0.9 + Math.sin(elapsed / 300) * 0.2;
            const rotation = (elapsed / 1000) * Math.PI * 2;
            
            // Rainbow glow effect
            const colors = ['#FF6B9D', '#C44569', '#FFA07A', '#98D8C8', '#6C5CE7', '#FD79A8'];
            const colorIndex = Math.floor((elapsed / 200) % colors.length);
            ctx.shadowColor = colors[colorIndex];
            ctx.shadowBlur = 30;
            
            ctx.globalAlpha = Math.max(0, 1 - progress * 0.8);
            ctx.translate(effect.x, effect.y);
            ctx.rotate(rotation);
            ctx.scale(scale, scale);
            ctx.drawImage(img, -effect.radius, -effect.radius, effect.radius * 2, effect.radius * 2);
          }
          
          ctx.restore();
        }
      });

      // Draw death animations with enhanced effects
      deathAnimations.forEach(anim => {
        const elapsed = Date.now() - anim.startTime;
        
        ctx.save();
        
        // Blood splash (0-100ms) with scale animation
        if (elapsed < BLOOD_SPLASH_DURATION && images.blood) {
          const size = 48;
          const progress = elapsed / BLOOD_SPLASH_DURATION;
          
          // Scale burst: 0.5 -> 1.2 -> 1.0
          let scale = 1;
          if (progress < 0.3) {
            scale = 0.5 + (progress / 0.3) * 0.7; // 0.5 to 1.2
          } else if (progress < 0.6) {
            scale = 1.2 - ((progress - 0.3) / 0.3) * 0.2; // 1.2 to 1.0
          }
          
          const rotation = Math.random() * Math.PI * 2; // Random rotation
          
          ctx.translate(anim.x, anim.y);
          ctx.rotate(rotation);
          ctx.scale(scale, scale);
          ctx.globalAlpha = Math.min(1, progress / 0.3);
          ctx.drawImage(images.blood, -size / 2, -size / 2, size, size);
        }
        
        // Dead sprite (100ms-2100ms) with shake and fade
        if (elapsed >= BLOOD_SPLASH_DURATION && 
            elapsed < BLOOD_SPLASH_DURATION + DEATH_ANIMATION_DURATION && 
            images.dead) {
          const size = 32 * 1.25;
          const deathProgress = (elapsed - BLOOD_SPLASH_DURATION) / DEATH_ANIMATION_DURATION;
          
          let offsetX = 0;
          let scale = 1;
          let alpha = 1;
          
          // Initial shake (first 200ms)
          if (elapsed < BLOOD_SPLASH_DURATION + 200) {
            const shakeProgress = (elapsed - BLOOD_SPLASH_DURATION) / 200;
            offsetX = Math.sin(shakeProgress * Math.PI * 8) * 2 * (1 - shakeProgress);
            scale = 1 - Math.sin(shakeProgress * Math.PI) * 0.05; // Slight squish
          }
          
          // Darken over time
          const darkness = 0.95 - deathProgress * 0.15;
          
          // Final fade (last 300ms)
          if (elapsed > BLOOD_SPLASH_DURATION + DEATH_ANIMATION_DURATION - 300) {
            const fadeProgress = (elapsed - (BLOOD_SPLASH_DURATION + DEATH_ANIMATION_DURATION - 300)) / 300;
            alpha = 1 - fadeProgress;
          }
          
          ctx.translate(anim.x + offsetX, anim.y);
          ctx.scale(scale, scale);
          ctx.globalAlpha = alpha * darkness;
          ctx.drawImage(images.dead, -size / 2, -size / 2, size, size);
        }
        
        ctx.restore();
      });

      // Draw thronglings
      thronglings.forEach(t => {
        if (!t.isAlive) return;
        
        // Choose sprite based on character type and direction
        const direction = t.direction || 'right';
        const characterType = t.characterType || 'normal';
        const spriteKey = `${characterType}-${direction}`;
        const sprite = images[spriteKey] || images[`${characterType}-right`] || images.alive;
        
        if (sprite) {
          const size = 32 * 1.25;
          ctx.drawImage(sprite, t.x - size / 2, t.y - size / 2, size, size);
          
          // Draw name if available
          if (t.name) {
            ctx.font = '6.5px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            
            // Add background for readability
            const metrics = ctx.measureText(t.name);
            const padding = 2;
            const bgX = t.x - metrics.width / 2 - padding;
            const bgY = t.y - size / 2 - 11;
            const bgWidth = metrics.width + padding * 2;
            const bgHeight = 8;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
            
            // Draw text
            ctx.fillStyle = 'white';
            ctx.fillText(t.name, t.x, t.y - size / 2 - 4);
          }
          
          // Draw heart emoji if festival buff is active
          if (t.festivalBuff) {
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const heartY = t.name ? t.y - size / 2 - 26 : t.y - size / 2 - 8;
            ctx.fillText('❤️', t.x, heartY);
          }
        }
      });
      
      // Draw top layer particles (embers, sparks, confetti)
      particles.forEach(p => {
        if (p.type === 'ember' || p.type === 'spark' || p.type === 'confetti') {
          ctx.save();
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          
          if (p.type === 'spark') {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 5;
          }
          
          if (p.type === 'confetti' && p.rotation !== undefined) {
            // Draw confetti as rotated rectangles
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [thronglings, images, weaponEffects, deathAnimations, particles, screenShake]);

  // Update canvas size and center map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    resize();
    
    // Open focused on the FIRST island (the green meadow at x0-768), not the
    // middle gap between the two islands.
    {
      const firstIslandCenterX = 384; // first island spans x 0-768
      const firstIslandCenterY = 384; // and y 0-768
      setCamera(prev => ({
        ...prev,
        x: firstIslandCenterX - window.innerWidth / 2,
        y: firstIslandCenterY - window.innerHeight / 2,
      }));
    }

    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Throngling movement with collision detection
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setThronglings(prev => prev.map(t => {
        if (!t.isAlive || t.isDragging) return t;

        // Random sound playback with rate limiting
        const SOUND_COOLDOWN = 15000; // 15 seconds minimum between sounds
        const SOUND_PROBABILITY = 0.0008; // ~3 sounds per minute per Throngling
        
        if (Math.random() < SOUND_PROBABILITY) {
          if (!t.lastSoundTime || (now - t.lastSoundTime) >= SOUND_COOLDOWN) {
            // Pick a random sound different from the last one
            const availableSounds: ('heyy' | 'jumping' | 'kwaa')[] = ['heyy', 'jumping', 'kwaa'];
            const filteredSounds = availableSounds.filter(s => s !== t.lastSoundType);
            const randomSound = filteredSounds[Math.floor(Math.random() * filteredSounds.length)];
            
            playSound(randomSound);
            
            // Update tracking on the throngling
            t.lastSoundTime = now;
            t.lastSoundType = randomSound;
          }
        }

        // Store original velocity before collision changes
        const originalVx = t.vx;
        const originalVy = t.vy;

        let newX = t.x + t.vx * 0.016; // ~60fps
        let newY = t.y + t.vy * 0.016;
        let newVx = t.vx;
        let newVy = t.vy;

        // Check if new position is walkable
        if (!isWalkable(newX, newY)) {
          // Hit non-walkable area, bounce back
          newVx *= -1;
          newVy *= -1;
          newX = t.x;
          newY = t.y;
        }

        // Determine which island this throngling belongs to and clamp within that spawn area
        const inSecondIsland = t.x >= ISLAND_POSITIONS.second.x;
        const bounds = inSecondIsland ? SPAWN_AREA_SECOND : SPAWN_AREA;

        // Clamp position within appropriate spawn area boundaries
        if (newX < bounds.x) {
          newX = bounds.x;
          newVx *= -1;
        } else if (newX > bounds.x + bounds.w) {
          newX = bounds.x + bounds.w;
          newVx *= -1;
        }

        if (newY < bounds.y) {
          newY = bounds.y;
          newVy *= -1;
        } else if (newY > bounds.y + bounds.h) {
          newY = bounds.y + bounds.h;
          newVy *= -1;
        }

        // Random direction changes
        if (Math.random() < 0.01) {
          newVx = (Math.random() - 0.5) * THRONGLING_SPEED;
          newVy = (Math.random() - 0.5) * THRONGLING_SPEED;
        }

        // Only update direction if enough time has passed (150ms cooldown)
        const DIRECTION_UPDATE_COOLDOWN = 150;
        let newDirection = t.direction || 'right';
        
        if (!t.lastDirectionUpdate || now - t.lastDirectionUpdate > DIRECTION_UPDATE_COOLDOWN) {
          // Calculate direction based on ORIGINAL velocity (before collision changes)
          newDirection = getThronglingDirection(originalVx, originalVy);
          
          return {
            ...t,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            direction: newDirection,
            lastDirectionUpdate: now,
          };
        }

        return {
          ...t,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
        };
      }));
    }, 16);

    return () => clearInterval(interval);
  }, []);

  // Sync positions to database every 2 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const updates = thronglings
        .filter(t => t.isAlive)
        .map(t => ({
          id: t.id,
          x: t.x,
          y: t.y,
          vx: t.vx,
          vy: t.vy,
          state: t.state,
          body_color: t.bodyColor,
          accent_color: t.accentColor,
          name: t.name,
          character_type: t.characterType || 'normal',
          updated_at: new Date().toISOString(),
        }));

      if (updates.length > 0) {
        const { error } = await supabase
          .from('thronglings')
          .upsert(updates);

        if (error) {
          console.error('Error syncing positions:', error);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [thronglings]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ cursor: isSelectingSpawnLocation || selectedTool ? 'crosshair' : isPanning.current ? 'grabbing' : 'grab' }}
    />
  );
};
