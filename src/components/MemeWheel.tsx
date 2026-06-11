import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './MemeWheel.module.css';

interface WheelItem {
  id: string;
  label: string;
  color: string;
  textColor: string;
  weight: number;
  fake?: boolean;
  redirectTo?: string;
}

const ITEMS: WheelItem[] = [
  { id: '1', label: 'R$ 1.000 💸',       color: '#16a34a', textColor: '#dcfce7', weight: 60, fake: true, redirectTo: '4' },
  { id: '2', label: 'Tente de novo 🔄',   color: '#1d4ed8', textColor: '#dbeafe', weight: 20 },
  { id: '3', label: 'Quase lá... 😬',     color: '#7c3aed', textColor: '#ede9fe', weight: 12 },
  { id: '4', label: 'Jatada na cara 🤕',  color: '#b91c1c', textColor: '#fee2e2', weight: 8  },
];

const SIZE = 340;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2 - 8;
const TWO_PI = Math.PI * 2;

// ── segment layout ───────────────────────────────────────────
// Segments are laid out starting at angle 0 (right), going clockwise.
// The pointer is fixed at the TOP (-PI/2). The wheel rotates.
// A segment is "under the pointer" when the wheel rotation places it at top.

function getSegments(items: WheelItem[]) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let acc = 0;
  return items.map(item => {
    const startFrac = acc / total;          // 0..1
    const span = item.weight / total;       // 0..1
    acc += item.weight;
    return { item, startFrac, span, midFrac: startFrac + span / 2 };
  });
}

const SEGMENTS = getSegments(ITEMS);

// Given current wheel rotation (turns, 0..1), which item is under the pointer?
// Pointer is at top = -0.25 turns (or 0.75 in mod space).
// The segment that contains (0.75 - rotation) mod 1 wins.
function getWinner(rotTurns: number): number {
  const pointer = ((0.75 - rotTurns) % 1 + 1) % 1; // 0..1 position under pointer
  for (let i = 0; i < SEGMENTS.length; i++) {
    const { startFrac, span } = SEGMENTS[i];
    if (pointer >= startFrac && pointer < startFrac + span) return i;
  }
  return 0;
}

// What rotation (turns) puts the CENTER of segment[idx] under the pointer?
function rotationForIdx(idx: number): number {
  const { midFrac } = SEGMENTS[idx];
  // We want pointer = midFrac → (0.75 - rot) mod 1 = midFrac → rot = 0.75 - midFrac
  return ((0.75 - midFrac) % 1 + 1) % 1;
}

