import { useState, useEffect, useCallback } from 'react';
import styles from './GlobalRanking.module.css';
import { api, type ApiScore } from '../api';

type GameFilter = 'all' | 'mines' | 'forest' | 'dragon';
type PeriodFilter = 'all' | 'week' | 'today';

const GAME_LABELS: Record<GameFilter, string> = {
  all: 'Todos',
  mines: '💣 Mines',
  forest: '🌿 Forest',
  dragon: '🐉 Dragon',
};

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all: 'Sempre',
  week: 'Esta semana',
  today: 'Hoje',
};

const MEDAL = ['🥇', '🥈', '🥉'];

const GAME_COLORS: Record<GameFilter, string> = {
  all:    '#8b5cf6',
  mines:  '#f59e0b',
  forest: '#34d399',
  dragon: '#ef4444',
};

function fmtMoney(n: number) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeSince(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return Math.floor(s / 60) + 'min atrás';
  if (s < 86400) return Math.floor(s / 3600) + 'h atrás';
  return Math.floor(s / 86400) + 'd atrás';
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function initials(name: string) {
  return (name || '?').trim().slice(0, 2).toUpperCase();
}

const GAME_BADGE: Record<string, { emoji: string; label: string; color: string }> = {
  mines:  { emoji: '💣', label: 'Mines',  color: '#f59e0b' },
  forest: { emoji: '🌿', label: 'Forest', color: '#34d399' },
  dragon: { emoji: '🐉', label: 'Dragon', color: '#ef4444' },
};

export function GlobalRanking({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const handleClose = () => { if (onClose) onClose(); else setInternalOpen(false); };
  const handleOpen = () => setInternalOpen(true);
  const [game, setGame] = useState<GameFilter>('all');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [scores, setScores] = useState<ApiScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getScores({
        game: game === 'all' ? undefined : game,
        period: period === 'all' ? undefined : period,
        limit: 50,
      });
      setScores(data);
      setLastUpdated(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [game, period]);

  useEffect(() => {
    if (open) {
      load();
      const iv = setInterval(load, 30000);
      return () => clearInterval(iv);
    }
  }, [open, load]);

  const accentColor = GAME_COLORS[game];

  if (!open) {
    if (isOpen !== undefined) return null;
    return (
      <button className={styles.fab} onClick={handleOpen} title="Ranking Global" style={{ '--fab-color': accentColor } as React.CSSProperties}>
        <span className={styles.fabIcon}>🏆</span>
        <span className={styles.fabLabel}>Ranking</span>
      </button>
    );
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ '--accent': accentColor } as React.CSSProperties}>

        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>🏆</span>
            <div>
              <div className={styles.headerTitle}>Ranking Global</div>
              <div className={styles.headerSub}>
                {lastUpdated ? `Atualizado ${timeSince(lastUpdated.toISOString())}` : 'Carregando...'}
              </div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>

        {/* FILTERS */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <div className={styles.filterLabel}>Jogo</div>
            <div className={styles.filterBtns}>
              {(Object.keys(GAME_LABELS) as GameFilter[]).map(g => (
                <button
                  key={g}
                  className={`${styles.filterBtn} ${game === g ? styles.filterBtnActive : ''}`}
                  style={game === g ? { '--btn-color': GAME_COLORS[g] } as React.CSSProperties : undefined}
                  onClick={() => setGame(g)}
                >
                  {GAME_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.filterGroup}>
            <div className={styles.filterLabel}>Período</div>
            <div className={styles.filterBtns}>
              {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map(p => (
                <button
                  key={p}
                  className={`${styles.filterBtn} ${period === p ? styles.filterBtnActive : ''}`}
                  style={period === p ? { '--btn-color': accentColor } as React.CSSProperties : undefined}
                  onClick={() => setPeriod(p)}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PODIUM (top 3) */}
        {!loading && scores.length >= 3 && (
          <div className={styles.podium}>
            {/* 2nd */}
            <div className={styles.podiumItem} style={{ order: 0 }}>
              <div className={styles.podiumAvatar} style={{ '--pa-color': accentColor } as React.CSSProperties}>
                {initials(scores[1]?.username || scores[1]?.name || '?')}
              </div>
              <div className={styles.podiumMedal}>{MEDAL[1]}</div>
              <div className={styles.podiumName}>{scores[1]?.username || scores[1]?.name}</div>
              <div className={styles.podiumAmount}>{fmtMoney(scores[1]?.amount || 0)}</div>
              <div className={styles.podiumBar} style={{ height: '50px', '--pb-color': accentColor } as React.CSSProperties} />
            </div>
            {/* 1st */}
            <div className={styles.podiumItem} style={{ order: 1 }}>
              <div className={styles.podiumCrown}>👑</div>
              <div className={`${styles.podiumAvatar} ${styles.podiumAvatarFirst}`} style={{ '--pa-color': accentColor } as React.CSSProperties}>
                {initials(scores[0]?.username || scores[0]?.name || '?')}
              </div>
              <div className={styles.podiumMedal}>{MEDAL[0]}</div>
              <div className={styles.podiumName}>{scores[0]?.username || scores[0]?.name}</div>
              <div className={styles.podiumAmount}>{fmtMoney(scores[0]?.amount || 0)}</div>
              <div className={styles.podiumBar} style={{ height: '80px', '--pb-color': accentColor } as React.CSSProperties} />
            </div>
            {/* 3rd */}
            <div className={styles.podiumItem} style={{ order: 2 }}>
              <div className={styles.podiumAvatar} style={{ '--pa-color': accentColor } as React.CSSProperties}>
                {initials(scores[2]?.username || scores[2]?.name || '?')}
              </div>
              <div className={styles.podiumMedal}>{MEDAL[2]}</div>
              <div className={styles.podiumName}>{scores[2]?.username || scores[2]?.name}</div>
              <div className={styles.podiumAmount}>{fmtMoney(scores[2]?.amount || 0)}</div>
              <div className={styles.podiumBar} style={{ height: '35px', '--pb-color': accentColor } as React.CSSProperties} />
            </div>
          </div>
        )}

        {/* FULL LIST */}
        <div className={styles.listWrapper}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} style={{ '--sp-color': accentColor } as React.CSSProperties} />
              <span>Carregando ranking...</span>
            </div>
          ) : scores.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🏆</span>
              <p>Nenhum resultado para este filtro.</p>
              <p>Seja o primeiro a jogar!</p>
            </div>
          ) : (
            <div className={styles.list}>
              {scores.map((s, i) => {
                const badge = GAME_BADGE[s.game] || GAME_BADGE.mines;
                return (
                  <div
                    key={s._id}
                    className={`${styles.row} ${i < 3 ? styles.rowTop : ''}`}
                    style={i < 3 ? { '--row-color': accentColor } as React.CSSProperties : undefined}
                  >
                    <div className={styles.rowRank}>
                      {i < 3 ? <span className={styles.rowMedal}>{MEDAL[i]}</span> : <span className={styles.rowNum}>{i + 1}</span>}
                    </div>
                    <div className={styles.rowAvatar} style={{ '--av-color': badge.color } as React.CSSProperties}>
                      {initials(s.username || s.name)}
                    </div>
                    <div className={styles.rowInfo}>
                      <div className={styles.rowName}>{s.username || s.name}</div>
                      <div className={styles.rowMeta}>
                        <span className={styles.rowGame} style={{ color: badge.color }}>{badge.emoji} {badge.label}</span>
                        <span className={styles.rowDot}>·</span>
                        <span className={styles.rowDate}>{formatDate(s.createdAt)}</span>
                      </div>
                    </div>
                    <div className={styles.rowAmount}>{fmtMoney(s.amount)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span>🔄 Atualiza automaticamente a cada 30s</span>
          <button className={styles.refreshBtn} onClick={load} disabled={loading}>
            Atualizar agora
          </button>
        </div>
      </div>
    </div>
  );
}
