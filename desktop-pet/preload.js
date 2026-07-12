// Bridge between the overlay renderer and the main process.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  // Renderer -> main: enable/disable click-through based on hover.
  setInteractive: (interactive) => ipcRenderer.send('set-interactive', interactive),
  showThrongMenu: () => ipcRenderer.invoke('throng-menu'),
  // main -> renderer: tray / hotkey commands.
  onSpawn: (cb) => ipcRenderer.on('spawn', (_e, n) => cb(n)),
  onClear: (cb) => ipcRenderer.on('clear', () => cb()),
  onMute: (cb) => ipcRenderer.on('mute', (_e, muted) => cb(muted)),
});
