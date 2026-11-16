export interface VocabWord {
  id: string;
  english: string;
  vietnamese: string;
}

export type AppScreen = 'SETUP' | 'PLAYING' | 'SUMMARY';

export interface BlockColor {
  fill: string;
  wash: string;
  name: string;
}

export const MARKER_COLORS: BlockColor[] = [
  { fill: '#FEF08A', wash: '#FDE047', name: 'yellow' },
  { fill: '#BBF7D0', wash: '#86EFAC', name: 'mint' },
  { fill: '#BAE6FD', wash: '#7DD3FC', name: 'sky' },
  { fill: '#FED7AA', wash: '#FDBA74', name: 'peach' },
  { fill: '#E9D5FF', wash: '#D8B4FE', name: 'lavender' },
  { fill: '#FECDD3', wash: '#FDA4AF', name: 'rose' },
];

export interface FallingBlock {
  uid: string;
  word: VocabWord;
  x: number; // center x
  y: number; // center y
  width: number;
  height: number;
  speed: number; // px per second
  tilt: number; // slight hand-placed rotation in radians
  seed: number;
  color: BlockColor;
  typedCount: number;
  hitJitter: number; // decays over time when hit by bullet
  lines: string[];
}

export interface InkBullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetUid: string;
  angle: number;
  color: string;
}

export interface DoodleExplosion {
  id: string;
  x: number;
  y: number;
  progress: number; // 0 to 1
  seed: number;
  kind: 'destroy' | 'miss' | 'skip';
  label?: string;
}

export interface ReviewItem {
  word: VocabWord;
  reason: 'skipped' | 'missed';
}

export interface GameResult {
  totalWords: number;
  correctCount: number;
  skippedCount: number;
  missedCount: number;
  reviewItems: ReviewItem[];
}

export const STARTER_VOCAB: VocabWord[] = [
  { id: 'starter-1', english: 'notebook', vietnamese: 'quyển vở' },
  { id: 'starter-2', english: 'spaceship', vietnamese: 'tàu vũ trụ' },
  { id: 'starter-3', english: 'pencil', vietnamese: 'bút chì' },
  { id: 'starter-4', english: 'adventure', vietnamese: 'cuộc phiêu lưu' },
  { id: 'starter-5', english: 'galaxy', vietnamese: 'thiên hà' },
  { id: 'starter-6', english: 'courage', vietnamese: 'lòng dũng cảm' },
];
