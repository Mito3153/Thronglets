import { Palette } from 'lucide-react';
import { TOKEN_LINKS } from '@/lib/tokenLinks';

export const CustomDesignBadge = () => {
  return (
    <a 
      href={TOKEN_LINKS.TWITTER}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-panel rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer"
    >
      <Palette className="w-8 h-8 text-purple-400" />
      <div className="flex flex-col">
        <div className="text-xs text-muted-foreground">
          Order custom Thronglet design for your project. (Payment in $THRONG)
        </div>
      </div>
    </a>
  );
};
