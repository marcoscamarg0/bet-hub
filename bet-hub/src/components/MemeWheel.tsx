import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './MemeWheel.module.css';

interface WheelItem {
  id: string;
  label: string;
  color: string;
  textColor: string;
  weight: number;
}

const ITEMS: WheelItem[] = [
  { id: '1', label: 'R$ 1.000 💸',       color: '#16a34a', textColor: '#dcfce7', weight: 60 },
  { id: '2', label: 'Tente de novo 🔄',   color: '#1d4ed8', textColor: '#dbeafe', weight: 20 },
  { id: '3', label: 'Quase lá... 😬',     color: '#7c3aed', textColor: '#ede9fe', weight: 12 },
  { id: '4', label: 'Jatada na cara 🤕',  color: '#b91c1c', textColor: '#fee2e2', weight: 8  },
];

const SIZE = 340;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R  = SIZE / 2 - 8;
const TWO_PI = Math.PI * 2;

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

// ── torment easing ──────────────────────────────────────────
// Builds a custom velocity curve:
// 1. Fast spin (normal)
// 2. Slows down approaching R$1000 — suspense!
// 3. "Almost stops" right on R$1000 (pointer grazes it)
// 4. Picks up again — "nooo!"
// 5. Slowly crawls and dies on Jatada
//
// We do this by building a piecewise position function in [0,1] → [0, totalTurns]

function buildCurve(totalTurns: number) {
  // Phases (fractions of total time):
  // [0.00–0.45] fast spin, easeNone
  // [0.45–0.65] decelerate approaching R$1000
  // [0.65–0.75] AGONIZING near-stop on R$1000 (almost zero velocity)
  // [0.75–0.85] re-accelerate (cruel bounce)
  // [0.85–1.00] final decelerate to Jatada

  return (t: number): number => {
    if (t <= 0.45) {
      // fast, linear-ish
      const u = t / 0.45;
      return totalTurns * 0.30 * u;
    }
    if (t <= 0.65) {
      // decelerate: cubic ease-in (approaching slowly)
      const u = (t - 0.45) / 0.20;
      const eased = u * u * u; // slow start of decel
      return totalTurns * (0.30 + 0.32 * eased);
    }
    if (t <= 0.75) {
      // near-stop — exponential crawl, almost touches R$1000
      const u = (t - 0.65) / 0.10;
      const crawl = 1 - Math.pow(1 - u, 4); // very slow
      return totalTurns * (0.62 + 0.04 * crawl); // barely moves (0.04 turns = ~14°)
    }
    if (t <= 0.85) {
      // cruel re-acceleration
      const u = (t - 0.75) / 0.10;
      const accel = u * u;
      return totalTurns * (0.66 + 0.12 * accel);
    }
    // final slowdown to Jatada
    const u = (t - 0.85) / 0.15;
    const eased = 1 - Math.pow(1 - u, 3);
    return totalTurns * (0.78 + 0.22 * eased);
  };
}

// ── component ───────────────────────────────────────────────
type Phase = 'idle' | 'spinning' | 'done';

export function MemeWheel() {
  const [open, setOpen]         = useState(false);
  const [phase, setPhase]       = useState<Phase>('idle');
  const [rotTurns, setRotTurns] = useState(0);
  const [winner, setWinner]     = useState<WheelItem | null>(null);
  const [taunt, setTaunt]       = useState('');
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
    setTaunt('');
    setPhase('spinning');

    // Always land on Jatada (id 4, index 3)
    const jatadaIdx = ITEMS.findIndex(i => i.id === '4');
    const landRot   = rotForIdx(jatadaIdx);
    const curFrac   = ((rotRef.current % 1) + 1) % 1;
    const diff      = ((landRot - curFrac) + 1) % 1;

    // R$1000 is index 0 — calculate where it sits relative to Jatada
    // so the "near stop" phase grazes over R$1000 before escaping to Jatada
    // We do 8 full spins; the curve handles the drama
    const spins      = 8;
    const totalTurns = spins + diff;
    const curve      = buildCurve(totalTurns);

    const startRot = rotRef.current;
    const duration = 8000;
    const t0       = performance.now();

    // taunt messages timed to phases
    const taunts: [number, string][] = [
      [0.60, '😲 R$ 1.000!!!'],
      [0.68, '🤑 VAI GANHAR!!'],
      [0.72, '😱 QUASE!!!'],
      [0.76, '💀 NÃO!!!'],
      [0.90, 'kkkkkkkkkkk'],
    ];
    let tauntIdx = 0;

    cancelAnimationFrame(rafRef.current);

    const animate = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);

      // fire taunts
      while (tauntIdx < taunts.length && t >= taunts[tauntIdx][0]) {
        setTaunt(taunts[tauntIdx][1]);
        tauntIdx++;
      }

      setRot(startRot + curve(t));

      if (t < 1) { rafRef.current = requestAnimationFrame(animate); return; }

      setWinner(ITEMS[jatadaIdx]);
      setPhase('done');
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [phase, setRot]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase('idle');
    setWinner(null);
    setTaunt('');
  }, []);

  const isSpinning = phase === 'spinning';

  const btnLabel =
    isSpinning       ? 'Girando...' :
    phase === 'done' ? 'Tentar de novo 😭' :
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

        {taunt && (
          <div key={taunt} className={styles.taunt}>{taunt}</div>
        )}

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
            <span className={styles.winnerIcon}>💀</span>
            <span className={styles.winnerText} style={{ color: winner.textColor }}>
              {winner.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
