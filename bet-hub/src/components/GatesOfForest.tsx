import { useState, useCallback, useEffect, useRef } from 'react';
import styles from './GatesOfForest.module.css';
import { api } from '../api';
import { useAuth } from '../AuthContext';

// ── Symbols ───────────────────────────────────────────────────
const SYMBOLS = ['🌙', '🔮', '⚡', '🦋', '🌸', '🎭', '🗝️', '💫'] as const;
type Sym = typeof SYMBOLS[number];

const SYMBOL_WEIGHT: Record<Sym, number> = {
  '💫': 30, // most common (low value)
  '🌸': 25,
  '🦋': 18,
  '🎭': 12,
  '🗝️': 8,
  '⚡': 4,
  '🔮': 2,
  '🌙': 1, // rarest (jackpot)
};

const SYMBOL_MULT: Record<Sym, number[]> = {
  '🌙': [50, 100, 500],
  '🔮': [20, 50, 150],
  '⚡': [10, 25, 80],
  '🗝️': [5, 15, 40],
  '🎭': [3, 8, 20],
  '🦋': [2, 5, 12],
  '🌸': [1.5, 3, 8],
  '💫': [0.5, 1.5, 4],
};

const SYMBOL_COLOR: Record<Sym, string> = {
  '🌙': '#fbbf24',
  '🔮': '#a78bfa',
  '⚡': '#67e8f9',
  '🗝️': '#f97316',
  '🎭': '#f472b6',
  '🦋': '#34d399',
  '🌸': '#fb7185',
  '💫': '#94a3b8',
};

const COLS = 6;
const ROWS = 5;
const GRID_SIZE = COLS * ROWS;

function weightedRandom(): Sym {
  const total = Object.values(SYMBOL_WEIGHT).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [sym, w] of Object.entries(SYMBOL_WEIGHT) as [Sym, number][]) {
    r -= w;
    if (r <= 0) return sym;
  }
  return '💫';
}

function generateGrid(): Sym[] {
  return Array.from({ length: GRID_SIZE }, weightedRandom);
}

function findWinGroups(grid: Sym[]): number[][] {
  // Find connected groups of 8+ same symbols (cluster pays)
  const visited = new Set<number>();
  const groups: number[][] = [];

  function getNeighbors(i: number): number[] {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    const neighbors: number[] = [];
    if (r > 0) neighbors.push(i - COLS);
    if (r < ROWS - 1) neighbors.push(i + COLS);
    if (c > 0) neighbors.push(i - 1);
    if (c < COLS - 1) neighbors.push(i + 1);
    return neighbors;
  }

  for (let i = 0; i < GRID_SIZE; i++) {
    if (visited.has(i)) continue;
    const sym = grid[i];
    // BFS
    const group: number[] = [];
    const queue = [i];
    const inQueue = new Set([i]);
    while (queue.length) {
      const curr = queue.shift()!;
      group.push(curr);
      visited.add(curr);
      for (const nb of getNeighbors(curr)) {
        if (!visited.has(nb) && !inQueue.has(nb) && grid[nb] === sym) {
          queue.push(nb);
          inQueue.add(nb);
        }
      }
    }
    if (group.length >= 8) groups.push(group);
  }
  return groups;
}

function calcWin(groups: number[][], grid: Sym[], bet: number): number {
  let total = 0;
  for (const group of groups) {
    const sym = grid[group[0]];
    const mults = SYMBOL_MULT[sym];
    let mult = mults[0];
    if (group.length >= 15) mult = mults[2];
    else if (group.length >= 12) mult = mults[1];
    total += bet * mult;
  }
  return Math.round(total * 100) / 100;
}

