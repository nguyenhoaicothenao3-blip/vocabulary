import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut, SkipForward, Volume2, VolumeX } from 'lucide-react';
import {
  DoodleExplosion,
  FallingBlock,
  GameResult,
  InkBullet,
  MARKER_COLORS,
  ReviewItem,
  Shuriken,
  StickDefender,
  StickDefenderKind,
  VocabWord,
} from '../types/vocab';
import {
  drawDoodleExplosion,
  drawDoodleSpaceship,
  drawFallingBlock,
  drawInkBullet,
  drawShuriken,
  drawStickDefender,
  wrapVietnameseText,
} from '../utils/sketchDraw';
import { soundEngine } from '../utils/sound';
import { NotebookBinderHoles } from './DoodleDecoration';

interface GameScreenProps {
  words: VocabWord[];
  onFinishGame: (result: GameResult) => void;
  onExitToSetup: () => void;
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function GameScreen({
  words,
  onFinishGame,
  onExitToSetup,
}: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState('');
  const [wrongShake, setWrongShake] = useState(false);
  const [muted, setMuted] = useState(soundEngine.muted);
  const [hudState, setHudState] = useState({
    correct: 0,
    skipped: 0,
    missed: 0,
    remaining: words.length,
    targetVietnamese: '',
    targetTypedCount: 0,
    targetTotalLength: 0,
  });

  // Mutable game engine state inside ref for smooth 60fps loop
  const engineRef = useRef<{
    initialized: boolean;
    ended: boolean;
    finishScheduledAt: number | null;
    width: number;
    height: number;
    pendingQueue: VocabWord[];
    blocks: FallingBlock[];
    bullets: InkBullet[];
    defenders: StickDefender[];
    shurikens: Shuriken[];
    explosions: DoodleExplosion[];
    correctCount: number;
    skippedCount: number;
    missedCount: number;
    reviewItems: ReviewItem[];
    spawnTimer: number;
    colorIdx: number;
    shipAngle: number;
    shipRecoil: number;
    currentTargetUid: string | null;
  }>({
    initialized: false,
    ended: false,
    finishScheduledAt: null,
    width: 0,
    height: 0,
    pendingQueue: shuffleArray(words),
    blocks: [],
    bullets: [],
    defenders: [],
    shurikens: [],
    explosions: [],
    correctCount: 0,
    skippedCount: 0,
    missedCount: 0,
    reviewItems: [],
    spawnTimer: 0,
    colorIdx: 0,
    shipAngle: -Math.PI / 2,
    shipRecoil: 0,
    currentTargetUid: null,
  });

  const syncHud = useCallback(() => {
    const eng = engineRef.current;
    // Closest to ship = largest Y
    let closest: FallingBlock | null = null;
    for (const b of eng.blocks) {
      if (!closest || b.y > closest.y) {
        closest = b;
      }
    }

    const newTargetUid = closest ? closest.uid : null;
    if (newTargetUid !== eng.currentTargetUid) {
      eng.currentTargetUid = newTargetUid;
      setInputValue(closest ? closest.word.english.slice(0, closest.typedCount) : '');
    }

    const resolved = eng.correctCount + eng.skippedCount + eng.missedCount;
    setHudState({
      correct: eng.correctCount,
      skipped: eng.skippedCount,
      missed: eng.missedCount,
      remaining: Math.max(0, words.length - resolved),
      targetVietnamese: closest ? closest.word.vietnamese : '',
      targetTypedCount: closest ? closest.typedCount : 0,
      targetTotalLength: closest ? closest.word.english.length : 0,
    });
  }, [words.length]);

  const spawnWordBlock = useCallback((initialY?: number) => {
    const eng = engineRef.current;
    const canvas = canvasRef.current;
    if (!canvas || eng.pendingQueue.length === 0 || eng.width <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const word = eng.pendingQueue.shift()!;
    ctx.font = 'bold 17px "Patrick Hand", cursive, sans-serif';
    const rect = canvas.getBoundingClientRect();
    const pageRedLine = window.innerWidth < 640 ? 30 : 66;
    const leftMargin = Math.max(14, pageRedLine - rect.left);
    const rightMargin = 14;
    const maxTextWidth = Math.min(170, Math.max(96, eng.width - leftMargin - rightMargin - 36));
    const lines = wrapVietnameseText(ctx, word.vietnamese, maxTextWidth);

    let maxLineW = 0;
    for (const line of lines) {
      maxLineW = Math.max(maxLineW, ctx.measureText(line).width);
    }

    const blockW = Math.max(96, Math.min(208, maxLineW + 28));
    const blockH = lines.length > 1 ? 58 : 44;

    const minX = leftMargin + blockW / 2 + 10;
    const maxX = Math.max(minX + 10, eng.width - rightMargin - blockW / 2 - 10);
    const spanX = maxX - minX;

    const spawnY = initialY ?? -blockH / 2 - 6;

    // Spread words evenly across full column width by dividing into sectors + maximizing distance from active blocks
    const sectorCount = Math.max(3, Math.floor(spanX / (blockW + 22)));
    const sectorIdx = eng.colorIdx % sectorCount;
    const sectorWidth = spanX / sectorCount;
    const sectorMin = minX + sectorIdx * sectorWidth;
    const sectorMax = minX + (sectorIdx + 1) * sectorWidth;

    let bestX = sectorMin + Math.random() * (sectorMax - sectorMin);
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 20; attempt++) {
      const candX =
        attempt < 10
          ? sectorMin + Math.random() * (sectorMax - sectorMin)
          : minX + Math.random() * spanX;

      let minClearance = Infinity;
      for (const existing of eng.blocks) {
        const dy = Math.abs(existing.y - spawnY);
        if (dy < 160) {
          const dx = Math.abs(existing.x - candX) - (existing.width + blockW) / 2;
          const clearance = dy > 95 ? dx + 40 : dx;
          minClearance = Math.min(minClearance, clearance);
        }
      }

      if (minClearance >= 28) {
        bestX = candX;
        break;
      }
      if (minClearance > bestScore) {
        bestScore = minClearance;
        bestX = candX;
      }
    }

    const color = MARKER_COLORS[eng.colorIdx % MARKER_COLORS.length];
    eng.colorIdx += 1;

    // Gentle fall speed across the tall playfield
    const baseSpeed = Math.max(19, Math.min(27, eng.height * 0.036));

    eng.blocks.push({
      uid: `${word.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      word,
      x: bestX,
      y: spawnY,
      width: blockW,
      height: blockH,
      speed: baseSpeed,
      tilt: (Math.random() - 0.5) * 0.06,
      seed: Math.random() * 1000,
      color,
      typedCount: 0,
      hitJitter: 0,
      lines,
    });
  }, []);

  const getActiveTarget = (): FallingBlock | null => {
    const eng = engineRef.current;
    let closest: FallingBlock | null = null;
    for (const b of eng.blocks) {
      if (!closest || b.y > closest.y) {
        closest = b;
      }
    }
    return closest;
  };

  const handleSkip = useCallback(() => {
    const eng = engineRef.current;
    if (eng.ended) return;

    const target = getActiveTarget();
    if (!target) return;

    eng.skippedCount += 1;
    eng.reviewItems.push({ word: target.word, reason: 'skipped' });
    eng.explosions.push({
      id: `skip-${Date.now()}-${Math.random()}`,
      x: target.x,
      y: target.y,
      progress: 0,
      seed: Math.random() * 500,
      kind: 'skip',
      label: 'Bỏ qua',
    });

    eng.blocks = eng.blocks.filter((b) => b.uid !== target.uid);
    eng.currentTargetUid = null;
    setInputValue('');
    soundEngine.playSkip();
    syncHud();
    inputRef.current?.focus();
  }, [syncHud]);

  const wrongTimerRef = useRef<number | null>(null);

  const triggerWrongFeedback = useCallback(() => {
    soundEngine.playWrongKey();
    setWrongShake(false);
    if (wrongTimerRef.current !== null) {
      window.clearTimeout(wrongTimerRef.current);
    }
    requestAnimationFrame(() => {
      setWrongShake(true);
      wrongTimerRef.current = window.setTimeout(() => {
        setWrongShake(false);
        wrongTimerRef.current = null;
      }, 280);
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const eng = engineRef.current;
    if (eng.ended) return;

    const target = getActiveTarget();
    if (!target) {
      setInputValue('');
      return;
    }

    const expected = target.word.english;
    const validPrefix = expected.slice(0, target.typedCount);
    const nextVal = e.target.value;

    // Ignore backspacing already-landed bullets
    if (nextVal.length <= validPrefix.length) {
      setInputValue(validPrefix);
      return;
    }

    const addedChars = nextVal.slice(validPrefix.length);
    let destroyed = false;

    for (const ch of addedChars) {
      if (target.typedCount >= expected.length) break;
      const expectedChar = expected[target.typedCount];

      if (ch.toLowerCase() === expectedChar.toLowerCase()) {
        target.typedCount += 1;
        soundEngine.playShoot();

        // Compute ship nose position and bullet velocity
        const shipX = eng.width / 2;
        const shipY = eng.height - 26;
        const angle = Math.atan2(target.y - shipY, target.x - shipX);
        eng.shipAngle = angle;
        eng.shipRecoil = 7.5;

        const bulletSpeed = 1350;
        eng.bullets.push({
          id: `b-${Date.now()}-${Math.random()}`,
          x: shipX + Math.cos(angle) * 24,
          y: shipY + Math.sin(angle) * 24,
          vx: Math.cos(angle) * bulletSpeed,
          vy: Math.sin(angle) * bulletSpeed,
          targetUid: target.uid,
          angle,
          color: '#1e293b',
        });

        if (target.typedCount >= expected.length) {
          // Word completed -> destroy target immediately
          eng.correctCount += 1;
          eng.explosions.push({
            id: `exp-${Date.now()}-${Math.random()}`,
            x: target.x,
            y: target.y,
            progress: 0,
            seed: Math.random() * 999,
            kind: 'destroy',
            label: expected,
          });
          eng.blocks = eng.blocks.filter((b) => b.uid !== target.uid);
          eng.currentTargetUid = null;
          soundEngine.playDestroy();
          destroyed = true;
          break;
        }
      } else {
        triggerWrongFeedback();

        // Still fire a bullet, but spawn a random stickman defender (sword or shield) near the word to bat/bounce it away!
        const shipX = eng.width / 2;
        const shipY = eng.height - 26;
        const angle = Math.atan2(target.y - shipY, target.x - shipX);
        eng.shipAngle = angle;
        eng.shipRecoil = 6;
        soundEngine.playShoot();

        const defenderKinds: StickDefenderKind[] = ['sword', 'shield', 'wand', 'ninja'];
        const defenderKind = defenderKinds[Math.floor(Math.random() * defenderKinds.length)];
        const guardDist = target.height / 2 + 24;
        // Slight lateral offset so even straight-up shots show a clear side-facing silhouette
        const sideNudge = Math.abs(Math.cos(angle)) < 0.2 ? (Math.random() < 0.5 ? -14 : 14) : 0;
        const offsetX = -Math.cos(angle) * guardDist + sideNudge;
        const offsetY = -Math.sin(angle) * guardDist;
        const facing: 1 | -1 = offsetX >= 0 ? -1 : 1;

        const defenderId = `def-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        eng.defenders.push({
          id: defenderId,
          targetUid: target.uid,
          kind: defenderKind,
          x: target.x + offsetX,
          y: target.y + offsetY,
          offsetX,
          offsetY,
          facing,
          parried: false,
          age: 0,
          parryProgress: 0,
        });

        const wrongBulletSpeed = 1050;
        eng.bullets.push({
          id: `bw-${Date.now()}-${Math.random()}`,
          x: shipX + Math.cos(angle) * 24,
          y: shipY + Math.sin(angle) * 24,
          vx: Math.cos(angle) * wrongBulletSpeed,
          vy: Math.sin(angle) * wrongBulletSpeed,
          targetUid: target.uid,
          angle,
          color: '#dc2626',
          isWrong: true,
          deflected: false,
          defenderId,
        });
        break;
      }
    }

    if (destroyed) {
      setInputValue('');
    } else {
      setInputValue(expected.slice(0, target.typedCount));
    }
    syncHud();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleSkip();
    }
  };

  const toggleMute = () => {
    soundEngine.muted = !soundEngine.muted;
    setMuted(soundEngine.muted);
    inputRef.current?.focus();
  };

  // Focus input on mount and resize observer for canvas
  useEffect(() => {
    inputRef.current?.focus();

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const eng = engineRef.current;
      eng.width = rect.width;
      eng.height = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      // Keep existing blocks inside bounds when browser window resizes
      const pageRedLine = window.innerWidth < 640 ? 30 : 66;
      const leftMargin = Math.max(14, pageRedLine - rect.left);
      const rightMargin = 14;
      for (const block of eng.blocks) {
        const minX = leftMargin + block.width / 2 + 10;
        const maxX = Math.max(minX, rect.width - rightMargin - block.width / 2 - 10);
        if (block.x < minX) block.x = minX;
        if (block.x > maxX) block.x = maxX;
      }

      if (!eng.initialized) {
        eng.initialized = true;
        const initialCount = Math.min(2, eng.pendingQueue.length);
        // Spawn right below the floating top HUD for maximum fall distance
        const startHeights = [48, -28];
        for (let i = 0; i < initialCount; i++) {
          spawnWordBlock(startHeights[i]);
        }
        syncHud();
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [spawnWordBlock, syncHud]);

  // Main 60fps Canvas game loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const timeSec = now / 1000;

      const eng = engineRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx && eng.width > 0 && eng.height > 0) {
        const dpr = canvas.width / eng.width;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, eng.width, eng.height);

        // 1. Spawning logic (spaced out comfortably across height)
        if (eng.pendingQueue.length > 0 && !eng.ended) {
          eng.spawnTimer += dt;
          if (eng.blocks.length === 0 || (eng.spawnTimer >= 2.9 && eng.blocks.length < 5)) {
            eng.spawnTimer = 0;
            spawnWordBlock();
            syncHud();
          }
        }

        // 2. Move falling blocks & check bottom boundary (low near the ship)
        const bottomLimit = eng.height - 48;
        let hudDirty = false;
        const survivingBlocks: FallingBlock[] = [];

        for (const block of eng.blocks) {
          block.y += block.speed * dt;
          block.hitJitter = Math.max(0, block.hitJitter - dt * 5);

          if (block.y + block.height / 2 >= bottomLimit) {
            // Reached bottom -> record for review, game continues!
            eng.missedCount += 1;
            eng.reviewItems.push({ word: block.word, reason: 'missed' });
            eng.explosions.push({
              id: `miss-${Date.now()}-${Math.random()}`,
              x: block.x,
              y: bottomLimit - 12,
              progress: 0,
              seed: Math.random() * 500,
              kind: 'miss',
              label: 'Chạm đáy!',
            });
            hudDirty = true;
          } else {
            survivingBlocks.push(block);
          }
        }
        eng.blocks = survivingBlocks;

        // 3. Identify closest target (largest Y)
        let targetBlock: FallingBlock | null = null;
        for (const b of eng.blocks) {
          if (!targetBlock || b.y > targetBlock.y) {
            targetBlock = b;
          }
        }

        if (hudDirty) {
          syncHud();
        }

        // 4. Smoothly aim spaceship toward target (ship sits right at the bottom)
        const shipX = eng.width / 2;
        const shipY = eng.height - 26;
        const desiredAngle = targetBlock
          ? Math.atan2(targetBlock.y - shipY, targetBlock.x - shipX)
          : -Math.PI / 2;
        eng.shipAngle += (desiredAngle - eng.shipAngle) * Math.min(1, dt * 12);
        eng.shipRecoil = Math.max(0, eng.shipRecoil - dt * 40);

        // 5. Update stick-figure defenders
        const activeDefenders: StickDefender[] = [];
        for (const def of eng.defenders) {
          def.age += dt;
          const host = eng.blocks.find((b) => b.uid === def.targetUid);
          if (host) {
            def.x = host.x + def.offsetX;
            def.y = host.y + def.offsetY;
          }
          if (def.parried) {
            def.parryProgress += dt * 1.9;
            if (def.parryProgress < 1) {
              activeDefenders.push(def);
            }
          } else if (host || def.age < 0.65) {
            activeDefenders.push(def);
          }
        }
        eng.defenders = activeDefenders;

        // 6. Update shurikens & mid-air bullet collisions
        const consumedBulletIds = new Set<string>();
        const activeShurikens: Shuriken[] = [];
        for (const s of eng.shurikens) {
          s.spin += dt * 24;
          const targetBullet = eng.bullets.find(
            (b) => b.id === s.bulletId && !b.deflected && !b.frozen && !consumedBulletIds.has(b.id)
          );
          if (targetBullet) {
            const dx = targetBullet.x - s.x;
            const dy = targetBullet.y - s.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 22) {
              // Mid-air collision: both vanish into white ninja smoke!
              consumedBulletIds.add(targetBullet.id);
              const mx = (s.x + targetBullet.x) / 2;
              const my = (s.y + targetBullet.y) / 2;
              soundEngine.playDeflect('ninja');
              eng.explosions.push({
                id: `smoke-${Date.now()}-${Math.random()}`,
                x: mx,
                y: my,
                progress: 0,
                seed: Math.random() * 500,
                kind: 'smoke',
                label: 'Bùm!',
              });
              continue;
            }
            const angle = Math.atan2(dy, dx);
            const shurikenSpeed = 860;
            s.vx = Math.cos(angle) * shurikenSpeed;
            s.vy = Math.sin(angle) * shurikenSpeed;
          }
          s.x += s.vx * dt;
          s.y += s.vy * dt;

          if (
            s.x >= -30 &&
            s.x <= eng.width + 30 &&
            s.y >= -30 &&
            s.y <= eng.height + 30
          ) {
            activeShurikens.push(s);
          }
        }
        eng.shurikens = activeShurikens;

        // 7. Update bullets
        const activeBullets: InkBullet[] = [];
        for (const bullet of eng.bullets) {
          if (consumedBulletIds.has(bullet.id)) continue;

          if (bullet.frozen) {
            // Frozen into a heavy ice cube -> falls straight down under heavy gravity
            bullet.vx = 0;
            bullet.vy += 1280 * dt;
            bullet.y += bullet.vy * dt;
            if (bullet.y >= bottomLimit + 26) {
              eng.explosions.push({
                id: `ice-land-${Date.now()}-${Math.random()}`,
                x: bullet.x,
                y: bottomLimit + 20,
                progress: 0,
                seed: Math.random() * 500,
                kind: 'freeze',
              });
              continue;
            }
          } else if (bullet.deflected) {
            // Deflected bullet arcs away with slight gravity
            bullet.vy += 620 * dt;
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;
            bullet.angle = Math.atan2(bullet.vy, bullet.vx);
          } else if (bullet.isWrong) {
            const def = eng.defenders.find((d) => d.id === bullet.defenderId);
            if (def && !def.parried) {
              const guardX = def.x + def.facing * 8;
              const guardY = def.y;
              const dx = guardX - bullet.x;
              const dy = guardY - bullet.y;
              const dist = Math.hypot(dx, dy);

              if (def.kind === 'wand') {
                if (dist < 64) {
                  // Wizard waves wand & shoots ice ray -> freezes bullet into heavy ice cube!
                  bullet.frozen = true;
                  bullet.vx = 0;
                  bullet.vy = 55;
                  bullet.iceTilt = (Math.random() - 0.5) * 0.22;

                  def.parried = true;
                  def.parryProgress = 0;
                  def.beamTargetX = bullet.x;
                  def.beamTargetY = bullet.y;

                  soundEngine.playDeflect('wand');
                  eng.explosions.push({
                    id: `freeze-${Date.now()}-${Math.random()}`,
                    x: bullet.x,
                    y: bullet.y,
                    progress: 0,
                    seed: Math.random() * 500,
                    kind: 'freeze',
                    label: 'Đóng băng!',
                  });
                } else {
                  const angle = Math.atan2(dy, dx);
                  const speed = 1050;
                  bullet.vx = Math.cos(angle) * speed;
                  bullet.vy = Math.sin(angle) * speed;
                  bullet.angle = angle;
                  bullet.x += bullet.vx * dt;
                  bullet.y += bullet.vy * dt;
                }
              } else if (def.kind === 'ninja') {
                // Ninja throws a small shuriken out to intercept bullet mid-air!
                if (!def.threwShuriken && (dist < 175 || def.age >= 0.08)) {
                  def.threwShuriken = true;
                  def.parried = true;
                  def.parryProgress = 0;

                  const sx = def.x + def.facing * 10;
                  const sy = def.y;
                  const sAngle = Math.atan2(bullet.y - sy, bullet.x - sx);
                  const shurikenSpeed = 860;
                  eng.shurikens.push({
                    id: `sh-${Date.now()}-${Math.random()}`,
                    x: sx,
                    y: sy,
                    vx: Math.cos(sAngle) * shurikenSpeed,
                    vy: Math.sin(sAngle) * shurikenSpeed,
                    spin: 0,
                    bulletId: bullet.id,
                  });
                }
                const angle = Math.atan2(dy, dx);
                const speed = 960;
                bullet.vx = Math.cos(angle) * speed;
                bullet.vy = Math.sin(angle) * speed;
                bullet.angle = angle;
                bullet.x += bullet.vx * dt;
                bullet.y += bullet.vy * dt;
              } else {
                // Sword or Shield parry!
                if (dist < 22) {
                  bullet.deflected = true;
                  def.parried = true;
                  def.parryProgress = 0;

                  const side = Math.random() < 0.5 ? 1 : -1;
                  const bounceAngle = bullet.angle + Math.PI + side * (0.55 + Math.random() * 0.65);
                  const bounceSpeed = 860;
                  bullet.vx = Math.cos(bounceAngle) * bounceSpeed;
                  bullet.vy = Math.sin(bounceAngle) * bounceSpeed;
                  bullet.angle = bounceAngle;

                  soundEngine.playDeflect(def.kind);
                  eng.explosions.push({
                    id: `deflect-${Date.now()}-${Math.random()}`,
                    x: guardX,
                    y: guardY,
                    progress: 0,
                    seed: Math.random() * 500,
                    kind: 'deflect',
                    label: def.kind === 'sword' ? 'Keng!' : 'Bộp!',
                  });
                } else {
                  const angle = Math.atan2(dy, dx);
                  const speed = 1050;
                  bullet.vx = Math.cos(angle) * speed;
                  bullet.vy = Math.sin(angle) * speed;
                  bullet.angle = angle;
                  bullet.x += bullet.vx * dt;
                  bullet.y += bullet.vy * dt;
                }
              }
            } else {
              // If ninja already threw shuriken, let bullet keep moving toward collision point!
              bullet.x += bullet.vx * dt;
              bullet.y += bullet.vy * dt;
            }
          } else {
            const dest = eng.blocks.find((b) => b.uid === bullet.targetUid);
            if (dest) {
              const dx = dest.x - bullet.x;
              const dy = dest.y - bullet.y;
              const dist = Math.hypot(dx, dy);
              if (dist < 22) {
                dest.hitJitter = 1;
                continue; // bullet hit target
              }
              const angle = Math.atan2(dy, dx);
              const speed = 1350;
              bullet.vx = Math.cos(angle) * speed;
              bullet.vy = Math.sin(angle) * speed;
              bullet.angle = angle;
            }
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;
          }

          if (
            bullet.x >= -30 &&
            bullet.x <= eng.width + 30 &&
            bullet.y >= -30 &&
            bullet.y <= eng.height + 30
          ) {
            activeBullets.push(bullet);
          }
        }
        eng.bullets = activeBullets;

        // 8. Update explosions
        eng.explosions = eng.explosions
          .map((exp) => ({ ...exp, progress: exp.progress + dt * 1.9 }))
          .filter((exp) => exp.progress < 1);

        // 9. Draw subtle dashed floor line in pencil
        const floorLeftMargin = Math.max(12, (window.innerWidth < 640 ? 28 : 64) - canvas.getBoundingClientRect().left);
        ctx.save();
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        ctx.moveTo(floorLeftMargin, bottomLimit);
        ctx.lineTo(eng.width - 12, bottomLimit);
        ctx.stroke();
        ctx.restore();

        // 10. Draw non-target blocks first, then target block on top so red ring stands out
        for (const block of eng.blocks) {
          if (!targetBlock || block.uid !== targetBlock.uid) {
            drawFallingBlock(ctx, block, false, timeSec);
          }
        }
        if (targetBlock) {
          drawFallingBlock(ctx, targetBlock, true, timeSec);
        }

        // 11. Draw stick-figure defenders, shurikens, bullets, explosions, and doodle spaceship
        for (const def of eng.defenders) {
          drawStickDefender(ctx, def);
        }
        for (const s of eng.shurikens) {
          drawShuriken(ctx, s);
        }
        for (const bullet of eng.bullets) {
          drawInkBullet(ctx, bullet);
        }
        for (const exp of eng.explosions) {
          drawDoodleExplosion(ctx, exp);
        }
        drawDoodleSpaceship(ctx, shipX, shipY, eng.shipAngle, eng.shipRecoil, timeSec);

        // 10. Check game completion
        if (
          !eng.ended &&
          eng.pendingQueue.length === 0 &&
          eng.blocks.length === 0
        ) {
          if (eng.finishScheduledAt === null) {
            eng.finishScheduledAt = now;
          } else if (now - eng.finishScheduledAt >= 550 && eng.explosions.length === 0) {
            eng.ended = true;
            soundEngine.playFinish();
            onFinishGame({
              totalWords: words.length,
              correctCount: eng.correctCount,
              skippedCount: eng.skippedCount,
              missedCount: eng.missedCount,
              reviewItems: eng.reviewItems,
            });
            return;
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onFinishGame, spawnWordBlock, syncHud, words.length]);

  return (
    <div
      className="h-dvh overflow-hidden flex flex-col notebook-paper relative select-none"
      onClick={() => inputRef.current?.focus()}
    >
      <NotebookBinderHoles />

      {/* Centered, focused notebook play column */}
      <div className="flex-1 min-h-0 w-full max-w-[820px] mx-auto flex flex-col relative lg:border-x lg:border-dashed lg:border-slate-400/50">
        {/* Floating minimal corner HUD so canvas uses full top-to-bottom height */}
        <header className="pointer-events-none absolute top-1.5 left-9 sm:left-16 lg:left-3 right-3 flex items-center justify-between gap-2 z-20">
          <div className="pointer-events-auto bg-[#fcf9f2]/88 px-2.5 py-0.5 rounded-md border border-slate-300/80 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-700 tabular-nums whitespace-nowrap">
            <span>
              Đã bắn: <strong className="text-emerald-700">{hudState.correct}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Bỏ qua: <strong className="text-amber-700">{hudState.skipped}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Còn lại: <strong className="text-slate-900">{hudState.remaining}</strong>
            </span>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="w-8 h-8 rounded-lg border-2 border-slate-800 bg-[#fcf9f2]/95 hover:bg-amber-100 flex items-center justify-center text-slate-800 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExitToSetup();
              }}
              className="sketch-btn bg-[#fcf9f2] hover:bg-rose-100 text-slate-900 px-2.5 py-1 text-xs sm:text-sm font-display flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Thoát</span>
            </button>
          </div>
        </header>

