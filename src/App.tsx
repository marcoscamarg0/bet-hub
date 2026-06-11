import { useState } from 'react';
import { houses, siteConfig } from './data';
import type { House } from './types';
import styles from './App.module.css';

type Filter = 'todas' | 'diaria' | 'ativas';

export default function App() {
  const [filter, setFilter] = useState<Filter>('todas');
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filtered = houses.filter(h => {
    if (filter === 'diaria') return h.hasDaily;
    if (filter === 'ativas') return h.active;
    return true;
  });

  const dailyTotal = houses.filter(h => h.hasDaily && h.active).length;
  const activeTotal = houses.filter(h => h.active).length;
  const checkedToday = [...checked].filter(id => {
    const h = houses.find(x => x.id === id);
    return h?.hasDaily;
  }).length;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.logo}>{siteConfig.title}</h1>
        <div className={styles.progress}>
          <span className={styles.progressLabel}>Roletas hoje</span>
          <span className={styles.progressCount}>
            <span className={styles.progressDone}>{checkedToday}</span>
            <span className={styles.progressSep}>/</span>
            {dailyTotal}
          </span>
        </div>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        {(['todas', 'diaria', 'ativas'] as Filter[]).map(f => (
          <button
            key={f}
            className={`${styles.fbtn} ${filter === f ? styles.factive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'todas' ? `Todas (${houses.length})` : f === 'diaria' ? `Roleta diária (${dailyTotal})` : `Ativas (${activeTotal})`}
          </button>
        ))}
      </div>

      {/* List */}
      <main className={styles.list}>
        {filtered.map((h: House, i: number) => {
          const done = checked.has(h.id);
          return (
            <div
              key={h.id}
              className={`${styles.row} ${!h.active ? styles.inactive : ''} ${done ? styles.done : ''}`}
            >
              <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>

              <a
                href={h.active ? h.url : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.name}
                onClick={e => !h.active && e.preventDefault()}
              >
                {h.name}
              </a>

              <div className={styles.rowRight}>
                {h.hasDaily && (
                  <span className={styles.dailyBadge} title="Tem roleta diária">
                    🎰 diária
                  </span>
                )}
                {!h.active && (
                  <span className={styles.trashBadge}>evitar</span>
                )}
                {h.hasDaily && h.active && (
                  <button
                    className={`${styles.checkBtn} ${done ? styles.checkDone : ''}`}
                    onClick={() => toggle(h.id)}
                    title={done ? 'Desmarcar' : 'Marcar como feito hoje'}
                  >
                    {done ? '✓' : '○'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </main>

      <footer className={styles.footer}>
        Jogue com responsabilidade · 18+
      </footer>
    </div>
  );
}
