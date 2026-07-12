// Throngle Pet — renderer. Free-roam like the game (no gravity): throngs wander
// anywhere across the whole screen and bounce off the edges. You can grab one
// and fling it — it glides to a stop (friction) and resumes wandering.
// A throng's (x, y) is its CENTER.

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

let W = 0, H = 0, dpr = 1;
function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// --- assets ----------------------------------------------------------------
const sprite = {
  left:  load('assets/throngling-left.png'),
  right: load('assets/throngling-right.png'),
  up:    load('assets/throngling-up.png'),
  front: load('assets/throngling.png'),
};
function load(src) { const i = new Image(); i.src = src; return i; }

const SFX = { heyy: 'assets/heyy.mp3', kwaa: 'assets/kwaa.mp3', jump: 'assets/jumping.mp3' };
let muted = false;
let ambientPlaying = 0;
function play(name, { ambient = false } = {}) {
  if (muted) return;
  if (ambient) {
    if (ambientPlaying >= 3) return;          // don't let a swarm scream at once
    ambientPlaying++;
  }
  const a = new Audio(SFX[name]);
  a.volume = ambient ? 0.35 : 0.55;
  if (ambient) a.addEventListener('ended', () => { ambientPlaying = Math.max(0, ambientPlaying - 1); });
  a.play().catch(() => { if (ambient) ambientPlaying = Math.max(0, ambientPlaying - 1); });
}

// --- tuning ----------------------------------------------------------------
const SIZE_H = 52;            // rendered height of a throng, px (smaller)
const ROAM_MIN = 28, ROAM_MAX = 80;
const FRICTION = 1.8;         // how fast a fling decays (per second, exp)
const RESUME_SPEED = 95;      // below this, a flung throng goes back to roaming
const MAX_THRONGS = 300;
const rand = (a, b) => a + Math.random() * (b - a);
const hyp = (a, b) => Math.hypot(a, b);

// --- a throng --------------------------------------------------------------
class Throng {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.roam();                         // pick an initial heading
    this.state = 'roam';                 // roam | idle | drag | flung
    this.tNextDecision = rand(0.8, 2.5);
    this.tNextAmbient = rand(4, 14);
    this.wobble = Math.random() * Math.PI * 2;
  }

  roam() {
    const ang = Math.random() * Math.PI * 2;
    const sp = rand(ROAM_MIN, ROAM_MAX);
    this.vx = Math.cos(ang) * sp;
    this.vy = Math.sin(ang) * sp;
  }

  footprint() {
    const img = this.sprite();
    const w = img.naturalHeight ? (img.naturalWidth / img.naturalHeight) * SIZE_H : SIZE_H;
    return { w, h: SIZE_H };
  }

  sprite() {
    if (this.state === 'drag') return sprite.up;
    const sp = hyp(this.vx, this.vy);
    if (this.state === 'idle' || sp < 6) return sprite.front;
    if (this.vy < 0 && Math.abs(this.vy) > Math.abs(this.vx)) return sprite.up; // moving up
    return this.vx < 0 ? sprite.left : sprite.right;
  }

  hit(px, py) {
    const { w, h } = this.footprint();
    return px >= this.x - w / 2 && px <= this.x + w / 2 && py >= this.y - h / 2 && py <= this.y + h / 2;
  }

  update(dt) {
    if (this.state === 'drag') return;   // position driven by the cursor

    if (this.state === 'flung') {
      const d = Math.exp(-FRICTION * dt);
      this.vx *= d; this.vy *= d;
      if (hyp(this.vx, this.vy) < RESUME_SPEED) { this.state = 'roam'; this.roam(); this.tNextDecision = rand(0.8, 2); }
    } else {
      // roam / idle: occasionally change heading, pause, or wander on
      this.tNextDecision -= dt;
      if (this.tNextDecision <= 0) {
        const r = Math.random();
        if (r < 0.22) { this.state = 'idle'; this.vx = this.vy = 0; this.tNextDecision = rand(0.6, 1.6); }
        else { this.state = 'roam'; this.roam(); this.tNextDecision = rand(1.2, 3.5); }
      }
    }

    // move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // bounce off all four edges (keeps them on screen, and throws ricochet)
    const { w, h } = this.footprint();
    const hw = w / 2, hh = h / 2;
    if (this.x < hw)     { this.x = hw;     this.vx = Math.abs(this.vx); }
    if (this.x > W - hw) { this.x = W - hw; this.vx = -Math.abs(this.vx); }
    if (this.y < hh)     { this.y = hh;     this.vy = Math.abs(this.vy); }
    if (this.y > H - hh) { this.y = H - hh; this.vy = -Math.abs(this.vy); }

    if (this.state === 'roam') this.wobble += dt * 8;

    // ambient throng noises
    this.tNextAmbient -= dt;
    if (this.tNextAmbient <= 0) {
      this.tNextAmbient = rand(6, 18);
      if (Math.random() < 0.55) play(Math.random() < 0.5 ? 'heyy' : 'kwaa', { ambient: true });
    }
  }

  draw() {
    const img = this.sprite();
    if (!img.complete || !img.naturalWidth) return;
    const { w, h } = this.footprint();
    const bob = this.state === 'roam' ? Math.sin(this.wobble) * 1.5 : 0;
    ctx.drawImage(img, this.x - w / 2, this.y - h / 2 + bob, w, h);
  }
}

