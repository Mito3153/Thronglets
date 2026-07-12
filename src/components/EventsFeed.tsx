import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { GameEvent } from '@/types/game';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MinimizeButton } from '@/components/MinimizeButton';

interface Props {
  events: GameEvent[];
  onEventClick: (event: GameEvent) => void;
}

export const EventsFeed = ({ events, onEventClick }: Props) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const getEventIcon = (type: GameEvent['type']) => {
    const icons = {
      meteor: '🪨',
      lightning: '⚡',
      tornado: '🌪️',
      fire: '🔥',
      snack: '🍰',
      festival: '🎉',
      spawn: '✨',
      death: '💀',
    };
    return icons[type];
  };

  return (
    <Collapsible open={!isMinimized} onOpenChange={() => setIsMinimized(!isMinimized)}>
      <Card className="absolute top-[540px] right-4 w-80 glass-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <CollapsibleTrigger asChild>
            <MinimizeButton isMinimized={isMinimized} />
          </CollapsibleTrigger>
          <h2 className="pixel-heading text-cyan">{isMinimized ? 'EVENTS' : 'LIVE EVENTS'}</h2>
        </div>
        
        <CollapsibleContent>
          {events.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-[10px]">
          No events yet...
        </div>
      ) : (
        <ScrollArea className="h-40">
          <div className="space-y-1.5">
            {events.slice().reverse().map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="glass-button w-full text-left p-2 text-[10px] flex items-start gap-2"
              >
                <span className="text-base">{getEventIcon(event.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-cyan truncate">{event.description}</div>
                  <div className="text-muted-foreground text-[9px]">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
      
          <div className="text-[9px] text-muted-foreground mt-3">
            Click an event to fly to it.
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
