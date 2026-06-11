import { useState, useEffect, useCallback } from 'react';
import { houses } from './data';
import styles from './App.module.css';

// ── Cookie helpers ──────────────────────────────────────────
const todayKey = () => {
  const d = new Date();
  return `bh_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
};

function loadChecked(): Set<string> {
  try {
    const key = todayKey();
    const match = document.cookie.split('; ').find(r => r.startsWith(key + '='));
    if (!match) return new Set();
    const val = decodeURIComponent(match.split('=')[1]);
    return new Set(JSON.parse(val));
  } catch { return new Set(); }
}

function saveChecked(checked: Set<string>) {
  const key = todayKey();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  document.cookie = `${key}=${encodeURIComponent(JSON.stringify([...checked]))}; expires=${midnight.toUTCString()}; path=/; SameSite=Lax`;
}

// ── Total roletas ────────────────────────────────────────────
const activeHouses = houses.filter(h => h.active);
const totalRoletas = activeHouses.reduce((s, h) => s + h.roletas.length, 0);

// roleta key = houseId + ':' + roletaIndex
function roletaKey(houseId: string, idx: number) {
  return `${houseId}:${idx}`;
}

export default function App() {
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked());
  const [filter, setFilter] = useState<'todas' | 'pendentes'>('todas');

  useEffect(() => { saveChecked(checked); }, [checked]);

  const toggle = useCallback((key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const doneCount = [...checked].length;
  const pct = totalRoletas > 0 ? Math.round((doneCount / totalRoletas) * 100) : 0;
  const allDone = doneCount >= totalRoletas;

  const displayed = filter === 'pendentes'
    ? activeHouses.filter(h => h.roletas.some((_, i) => !checked.has(roletaKey(h.id, i))))
    : activeHouses;

  // date string
  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className={styles.page}>

      {/* ── TOP BAR ── */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          BetHub
        </div>
        <span className={styles.date}>{dateStr}</span>
      </header>

      {/* ── MISSION BAR ── */}
      <div className={styles.mission}>
        <div className={styles.missionTop}>
          <div className={styles.missionLabel}>
            {allDone
              ? '✦ Missão completa!'
              : `Roletas do dia`}
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
      </div>

      {/* ── FILTERS ── */}
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
      </div>

      {/* ── LIST ── */}
      <main className={styles.list}>
        {displayed.map((house, hi) => {
          const houseDone = house.roletas.every((_, i) => checked.has(roletaKey(house.id, i)));
          const hasDouble = house.roletas.length > 1;

          return (
            <div
              key={house.id}
              className={`${styles.houseRow} ${houseDone ? styles.houseDone : ''}`}
              style={{ animationDelay: `${hi * 30}ms` }}
            >
              {/* Left: index */}
              <span className={styles.houseIdx}>{String(hi + 1).padStart(2, '0')}</span>

              {/* Center: name + roletas */}
              <div className={styles.houseBody}>
                <a
                  href={house.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.houseName}
                >
                  {house.name}
                  {hasDouble && <span className={styles.doubleBadge}>×{house.roletas.length}</span>}
                </a>

                <div className={styles.roletaList}>
                  {house.roletas.map((r, ri) => {
                    const rk = roletaKey(house.id, ri);
                    const done = checked.has(rk);
                    return (
                      <button
                        key={ri}
                        className={`${styles.roletaBtn} ${done ? styles.roletaDone : ''}`}
                        onClick={() => toggle(rk)}
                        title={done ? 'Desmarcar' : 'Marcar como feito'}
                      >
                        <span className={styles.roletaCheck}>{done ? '✓' : '○'}</span>
                        <span className={styles.roletaLabel}>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: open link */}
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

        {/* Evitar section */}
        {filter === 'todas' && (
          <div className={styles.trashSection}>
            {houses.filter(h => !h.active).map(h => (
              <div key={h.id} className={styles.trashRow}>
                <span className={styles.trashName}>{h.name}</span>
                <span className={styles.trashBadge}>evitar</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        Jogue com responsabilidade · 18+
      </footer>
    </div>
  );
}
