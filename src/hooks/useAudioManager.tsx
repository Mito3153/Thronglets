import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import edenMusic from '@/assets/Eden.mp3';
import splittingSound from '@/assets/splitting.mp3';
import heyySound from '@/assets/heyy.mp3';
import jumpingSound from '@/assets/jumping.mp3';
import kwaaSound from '@/assets/kwaa.mp3';

export const useAudioManager = () => {
  const [muted, setMuted] = useState(() => {
    const saved = localStorage.getItem('audio-muted');
    return saved === 'true';
  });
  
  const musicRef = useRef<Howl | null>(null);
  const splittingSoundRef = useRef<Howl | null>(null);
  const heyyRef = useRef<Howl | null>(null);
  const jumpingRef = useRef<Howl | null>(null);
  const kwaaRef = useRef<Howl | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (isInitializedRef.current) {
      return;
    }
    
    // Clean up any existing instance first
    if (musicRef.current) {
      musicRef.current.unload();
      musicRef.current = null;
    }

    console.log('[Audio] Initializing with muted:', muted);

    // Initialize background music WITH the correct mute state from the start
    musicRef.current = new Howl({
      src: [edenMusic],
      loop: true,
      volume: 0.5,
      autoplay: !muted, // Don't autoplay if already muted
      mute: muted,      // Set initial mute state
      onplayerror: () => {
        musicRef.current?.once('unlock', () => {
          if (!muted && musicRef.current) {
            musicRef.current.play();
          }
        });
      },
      onload: () => {
        console.log('[Audio] Music loaded, muted:', muted);
      }
    });

    // Initialize splitting sound effect
    splittingSoundRef.current = new Howl({
      src: [splittingSound],
      volume: 0.7,
      mute: muted,
    });

    // Initialize Throngling voice sounds
    heyyRef.current = new Howl({
      src: [heyySound],
      volume: 0.4,
      mute: muted,
    });

    jumpingRef.current = new Howl({
      src: [jumpingSound],
      volume: 0.4,
      mute: muted,
    });

    kwaaRef.current = new Howl({
      src: [kwaaSound],
      volume: 0.4,
      mute: muted,
    });

    isInitializedRef.current = true;

    // Cleanup on unmount
    return () => {
      console.log('[Audio] Cleaning up');
      if (musicRef.current) {
        musicRef.current.unload();
        musicRef.current = null;
      }
      if (splittingSoundRef.current) {
        splittingSoundRef.current.unload();
        splittingSoundRef.current = null;
      }
      if (heyyRef.current) {
        heyyRef.current.unload();
        heyyRef.current = null;
      }
      if (jumpingRef.current) {
        jumpingRef.current.unload();
        jumpingRef.current = null;
      }
      if (kwaaRef.current) {
        kwaaRef.current.unload();
        kwaaRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []); // Only run once on mount

  useEffect(() => {
    // Apply mute state changes AFTER initialization
    if (!isInitializedRef.current || !musicRef.current) {
      return;
    }

    console.log('[Audio] Setting mute to:', muted);
    
    // Apply mute state to music
    musicRef.current.mute(muted);
    
    // Apply mute state to sound effects
    if (splittingSoundRef.current) {
      splittingSoundRef.current.mute(muted);
    }
    if (heyyRef.current) {
      heyyRef.current.mute(muted);
    }
    if (jumpingRef.current) {
      jumpingRef.current.mute(muted);
    }
    if (kwaaRef.current) {
      kwaaRef.current.mute(muted);
    }
    
    // If unmuting, make sure music is playing
    if (!muted && !musicRef.current.playing()) {
      musicRef.current.play();
    }
    
    // Persist mute preference
    localStorage.setItem('audio-muted', String(muted));
  }, [muted]);

  const toggleMute = () => {
    setMuted(prev => !prev);
  };

  const playSound = (soundType: 'split' | 'heyy' | 'jumping' | 'kwaa') => {
    if (soundType === 'split' && splittingSoundRef.current) {
      splittingSoundRef.current.play();
    } else if (soundType === 'heyy' && heyyRef.current) {
      heyyRef.current.play();
    } else if (soundType === 'jumping' && jumpingRef.current) {
      jumpingRef.current.play();
    } else if (soundType === 'kwaa' && kwaaRef.current) {
      kwaaRef.current.play();
    }
  };

  return { muted, toggleMute, playSound };
};