// ── draw ─────────────────────────────────────────────────────
function drawWheel(canvas: HTMLCanvasElement, rotTurns: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, SIZE, SIZE);

  const rotRad = rotTurns * TWO_PI;

  // shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(CX, CY, R + 4, 0, TWO_PI);
  ctx.fillStyle = '#0d1117';
  ctx.fill();
  ctx.restore();

  SEGMENTS.forEach(({ item, startFrac, span }) => {
    const startRad = startFrac * TWO_PI + rotRad;
    const endRad   = startRad + span * TWO_PI;
    const midRad   = startRad + (span * TWO_PI) / 2;

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, startRad, endRad);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // text
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(midRad);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = item.textColor;
    ctx.font = `bold ${Math.min(13, 260 / ITEMS.length)}px Inter, system-ui, sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;
    const maxW = R - 44;
    let text = item.label;
    if (ctx.measureText(text).width > maxW) {
      while (ctx.measureText(text + '…').width > maxW && text.length > 0) text = text.slice(0, -1);
      text += '…';
    }
    ctx.fillText(text, R - 16, 0);
    ctx.restore();
  });

  // border
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, TWO_PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // center cap
  const grad = ctx.createRadialGradient(CX - 6, CY - 6, 2, CX, CY, 26);
  grad.addColorStop(0, '#2a3040');
  grad.addColorStop(1, '#0d1117');
  ctx.beginPath();
  ctx.arc(CX, CY, 24, 0, TWO_PI);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, 5, 0, TWO_PI);
  ctx.fillStyle = '#17d585';
  ctx.fill();

  // pointer at top
  ctx.save();
  ctx.translate(CX, 6);
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fillStyle = '#17d585';
  ctx.shadowColor = '#17d585';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();
}

// ── easing ───────────────────────────────────────────────────
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOutSine(t: number) { return -(Math.cos(Math.PI * t) - 1) / 2; }

// ── component ────────────────────────────────────────────────
type Phase = 'idle' | 'spinning' | 'slow' | 'done';

export function MemeWheel() {
  const [open, setOpen]     = useState(false);
  const [phase, setPhase]   = useState<Phase>('idle');
  const [rotTurns, setRotTurns] = useState(0);
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const rotRef    = useRef(0);

  const setRot = useCallback((r: number) => {
    rotRef.current = r;
    setRotTurns(r);
  }, []);

  useEffect(() => {
    if (canvasRef.current) drawWheel(canvasRef.current, rotTurns);
  }, [rotTurns]);

  useEffect(() => {
    if (open && canvasRef.current) drawWheel(canvasRef.current, rotRef.current);
  }, [open]);

  const spin = useCallback(() => {
    if (phase !== 'idle' && phase !== 'done') return;
    setWinner(null);
    setPhase('spinning');

    // weighted pick
    const total = ITEMS.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    let pickedIdx = 0;
    for (let i = 0; i < ITEMS.length; i++) {
      r -= ITEMS[i].weight;
      if (r <= 0) { pickedIdx = i; break; }
    }

    const picked = ITEMS[pickedIdx];
    const landRot = rotationForIdx(pickedIdx); // 0..1 fractional turns
    // Add 6–9 full spins on top of landing rotation
    const spins = 6 + Math.floor(Math.random() * 4);
    const curFrac = ((rotRef.current % 1) + 1) % 1;
    const diff = ((landRot - curFrac) + 1) % 1; // how much to turn to reach landing
    const targetTurns = rotRef.current + spins + diff;

    const startTurns = rotRef.current;
    const duration = 4500;
    const t0 = performance.now();

    cancelAnimationFrame(rafRef.current);

    const animate = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      setRot(startTurns + (targetTurns - startTurns) * easeOutCubic(t));

      if (t < 1) { rafRef.current = requestAnimationFrame(animate); return; }

      // verify winner (sanity check)
      const actualIdx = getWinner(rotRef.current);

      if (picked.fake && picked.redirectTo) {
        // slow spin to real target
        setPhase('slow');

        const realIdx = ITEMS.findIndex(i => i.id === picked.redirectTo);
        const realLand = rotationForIdx(realIdx);
        const slowStart = rotRef.current;
        const slowCurFrac = ((slowStart % 1) + 1) % 1;
        const slowDiff = ((realLand - slowCurFrac) + 1) % 1;
        // one gentle spin + diff, minimum 0.3 turns so it visibly moves
        const slowExtra = slowDiff < 0.1 ? 1 + slowDiff : slowDiff;
        const slowTarget = slowStart + slowExtra;
        const slowDur = 3500;
        const t1 = performance.now();

        const slowAnim = (now: number) => {
          const st = Math.min((now - t1) / slowDur, 1);
          setRot(slowStart + (slowTarget - slowStart) * easeInOutSine(st));

          if (st < 1) { rafRef.current = requestAnimationFrame(slowAnim); return; }

          const realItem = ITEMS[realIdx];
          setWinner(realItem);
          setPhase('done');
        };

        rafRef.current = requestAnimationFrame(slowAnim);
      } else {
        setWinner(ITEMS[actualIdx]);
        setPhase('done');
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [phase, setRot]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase('idle');
    setWinner(null);
  }, []);

  const isSpinning = phase === 'spinning' || phase === 'slow';

  const btnLabel =
    phase === 'spinning' ? 'Girando...' :
    phase === 'slow'     ? 'Devagar...' :
    phase === 'done'     ? 'Girar de novo' :
    'Girar';

  if (!open) {
    return (
      <button className={styles.fab} onClick={() => setOpen(true)} title="Roleta SORTUDA">
        🎡
      </button>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Roleta SORTUDA</span>
          <button className={styles.closeBtn} onClick={() => { reset(); setOpen(false); }}>✕</button>
        </div>

        <div className={styles.canvasWrap}>
          <canvas ref={canvasRef} width={SIZE} height={SIZE} className={styles.canvas} />
        </div>

        <div className={styles.legend}>
          {ITEMS.map(item => (
            <div key={item.id} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: item.color }} />
              <span className={styles.legendLabel}>{item.label}</span>
            </div>
          ))}
        </div>

        <button
          className={`${styles.spinBtn} ${isSpinning ? styles.spinBtnDisabled : ''}`}
          onClick={phase === 'done' ? reset : spin}
          disabled={isSpinning}
        >
          {btnLabel}
        </button>

        {winner && phase === 'done' && (
          <div
            className={styles.winnerBox}
            style={{ borderColor: winner.color + '66', background: winner.color + '18' }}
          >
            <span className={styles.winnerIcon}>🏆</span>
            <span className={styles.winnerText} style={{ color: winner.textColor }}>
              {winner.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
