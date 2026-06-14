import { useState, useEffect, useCallback, useRef } from 'react';
import { houses as localHouses } from './data';
import { api, type ApiHouse } from './api';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { LoginScreen } from './Login';
import { AdminPanel } from './AdminPanel';
import styles from './App.module.css';
import { MemeWheel } from './components/MemeWheel';

// ── Helpers ──────────────────────────────────────────────────
function rk(houseId: string, idx: number) { return `${houseId}:${idx}`; }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtMoney(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type Filter = 'todas' | 'pendentes' | 'gorjetas' | 'deposite';

const bonusTags: Record<string, { gorjeta?: string; deposite?: string }> = {
  lotogreen: { gorjeta: 'Gorjetas e roletas diarias', deposite: 'Deposito com campanhas recorrentes' },
  lottu: { gorjeta: 'Giros e recompensas para usuarios ativos' },
  novibet: { deposite: 'Bonus para depositar e jogar ao vivo' },
  br4: { gorjeta: 'Duas roletas de bonus', deposite: 'Campanhas de deposito frequentes' },
  superbet: { deposite: 'Ofertas para novos depositos' },
  donald: { gorjeta: 'Bonus direto na conta' },
  ginga: { gorjeta: 'Roleta e missoes promocionais' },
  betano: { deposite: 'Promocoes para deposito e aposta' },
  vaidebet: { deposite: 'Ofertas de deposito e cassino' },
  hiper: { gorjeta: 'Bonus rapido', deposite: 'Deposito com beneficios de campanha' },
  esportesdasorte: { deposite: 'Promocoes para deposito' },
  apostaganha: { gorjeta: 'Roleta no cassino', deposite: 'Bonus de deposito no cassino' },
  voudebet: { gorjeta: 'Bonus disponivel' },
  vixe: { gorjeta: 'Roleta promocional' },
  upbet: { gorjeta: 'Bonus e campanhas ativas' },
  mma: { gorjeta: 'Bonus de cassino' },
  apostou: { gorjeta: 'Roleta promocional' },
  ona: { gorjeta: 'Roleta e missoes' },
  betnacional: { deposite: 'Promocoes e bonus de deposito' },
  jogao: { gorjeta: 'Bonus disponivel' },
  jogodeouro: { gorjeta: 'Bonus disponivel' },
  galera: { gorjeta: 'Bonus com condicoes especiais' },
};

function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

// fallback houses shape (from local data.ts) → ApiHouse-like
function fallbackHouses(): ApiHouse[] {
  return localHouses.map((h, i) => ({
    _id: h.id,
    id: h.id,
    name: h.name,
    url: h.url,
    roletas: h.roletas,
    active: h.active,
    note: h.note,
    order: i,
  }));
}

// ── Main app (after login) ──────────────────────────────────
function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [houses, setHouses] = useState<ApiHouse[] | null>(null);
  const [checked, setChecked] = useState<Record<string, { ts: string; amount: number }>>({});
  const [totalGanhoHoje, setTotalGanhoHoje] = useState(0);
  const [gorjetas, setGorjetas] = useState(0);
  const [depositos, setDepositos] = useState(0);
  const [ganhos, setGanhos] = useState(0);
  const [filter, setFilter] = useState<Filter>('todas');
  const [showAdmin, setShowAdmin] = useState(false);
  const [amountModal, setAmountModal] = useState<{ houseId: string; idx: number; label: string } | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [apiError, setApiError] = useState(false);
  const [manualAmountType, setManualAmountType] = useState<'gorjeta' | 'deposito' | 'ganho' | null>(null);
  const [manualAmountInput, setManualAmountInput] = useState('');

  const midnightTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load houses + today's spins
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [housesRes, todayRes] = await Promise.all([api.getHouses(), api.getMyToday()]);
        if (cancelled) return;
        setHouses(housesRes.houses);
        setApiError(false);

        const map: Record<string, { ts: string; amount: number }> = {};
        for (const spin of todayRes.spins) {
          // find roleta index by label within that house
          const house = housesRes.houses.find(h => h.id === spin.houseId);
          const idx = house?.roletas.findIndex(r => r.label === spin.roletaLabel) ?? 0;
          map[rk(spin.houseId, idx >= 0 ? idx : 0)] = { ts: spin.playedAt, amount: spin.amount };
        }
        setChecked(map);
        setTotalGanhoHoje(todayRes.totalGanhoHoje);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setApiError(true);
        setHouses(fallbackHouses());
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Reset at midnight
  useEffect(() => {
    function scheduleReset() {
      const ms = msUntilMidnight();
      midnightTimer.current = setTimeout(() => {
        setChecked({});
        setTotalGanhoHoje(0);
        scheduleReset();
      }, ms);
    }
    scheduleReset();
    return () => clearTimeout(midnightTimer.current);
  }, []);

  const activeHouses = (houses ?? []).filter(h => h.active);
  const totalRoletas = activeHouses.reduce((s, h) => s + h.roletas.length, 0);
  const doneCount = Object.keys(checked).length;
  const pct = totalRoletas > 0 ? Math.round((doneCount / totalRoletas) * 100) : 0;
  const allDone = doneCount >= totalRoletas && totalRoletas > 0;

  const openAmountModal = useCallback((houseId: string, idx: number, label: string) => {
    setAmountInput('');
    setAmountModal({ houseId, idx, label });
  }, []);

  const closeAmountModal = useCallback(() => setAmountModal(null), []);

  const confirmAmount = useCallback(async () => {
    if (!amountModal) return;
    const amount = parseFloat(amountInput.replace(',', '.')) || 0;
    const { houseId, idx, label } = amountModal;
    const key = rk(houseId, idx);
    const ts = new Date().toISOString();

    setChecked(prev => ({ ...prev, [key]: { ts, amount } }));
    setTotalGanhoHoje(prev => prev + amount);
    setAmountModal(null);

    if (!apiError) {
      try {
        await api.createSpin({ houseId, roletaLabel: label, amount, playedAt: ts });
      } catch (err) {
        console.error('Falha ao salvar spin:', err);
      }
    }
  }, [amountModal, amountInput, apiError]);

  // toggle off (unmark)
  const unmark = useCallback((houseId: string, idx: number) => {
    const key = rk(houseId, idx);
    setChecked(prev => {
      const next = { ...prev };
      const removed = next[key];
      delete next[key];
      if (removed) setTotalGanhoHoje(t => Math.max(0, t - removed.amount));
      return next;
    });
    // Nota: não removemos o registro do backend para manter histórico de auditoria
  }, []);

  const gorjetaCount = activeHouses.filter(h => bonusTags[h.id]?.gorjeta).length;
  const depositeCount = activeHouses.filter(h => bonusTags[h.id]?.deposite).length;
  const displayed = activeHouses.filter(h => {
    if (filter === 'pendentes') return h.roletas.some((_, i) => !checked[rk(h.id, i)]);
    if (filter === 'gorjetas') return !!bonusTags[h.id]?.gorjeta;
    if (filter === 'deposite') return !!bonusTags[h.id]?.deposite;
    return true;
  });

  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (houses === null) {
    return <div className={styles.loadingPage}>Carregando...</div>;
  }

  if (showAdmin && user?.role === 'admin') {
    return <AdminPanel onBack={() => setShowAdmin(false)} />;
  }

  return (
    <div className={styles.page}>

      {/* TOP BAR */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          BetHub
        </div>
        <div className={styles.topbarRight}>
          <span className={styles.date}>{dateStr}</span>
          <div className={styles.userMenu}>
            <span className={styles.userName}>{user?.username || user?.name}</span>
            {user?.role === 'admin' && (
              <button className={styles.adminBtn} onClick={() => setShowAdmin(true)}>
                Admin
              </button>
            )}
            <button 
              className={styles.themeToggle} 
              onClick={toggleTheme} 
              title={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className={styles.logoutBtn} onClick={logout} title="Sair">⏻</button>
          </div>
        </div>
      </header>

      {apiError && (
        <div className={styles.apiWarning}>
          ⚠️ Não foi possível conectar à API. Mostrando dados locais — seu progresso não será salvo.
        </div>
      )}

      {/* MISSION */}
      <div className={styles.mission}>
        <div className={styles.missionTop}>
          <div className={styles.missionLabel}>
            {allDone ? '✦ Missão completa!' : 'Roletas do dia'}
          </div>
          <div className={styles.missionCount}>
            <span className={styles.missionDone}>{doneCount}</span>
            <span className={styles.missionSep}>/</span>
            <span>{totalRoletas}</span>
          </div>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${allDone ? styles.progressComplete : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className={styles.earningsRow}>
          <span className={styles.earningsLabel}>Ganho hoje</span>
          <span className={styles.earningsValue}>{fmtMoney(totalGanhoHoje)}</span>
        </div>
      </div>

      {/* MANUAL ENTRIES */}
      <div className={styles.manualEntriesGrid}>
        {/* Gorjetas */}
        <div className={styles.manualCard}>
          <div className={styles.manualCardTop}>
            <div className={styles.manualCardLabel}>💰 Gorjetas</div>
            <div className={styles.manualCardValue}>{fmtMoney(gorjetas)}</div>
          </div>
          <div className={styles.manualCardFooter}>
            <input 
              type="number" 
              inputMode="decimal" 
              step="0.01"
              min="0"
              placeholder="Valor" 
              value={manualAmountType === 'gorjeta' ? manualAmountInput : ''}
              onChange={(e) => {
                setManualAmountType('gorjeta');
                setManualAmountInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualAmountInput) {
                  const amount = parseFloat(manualAmountInput.replace(',', '.')) || 0;
                  setGorjetas(prev => prev + amount);
                  setManualAmountInput('');
                  setManualAmountType(null);
                }
              }}
              className={styles.manualInput}
            />
            <button 
              className={styles.manualBtn}
              onClick={() => {
                const amount = parseFloat(manualAmountInput.replace(',', '.')) || 0;
                if (amount > 0) {
                  setGorjetas(prev => prev + amount);
                  setManualAmountInput('');
                  setManualAmountType(null);
                }
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Depositos */}
        <div className={styles.manualCard}>
          <div className={styles.manualCardTop}>
            <div className={styles.manualCardLabel}>🏦 Depósitos</div>
            <div className={styles.manualCardValue}>{fmtMoney(depositos)}</div>
          </div>
          <div className={styles.manualCardFooter}>
            <input 
              type="number" 
              inputMode="decimal" 
              step="0.01"
              min="0"
              placeholder="Valor" 
              value={manualAmountType === 'deposito' ? manualAmountInput : ''}
              onChange={(e) => {
                setManualAmountType('deposito');
                setManualAmountInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualAmountInput) {
                  const amount = parseFloat(manualAmountInput.replace(',', '.')) || 0;
                  setDepositos(prev => prev + amount);
                  setManualAmountInput('');
                  setManualAmountType(null);
                }
              }}
              className={styles.manualInput}
            />
            <button 
              className={styles.manualBtn}
              onClick={() => {
                const amount = parseFloat(manualAmountInput.replace(',', '.')) || 0;
                if (amount > 0) {
                  setDepositos(prev => prev + amount);
                  setManualAmountInput('');
                  setManualAmountType(null);
                }
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Ganhos */}
        <div className={styles.manualCard}>
          <div className={styles.manualCardTop}>
            <div className={styles.manualCardLabel}>🎁 Ganhos extras</div>
            <div className={styles.manualCardValue}>{fmtMoney(ganhos)}</div>
          </div>
          <div className={styles.manualCardFooter}>
            <input 
              type="number" 
              inputMode="decimal" 
              step="0.01"
              min="0"
              placeholder="Valor" 
              value={manualAmountType === 'ganho' ? manualAmountInput : ''}
              onChange={(e) => {
                setManualAmountType('ganho');
                setManualAmountInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualAmountInput) {
                  const amount = parseFloat(manualAmountInput.replace(',', '.')) || 0;
                  setGanhos(prev => prev + amount);
                  setManualAmountInput('');
                  setManualAmountType(null);
                }
              }}
              className={styles.manualInput}
            />
            <button 
              className={styles.manualBtn}
              onClick={() => {
                const amount = parseFloat(manualAmountInput.replace(',', '.')) || 0;
                if (amount > 0) {
                  setGanhos(prev => prev + amount);
                  setManualAmountInput('');
                  setManualAmountType(null);
                }
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className={styles.filters}>
        <button
          className={`${styles.ftab} ${filter === 'todas' ? styles.ftabOn : ''}`}
          onClick={() => setFilter('todas')}
        >
          Todas <span className={styles.ftabCount}>{activeHouses.length}</span>
        </button>
        <button
          className={`${styles.ftab} ${filter === 'pendentes' ? styles.ftabOn : ''}`}
          onClick={() => setFilter('pendentes')}
        >
          Pendentes <span className={styles.ftabCount}>{totalRoletas - doneCount}</span>
        </button>
        <button
          className={`${styles.ftab} ${filter === 'gorjetas' ? styles.ftabOn : ''}`}
          onClick={() => setFilter('gorjetas')}
        >
          Gorjetas <span className={styles.ftabCount}>{gorjetaCount}</span>
        </button>
        <button
          className={`${styles.ftab} ${filter === 'deposite' ? styles.ftabOn : ''}`}
          onClick={() => setFilter('deposite')}
        >
          Deposite e ganhe <span className={styles.ftabCount}>{depositeCount}</span>
        </button>
      </div>

      {/* LIST */}
      <main className={styles.list}>
        {displayed.map((house, hi) => {
          const houseDone = house.roletas.every((_, i) => !!checked[rk(house.id, i)]);
          const hasDouble = house.roletas.length > 1;

          return (
            <div
              key={house.id}
              className={`${styles.houseRow} ${houseDone ? styles.houseDone : ''}`}
              style={{ animationDelay: `${hi * 25}ms` }}
            >
              <span className={styles.houseIdx}>{String(hi + 1).padStart(2, '0')}</span>

              <div className={styles.houseBody}>
                <div className={styles.houseHead}>
                <a
                  href={house.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.houseName}
                >
                  {house.name}
                  {hasDouble && <span className={styles.doubleBadge}>×{house.roletas.length}</span>}
                </a>
                  <div className={styles.bonusBadges}>
                    {bonusTags[house.id]?.gorjeta && <span className={styles.gorjetaBadge}>Gorjeta</span>}
                    {bonusTags[house.id]?.deposite && <span className={styles.depositeBadge}>Deposite e ganhe</span>}
                  </div>
                </div>

                {house.note && <div className={styles.houseNote}>{house.note}</div>}
                {(bonusTags[house.id]?.gorjeta || bonusTags[house.id]?.deposite) && (
                  <div className={styles.bonusNote}>
                    {[bonusTags[house.id]?.gorjeta, bonusTags[house.id]?.deposite].filter(Boolean).join(' - ')}
                  </div>
                )}

                <div className={styles.roletaList}>
                  {house.roletas.map((r, ri) => {
                    const key = rk(house.id, ri);
                    const entry = checked[key];
                    const done = !!entry;

                    return (
                      <div key={ri} className={styles.roletaWrap}>
                        <button
                          className={`${styles.roletaBtn} ${done ? styles.roletaDone : ''}`}
                          onClick={() => done ? unmark(house.id, ri) : openAmountModal(house.id, ri, r.label)}
                          title={done ? 'Desmarcar' : 'Marcar como feito'}
                        >
                          <span className={styles.roletaCheck}>{done ? '✓' : '○'}</span>
                          <span className={styles.roletaLabel}>{r.label}</span>
                        </button>
                        {done && entry && (
                          <span className={styles.roletaTime}>
                            {fmtTime(entry.ts)} · {fmtMoney(entry.amount)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <a
                href={house.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.houseLink}
                title={`Abrir ${house.name}`}
              >
                ↗
              </a>
            </div>
          );
        })}
      </main>

      <footer className={styles.footer}>
        Jogue com responsabilidade · 18+ · Reset automático à meia-noite
      </footer>

      <MemeWheel />

      {/* AMOUNT MODAL */}
      {amountModal && (
        <div className={styles.overlay} onClick={closeAmountModal}>
          <div className={styles.amountModal} onClick={e => e.stopPropagation()}>
            <div className={styles.amountTitle}>Quanto você ganhou?</div>
            <div className={styles.amountSubtitle}>{amountModal.label}</div>
            <input
              className={styles.amountInput}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') confirmAmount(); }}
            />
            <div className={styles.amountActions}>
              <button className={styles.amountCancel} onClick={closeAmountModal}>Cancelar</button>
              <button className={styles.amountConfirm} onClick={confirmAmount}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root: auth gate ──────────────────────────────────────────
export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className={styles.loadingPage}>Carregando...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <Dashboard />;
}
