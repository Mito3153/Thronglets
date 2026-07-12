import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const GrowthBadge = () => {
  const [timeLeft, setTimeLeft] = useState('5d 0h 0m 0s');
  const [targetTime, setTargetTime] = useState<number>(0);

  useEffect(() => {
    // Clean up old localStorage key (one-time cleanup)
    localStorage.removeItem('territory-expansion-end-time');
    
    // Fetch initial timer value
    const fetchTimer = async () => {
      const { data, error } = await supabase
        .from('game_timers')
        .select('target_time')
        .eq('id', 'territory_expansion')
        .single();

      if (data && !error) {
        setTargetTime(data.target_time);
      }
    };

    fetchTimer();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('game-timers')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_timers',
          filter: 'id=eq.territory_expansion'
        },
        (payload) => {
          setTargetTime(payload.new.target_time);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!targetTime) return;

    // Update display every second
    const displayInterval = setInterval(() => {
      const diff = targetTime - Date.now();
      
      if (diff <= 0) {
        setTimeLeft('0d 0h 0m 0s');
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    // Check for reset every 10 seconds
    const resetCheckInterval = setInterval(async () => {
      try {
        await supabase.functions.invoke('reset-game-timer', {
          body: {}
        });
      } catch (error) {
        console.error('Error checking timer reset:', error);
      }
    }, 10000);

    return () => {
      clearInterval(displayInterval);
      clearInterval(resetCheckInterval);
    };
  }, [targetTime]);

  return (
    <div className="glass-panel rounded-xl px-4 py-3 flex items-center gap-3">
      <Sparkles className="w-6 h-6 text-yellow-400" />
      <div className="flex flex-col">
        <div className="text-xs text-muted-foreground">Territory expands in</div>
        <div className="text-sm text-yellow-400 font-bold">{timeLeft}</div>
      </div>
    </div>
  );
};