function cascadeGrid(grid: Sym[], winIndices: Set<number>): Sym[] {
  const newGrid = [...grid];
  // Remove winning cells
  for (const idx of winIndices) newGrid[idx] = '' as Sym;
  // For each column, drop symbols down
  for (let c = 0; c < COLS; c++) {
    const col: Sym[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const idx = r * COLS + c;
      if (newGrid[idx] !== '') col.push(newGrid[idx]);
    }
    while (col.length < ROWS) col.push(weightedRandom());
    for (let r = ROWS - 1; r >= 0; r--) {
      newGrid[r * COLS + c] = col[ROWS - 1 - r];
    }
  }
  return newGrid;
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

// ── Component ─────────────────────────────────────────────────
type Phase = 'idle' | 'spinning' | 'cascade' | 'freespins' | 'result';

export function GatesOfForest() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [grid, setGrid] = useState<Sym[]>(generateGrid());
  const [phase, setPhase] = useState<Phase>('idle');
  const [bet, setBet] = useState(10);
  const [winGroups, setWinGroups] = useState<number[][]>([]);
  const [winIndices, setWinIndices] = useState<Set<number>>(new Set());
  const [totalWin, setTotalWin] = useState(0);
  const [roundWin, setRoundWin] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [cascadeCount, setCascadeCount] = useState(0);
  const [freeSpins, setFreeSpins] = useState(0);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [spinningCells, setSpinningCells] = useState<boolean[]>(Array(GRID_SIZE).fill(false));
  const [newCells, setNewCells] = useState<Set<number>>(new Set());
  const [scores, setScores] = useState<{ name: string; amount: number; createdAt: string }[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load leaderboard
  useEffect(() => {
    loadScores();
    const interval = setInterval(loadScores, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadScores() {
    try {
      const data = await api.getScores({ game: 'forest', limit: 20 });
      setScores(data.map(s => ({ name: s.username || s.name, amount: s.amount, createdAt: s.createdAt })));
    } catch {
      // silently fail
    }
  }

  async function saveScore(amount: number) {
    if (amount <= 0) return;
    try {
      await api.postScore({
        name: user?.username || user?.name || 'Anônimo',
        amount,
        game: 'forest',
      });
      setTimeout(loadScores, 1000);
    } catch {
      // silently fail
    }
  }

  const doSpin = useCallback((grid: Sym[], currentBet: number, isFreeSpins: boolean) => {
    // Animate spinning cells
    setSpinningCells(Array(GRID_SIZE).fill(true));
    setWinGroups([]);
    setWinIndices(new Set());
    setPhase('spinning');
    setStatusMsg(isFreeSpins ? '✨ Free Spin!' : '🌀 Girando...');

    timerRef.current = setTimeout(() => {
      const newGrid = generateGrid();
      setSpinningCells(Array(GRID_SIZE).fill(false));
      setNewCells(new Set(Array.from({ length: GRID_SIZE }, (_, i) => i)));
      setTimeout(() => setNewCells(new Set()), 500);
      processResult(newGrid, currentBet, isFreeSpins, 1, 0);
    }, 600);
  }, []);

  function processResult(grid: Sym[], currentBet: number, isFreeSpins: boolean, mult: number, accumulated: number) {
    const groups = findWinGroups(grid);

    // Count scatters for free spins trigger (🌙 = scatter)
    const moonCount = grid.filter(s => s === '🌙').length;
    let bonusFS = 0;
    if (!isFreeSpins && moonCount >= 4) bonusFS = moonCount >= 6 ? 15 : moonCount >= 5 ? 10 : 6;

    if (groups.length === 0) {
      setGrid(grid);
      setWinGroups([]);
      setWinIndices(new Set());

      if (bonusFS > 0) {
        setFreeSpins(bonusFS);
        setFreeSpinsLeft(bonusFS);
        setStatusMsg(`🌙 ${bonusFS} FREE SPINS! Boa sorte!`);
        setPhase('freespins');
        return;
      }

      if (isFreeSpins && freeSpinsLeft > 1) {
        setFreeSpinsLeft(f => f - 1);
        const totalNow = accumulated;
        setTotalWin(totalNow);
        setRoundWin(prev => prev + totalNow);
        setStatusMsg(`✨ Free Spin! ${freeSpinsLeft - 1} restantes · Ganho: ${fmtMoney(totalNow)}`);
        setTimeout(() => doSpin(grid, currentBet, true), 1200);
        return;
      }

      setMultiplier(mult);
      const total = accumulated;
      setTotalWin(total);
      if (total > 0) {
        setRoundWin(prev => prev + total);
        setStatusMsg(`💚 +${fmtMoney(total)} · ${cascadeCount > 0 ? cascadeCount + ' cascatas!' : ''}`);
        saveScore(total);
      } else {
        setStatusMsg('😔 Sem ganhos desta vez');
      }
      setCascadeCount(0);
      setPhase('result');
      return;
    }

    const winIdx = new Set(groups.flat());
    const win = calcWin(groups, grid, currentBet) * mult;
    const newAccumulated = accumulated + win;

    setGrid(grid);
    setWinGroups(groups);
    setWinIndices(winIdx);
    setMultiplier(mult);
    setTotalWin(newAccumulated);
    setStatusMsg(`⚡ +${fmtMoney(win)} · ×${mult} multiplicador!`);
    setPhase('cascade');

    // Cascade after brief celebration
    timerRef.current = setTimeout(() => {
      const cascaded = cascadeGrid(grid, winIdx);
      const cascIdx = new Set<number>();
      for (let i = 0; i < GRID_SIZE; i++) {
        if (cascaded[i] !== grid[i]) cascIdx.add(i);
      }
      setNewCells(cascIdx);
      setTimeout(() => setNewCells(new Set()), 500);
      setCascadeCount(c => c + 1);
      processResult(cascaded, currentBet, isFreeSpins, mult + 1, newAccumulated);
    }, 1500);
  }

  function spin() {
    if (phase === 'spinning' || phase === 'cascade') return;
    setRoundWin(0);
    setTotalWin(0);
    setCascadeCount(0);
    setMultiplier(1);
    doSpin(grid, bet, false);
  }

  function spinFree() {
    if (phase === 'spinning' || phase === 'cascade') return;
    doSpin(grid, bet, true);
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const isPlaying = phase === 'spinning' || phase === 'cascade';
  const canSpin = !isPlaying && (phase !== 'freespins');
  const canSpinFree = !isPlaying && phase === 'freespins' && freeSpinsLeft > 0;

  if (!open) {
    return (
      <button className={styles.fab} onClick={() => setOpen(true)} title="Gates of the Forest">
        <span className={styles.fabIcon}>🌿</span>
        <span className={styles.fabLabel}>Forest</span>
      </button>
    );
  }

  return (
    <div className={styles.overlay} onClick={() => !isPlaying && setOpen(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>🌿</span>
            <div>
              <div className={styles.headerTitle}>Gates of the Forest</div>
              <div className={styles.headerSub}>Slots místico · Cluster pays</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className={styles.body}>
          {/* MAIN GAME AREA */}
          <div className={styles.gameArea}>

            {/* Stats row */}
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Aposta</span>
                <span className={styles.statVal}>{fmtMoney(bet)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Multiplicador</span>
                <span className={styles.statVal} style={{ color: multiplier > 1 ? '#34d399' : '#94a3b8' }}>×{multiplier}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Ganho rodada</span>
                <span className={styles.statVal} style={{ color: totalWin > 0 ? '#fbbf24' : '#94a3b8' }}>{fmtMoney(totalWin)}</span>
              </div>
              {phase === 'freespins' && (
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Free Spins</span>
                  <span className={styles.statVal} style={{ color: '#a78bfa' }}>{freeSpinsLeft}</span>
                </div>
              )}
            </div>

            {/* Status message */}
            <div className={`${styles.status} ${phase === 'cascade' ? styles.statusWin : ''}`}>
              {statusMsg || '🌿 Clique em Girar para jogar'}
            </div>

            {/* GRID */}
            <div className={styles.grid}>
              {grid.map((sym, i) => {
                const isWin = winIndices.has(i);
                const isNew = newCells.has(i);
                const isSpinning = spinningCells[i];
                return (
                  <div
                    key={i}
                    className={[
                      styles.cell,
                      isWin ? styles.cellWin : '',
                      isNew ? styles.cellNew : '',
                      isSpinning ? styles.cellSpin : '',
                    ].join(' ')}
                    style={isWin ? { '--cell-color': SYMBOL_COLOR[sym] } as React.CSSProperties : undefined}
                  >
                    <span className={styles.cellEmoji}>{sym}</span>
                  </div>
                );
              })}
            </div>

            {/* Bet control */}
            <div className={styles.betRow}>
              <span className={styles.betLabel}>Aposta</span>
              <div className={styles.betBtns}>
                {[5, 10, 25, 50, 100].map(v => (
                  <button
                    key={v}
                    className={`${styles.betBtn} ${bet === v ? styles.betBtnActive : ''}`}
                    onClick={() => setBet(v)}
                    disabled={isPlaying}
                  >R${v}</button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className={styles.actionRow}>
              {canSpinFree ? (
                <button className={styles.btnFree} onClick={spinFree}>
                  ✨ FREE SPIN ({freeSpinsLeft})
                </button>
              ) : (
                <button
                  className={`${styles.btnSpin} ${isPlaying ? styles.btnSpinActive : ''}`}
                  onClick={spin}
                  disabled={isPlaying || phase === 'freespins'}
                >
                  {isPlaying ? (
                    <><span className={styles.spinnerDot} />Girando...</>
                  ) : '🌿 GIRAR'}
                </button>
              )}
            </div>

            {/* Pay table */}
            <div className={styles.paytable}>
              <div className={styles.paytableTitle}>Grupos de 8+ · Multiplicadores</div>
              <div className={styles.paytableGrid}>
                {(Object.entries(SYMBOL_MULT) as [Sym, number[]][]).map(([sym, mults]) => (
                  <div key={sym} className={styles.paytableRow}>
                    <span className={styles.paytableSym}>{sym}</span>
                    <span className={styles.paytableMult} style={{ color: SYMBOL_COLOR[sym] }}>
                      {mults[0]}× / {mults[1]}× / {mults[2]}×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LEADERBOARD */}
          <div className={styles.lbCol}>
            <div className={styles.lbTitle}>🏆 Top Jogadores</div>
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
