// Throngle Pet — Electron main process.
// Creates one transparent, always-on-top overlay across the primary display.
// The overlay is click-through by default (so it doesn't block your desktop);
// when the cursor is over a throng, the renderer asks us to make it interactive
// so you can grab and fling it.

const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');

let win = null;
let tray = null;

function createWindow() {
  const display = screen.getPrimaryDisplay();
  // workArea excludes the taskbar, so throngs walk along the top of it (not behind it).
  const { x, y, width, height } = display.workArea;

  win = new BrowserWindow({
    x, y, width, height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    hasShadow: false,
    skipTaskbar: true,
    fullscreenable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Sit above normal windows (including most full-screen apps).
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Click-through by default; forward mousemove so the renderer can detect hover.
  win.setIgnoreMouseEvents(true, { forward: true });

  win.loadFile('index.html');
}

// Renderer toggles interactivity based on whether the cursor is over a throng.
ipcMain.on('set-interactive', (_e, interactive) => {
  if (win && !win.isDestroyed()) {
    win.setIgnoreMouseEvents(!interactive, { forward: true });
  }
});

// Right-click on a throng -> native context menu. Resolves with the chosen action.
ipcMain.handle('throng-menu', () => new Promise((resolve) => {
  const menu = Menu.buildFromTemplate([
    { label: '🐣 Spawn another', click: () => resolve('spawn') },
    { label: '🗑 Remove this one', click: () => resolve('remove') },
    { type: 'separator' },
    { label: '🧹 Clear all', click: () => resolve('clear') },
  ]);
  menu.popup({ window: win, callback: () => resolve(null) });
}));

function send(channel, ...args) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}

function buildTray() {
  const icon = nativeImage
    .createFromPath(path.join(__dirname, 'assets', 'throngling.png'))
    .resize({ width: 20, height: 20 });
  tray = new Tray(icon);
  tray.setToolTip('Throngle Pet');

  let muted = false;
  const rebuild = () => {
    const menu = Menu.buildFromTemplate([
      { label: '🐣 Spawn Throng', click: () => send('spawn', 1) },
      { label: '✨ Spawn 10', click: () => send('spawn', 10) },
      { label: '🌊 Spawn 50', click: () => send('spawn', 50) },
      { type: 'separator' },
      { label: '🧹 Clear all', click: () => send('clear') },
      {
        label: muted ? '🔇 Sounds: Off' : '🔊 Sounds: On',
        click: () => { muted = !muted; send('mute', muted); rebuild(); },
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);
    tray.setContextMenu(menu);
  };
  rebuild();

  // Clicking the tray icon spawns one too.
  tray.on('click', () => send('spawn', 1));
}

app.whenReady().then(() => {
  createWindow();
  buildTray();

  // Global hotkey: Ctrl+Shift+T spawns a throng from anywhere.
  globalShortcut.register('CommandOrControl+Shift+T', () => send('spawn', 1));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());

// Overlay app — keep running when windows close (tray stays); quit is explicit.
app.on('window-all-closed', () => {});
