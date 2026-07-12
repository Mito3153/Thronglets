import { createContext, useContext, ReactNode } from 'react';
import { useAudioManager } from '@/hooks/useAudioManager';

interface AudioContextType {
  muted: boolean;
  toggleMute: () => void;
  playSound: (soundType: 'split' | 'heyy' | 'jumping' | 'kwaa') => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const audioManager = useAudioManager();
  
  return (
    <AudioContext.Provider value={audioManager}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};
