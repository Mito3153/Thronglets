import thronglingImage from '@/assets/throngling.png';

interface ThronglingCounterProps {
  count: number;
  maxCount: number;
}

export const ThronglingCounter = ({ count, maxCount }: ThronglingCounterProps) => {
  return (
    <div className="glass-button rounded-xl px-4 py-3 flex items-center gap-2">
      <img 
        src={thronglingImage} 
        alt="Throngling" 
        className="w-6 h-6 object-contain"
      />
      <span className="text-card-foreground font-semibold">
        {count}/{maxCount}
      </span>
    </div>
  );
};
