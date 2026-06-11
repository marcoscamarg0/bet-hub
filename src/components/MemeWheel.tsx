import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './MemeWheel.module.css';

interface WheelItem {
  id: string;
  label: string;
  color: string;
  textColor: string;
  weight: number;
  slowSpin?: boolean; // se true, gira bem devagar até parar no id4
  redirectTo?: string;
}

const ITEMS: WheelItem[] = [
  { id: '1', label: 'R$ 1.000 💸',       color: '#16a34a', textColor: '#dcfce7', weight: 60, slowSpin: true, redirectTo: '4' },
  { id: '2', label: 'Tente de novo 🔄',   color: '#1d4ed8', textColor: '#dbeafe', weight: 20 },
  { id: '3', label: 'Quase lá... 😬',     color: '#7c3aed', textColor: '#ede9fe', weight: 12 },
  { id: '4', label: 'Jatada na cara 🤕',  color: '#b91c1c', textColor: '#fee2e2', weight: 8  },
];

const SIZE = 340;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R  = SIZE / 2 - 8;
const TWO_PI = Math.PI * 2;

// Segments laid out starting at angle 0, clockwise.
// Pointer fixed at top = -PI/2 = -0.25 turns.
function getSegments(items: WheelItem[]) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let acc = 0;
  return items.map(item => {
    const startFrac = acc / total;
    const span      = item.weight / total;
    acc += item.weight;
    return { item, startFrac, span, midFrac: startFrac + span / 2 };
  });
}

const SEGS = getSegments(ITEMS);

// Which segment is under the pointer given rotation in turns?
function getWinner(rotTurns: number): number {
  const pointer = ((0.75 - rotTurns) % 1 + 1) % 1;
  for (let i = 0; i < SEGS.length; i++) {
    if (pointer >= SEGS[i].startFrac && pointer < SEGS[i].startFrac + SEGS[i].span) return i;
  }
  return 0;
}

// Rotation (turns) that places center of segment[idx] under the pointer
function rotForIdx(idx: number): number {
  return ((0.75 - SEGS[idx].midFrac) % 1 + 1) % 1;
}

// ── draw ────────────────────────────────────────────────────
function drawWheel(canvas: HTMLCanvasElement, rotTurns: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, SIZE, SIZE);
  const rotRad = rotTurns * TWO_PI;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(CX, CY, R + 4, 0, TWO_PI);
  ctx.fillStyle = '#0d1117';
  ctx.fill();
  ctx.restore();

  SEGS.forEach(({ item, startFrac, span }) => {
    const s = startFrac * TWO_PI + rotRad;
    const e = s + span * TWO_PI;
    const m = s + (span * TWO_PI) / 2;

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, s, e);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(m);
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

  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, TWO_PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 3;
  ctx.stroke();

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

  // pointer
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

// ── easing ──────────────────────────────────────────────────
// Normal fast spin: ease out cubic
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
// Slow creep: ease out expo — starts normally, ends very very slowly
function easeOutExpo(t: number)  { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

// ── component ───────────────────────────────────────────────
type Phase = 'idle' | 'spinning' | 'done';

export function MemeWheel() {
  const [open, setOpen]         = useState(false);
  const [phase, setPhase]       = useState<Phase>('idle');
  const [rotTurns, setRotTurns] = useState(0);
  const [winner, setWinner]     = useState<WheelItem | null>(null);
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

    // weighted random pick
    const total = ITEMS.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    let pickedIdx = 0;
    for (let i = 0; i < ITEMS.length; i++) {
      r -= ITEMS[i].weight;
      if (r <= 0) { pickedIdx = i; break; }
    }

    const picked = ITEMS[pickedIdx];

    // Determine actual landing index (redirect if slowSpin)
    const landIdx = picked.slowSpin && picked.redirectTo
      ? ITEMS.findIndex(i => i.id === picked.redirectTo)
      : pickedIdx;

    const landRot  = rotForIdx(landIdx);
    const curFrac  = ((rotRef.current % 1) + 1) % 1;
    const diff     = ((landRot - curFrac) + 1) % 1;

    // Normal spin: 6-9 full turns, 4.5s, easeOutCubic
    // Slow spin:   2-3 full turns, 9s,   easeOutExpo  (visibly crawls to a stop)
    const isSlow    = !!picked.slowSpin;
    const spins     = isSlow ? 2 + Math.random() : 6 + Math.floor(Math.random() * 4);
    const target    = rotRef.current + spins + diff;
    const duration  = isSlow ? 9000 : 4500;
    const easeFn    = isSlow ? easeOutExpo : easeOutCubic;

    const start = rotRef.current;
    const t0    = performance.now();

    cancelAnimationFrame(rafRef.current);

    const animate = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      setRot(start + (target - start) * easeFn(t));

      if (t < 1) { rafRef.current = requestAnimationFrame(animate); return; }

      setWinner(ITEMS[landIdx]);
      setPhase('done');
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [phase, setRot]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase('idle');
    setWinner(null);
  }, []);

  const isSpinning = phase === 'spinning';

  const btnLabel =
    isSpinning   ? 'Girando...' :
    phase === 'done' ? 'Girar de novo' :
    'Girar';

  if (!open) {
    return (
      <button className={styles.fab} onClick={() => setOpen(true)} title="Roleta meme">
        🎡
      </button>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Roleta Meme</span>
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
