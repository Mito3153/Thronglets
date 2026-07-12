import { Volume2, VolumeX, HelpCircle, Maximize2, Minimize2, Info } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import { HowItWorksDialog } from './HowItWorksDialog';
import { AboutDialog } from './AboutDialog';
import { ThronglingCounter } from './ThronglingCounter';
import { MAX_POPULATION } from '@/lib/constants';
import { useAudio } from '@/contexts/AudioContext';

interface TopControlsProps {
  thronglingCount: number;
}

export const TopControls = ({ thronglingCount }: TopControlsProps) => {
  const { muted, toggleMute } = useAudio();
  const [showHelp, setShowHelp] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  return (
    <>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThronglingCounter count={thronglingCount} maxCount={MAX_POPULATION} />
        
        <button
          onClick={toggleMute}
          className="glass-button rounded-xl p-3 text-card-foreground"
          aria-label="Toggle sound"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        
        <button
          onClick={() => setShowHelp(true)}
          className="glass-button rounded-xl p-3 text-card-foreground"
          aria-label="How it works"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => setAboutOpen(true)}
          className="glass-button rounded-xl p-3 text-card-foreground"
          aria-label="About"
        >
          <Info className="w-5 h-5" />
        </button>
        
        <button
          onClick={toggleFullscreen}
          className="glass-button rounded-xl p-3 text-card-foreground"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        <div className="wallet-adapter-button-trigger">
          <WalletMultiButton />
        </div>
      </div>

      <HowItWorksDialog open={showHelp} onOpenChange={setShowHelp} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
};
