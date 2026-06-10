import { useState, useMemo } from 'react';
import { houses, siteConfig } from './data';
import BettingCard from './components/BettingCard';
import FilterBar from './components/FilterBar';
import type { Category } from './types';
import styles from './App.module.css';

type FilterValue = 'todos' | Category;

// Animated chip SVG for the hero background
function ChipDecor() {
  return (
    <div className={styles.chipDecor} aria-hidden>
      {['🃏','🎲','🎴','♠️','♥️','🎰','💎','🪙'].map((ch, i) => (
        <span key={i} className={styles.chip} style={{ animationDelay: `${i * 0.7}s`, left: `${10 + i * 11}%` }}>
          {ch}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const [filter, setFilter] = useState<FilterValue>('todos');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return houses.filter(h => {
      const matchCat = filter === 'todos' || h.category.includes(filter as Category);
      const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [filter, search]);

  // Count per filter
  const counts = useMemo(() => {
    const result: Record<string, number> = { todos: houses.length };
    (['esportes', 'cassino', 'ao-vivo'] as Category[]).forEach(cat => {
      result[cat] = houses.filter(h => h.category.includes(cat)).length;
    });
    return result;
  }, []);

  const featuredCount = houses.filter(h => h.featured).length;
  const totalBonus = houses.filter(h => !h.isTrash).length;

  return (
    <div className={styles.app}>
      {/* ── HERO ── */}
      <header className={styles.hero}>
        <ChipDecor />
        <div className={styles.heroInner}>
          <div className={styles.heroEyebrow}>
            <span className={styles.dot} />
            Atualizado manualmente
          </div>
          <h1 className={styles.heroTitle}>
            {siteConfig.title}
            <span className={styles.heroAccent}>.</span>
          </h1>
          <p className={styles.heroSub}>{siteConfig.description}</p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{houses.length}</span>
              <span className={styles.statLabel}>Casas</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>{featuredCount}</span>
              <span className={styles.statLabel}>Top Picks</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>{totalBonus}</span>
              <span className={styles.statLabel}>Com Bônus</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── CONTROLS ── */}
      <section className={styles.controls}>
        <FilterBar active={filter} onChange={setFilter} counts={counts} />
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.search}
            type="text"
            placeholder="Buscar casa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </section>

      {/* ── GRID ── */}
      <main className={styles.main}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span>😶</span>
            <p>Nenhuma casa encontrada.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(house => (
              <BettingCard key={house.id} house={house} />
            ))}
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <p>Aposte com responsabilidade. 18+ · Jogue com moderação.</p>
      </footer>
    </div>
  );
}
