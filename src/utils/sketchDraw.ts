import { DoodleExplosion, FallingBlock, InkBullet, Shuriken, StickDefender } from '../types/vocab';

function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Traces a slightly imperfect, hand-drawn rounded rectangle path.
 */
function traceWobblyRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  seed: number,
  wobbleAmt = 2.2
) {
  const j = (offset: number) => (seededRand(seed + offset) - 0.5) * wobbleAmt * 2;
  const hw = w / 2;
  const hh = h / 2;
  const left = x - hw;
  const right = x + hw;
  const top = y - hh;
  const bottom = y + hh;

  ctx.beginPath();
  ctx.moveTo(left + r + j(1), top + j(2));
  // Top edge (two quadratic curves for natural hand tremor)
  ctx.quadraticCurveTo(x + j(3), top + j(4) * 0.8, right - r + j(5), top + j(6));
  // Top-right corner
  ctx.quadraticCurveTo(right + j(7), top + j(8), right + j(9), top + r + j(10));
  // Right edge
  ctx.quadraticCurveTo(right + j(11) * 0.8, y + j(12), right + j(13), bottom - r + j(14));
  // Bottom-right corner
  ctx.quadraticCurveTo(right + j(15), bottom + j(16), right - r + j(17), bottom + j(18));
  // Bottom edge
  ctx.quadraticCurveTo(x + j(19), bottom + j(20) * 0.8, left + r + j(21), bottom + j(22));
  // Bottom-left corner
  ctx.quadraticCurveTo(left + j(23), bottom + j(24), left + j(25), bottom - r + j(26));
  // Left edge
  ctx.quadraticCurveTo(left + j(27) * 0.8, y + j(28), left + j(29), top + r + j(30));
  // Top-left corner
  ctx.quadraticCurveTo(left + j(31), top + j(32), left + r + j(1), top + j(2));
  ctx.closePath();
}

