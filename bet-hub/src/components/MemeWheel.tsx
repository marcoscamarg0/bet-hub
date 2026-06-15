import { useState, useRef, useEffect, useCallback } from 'react';

interface WheelItem {
  id: string;
  label: string;
  color: string;
  textColor: string;
  weight: number;
}

const ITEMS: WheelItem[] = [
  { id: '1', label: 'R$ 1.000 💸',       color: '#15803d', textColor: '#dcfce7', weight: 0 },
  { id: '2', label: 'Tente de novo 🔄',   color: '#1d4ed8', textColor: '#dbeafe', weight: 20 },
  { id: '3', label: 'Quase lá... 😬',     color: '#6d28d9', textColor: '#ede9fe', weight: 12 },
  { id: '4', label: 'Jatada na cara 🤕',  color: '#991b1b', textColor: '#fee2e2', weight: 8  },
];

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R  = SIZE / 2 - 6;
const TWO_PI = Math.PI * 2;

function getSegments(items: WheelItem[]) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let acc = 0;
  return items.map(item => {
    const startFrac = acc / total;
    const span = item.weight / total;
    acc += item.weight;
    return { item, startFrac, span, midFrac: startFrac + span / 2 };
  });
}

const SEGS = getSegments(ITEMS);

function rotForIdx(idx: number): number {
  return ((0.75 - SEGS[idx].midFrac) % 1 + 1) % 1;
}

// Improved physics: fast start, natural deceleration with bounce
function buildSpinCurve(totalTurns: number, duration: number) {
  // Multi-phase easing: 
  // 0-15%: fast acceleration
  // 15-70%: constant speed
  // 70-90%: smooth deceleration  
  // 90-100%: final micro-settle (elastic finish)
  return (t: number): number => {
    if (t <= 0.15) {
      // acceleration phase: ease-in quad
      const p = t / 0.15;
      const progress = p * p;
      return totalTurns * 0.08 * progress;
    } else if (t <= 0.70) {
      // constant (max) speed phase
      const p = (t - 0.15) / 0.55;
      return totalTurns * (0.08 + 0.65 * p);
    } else if (t <= 0.95) {
      // deceleration: ease-out cubic
      const p = (t - 0.70) / 0.25;
      const eased = 1 - Math.pow(1 - p, 3);
      return totalTurns * (0.73 + 0.25 * eased);
    } else {
      // final settle: tiny elastic overshoot then settle
      const p = (t - 0.95) / 0.05;
      const overshoot = Math.sin(p * Math.PI) * 0.0015; // tiny wobble
      return totalTurns * (0.98 + 0.02 * p) + overshoot;
    }
  };
}

