import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { api, ApiError, type ApiHouse, type EarningsRow, type ApiSpin } from './api';
import styles from './AdminPanel.module.css';

function fmtMoney(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

type Tab = 'houses' | 'earnings';

export function AdminPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('houses');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Voltar</button>
        <span className={styles.title}>Painel Admin</span>
      </header>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'houses' ? styles.tabOn : ''}`} onClick={() => setTab('houses')}>
          Casas
        </button>
        <button className={`${styles.tab} ${tab === 'earnings' ? styles.tabOn : ''}`} onClick={() => setTab('earnings')}>
          Ganhos dos usuários
        </button>
      </div>

      {tab === 'houses' ? <HousesTab /> : <EarningsTab />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// HOUSES TAB
// ════════════════════════════════════════════════════════════

function HousesTab() {
  const [houses, setHouses] = useState<ApiHouse[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ApiHouse | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api.getHouses().then(r => setHouses(r.houses)).catch(err => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm(`Remover a casa "${id}"?`)) return;
    try {
      await api.deleteHouse(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover');
    }
  }

  async function handleToggleActive(house: ApiHouse) {
    try {
      await api.updateHouse(house.id, { active: !house.active });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar');
    }
  }

  if (houses === null) return <div className={styles.empty}>Carregando...</div>;

  return (
    <div className={styles.section}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{houses.length} casas cadastradas</span>
        <button className={styles.addBtn} onClick={() => setCreating(true)}>+ Nova casa</button>
      </div>

      <div className={styles.houseList}>
        {houses.map(h => (
          <div key={h.id} className={`${styles.houseCard} ${!h.active ? styles.houseInactive : ''}`}>
            <div className={styles.houseCardTop}>
              <div>
                <span className={styles.houseCardName}>{h.name}</span>
                <span className={styles.houseCardId}>#{h.id}</span>
              </div>
              <div className={styles.houseCardActions}>
                <button className={styles.smallBtn} onClick={() => handleToggleActive(h)}>
                  {h.active ? 'Ativa' : 'Inativa'}
                </button>
                <button className={styles.smallBtn} onClick={() => setEditing(h)}>Editar</button>
                <button className={styles.smallBtnDanger} onClick={() => handleDelete(h.id)}>Remover</button>
              </div>
            </div>
            <a className={styles.houseCardUrl} href={h.url} target="_blank" rel="noopener noreferrer">{h.url}</a>
            <div className={styles.roletaTags}>
              {h.roletas.map((r, i) => (
                <span key={i} className={styles.roletaTag}>{r.label}</span>
              ))}
              {h.roletas.length === 0 && <span className={styles.roletaTagEmpty}>sem roletas</span>}
            </div>
            {h.note && <div className={styles.houseCardNote}>{h.note}</div>}
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <HouseFormModal
          house={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

// ── House form modal (create / edit) ─────────────────────────
interface HouseFormState {
  id: string;
  name: string;
  url: string;
  roletas: { label: string; url: string }[];
  active: boolean;
  note: string;
}

function HouseFormModal({ house, onClose, onSaved }: { house: ApiHouse | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!house;

  const [form, setForm] = useState<HouseFormState>(() => house
    ? { id: house.id, name: house.name, url: house.url, roletas: house.roletas.length ? house.roletas : [{ label: '', url: '' }], active: house.active, note: house.note ?? '' }
    : { id: '', name: '', url: '', roletas: [{ label: 'Roleta', url: '' }], active: true, note: '' }
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateRoleta(idx: number, field: 'label' | 'url', value: string) {
    setForm(f => ({
      ...f,
      roletas: f.roletas.map((r, i) => i === idx ? { ...r, [field]: value } : r),
    }));
  }

  function addRoleta() {
    setForm(f => ({ ...f, roletas: [...f.roletas, { label: '', url: f.url }] }));
  }

  function removeRoleta(idx: number) {
    setForm(f => ({ ...f, roletas: f.roletas.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.id || !form.name || !form.url) {
      setError('id, nome e url são obrigatórios');
      return;
    }

    const roletas = form.roletas.filter(r => r.label.trim() && r.url.trim());

    setSaving(true);
    try {
      if (isEdit) {
        await api.updateHouse(house!.id, {
          name: form.name,
          url: form.url,
          roletas,
          active: form.active,
          note: form.note || undefined,
        });
      } else {
        await api.createHouse({
          id: form.id.toLowerCase().trim(),
          name: form.name,
          url: form.url,
          roletas,
          active: form.active,
          note: form.note || undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className={styles.modalTitle}>{isEdit ? `Editar ${house!.name}` : 'Nova casa'}</div>

        {!isEdit && (
          <div className={styles.field}>
            <label className={styles.label}>ID (slug, sem espaços)</label>
            <input className={styles.input} value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="ex: novacasa" />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Nome</label>
          <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Nova Casa" />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>URL principal</label>
          <input className={styles.input} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Roletas / bônus diários</label>
          {form.roletas.map((r, i) => (
            <div key={i} className={styles.roletaRow}>
              <input
                className={styles.inputSmall}
                value={r.label}
                onChange={e => updateRoleta(i, 'label', e.target.value)}
                placeholder="Rótulo (ex: Roleta 1)"
              />
              <input
                className={styles.inputSmall}
                value={r.url}
                onChange={e => updateRoleta(i, 'url', e.target.value)}
                placeholder="URL"
              />
              <button type="button" className={styles.removeRoletaBtn} onClick={() => removeRoleta(i)}>✕</button>
            </div>
          ))}
          <button type="button" className={styles.addRoletaBtn} onClick={addRoleta}>+ Adicionar roleta</button>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Observação (opcional)</label>
          <input className={styles.input} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="ex: Bônus com condições ruins" />
        </div>

        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
          Ativa
        </label>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// EARNINGS TAB
// ════════════════════════════════════════════════════════════

function EarningsTab() {
  const [overview, setOverview] = useState<EarningsRow[] | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [userSpins, setUserSpins] = useState<Record<string, ApiSpin[]>>({});

  useEffect(() => {
    api.adminGetEarnings().then(r => setOverview(r.overview)).catch(err => setError(err.message));
  }, []);

  async function toggleExpand(userId: string) {
    if (expanded === userId) { setExpanded(null); return; }
    setExpanded(userId);
    if (!userSpins[userId]) {
      try {
        const r = await api.adminGetUserSpins(userId, { limit: 50 });
        setUserSpins(prev => ({ ...prev, [userId]: r.spins }));
      } catch (err) {
        console.error(err);
      }
    }
  }

  if (overview === null) return <div className={styles.empty}>Carregando...</div>;

  return (
    <div className={styles.section}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{overview.length} usuários</span>
      </div>

      <div className={styles.earningsList}>
        {overview.map(row => (
          <div key={row.user.id} className={styles.earningsCard}>
            <button className={styles.earningsCardTop} onClick={() => toggleExpand(row.user.id)}>
              <div className={styles.earningsUserInfo}>
                <span className={styles.earningsUserName}>
                  {row.user.name}
                  {row.user.role === 'admin' && <span className={styles.adminTag}>admin</span>}
                </span>
                <span className={styles.earningsUserEmail}>{row.user.email}</span>
              </div>
              <div className={styles.earningsStats}>
                <div className={styles.earningsStat}>
                  <span className={styles.earningsStatValue}>{fmtMoney(row.totalGanho)}</span>
                  <span className={styles.earningsStatLabel}>total</span>
                </div>
                <div className={styles.earningsStat}>
                  <span className={styles.earningsStatValueGreen}>{fmtMoney(row.ganhoHoje)}</span>
                  <span className={styles.earningsStatLabel}>hoje</span>
                </div>
                <div className={styles.earningsStat}>
                  <span className={styles.earningsStatValue}>{row.totalSpins}</span>
                  <span className={styles.earningsStatLabel}>spins</span>
                </div>
              </div>
            </button>

            {expanded === row.user.id && (
              <div className={styles.spinHistory}>
                <div className={styles.spinHistoryHeader}>Histórico recente</div>
                {(userSpins[row.user.id] ?? []).length === 0 ? (
                  <div className={styles.spinHistoryEmpty}>Sem registros</div>
                ) : (
                  (userSpins[row.user.id] ?? []).map(spin => (
                    <div key={spin._id} className={styles.spinRow}>
                      <span className={styles.spinHouse}>{spin.houseName}</span>
                      <span className={styles.spinLabel}>{spin.roletaLabel}</span>
                      <span className={styles.spinTime}>{fmtDateTime(spin.playedAt)}</span>
                      <span className={styles.spinAmount}>{fmtMoney(spin.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
