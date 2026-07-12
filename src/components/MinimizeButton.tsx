import { ChevronUp, ChevronDown } from 'lucide-react';

interface MinimizeButtonProps {
  isMinimized: boolean;
  onClick?: () => void;
}

export const MinimizeButton = ({ isMinimized, onClick }: MinimizeButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-full glass-button flex items-center justify-center hover:border-cyan transition-all"
      aria-label={isMinimized ? 'Expand panel' : 'Minimize panel'}
    >
      {isMinimized ? (
        <ChevronDown className="w-4 h-4 text-cyan" />
      ) : (
        <ChevronUp className="w-4 h-4 text-cyan" />
      )}
    </button>
  );
};
