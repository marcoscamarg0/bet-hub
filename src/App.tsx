import { useState, useEffect, useCallback, useRef } from 'react';
import { houses } from './data';
import styles from './App.module.css';
import { MemeWheel } from './components/MemeWheel';

// ── Storage key ─────────────────────────────────────────────
const storageKey = () => {
  const d = new Date();
  return `bh_${d.getFullYear()}_${String(d.getMonth()).padStart(2,'0')}_${String(d.getDate()).padStart(2,'0')}`;
};

const previousDayTimeKey = 'bh_previous_day_time';

interface Entry {
  ts: number; // unix ms
}

type CheckedMap = Record<string, Entry>; // roletaKey -> Entry

function load(): CheckedMap {
  try {
    const key = storageKey();
    const match = document.cookie.split('; ').find(r => r.startsWith(key + '='));
    if (!match) return {};
    return JSON.parse(decodeURIComponent(match.split('=')[1]));
  } catch { return {}; }
}

function save(map: CheckedMap) {
  const key = storageKey();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  document.cookie = `${key}=${encodeURIComponent(JSON.stringify(map))}; expires=${midnight.toUTCString()}; path=/; SameSite=Lax`;
}

function getPreviousDayTime(): number | null {
  try {
    const val = localStorage.getItem(previousDayTimeKey);
    return val ? parseInt(val, 10) : null;
  } catch { return null; }
}

function setPreviousDayTime(ts: number) {
  try {
    localStorage.setItem(previousDayTimeKey, String(ts));
  } catch { }
}

// ── Helpers ──────────────────────────────────────────────────
const activeHouses = houses.filter(h => h.active);
const totalRoletas = activeHouses.reduce((s, h) => s + h.roletas.length, 0);

function rk(houseId: string, idx: number) { return `${houseId}:${idx}`; }

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

// ── Component ────────────────────────────────────────────────
export default function App() {
  const [checked, setChecked] = useState<CheckedMap>(() => load());
  const [previousDayTime, setPreviousDayTimeState] = useState<number | null>(() => getPreviousDayTime());
  const [, tick] = useState(0); // force re-render each minute for clock
  const [filter, setFilter] = useState<'todas' | 'pendentes'>('todas');
  const midnightTimer = useRef<ReturnType<typeof setTimeout>>();

  // Save whenever checked changes
  useEffect(() => { save(checked); }, [checked]);

  // Tick every minute so timestamps stay fresh
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Reset at midnight
  useEffect(() => {
    function scheduleReset() {
      const ms = msUntilMidnight();
      midnightTimer.current = setTimeout(() => {
        // Capture the last timestamp before resetting
        const entries = Object.values(checked) as Entry[];
        if (entries.length > 0) {
          const lastTs = Math.max(...entries.map(e => e.ts));
          setPreviousDayTime(lastTs);
          setPreviousDayTimeState(lastTs);
        }
        setChecked({});
        scheduleReset(); // reschedule for next day
      }, ms);
    }
    scheduleReset();
    return () => clearTimeout(midnightTimer.current);
  }, [checked]);

  const toggle = useCallback((key: string) => {
    setChecked(prev => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { ts: Date.now() };
      }
      return next;
    });
  }, []);

  const doneCount = Object.keys(checked).length;
  const pct = totalRoletas > 0 ? Math.round((doneCount / totalRoletas) * 100) : 0;
  const allDone = doneCount >= totalRoletas;

  const displayed = filter === 'pendentes'
    ? activeHouses.filter(h => h.roletas.some((_, i) => !checked[rk(h.id, i)]))
    : activeHouses;

  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className={styles.page}>

      {/* TOP BAR */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          BetHub
        </div>
        <div className={styles.dateSection}>
          <span className={styles.date}>{dateStr}</span>
          {previousDayTime && (
            <span className={styles.previousDayTime}>
              🕐 Ontem: {fmtTime(previousDayTime)}
            </span>
          )}
        </div>
      </header>

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
                <a
                  href={house.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.houseName}
                >
                  {house.name}
                  {hasDouble && <span className={styles.doubleBadge}>×{house.roletas.length}</span>}
                </a>

                {house.note && (
                  <div className={styles.houseNote}>{house.note}</div>
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
                          onClick={() => toggle(key)}
                          title={done ? 'Desmarcar' : 'Marcar como feito'}
                        >
                          <span className={styles.roletaCheck}>{done ? '✓' : '○'}</span>
                          <span className={styles.roletaLabel}>{r.label}</span>
                        </button>
                        {done && entry && (
                          <span className={styles.roletaTime}>{fmtTime(entry.ts)}</span>
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
        Jogue com responsabilidade · 18+ · Reset automático à meia-noite
      </footer>

      <MemeWheel />
    </div>
  );
}
