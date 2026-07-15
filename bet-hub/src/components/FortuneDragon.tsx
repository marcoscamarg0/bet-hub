import { useState, useRef, useEffect } from 'react';
import styles from './FortuneDragon.module.css';
import { api } from '../api';
import { useAuth } from '../AuthContext';

// ── Symbols ───────────────────────────────────────────────────
const SYMBOLS = ['🐉', '🎋', '🪷', '🪙', '🎯', '🍀', '🏮', '✨'] as const;
type Sym = typeof SYMBOLS[number];

const SYMBOL_WEIGHT: Record<Sym, number> = {
  '✨': 28,
  '🍀': 24,
  '🏮': 16,
  '🎯': 12,
  '🪙': 9,
  '🪷': 6,
  '🎋': 3,
  '🐉': 1,
};

// Pay table: [3-of-a-kind mult, 4, 5]
const PAY_TABLE: Record<Sym, [number, number, number]> = {
  '🐉': [50, 200, 1000],
  '🎋': [20, 80,  400],
  '🪷': [10, 40,  200],
  '🪙': [5,  20,  100],
  '🎯': [3,  10,  50],
  '🍀': [2,  6,   30],
  '🏮': [1.5, 4,  20],
  '✨': [1,  2.5, 12],
};

const SYMBOL_COLOR: Record<Sym, string> = {
  '🐉': '#ef4444',
  '🎋': '#22c55e',
  '🪷': '#f472b6',
  '🪙': '#fbbf24',
  '🎯': '#f97316',
  '🍀': '#34d399',
  '🏮': '#fb923c',
  '✨': '#94a3b8',
};

const COLS = 5;
const ROWS = 3;

// Pay lines (row indices for each col): 20 lines
const PAYLINES: number[][] = [
  [1,1,1,1,1], // middle straight
  [0,0,0,0,0], // top
  [2,2,2,2,2], // bottom
  [0,1,2,1,0], // V shape
  [2,1,0,1,2], // inverted V
  [0,0,1,2,2], // diagonal ↘
  [2,2,1,0,0], // diagonal ↗
  [1,0,0,0,1], // cup top
  [1,2,2,2,1], // cup bottom
  [0,1,0,1,0], // zigzag top
  [2,1,2,1,2], // zigzag bot
  [1,0,1,0,1], // alt zigzag
  [1,2,1,2,1],
  [0,0,0,1,2],
  [2,2,2,1,0],
  [0,1,1,1,0],
  [2,1,1,1,2],
  [1,1,0,1,1],
  [1,1,2,1,1],
  [0,2,0,2,0],
];

function weighted(): Sym {
  const total = Object.values(SYMBOL_WEIGHT).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [s, w] of Object.entries(SYMBOL_WEIGHT) as [Sym, number][]) {
    r -= w; if (r <= 0) return s;
  }
  return '✨';
}

function generateGrid(): Sym[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, weighted)
  );
}

interface LineWin { lineIdx: number; sym: Sym; count: number; mult: number; cells: [number, number][] }

function evalLines(grid: Sym[][], bet: number): { wins: LineWin[]; total: number } {
  const wins: LineWin[] = [];
  let total = 0;

  for (let li = 0; li < PAYLINES.length; li++) {
    const line = PAYLINES[li];
    const first = grid[line[0]][0];
    // Wild '🐉' matches everything
    let count = 1;
    for (let c = 1; c < COLS; c++) {
      const s = grid[line[c]][c];
      if (s === first || s === '🐉' || first === '🐉') { count++; } else break;
    }
    if (count >= 3) {
      const sym = first === '🐉' ? (grid[line[1]][1] === '🐉' ? '🐉' : grid[line[1]][1]) : first;
      const payIdx = count - 3; // 0,1,2 → 3,4,5 of a kind
      const mult = PAY_TABLE[sym][Math.min(payIdx, 2)];
      const win = Math.round(bet * mult * 100) / 100;
      total += win;
      const cells: [number, number][] = [];
      for (let c = 0; c < count; c++) cells.push([line[c], c]);
      wins.push({ lineIdx: li, sym, count, mult, cells });
    }
  }

  return { wins, total: Math.round(total * 100) / 100 };
}