export function drawFallingBlock(
  ctx: CanvasRenderingContext2D,
  block: FallingBlock,
  isTarget: boolean,
  timeSec: number
) {
  ctx.save();

  // Gentle shiver when targeted or hit by bullet
  const targetShakeX = isTarget ? Math.sin(timeSec * 18) * 1.1 : 0;
  const targetShakeY = isTarget ? Math.cos(timeSec * 14) * 0.7 : 0;
  const hitOffsetX = (Math.random() - 0.5) * block.hitJitter * 6;
  const hitOffsetY = -block.hitJitter * 4;

  ctx.translate(
    block.x + targetShakeX + hitOffsetX,
    block.y + targetShakeY + hitOffsetY
  );
  ctx.rotate(block.tilt + (isTarget ? Math.sin(timeSec * 6) * 0.015 : 0));

  const w = block.width;
  const h = block.height;

  // Hard ink offset shadow like a paper sticker
  ctx.save();
  ctx.translate(2.5, 3);
  traceWobblyRoundedRect(ctx, 0, 0, w, h, 11, block.seed + 99, 1.3);
  ctx.fillStyle = isTarget ? 'rgba(220, 38, 38, 0.28)' : 'rgba(30, 41, 59, 0.18)';
  ctx.fill();
  ctx.restore();

  // Highlighter / crayon fill
  traceWobblyRoundedRect(ctx, 0, 0, w, h, 11, block.seed, 1.8);
  ctx.fillStyle = block.color.fill;
  ctx.fill();

  // Crayon / marker diagonal inner stroke accent
  ctx.save();
  ctx.clip();
  ctx.fillStyle = block.color.wash;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(-w * 0.55, h * 0.15);
  ctx.lineTo(w * 0.55, -h * 0.25);
  ctx.lineTo(w * 0.55, h * 0.55);
  ctx.lineTo(-w * 0.55, h * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Ballpoint pen outline
  traceWobblyRoundedRect(ctx, 0, 0, w, h, 11, block.seed, 1.8);
  ctx.lineWidth = isTarget ? 2.6 : 1.9;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  // Faint second pen stroke for hand-sketched feel
  traceWobblyRoundedRect(ctx, 0.6, -0.5, w, h, 11, block.seed + 7, 1.9);
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.42)';
  ctx.stroke();

  // Active target red pen loop & corner ticks
  if (isTarget) {
    ctx.save();
    const rx = w / 2 + 9;
    const ry = h / 2 + 7;
    const wobble = Math.sin(timeSec * 5) * 1.0;

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';

    // Outer hand-drawn red pen loop (slightly open loop look)
    ctx.beginPath();
    const steps = 26;
    for (let i = 0; i <= steps + 3; i++) {
      const a = (i / steps) * Math.PI * 2 - 0.3;
      const rNoise = (seededRand(block.seed + i * 3) - 0.5) * 3.0;
      const px = Math.cos(a) * (rx + rNoise + wobble);
      const py = Math.sin(a) * (ry + rNoise * 0.65);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Little red pen arrow tick pointing from left
    ctx.beginPath();
    ctx.moveTo(-rx - 11, 0);
    ctx.lineTo(-rx - 3, 0);
    ctx.moveTo(-rx - 6.5, -3.5);
    ctx.lineTo(-rx - 2.5, 0);
    ctx.lineTo(-rx - 6.5, 3.5);
    ctx.stroke();
    ctx.restore();
  }

  // Vietnamese meaning text inside block
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 17px "Patrick Hand", cursive, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const hasTyped = block.typedCount > 0;
  const textShiftY = hasTyped ? -6 : 0;

  if (block.lines.length === 1) {
    ctx.fillText(block.lines[0], 0, textShiftY);
  } else {
    ctx.fillText(block.lines[0], 0, textShiftY - 8.5);
    ctx.fillText(block.lines[1], 0, textShiftY + 8.5);
  }

  // Show already-typed correct prefix letters as ink feedback on the block (never spoils remaining letters)
  if (hasTyped) {
    const typedStr = block.word.english.slice(0, block.typedCount);
    const totalLen = block.word.english.length;
    const remainingDots = Math.max(0, totalLen - block.typedCount);
    const progressText = `${typedStr}${'·'.repeat(Math.min(remainingDots, 6))}`;

    ctx.font = 'bold 12px "Pangolin", cursive, sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.fillText(progressText, 0, h / 2 - 8.5);
  }

  ctx.restore();
}

export function drawDoodleSpaceship(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  recoil: number,
  timeSec: number
) {
  ctx.save();
  // Apply recoil opposite to aim direction
  const rx = x - Math.cos(angle) * recoil;
  const ry = y - Math.sin(angle) * recoil;

  ctx.translate(rx, ry);
  ctx.rotate(angle + Math.PI / 2); // ship nose points up at angle -PI/2
  ctx.scale(0.84, 0.84);

  // Animated pencil/orange doodle thruster flame
  const flameFlicker = 6 + Math.sin(timeSec * 28) * 3.5;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-7, 18);
  ctx.lineTo(-3, 25 + flameFlicker * 0.7);
  ctx.lineTo(0, 22 + flameFlicker);
  ctx.lineTo(4, 24 + flameFlicker * 0.6);
  ctx.lineTo(7, 18);
  ctx.closePath();
  ctx.fillStyle = '#fb923c';
  ctx.fill();
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  // Wings (left and right doodle fins)
  ctx.fillStyle = '#93c5fd';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';

  // Left fin
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.quadraticCurveTo(-22, 12, -20, 20);
  ctx.lineTo(-8, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right fin
  ctx.beginPath();
  ctx.moveTo(9, 2);
  ctx.quadraticCurveTo(22, 12, 20, 20);
  ctx.lineTo(8, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Main rocket body (hand-sketched white notebook paper rocket)
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.quadraticCurveTo(13, -6, 10, 16);
  ctx.quadraticCurveTo(0, 19, -10, 16);
  ctx.quadraticCurveTo(-13, -6, 0, -24);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Ballpoint pen shading lines on right side of fuselage
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(29, 78, 216, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.moveTo(5, -6);
  ctx.lineTo(9, -3);
  ctx.moveTo(5, 0);
  ctx.lineTo(9.5, 3);
  ctx.moveTo(4.5, 6);
  ctx.lineTo(9, 9);
  ctx.stroke();

  // Red nose cone tip
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.quadraticCurveTo(5, -16, 6.5, -11);
  ctx.quadraticCurveTo(0, -9, -6.5, -11);
  ctx.quadraticCurveTo(-5, -16, 0, -24);
  ctx.closePath();
  ctx.fillStyle = '#fca5a5';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Porthole window
  ctx.beginPath();
  ctx.arc(0, -1, 5.2, 0, Math.PI * 2);
  ctx.fillStyle = '#bae6fd';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Little glare dot inside window
  ctx.beginPath();
  ctx.arc(-1.8, -2.5, 1.3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}

export function drawInkBullet(ctx: CanvasRenderingContext2D, bullet: InkBullet) {
  ctx.save();
  ctx.translate(bullet.x, bullet.y);

  if (bullet.frozen) {
    // Heavy sketched ice cube encasing the bullet as it plummets straight down
    ctx.rotate(bullet.iceTilt ?? 0.08);

    // Subtle vertical speed lines above ice cube
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -15);
    ctx.lineTo(-6, -24);
    ctx.moveTo(5, -14);
    ctx.lineTo(5, -22);
    ctx.stroke();

    // Ice cube body
    ctx.fillStyle = 'rgba(186, 230, 253, 0.92)';
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-10, -9);
    ctx.lineTo(9, -10);
    ctx.lineTo(11, 9);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner ice shine & facet lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, -5);
    ctx.lineTo(-2, -6);
    ctx.moveTo(-6, -5);
    ctx.lineTo(-5, 1);
    ctx.stroke();

    // Red bullet trapped inside the ice cube
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
    return;
  }

  ctx.rotate(bullet.angle);

  // Small ink stroke / pen dash with slight tail
  ctx.strokeStyle = bullet.isWrong ? '#dc2626' : bullet.color;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(5, 0);
  ctx.stroke();

  // Ink drop tip
  ctx.fillStyle = bullet.isWrong ? '#ef4444' : '#1d4ed8';
  ctx.beginPath();
  ctx.arc(5, 0, 2.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawShuriken(ctx: CanvasRenderingContext2D, shuriken: Shuriken) {
  ctx.save();
  ctx.translate(shuriken.x, shuriken.y);
  ctx.rotate(shuriken.spin);

  ctx.fillStyle = '#cbd5e1';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.7;
  ctx.lineJoin = 'round';

  // 4-point hand-drawn ninja star
  ctx.beginPath();
  const outer = 9.5;
  const inner = 2.8;
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / 4;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center hole
  ctx.fillStyle = '#fcf9f2';
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function drawStickDefender(ctx: CanvasRenderingContext2D, def: StickDefender) {
  // Pop-in scale & fade-out after parrying
  const popScale = Math.min(1, def.age / 0.1);
  const fadeOut = def.parried ? Math.max(0, 1 - Math.max(0, (def.parryProgress - 0.55) / 0.45)) : 1;
  if (fadeOut <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = fadeOut;
  ctx.translate(def.x, def.y);
  ctx.scale(def.facing * popScale, popScale);

  // Subtle white paper halo behind stickman so ink lines read cleanly over notebook lines
  ctx.fillStyle = 'rgba(252, 249, 242, 0.72)';
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1e293b';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.1;

  // Little lunge bounce when parrying
  const lungeX = def.parried ? Math.sin(Math.min(1, def.parryProgress * 3) * Math.PI) * 5 : 0;
  ctx.translate(lungeX, 0);

  // Head
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -11, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Determined little eyes
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(2.2, -11.4, 0.9, 0, Math.PI * 2);
  ctx.arc(-0.5, -11.4, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  ctx.beginPath();
  ctx.moveTo(0, -5.5);
  ctx.lineTo(-1, 6);
  ctx.stroke();

  // Legs (braced stance)
  ctx.beginPath();
  ctx.moveTo(-1, 6);
  ctx.lineTo(-6, 15);
  ctx.moveTo(-1, 6);
  ctx.lineTo(5.5, 14.5);
  ctx.stroke();

  // Back arm
  ctx.beginPath();
  ctx.moveTo(-0.5, -2);
  ctx.lineTo(-6.5, 2.5);
  ctx.stroke();

  if (def.kind === 'sword') {
    // Sword arm + doodle sword
    const swingT = def.parried ? Math.min(1, def.parryProgress * 4.5) : 0;
    const swordAngle = -0.95 + swingT * 2.15; // swings rapidly from raised (-0.95) down across front (+1.2)

    ctx.save();
    ctx.translate(1, -2);

    // Front arm reaching to hilt
    const handX = 7;
    const handY = 1 + swingT * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    // Sword drawn from hand
    ctx.translate(handX, handY);
    ctx.rotate(swordAngle);

    // Crossguard
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-3.5, 0);
    ctx.lineTo(3.5, 0);
    ctx.stroke();

    // Blade
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(-1.8, 0);
    ctx.lineTo(-1.2, -16);
    ctx.lineTo(0, -19.5);
    ctx.lineTo(1.2, -16);
    ctx.lineTo(1.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Curved ink slash arc during parry!
    if (def.parried && def.parryProgress < 0.55) {
      const slashAlpha = 1 - def.parryProgress / 0.55;
      ctx.save();
      ctx.globalAlpha *= slashAlpha;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(8, 1, 18, -1.25, 0.95);
      ctx.stroke();

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(9, 1, 22, -0.9, 0.7);
      ctx.stroke();
      ctx.restore();
    }
  } else if (def.kind === 'shield') {
    // Shield stickman: bracing shield out front!
    const thrust = def.parried ? Math.sin(Math.min(1, def.parryProgress * 4) * Math.PI) * 5 : 0;

    // Front arm holding shield
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(7 + thrust, 1);
    ctx.stroke();

    // Hand-drawn shield
    ctx.save();
    ctx.translate(9.5 + thrust, 1);
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.moveTo(-4, -9);
    ctx.quadraticCurveTo(3, -10, 6.5, -7);
    ctx.quadraticCurveTo(8, 2, 2, 10);
    ctx.quadraticCurveTo(-4, 6, -4, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Shield boss / center circle
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath();
    ctx.arc(1.5, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    // Bounce shockwave arcs when shield deflects bullet
    if (def.parried && def.parryProgress < 0.55) {
      const waveAlpha = 1 - def.parryProgress / 0.55;
      const spread = def.parryProgress * 14;
      ctx.save();
      ctx.globalAlpha *= waveAlpha;
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.arc(15 + spread * 0.5, 1, 9 + spread * 0.4, -0.75, 0.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(18 + spread * 0.8, 1, 13 + spread * 0.5, -0.6, 0.6);
      ctx.stroke();
      ctx.restore();
    }
  } else if (def.kind === 'wand') {
    // Wizard stickman: cute pointed hat + magic wand that fires ice ray!
    ctx.save();
    ctx.fillStyle = '#93c5fd';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-7, -15);
    ctx.lineTo(0, -25);
    ctx.lineTo(6.5, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const castWave = def.parried ? Math.min(1, def.parryProgress * 4) : 0;
    const wandAngle = -0.8 + castWave * 1.15;

    ctx.save();
    ctx.translate(1, -2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(7, -1 + castWave * 3);
    ctx.stroke();

    ctx.translate(7, -1 + castWave * 3);
    ctx.rotate(wandAngle);

    // Wand stick
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -14);
    ctx.stroke();

    // Glowing ice-star wand tip
    ctx.fillStyle = '#7dd3fc';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -15.5, 3.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else {
    // Ninja stickman: red headband with fluttering tails + shuriken throw pose
    ctx.save();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-5.5, -13.5);
    ctx.lineTo(5.5, -13.5);
    // Headband tails fluttering behind
    ctx.moveTo(-5.5, -13.5);
    ctx.lineTo(-11, -15.5);
    ctx.moveTo(-5.5, -13.5);
    ctx.lineTo(-10, -11);
    ctx.stroke();
    ctx.restore();

    // Throwing arm extended forward once thrown
    const throwPose = def.threwShuriken || def.parried ? 1 : 0;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(throwPose ? 10 : 4, throwPose ? 1 : -5);
    ctx.stroke();

    // Small shuriken in hand before throwing
    if (!def.threwShuriken && !def.parried) {
      ctx.save();
      ctx.translate(5, -6);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-3.5, 0);
      ctx.lineTo(3.5, 0);
      ctx.moveTo(0, -3.5);
      ctx.lineTo(0, 3.5);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();

  // Draw world-space ice ray from wand cast to target bullet when freezing
  if (
    def.kind === 'wand' &&
    def.parried &&
    def.parryProgress < 0.45 &&
    def.beamTargetX !== undefined &&
    def.beamTargetY !== undefined
  ) {
    const beamAlpha = 1 - def.parryProgress / 0.45;
    const startX = def.x + def.facing * 12;
    const startY = def.y - 6;
    const endX = def.beamTargetX;
    const endY = def.beamTargetY;
    const midX = (startX + endX) / 2 + (seededRand(def.x) - 0.5) * 10;
    const midY = (startY + endY) / 2 + (seededRand(def.y) - 0.5) * 10;

    ctx.save();
    ctx.globalAlpha = beamAlpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer frost glow stroke
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(midX, midY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Crisp inner icy blue beam
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(midX, midY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSketchStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.strokeStyle = color;
  ctx.fillStyle = '#fef08a';
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';

  ctx.beginPath();
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.42;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawDoodleExplosion(ctx: CanvasRenderingContext2D, exp: DoodleExplosion) {
  const p = exp.progress; // 0 -> 1
  const alpha = Math.max(0, 1 - Math.pow(p, 1.6));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(exp.x, exp.y);

  if (exp.kind === 'destroy') {
    // 1. Radiating ink rays
    const rayCount = 10;
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2 + seededRand(exp.seed + i) * 0.35;
      const innerR = 12 + p * 26;
      const outerR = 24 + p * 54 + seededRand(exp.seed + i + 50) * 14;
      ctx.strokeStyle = i % 2 === 0 ? '#dc2626' : '#1e293b';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
      ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
      ctx.stroke();
    }

    // 2. Pencil smoke puffs (curling clouds)
    const puffCount = 5;
    for (let i = 0; i < puffCount; i++) {
      const a = (i / puffCount) * Math.PI * 2 + 0.4;
      const dist = 10 + p * 34;
      const px = Math.cos(a) * dist;
      const py = Math.sin(a) * dist;
      const r = 7 + p * 10;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(px, py, r, 0.2, Math.PI * 1.85);
      ctx.stroke();
    }

    // 3. Hand-drawn stars
    const starCount = 4;
    for (let i = 0; i < starCount; i++) {
      const a = (i / starCount) * Math.PI * 2 + 0.7;
      const dist = 16 + p * 46;
      drawSketchStar(
        ctx,
        Math.cos(a) * dist,
        Math.sin(a) * dist,
        8 * (1 - p * 0.35),
        p * 2.5 + i,
        '#1e293b'
      );
    }

    // 4. Floating English word confirmation in ink!
    if (exp.label) {
      ctx.font = 'bold 18px "Pangolin", cursive, sans-serif';
      ctx.fillStyle = '#15803d';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`✓ ${exp.label}`, 0, -p * 22);
    }
  } else if (exp.kind === 'deflect') {
    // Sharp comic clash sparks when sword/shield knocks bullet away
    const sparkCount = 6;
    for (let i = 0; i < sparkCount; i++) {
      const a = (i / sparkCount) * Math.PI * 2 + seededRand(exp.seed + i) * 0.4;
      const r1 = 4 + p * 12;
      const r2 = 10 + p * 22;
      ctx.strokeStyle = i % 2 === 0 ? '#f59e0b' : '#2563eb';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    if (exp.label) {
      ctx.font = 'bold 13px "Pangolin", cursive, sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'center';
      ctx.fillText(exp.label, 0, -10 - p * 12);
    }
  } else if (exp.kind === 'freeze') {
    // Frost crystal burst when wand freezes bullet
    const rayCount = 6;
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2;
      const r1 = 3 + p * 8;
      const r2 = 10 + p * 18;
      ctx.strokeStyle = i % 2 === 0 ? '#0284c7' : '#7dd3fc';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    if (exp.label) {
      ctx.font = 'bold 13px "Pangolin", cursive, sans-serif';
      ctx.fillStyle = '#0369a1';
      ctx.textAlign = 'center';
      ctx.fillText(exp.label, 0, -12 - p * 10);
    }
  } else if (exp.kind === 'smoke') {
    // White ninja smoke clouds billowing outward on mid-air collision
    const puffCount = 7;
    for (let i = 0; i < puffCount; i++) {
      const a = (i / puffCount) * Math.PI * 2 + seededRand(exp.seed + i) * 0.4;
      const dist = i === 0 ? 0 : 6 + p * 22;
      const px = Math.cos(a) * dist;
      const py = Math.sin(a) * dist;
      const r = (i === 0 ? 11 : 7.5) + p * 8;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (exp.label) {
      ctx.font = 'bold 13px "Pangolin", cursive, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.fillText(exp.label, 0, -16 - p * 12);
    }
  } else {
    // Soft pencil scribble puff for skip or bottom miss
    const puffCount = 4;
    for (let i = 0; i < puffCount; i++) {
      const a = (i / puffCount) * Math.PI * 2;
      const dist = 8 + p * 22;
      ctx.strokeStyle = exp.kind === 'miss' ? '#dc2626' : '#64748b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, 6 + p * 6, 0, Math.PI * 1.7);
      ctx.stroke();
    }
    if (exp.label) {
      ctx.font = '16px "Patrick Hand", cursive, sans-serif';
      ctx.fillStyle = exp.kind === 'miss' ? '#dc2626' : '#475569';
      ctx.textAlign = 'center';
      ctx.fillText(exp.label, 0, -p * 16);
    }
  }

  ctx.restore();
}

export function wrapVietnameseText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length <= 1) return [text.trim()];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const next = `${current} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);

  if (lines.length > 2) {
    return [lines[0], lines.slice(1).join(' ')];
  }
  return lines;
}