function drawWheel(canvas: HTMLCanvasElement, rotTurns: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, SIZE, SIZE);
  const rotRad = rotTurns * TWO_PI;

  // Outer glow ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R + 6, 0, TWO_PI);
  const glowGrad = ctx.createRadialGradient(CX, CY, R - 2, CX, CY, R + 8);
  glowGrad.addColorStop(0, 'rgba(139,92,246,0.4)');
  glowGrad.addColorStop(1, 'rgba(139,92,246,0)');
  ctx.fillStyle = glowGrad;
  ctx.fill();
  ctx.restore();

  // Drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, TWO_PI);
  ctx.fillStyle = '#0d1321';
  ctx.fill();
  ctx.restore();

  // Segments
  SEGS.forEach(({ item, startFrac, span }) => {
    const s = startFrac * TWO_PI + rotRad;
    const e = s + span * TWO_PI;
    const m = s + (span * TWO_PI) / 2;

    // Segment fill
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, s, e);
    ctx.closePath();
    
    // Gradient per segment
    const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, R);
    grad.addColorStop(0.0, lightenColor(item.color, 30));
    grad.addColorStop(1.0, darkenColor(item.color, 15));
    ctx.fillStyle = grad;
    ctx.fill();
    
    // Subtle border
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Text
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(m);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = item.textColor;
    ctx.font = `bold ${Math.min(12, 240 / ITEMS.length)}px Inter, system-ui, sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    const maxW = R - 40;
    let text = item.label;
    if (ctx.measureText(text).width > maxW) {
      while (ctx.measureText(text + '…').width > maxW && text.length > 0) text = text.slice(0, -1);
      text += '…';
    }
    ctx.fillText(text, R - 14, 0);
    ctx.restore();
  });

  // Rim highlight
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, TWO_PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner rim shadow
  ctx.beginPath();
  ctx.arc(CX, CY, R - 1, 0, TWO_PI);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Center hub
  const hubGrad = ctx.createRadialGradient(CX - 4, CY - 4, 1, CX, CY, 22);
  hubGrad.addColorStop(0, '#4c1d95');
  hubGrad.addColorStop(1, '#0d1321');
  ctx.beginPath();
  ctx.arc(CX, CY, 22, 0, TWO_PI);
  ctx.fillStyle = hubGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(139,92,246,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(CX, CY, 5, 0, TWO_PI);
  ctx.fillStyle = '#a78bfa';
  ctx.shadowColor = '#a78bfa';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Pointer (arrow at top)
  ctx.save();
  ctx.translate(CX, 3);
  // Pointer shadow
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(9, 0);
  ctx.lineTo(0, 24);
  ctx.closePath();
  // Pointer gradient
  const pGrad = ctx.createLinearGradient(-9, 0, 9, 24);
  pGrad.addColorStop(0, '#c4b5fd');
  pGrad.addColorStop(1, '#7c3aed');
  ctx.fillStyle = pGrad;
  ctx.fill();
  ctx.restore();
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

type Phase = 'idle' | 'spinning' | 'done';

export function MemeWheel() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [rotTurns, setRotTurns] = useState(0);
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const [taunt, setTaunt] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const rotRef = useRef(0);

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

    const totalW = ITEMS.reduce((s, it) => s + it.weight, 0);
    let roll = Math.random() * totalW;
    let winnerIdx = 0;
    for (let i = 0; i < ITEMS.length; i++) {
      roll -= ITEMS[i].weight;
      if (roll <= 0) { winnerIdx = i; break; }
    }

    const landRot = rotForIdx(winnerIdx);
    const curFrac = ((rotRef.current % 1) + 1) % 1;
    const diff = ((landRot - curFrac) + 1) % 1;
    const spins = 7 + Math.random() * 2; // 7-9 spins for variability
    const totalTurns = spins + diff;
    const duration = 6500 + Math.random() * 1000; // 6.5-7.5s
    const curve = buildSpinCurve(totalTurns, duration);
    const startRot = rotRef.current;
    const t0 = performance.now();

    const taunts: [number, string][] = [
      [0.55, '😲 VAI GANHAR!!'],
      [0.65, '🤑 R$ 1.000!!!'],
      [0.75, '😱 QUASE!!!'],
      [0.82, '💀 NÃO!!!'],
      [0.93, 'kkkkkkkkkkk'],
    ];
    let tauntIdx = 0;

    cancelAnimationFrame(rafRef.current);

    const animate = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      while (tauntIdx < taunts.length && t >= taunts[tauntIdx][0]) {
        setTaunt(taunts[tauntIdx][1]);
        tauntIdx++;
      }
      setRot(startRot + curve(t));
      if (t < 1) { rafRef.current = requestAnimationFrame(animate); return; }
      setWinner(ITEMS[winnerIdx]);
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Roleta meme"
        className="fixed bottom-16 right-4 w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-2xl transition-all hover:scale-110 z-20"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          boxShadow: '0 8px 32px rgba(139,92,246,0.5)'
        }}>
        🎡
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{background:'rgba(0,0,0,0.82)', backdropFilter:'blur(14px)'}}>
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/[0.09] overflow-hidden"
        style={{background:'rgba(10,14,26,0.98)', boxShadow:'0 -8px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.08)'}}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
              style={{background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.25)'}}>
              🎡
            </div>
            <span className="font-bold text-white text-sm" style={{fontFamily:'Syne,sans-serif'}}>Roleta Meme</span>
          </div>
          <button
            onClick={() => { reset(); setOpen(false); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors text-sm"
            style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)'}}>
            ✕
          </button>
        </div>

        {/* Wheel */}
        <div className="flex justify-center pt-6 pb-2 relative">
          {/* Glow behind wheel */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none"
            style={{background:'rgba(139,92,246,0.08)'}} />
          <canvas ref={canvasRef} width={SIZE} height={SIZE}
            style={{borderRadius:'50%', filter:'drop-shadow(0 8px 32px rgba(0,0,0,0.5))'}} />
        </div>

        {/* Taunt */}
        <div className="min-h-[2.5rem] flex items-center justify-center px-4">
          {taunt && (
            <div className="text-center text-base font-bold anim-fade-up" key={taunt}
              style={{fontFamily:'Syne,sans-serif', color:'#a78bfa'}}>
              {taunt}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-1.5 px-5 py-3">
          {ITEMS.map(item => (
            <div key={item.id} className="flex items-center gap-2 py-1 px-2 rounded-lg"
              style={{background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)'}}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:item.color}} />
              <span className="text-xs text-slate-400 truncate">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Spin button */}
        <div className="px-5 pb-6">
          <button
            onClick={phase === 'done' ? reset : spin}
            disabled={isSpinning}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isSpinning ? 'rgba(139,92,246,0.25)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              boxShadow: isSpinning ? 'none' : '0 8px 24px rgba(139,92,246,0.4)',
              fontFamily:'Syne,sans-serif',
              border: isSpinning ? '1px solid rgba(139,92,246,0.3)' : 'none',
            }}>
            {isSpinning ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin inline-block" />
                Girando...
              </span>
            ) : phase === 'done' ? 'Tentar de novo 😭' : 'Girar 🎡'}
          </button>
        </div>

        {winner && phase === 'done' && (
          <div className="mx-5 mb-6 p-4 rounded-xl text-center border anim-fade-up"
            style={{
              borderColor: winner.color + '55',
              background: winner.color + '14',
            }}>
            <div className="text-2xl mb-1.5">
              {winner.id === '1' ? '🎉' : winner.id === '4' ? '💀' : '😅'}
            </div>
            <div className="font-bold text-sm" style={{color: winner.textColor, fontFamily:'Syne,sans-serif'}}>
              {winner.label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
