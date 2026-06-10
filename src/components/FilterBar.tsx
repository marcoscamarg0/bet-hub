import styles from './FilterBar.module.css';
import type { Category } from '../types';

type FilterValue = 'todos' | Category;

interface Props {
  active: FilterValue;
  onChange: (f: FilterValue) => void;
  counts: Record<string, number>;
}

const filters: { value: FilterValue; label: string }[] = [
  { value: 'todos',     label: '🏠 Todos'      },
  { value: 'esportes',  label: '⚽ Esportes'   },
  { value: 'ao-vivo',   label: '📡 Ao Vivo'    },
  { value: 'cassino',   label: '🎰 Cassino'    },
];

export default function FilterBar({ active, onChange, counts }: Props) {
  return (
    <div className={styles.bar}>
      {filters.map(f => (
        <button
          key={f.value}
          className={`${styles.btn} ${active === f.value ? styles.active : ''}`}
          onClick={() => onChange(f.value)}
        >
          {f.label}
          <span className={styles.count}>{counts[f.value] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
