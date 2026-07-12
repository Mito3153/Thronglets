export interface Throngling {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'wander' | 'eat' | 'rest' | 'play' | 'flee';
  isAlive: boolean;
  isDragging: boolean;
  bodyColor: string;
  accentColor: string;
  name?: string;
  dragStartTime?: number;
  festivalBuff?: boolean;
  festivalBuffStartTime?: number;
  direction?: 'left' | 'right' | 'up';
  lastDirectionUpdate?: number;
  lastSoundTime?: number;
  lastSoundType?: 'heyy' | 'jumping' | 'kwaa';
  characterType?: 'normal' | 'adolf' | 'doge' | 'george' | 'epstein' | 'pepe';
}

export interface GameEvent {
  id: string;
  type: 'meteor' | 'lightning' | 'tornado' | 'fire' | 'snack' | 'festival' | 'spawn' | 'death';
  x: number;
  y: number;
  timestamp: number;
  description: string;
  thronglingName?: string;
}

export interface Tool {
  id: string;
  name: string;
  price: number;
  icon: string;
  lethal: boolean;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
}

export interface WeaponEffect {
  id: string;
  type: 'rock' | 'lightning' | 'tornado' | 'fire' | 'festival';
  x: number;
  y: number;
  startTime: number;
  duration: number;
  radius: number;
}

export interface DeathAnimation {
  id: string;
  thronglingId: string;
  x: number;
  y: number;
  startTime: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // 0 to 1
  decay: number;
  rotation?: number;
  rotationSpeed?: number;
  type?: string;
}

export interface ScreenShake {
  intensity: number;
  duration: number;
  startTime: number;
}
