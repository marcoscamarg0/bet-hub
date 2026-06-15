import { useState, useRef, useEffect, useCallback } from 'react';

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

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R  = SIZE / 2 - 8;
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

function drawWheel(canvas: HTMLCanvasElement, rotTurns: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, SIZE, SIZE);
  const rotRad = rotTurns * TWO_PI;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(CX, CY, R + 4, 0, TWO_PI);
  ctx.fillStyle = '#14101f';
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
  grad.addColorStop(0, '#3a2e58');
  grad.addColorStop(1, '#14101f');
  ctx.beginPath();
  ctx.arc(CX, CY, 24, 0, TWO_PI);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, 5, 0, TWO_PI);
  ctx.fillStyle = '#a78bfa';
  ctx.fill();

  ctx.save();
  ctx.translate(CX, 6);
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fillStyle = '#a78bfa';
  ctx.shadowColor = '#a78bfa';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();
}

function buildCurve(totalTurns: number) {
  return (t: number): number => {
    if (t <= 0.45) {
      const u = t / 0.45;
      return totalTurns * 0.30 * u;
    }
    if (t <= 0.65) {
      const u = (t - 0.45) / 0.20;
      const eased = u * u * u;
      return totalTurns * (0.30 + 0.32 * eased);
    }
    if (t <= 0.75) {
      const u = (t - 0.65) / 0.10;
      const crawl = 1 - Math.pow(1 - u, 4);
      return totalTurns * (0.62 + 0.04 * crawl);
    }
    if (t <= 0.85) {
      const u = (t - 0.75) / 0.10;
      const accel = u * u;
      return totalTurns * (0.66 + 0.12 * accel);
    }
    const u = (t - 0.85) / 0.15;
    const eased = 1 - Math.pow(1 - u, 3);
    return totalTurns * (0.78 + 0.22 * eased);
  };
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

    const jatadaIdx = ITEMS.findIndex(i => i.id === '4');
    const landRot = rotForIdx(jatadaIdx);
    const curFrac = ((rotRef.current % 1) + 1) % 1;
    const diff = ((landRot - curFrac) + 1) % 1;
    const spins = 8;
    const totalTurns = spins + diff;
    const curve = buildCurve(totalTurns);
    const startRot = rotRef.current;
    const duration = 8000;
    const t0 = performance.now();

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

  const btnLabel = isSpinning ? 'Girando...' : phase === 'done' ? 'Tentar de novo 😭' : 'Girar';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Roleta meme"
        className="fixed bottom-20 right-4 w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-2xl transition-all hover:scale-110 z-20"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          boxShadow: '0 8px 32px rgba(139,92,246,0.5)'
        }}>
        🎡
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.75)', backdropFilter:'blur(10px)'}}>
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] overflow-hidden"
        style={{background:'rgba(13,19,33,0.98)', boxShadow:'0 32px 80px rgba(0,0,0,0.7)'}}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <span className="font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>Roleta Meme 🎡</span>
          <button
            onClick={() => { reset(); setOpen(false); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors text-sm"
            style={{background:'rgba(255,255,255,0.05)'}}>
            ✕
          </button>
        </div>

        {/* Wheel */}
        <div className="flex justify-center py-5">
          <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{borderRadius:'50%'}} />
        </div>

        {/* Taunt */}
        {taunt && (
          <div className="text-center text-lg font-bold py-2 px-4 anim-fade-up" key={taunt}
            style={{fontFamily:'Syne,sans-serif', color:'#a78bfa'}}>
            {taunt}
          </div>
        )}

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 px-5 py-3">
          {ITEMS.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:item.color}} />
              <span className="text-xs text-slate-400 truncate">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Spin button */}
        <div className="px-5 pb-5">
          <button
            onClick={phase === 'done' ? reset : spin}
            disabled={isSpinning}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isSpinning ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              boxShadow: isSpinning ? 'none' : '0 8px 24px rgba(139,92,246,0.35)',
              fontFamily:'Syne,sans-serif'
            }}>
            {btnLabel}
          </button>
        </div>

        {winner && phase === 'done' && (
          <div className="mx-5 mb-5 p-4 rounded-xl text-center border anim-fade-up"
            style={{
              borderColor: winner.color + '66',
              background: winner.color + '18',
            }}>
            <div className="text-2xl mb-1">💀</div>
            <div className="font-bold text-sm" style={{color: winner.textColor, fontFamily:'Syne,sans-serif'}}>
              {winner.label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