        {/* Full-height 2D Canvas Playfield */}
        <div ref={containerRef} className="flex-1 relative min-h-0 w-full">
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>

        {/* Compact Bottom Input & Skip Bar */}
        <div className="shrink-0 pl-8 sm:pl-16 lg:pl-4 pr-3 sm:pr-4 pb-2 pt-1 bg-[#fcf9f2]/92 border-t border-dashed border-slate-300/60 z-10">
          <div className="max-w-lg mx-auto flex items-stretch gap-2">
            <div
              className={`relative flex-1 ${wrongShake ? 'animate-doodle-shake' : ''}`}
              onAnimationEnd={() => setWrongShake(false)}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  hudState.targetVietnamese
                    ? `Gõ tiếng Anh cho "${hudState.targetVietnamese}"...`
                    : 'Đang chuẩn bị mục tiêu...'
                }
                aria-label="Nhập từ tiếng Anh tương ứng với mục tiêu"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                lang="en"
                className={`sketch-input w-full pl-3 pr-12 py-1 text-base sm:text-lg font-bold tracking-wide text-slate-900 placeholder:text-slate-500 placeholder:font-normal ${
                  wrongShake ? 'border-red-600 bg-red-50/90' : ''
                }`}
              />
              {hudState.targetVietnamese && (
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 tabular-nums">
                  {hudState.targetTypedCount}/{hudState.targetTotalLength}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip();
              }}
              disabled={!hudState.targetVietnamese}
              title="Bỏ qua từ này (phím Tab)"
              className="sketch-btn bg-amber-200 hover:bg-amber-300 text-slate-900 font-display text-sm px-3 py-1 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <SkipForward className="w-4 h-4" />
              <span>Skip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