// --- world -----------------------------------------------------------------
let throngs = [];
function spawn(n = 1) {
  for (let i = 0; i < n && throngs.length < MAX_THRONGS; i++) {
    throngs.push(new Throng(rand(40, Math.max(60, W - 40)), rand(40, Math.max(60, H - 40))));
  }
  play('heyy');
}
spawn(1); // start with a single throng

// --- input: grab & fling ---------------------------------------------------
let mouse = { x: -1, y: -1 };
let held = null;
let grabOff = { x: 0, y: 0 };
let samples = []; // recent cursor samples for fling velocity

function overAny(px, py) {
  for (let i = throngs.length - 1; i >= 0; i--) if (throngs[i].hit(px, py)) return throngs[i];
  return null;
}

let interactive = false;
function setInteractive(v) {
  if (v !== interactive) { interactive = v; window.pet.setInteractive(v); }
}

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  if (samples.length > 6) samples.shift();

  if (held) { held.x = e.clientX - grabOff.x; held.y = e.clientY - grabOff.y; }
  setInteractive(!!held || !!overAny(e.clientX, e.clientY));
});

window.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;            // only left-click grabs; right-click = menu
  const t = overAny(e.clientX, e.clientY);
  if (t) {
    held = t; t.state = 'drag'; t.vx = t.vy = 0;
    grabOff = { x: e.clientX - t.x, y: e.clientY - t.y };
    samples = [];
    play(Math.random() < 0.5 ? 'kwaa' : 'heyy');
  }
});

window.addEventListener('mouseup', () => {
  if (!held) return;
  let vx = 0, vy = 0;
  if (samples.length >= 2) {
    const a = samples[0], b = samples[samples.length - 1];
    const dt = (b.t - a.t) / 1000 || 0.016;
    vx = (b.x - a.x) / dt;
    vy = (b.y - a.y) / dt;
  }
  const clamp = (v) => Math.max(-1600, Math.min(1600, v));
  held.vx = clamp(vx); held.vy = clamp(vy);
  // if barely moved, just let it wander again; otherwise fling
  held.state = hyp(held.vx, held.vy) > RESUME_SPEED ? 'flung' : 'roam';
  if (held.state === 'roam') held.roam();
  else play('jump');
  held = null;
});

// right-click a throng -> context menu (spawn another / remove this / clear all)
function removeThrong(t) {
  const i = throngs.indexOf(t);
  if (i >= 0) { throngs.splice(i, 1); play('kwaa'); }
  if (held === t) held = null;
}
window.addEventListener('contextmenu', async (e) => {
  const t = overAny(e.clientX, e.clientY);
  if (!t) return;                        // empty space -> passes through to the desktop
  e.preventDefault();
  const action = await window.pet.showThrongMenu();
  if (action === 'spawn') {
    if (throngs.length < MAX_THRONGS) { throngs.push(new Throng(t.x + rand(-40, 40), t.y + rand(-40, 40))); play('heyy'); }
  } else if (action === 'remove') {
    removeThrong(t);
  } else if (action === 'clear') {
    throngs = []; held = null; setInteractive(false);
  }
});

// --- commands from the tray / hotkey ---------------------------------------
window.pet.onSpawn((n) => spawn(n));
window.pet.onClear(() => { throngs = []; held = null; setInteractive(false); });
window.pet.onMute((m) => { muted = m; });

// --- loop ------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  ctx.clearRect(0, 0, W, H);
  for (const t of throngs) { t.update(dt); t.draw(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
