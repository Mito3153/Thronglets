import { useState, useEffect } from 'react';
import { WalletProvider } from '@/components/WalletProvider';
import { GameCanvas } from '@/components/GameCanvas';
import { TokenPanel } from '@/components/TokenPanel';
import { TopControls } from '@/components/TopControls';
import { ActionMenu } from '@/components/ActionMenu';
import { EventsFeed } from '@/components/EventsFeed';
import { GrowthBadge } from '@/components/GrowthBadge';
import { CustomDesignBadge } from '@/components/CustomDesignBadge';
import { DesktopPetDownload } from '@/components/DesktopPetDownload';
import { ThrongChat } from '@/components/ThrongChat';
import { SpawnLabDialog } from '@/components/SpawnLabDialog';
import { PageTitle } from '@/components/PageTitle';
import { GameEvent } from '@/types/game';
import { toast } from 'sonner';

const Index = () => {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [showSpawnLab, setShowSpawnLab] = useState(false);
  const [thronglingCount, setThronglingCount] = useState(0);
  const [isSelectingSpawnLocation, setIsSelectingSpawnLocation] = useState(false);
  const [pendingSpawn, setPendingSpawn] = useState<{name: string, characterType: string} | null>(null);
  const [chatThrong, setChatThrong] = useState<{ id: string; name: string } | null>(null);

  const handleEventCreate = (event: Omit<GameEvent, 'id' | 'timestamp'>) => {
    const newEvent: GameEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    setEvents(prev => [...prev, newEvent].slice(-120)); // Keep last 120 events
    toast.success(`${event.description}!`, {
      duration: 3000,
    });
  };

  const handleEventClick = (event: GameEvent) => {
    console.log('[Index] Event clicked:', event.type, 'at', event.x, event.y);
    // Don't fly to spawn events, only to other events
    if (event.type !== 'spawn') {
      window.dispatchEvent(new CustomEvent('flyToLocation', { 
        detail: { x: event.x, y: event.y } 
      }));
    } else {
      console.log('[Index] Skipping fly-to for spawn event');
    }
  };

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(prev => prev === toolId ? null : toolId);
  };

  const handleToolUsed = () => {
    setSelectedTool(null);
  };

  const handleSpawn = (name: string, characterType: string) => {
    console.log('[Index] Preparing to spawn Throngling:', name, 'Type:', characterType);
    // Store spawn details and enter location selection mode
    setPendingSpawn({ name, characterType });
    setIsSelectingSpawnLocation(true);
    setShowSpawnLab(false);
    toast.info('Click on the map to choose spawn location', {
      description: 'Press ESC to cancel',
      duration: 5000,
    });
  };

  const handleSpawnLocationSelected = (x: number, y: number) => {
    if (!pendingSpawn) return;
    
    console.log('[Index] Spawning Throngling at:', x, y);
    // Dispatch custom event to actually spawn the Throngling with coordinates
    window.dispatchEvent(new CustomEvent('spawnThrongling', {
      detail: { 
        name: pendingSpawn.name, 
        characterType: pendingSpawn.characterType,
        x,
        y
      }
    }));
    
    handleEventCreate({
      type: 'spawn',
      x,
      y,
      description: `${pendingSpawn.name} spawned`,
      thronglingName: pendingSpawn.name,
    });
    
    setIsSelectingSpawnLocation(false);
    setPendingSpawn(null);
    toast.success(`Welcome ${pendingSpawn.name}!`, {
      description: 'Your Throngling has joined the community',
      duration: 5000,
    });
  };

  return (
    <WalletProvider>
      <div className="relative w-screen h-screen overflow-hidden bg-[#0a0e1a]" style={{
        backgroundImage: `url(${new URL('../assets/space-background.png', import.meta.url).href})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <GameCanvas 
          onEventCreate={handleEventCreate}
          selectedTool={selectedTool}
          onToolUsed={handleToolUsed}
          onCountChange={setThronglingCount}
          onThrongClick={setChatThrong}
          isSelectingSpawnLocation={isSelectingSpawnLocation}
          onSpawnLocationSelected={handleSpawnLocationSelected}
          onCancelSpawnSelection={() => {
            setIsSelectingSpawnLocation(false);
            setPendingSpawn(null);
            toast.info('Spawn cancelled');
          }}
        />
        
        <PageTitle />
        {/* Left column: flows top-to-bottom so panels never overlap regardless
            of the TokenPanel's height. pointer-events-none on the column lets
            clicks in the gaps fall through to the canvas. */}
        <div className="absolute top-4 left-4 w-80 flex flex-col gap-3 pointer-events-none z-10">
          <div className="pointer-events-auto"><TokenPanel /></div>
          <div className="pointer-events-auto"><GrowthBadge /></div>
          <div className="pointer-events-auto"><CustomDesignBadge /></div>
          <div className="pointer-events-auto"><DesktopPetDownload /></div>
        </div>
        <TopControls thronglingCount={thronglingCount} />
        <ActionMenu 
          onSelectTool={handleToolSelect} 
          selectedTool={selectedTool}
          onOpenSpawnLab={() => setShowSpawnLab(true)}
        />
        <EventsFeed events={events} onEventClick={handleEventClick} />
        <SpawnLabDialog
          open={showSpawnLab}
          onOpenChange={setShowSpawnLab}
          onSpawn={handleSpawn}
        />
        {chatThrong && <ThrongChat throng={chatThrong} onClose={() => setChatThrong(null)} />}
      </div>
    </WalletProvider>
  );
};

export default Index;