function fmtMoney(n: number) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeSince(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return Math.floor(s / 60) + 'min';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

type Phase = 'idle' | 'spinning' | 'result';

export function FortuneDragon() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [grid, setGrid] = useState<Sym[][]>(generateGrid());
  const [phase, setPhase] = useState<Phase>('idle');
  const [bet, setBet] = useState(10);
  const [wins, setWins] = useState<LineWin[]>([]);
  const [totalWin, setTotalWin] = useState(0);
  const [spinning, setSpinning] = useState<boolean[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(false))
  );
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const [winCells, setWinCells] = useState<Set<string>>(new Set());
  const [statusMsg, setStatusMsg] = useState('');
  const [scores, setScores] = useState<{ name: string; amount: number; createdAt: string }[]>([]);
  const [isFast, setIsFast] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const highlightRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    loadScores();
    const iv = setInterval(loadScores, 30000);
    return () => clearInterval(iv);
  }, []);

  async function loadScores() {
    try {
      const data = await api.getScores({ game: 'dragon', limit: 20 });
      setScores(data.map(s => ({ name: s.username || s.name, amount: s.amount, createdAt: s.createdAt })));
    } catch { /* silent */ }
  }

  async function saveScore(amount: number) {
    if (amount <= 0) return;
    try {
      await api.postScore({
        name: user?.username || user?.name || 'Anônimo',
        amount,
        game: 'dragon',
      });
      setTimeout(loadScores, 1000);
    } catch { /* silent */ }
  }

  function spin() {
    if (phase === 'spinning') return;
    setWins([]);
    setTotalWin(0);
    setWinCells(new Set());
    setHighlightLine(null);
    clearInterval(highlightRef.current);
    setPhase('spinning');
    setStatusMsg('🐉 Girando...');

    // Stagger spin animation per column
    const spinState = Array.from({ length: ROWS }, () => Array(COLS).fill(true));
    setSpinning(spinState);

    const delays = isFast ? [50, 100, 150, 200, 250] : [300, 450, 600, 750, 900];
    const finalGrid = generateGrid();

    delays.forEach((delay, col) => {
      timerRef.current = setTimeout(() => {
        setSpinning(prev => prev.map(row => row.map((v, c) => c !== col ? v : false)));
        setGrid(prev => prev.map((row, r) => row.map((v, c) => c !== col ? v : finalGrid[r][c])));
        if (col === COLS - 1) {
          // Evaluate after last reel stops
          setTimeout(() => {
            const { wins: w, total } = evalLines(finalGrid, bet);
            setWins(w);
            setTotalWin(total);
            setPhase('result');
            if (total > 0) {
              setStatusMsg(`🎊 Ganho: ${fmtMoney(total)}!`);
              // Highlight winning lines
              const allCells = new Set<string>();
              w.forEach(win => win.cells.forEach(([r, c]) => allCells.add(`${r}-${c}`)));
              setWinCells(allCells);
              let li = 0;
              highlightRef.current = setInterval(() => {
                setHighlightLine(w[li % w.length]?.lineIdx ?? null);
                li++;
              }, 700);
              saveScore(total);
            } else {
              setStatusMsg('😔 Sem ganhos. Tente de novo!');
            }
          }, 100);
        }
      }, delay);
    });
  }

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(highlightRef.current);
    };
  }, []);

  const isSpinning = phase === 'spinning';

  if (!open) {
    return (
      <button className={styles.fab} onClick={() => setOpen(true)} title="Fortune Dragon">
        <span className={styles.fabIcon}>🐉</span>
        <span className={styles.fabLabel}>Dragon</span>
      </button>
    );
  }

  return (
    <div className={styles.overlay} onClick={() => !isSpinning && setOpen(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>🐉</span>
            <div>
              <div className={styles.headerTitle}>Fortune Dragon</div>
              <div className={styles.headerSub}>20 linhas · Wild 🐉</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.gameArea}>

            {/* Stats */}
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Aposta</span>
                <span className={styles.statVal}>{fmtMoney(bet)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Linhas</span>
                <span className={styles.statVal} style={{ color: '#fbbf24' }}>20</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Ganho</span>
                <span className={styles.statVal} style={{ color: totalWin > 0 ? '#fbbf24' : '#94a3b8' }}>
                  {fmtMoney(totalWin)}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Linhas ganhas</span>
                <span className={styles.statVal} style={{ color: wins.length > 0 ? '#ef4444' : '#94a3b8' }}>
                  {wins.length}
                </span>
              </div>
            </div>

            {/* Status */}
            <div className={`${styles.status} ${totalWin > 0 && phase === 'result' ? styles.statusWin : ''}`}>
              {statusMsg || '🐉 Pressione Girar para começar'}
            </div>

            {/* Grid */}
            <div className={styles.reelWrapper}>
              <div className={styles.grid}>
                {grid.map((row, r) =>
                  row.map((sym, c) => {
                    const key = `${r}-${c}`;
                    const isWin = winCells.has(key);
                    const isSpin = spinning[r]?.[c];
                    return (
                      <div
                        key={key}
                        className={[
                          styles.cell,
                          isWin ? styles.cellWin : '',
                          isSpin ? styles.cellSpin : '',
                        ].join(' ')}
                        style={isWin ? { '--cell-color': SYMBOL_COLOR[sym] } as React.CSSProperties : undefined}
                      >
                        <span className={styles.cellEmoji}>{sym}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bet row */}
            <div className={styles.betRow}>
              <span className={styles.betLabel}>Aposta</span>
              <div className={styles.betBtns}>
                {[5, 10, 25, 50, 100, 200].map(v => (
                  <button
                    key={v}
                    className={`${styles.betBtn} ${bet === v ? styles.betBtnActive : ''}`}
                    onClick={() => setBet(v)}
                    disabled={isSpinning}
                  >R${v}</button>
                ))}
              </div>
            </div>

            {/* Spin button */}
            <div className={styles.actionRow}>
              <button 
                className={`${styles.btnFast} ${isFast ? styles.btnFastActive : ''}`} 
                onClick={() => setIsFast(!isFast)}
                disabled={isSpinning}
                title="Modo Turbo"
              >
                ⚡
              </button>
              <button
                className={`${styles.btnSpin} ${isSpinning ? styles.btnSpinActive : ''}`}
                onClick={spin}
                disabled={isSpinning}
              >
                {isSpinning ? (
                  <><span className={styles.reel} />Girando...</>
                ) : '🐉 GIRAR'}
              </button>
            </div>

            {/* Win lines display */}
            {wins.length > 0 && (
              <div className={styles.winLines}>
                <div className={styles.winLinesTitle}>Linhas vencedoras</div>
                <div className={styles.winLinesList}>
                  {wins.map((w, i) => (
                    <div key={i} className={`${styles.winLine} ${highlightLine === w.lineIdx ? styles.winLineActive : ''}`}>
                      <span className={styles.winLineSym}>{w.sym}</span>
                      <span className={styles.winLineCount}>{w.count}× em linha</span>
                      <span className={styles.winLineMult} style={{ color: SYMBOL_COLOR[w.sym] }}>
                        +{fmtMoney(bet * w.mult)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pay table */}
            <div className={styles.paytable}>
              <div className={styles.paytableTitle}>Tabela de Pagamentos (3 / 4 / 5 em linha)</div>
              <div className={styles.paytableGrid}>
                {(Object.entries(PAY_TABLE) as [Sym, [number, number, number]][]).map(([sym, pay]) => (
                  <div key={sym} className={styles.paytableRow}>
                    <span className={styles.paytableSym}>{sym}</span>
                    <span className={styles.paytablePay} style={{ color: SYMBOL_COLOR[sym] }}>
                      {pay[0]}× {pay[1]}× {pay[2]}×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className={styles.lbCol}>
            <div className={styles.lbTitle}>🏆 Maiores Ganhos</div>
            {scores.length === 0 ? (
              <div className={styles.lbEmpty}>Nenhum ganho ainda.<br />Seja o primeiro!</div>
            ) : (
              <div className={styles.lbList}>
                {scores.map((s, i) => (
                  <div key={i} className={`${styles.lbEntry} ${i < 3 ? styles.lbEntryTop : ''}`}>
                    <span className={styles.lbRank}>{i + 1}</span>
                    <div className={styles.lbAvatar}>{(s.name || '?').slice(0, 2).toUpperCase()}</div>
                    <div className={styles.lbInfo}>
                      <div className={styles.lbName}>{s.name}</div>
                      <div className={styles.lbTime}>{timeSince(s.createdAt)}</div>
                    </div>
                    <span className={styles.lbAmount}>+{fmtMoney(s.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
