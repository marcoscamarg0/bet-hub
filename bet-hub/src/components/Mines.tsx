import { useState, useCallback, useRef, useEffect } from 'react';
import styles from './Mines.module.css';

// ── Types ────────────────────────────────────────────────────
interface ScoreEntry {
  name: string;
  amount: number;
  mines: number;
  cells: number;
  ts: number;
}

// ── Cookie storage (shared via key, expires in 30 days) ──────
const LB_KEY = 'bh_mines_lb_v1';

function lbLoad(): ScoreEntry[] {
  try {
    const match = document.cookie.split('; ').find(r => r.startsWith(LB_KEY + '='));
    if (!match) return [];
    return JSON.parse(decodeURIComponent(match.split('=')[1]));
  } catch { return []; }
}

function lbSave(entries: ScoreEntry[]) {
  const exp = new Date();
  exp.setDate(exp.getDate() + 30);
  document.cookie = `${LB_KEY}=${encodeURIComponent(JSON.stringify(entries))}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`;
}

function lbAdd(entry: ScoreEntry) {
  const lb = lbLoad();
  lb.push(entry);
  lb.sort((a, b) => b.amount - a.amount);
  lbSave(lb.slice(0, 50));
}

// ── Helpers ──────────────────────────────────────────────────
const GRID = 25;
const SAFE_TOTAL = (mines: number) => GRID - mines;

