import { Download } from 'lucide-react';

// Downloads the desktop-pet installer served from /public.
export const DesktopPetDownload = () => {
  return (
    <a
      href="https://github.com/Mito3153/Thronglets/releases/download/desktop-pet-v1/ThronglePet.zip"
      className="glass-panel rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-black/40 transition-colors no-underline"
    >
      <Download className="w-6 h-6 text-cyan shrink-0" />
      <div className="flex flex-col">
        <div className="text-xs font-semibold text-primary-foreground">
          Get Desktop Throngles
        </div>
        <div className="text-[10px] text-muted-foreground">
          Download &amp; unzip, run Throngle Pet.exe — they roam your screen. Grab &amp; fling them.
        </div>
      </div>
    </a>
  );
};