function calcMultiplier(revealed: number, mineCount: number): number {
  // fair multiplier considering house edge of 3%
  let prob = 1;
  for (let i = 0; i < revealed; i++) {
    prob *= (GRID - mineCount - i) / (GRID - i);
  }
  return prob > 0 ? Math.round((0.97 / prob) * 100) / 100 : 1;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtMoney(n: number) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeSince(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return Math.floor(s / 60) + 'min';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || '??';
}

// ── Cell states ──────────────────────────────────────────────
type CellState = 'hidden' | 'safe' | 'bust' | 'mine-reveal' | 'safe-reveal';

// ── Component ────────────────────────────────────────────────
type GamePhase = 'idle' | 'playing' | 'won' | 'lost';

export function MinesGame({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const handleClose = () => { if (onClose) onClose(); else setInternalOpen(false); };
  const handleOpen = () => setInternalOpen(true);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [bet, setBet] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [playerName, setPlayerName] = useState('');
  const [mines, setMines] = useState<number[]>([]);
  const [cells, setCells] = useState<CellState[]>(Array(GRID).fill('hidden'));
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [multiplier, setMultiplier] = useState(1);
  const [lb, setLb] = useState<ScoreEntry[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [popCell, setPopCell] = useState<number | null>(null);
  const lbRefreshRef = useRef<ReturnType<typeof setInterval>>();

  // Load leaderboard
  const refreshLb = useCallback(() => setLb(lbLoad()), []);
  useEffect(() => {
    refreshLb();
    lbRefreshRef.current = setInterval(refreshLb, 10000);
    return () => clearInterval(lbRefreshRef.current);
  }, [refreshLb]);

  const gain = Math.round(bet * multiplier * 100) / 100;

  function startGame() {
    const allIdx = shuffle([...Array(GRID).keys()]);
    const newMines = allIdx.slice(0, mineCount);
    setMines(newMines);
    setCells(Array(GRID).fill('hidden'));
    setRevealed(new Set());
    setMultiplier(1);
    setPhase('playing');
    setStatusMsg('Clique nas células para revelar 💎');
  }

  function clickCell(i: number) {
    if (phase !== 'playing') return;
    if (cells[i] !== 'hidden') return;

    if (mines.includes(i)) {
      // BUST
      const newCells: CellState[] = [...cells];
      newCells[i] = 'bust';
      // reveal all mines with delay
      setTimeout(() => {
        setCells(prev => {
          const c = [...prev];
          mines.forEach((mi, idx) => {
            if (mi !== i) setTimeout(() => {
              setCells(p2 => {
                const c2 = [...p2];
                c2[mi] = 'mine-reveal';
                return c2;
              });
            }, idx * 60);
          });
          // reveal safe cells
          const safeCells = [...Array(GRID).keys()].filter(x => !mines.includes(x) && !revealed.has(x));
          safeCells.forEach((si, idx) => {
            setTimeout(() => {
              setCells(p2 => {
                const c2 = [...p2];
                if (c2[si] === 'hidden') c2[si] = 'safe-reveal';
                return c2;
              });
            }, idx * 20);
          });
          return c;
        });
      }, 50);
      setCells(newCells);
      setPhase('lost');
      setStatusMsg('💥 BOOM! Você perdeu ' + fmtMoney(bet));
      return;
    }

    // SAFE
    const newRevealed = new Set(revealed);
    newRevealed.add(i);
    const newCells: CellState[] = [...cells];
    newCells[i] = 'safe';
    const newMult = calcMultiplier(newRevealed.size, mineCount);

    setCells(newCells);
    setRevealed(newRevealed);
    setMultiplier(newMult);
    setPopCell(i);
    setTimeout(() => setPopCell(null), 250);

    if (newRevealed.size === SAFE_TOTAL(mineCount)) {
      setPhase('won');
      setStatusMsg('🏆 Perfeito! Você revelou tudo!');
      doSave(playerName || 'Anônimo', Math.round(bet * newMult * 100) / 100, mineCount, newRevealed.size);
    } else {
      setStatusMsg(`${newRevealed.size} célula${newRevealed.size > 1 ? 's' : ''} segura${newRevealed.size > 1 ? 's' : ''} · ${fmtMoney(bet * newMult)}`);
    }
  }

  function cashOut() {
    if (phase !== 'playing' || revealed.size === 0) return;
    const finalGain = Math.round(bet * multiplier * 100) / 100;
    setPhase('won');
    setStatusMsg('💰 Saque! Você ganhou ' + fmtMoney(finalGain));
    // reveal mines
    const newCells: CellState[] = [...cells];
    mines.forEach(mi => { if (newCells[mi] === 'hidden') newCells[mi] = 'mine-reveal'; });
    setCells(newCells);
    doSave(playerName || 'Anônimo', finalGain, mineCount, revealed.size);
  }

  function doSave(name: string, amount: number, mc: number, cellsRevealed: number) {
    if (amount <= 0) return;
    lbAdd({ name, amount, mines: mc, cells: cellsRevealed, ts: Date.now() });
    refreshLb();
  }

  const playing = phase === 'playing';
  const canCash = playing && revealed.size > 0;

  if (!open) {
    if (isOpen !== undefined) return null;
    return (
      <button className={styles.fab} onClick={handleOpen} title="Jogar Mines">
        💣
      </button>
    );
  }

  return (
    <div className={styles.overlay} onClick={() => !playing && handleClose()}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerTitle}>Mines</span>
            <span className={styles.headerSub}>Apostas fictícias</span>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* LEFT: GAME */}
          <div className={styles.gameCol}>
            {/* Player name */}
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Seu nome</label>
              <input
                className={styles.nameInput}
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Anônimo"
                maxLength={16}
                disabled={playing}
              />
            </div>

            {/* Stats */}
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Aposta</span>
                <span className={styles.statValue}>{fmtMoney(bet)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Mult</span>
                <span className={`${styles.statValue} ${styles.green}`}>{multiplier.toFixed(2)}×</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Ganho</span>
                <span className={`${styles.statValue} ${phase === 'lost' ? styles.red : styles.green}`}>
                  {phase === 'lost' ? '-' + fmtMoney(bet) : fmtMoney(gain)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className={styles.controls}>
              <div className={styles.sliderRow}>
                <span className={styles.sliderLabel}>Aposta</span>
                <input type="range" min={5} max={200} step={5} value={bet}
                  onChange={e => setBet(Number(e.target.value))}
                  disabled={playing} className={styles.slider} />
                <span className={styles.sliderVal}>R${bet}</span>
              </div>
              <div className={styles.sliderRow}>
                <span className={styles.sliderLabel}>Minas</span>
                <input type="range" min={1} max={10} step={1} value={mineCount}
                  onChange={e => setMineCount(Number(e.target.value))}
                  disabled={playing} className={styles.slider} />
                <span className={styles.sliderVal}>{mineCount}</span>
              </div>
            </div>

            {/* Grid */}
            <div className={`${styles.grid} ${phase === 'lost' ? styles.gridShake : ''}`}>
              {cells.map((state, i) => (
                <button
                  key={i}
                  className={[
                    styles.cell,
                    state === 'safe' ? styles.cellSafe : '',
                    state === 'bust' ? styles.cellBust : '',
                    state === 'mine-reveal' ? styles.cellMineReveal : '',
                    state === 'safe-reveal' ? styles.cellSafeReveal : '',
                    popCell === i ? styles.cellPop : '',
                  ].join(' ')}
                  onClick={() => clickCell(i)}
                  disabled={state !== 'hidden' || !playing}
                >
                  {state === 'safe' || state === 'safe-reveal' ? '💎' :
                   state === 'bust' || state === 'mine-reveal' ? '💣' : ''}
                </button>
              ))}
            </div>

            {/* Status */}
            <div className={`${styles.status} ${phase === 'lost' ? styles.statusLost : phase === 'won' ? styles.statusWon : ''}`}>
              {statusMsg || 'Configure e clique em Jogar'}
            </div>

            {/* Buttons */}
            <div className={styles.btnRow}>
              {phase === 'idle' || phase === 'lost' || phase === 'won' ? (
                <button className={styles.btnPlay} onClick={startGame}>
                  {phase === 'lost' ? 'Tentar de novo' : phase === 'won' ? 'Jogar de novo' : 'Jogar'}
                </button>
              ) : (
                <>
                  <button className={styles.btnCash} onClick={cashOut} disabled={!canCash}>
                    💰 Sacar {canCash ? fmtMoney(gain) : ''}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* RIGHT: LEADERBOARD */}
          <div className={styles.lbCol}>
            <div className={styles.lbTitle}>🏆 Maiores ganhos</div>
            {lb.length === 0 ? (
              <div className={styles.lbEmpty}>Nenhum ganho ainda.<br />Seja o primeiro!</div>
            ) : (
              <div className={styles.lbList}>
                {lb.map((entry, i) => (
                  <div key={i} className={styles.lbEntry}>
                    <span className={styles.lbRank}>{i + 1}</span>
                    <div className={styles.lbAvatar}>{initials(entry.name)}</div>
                    <div className={styles.lbInfo}>
                      <div className={styles.lbName}>{entry.name}</div>
                      <div className={styles.lbDetail}>{entry.cells} células · {entry.mines} 💣 · {timeSince(entry.ts)}</div>
                    </div>
                    <span className={styles.lbAmount}>+{fmtMoney(entry.amount)}</span>
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
