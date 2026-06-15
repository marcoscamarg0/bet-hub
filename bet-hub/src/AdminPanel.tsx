import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { api, ApiError, type ApiHouse, type EarningsRow, type ApiSpin } from './api';

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
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at top left, #7c3aed22 0%, transparent 40%), #070b14'
    }}>
      <header className="sticky top-0 z-30 border-b border-white/[0.06]"
        style={{background:'rgba(7,11,20,0.9)', backdropFilter:'blur(20px)'}}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Voltar
          </button>
          <span className="font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>Painel Admin</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{background:'rgba(255,255,255,0.05)'}}>
          {(['houses','earnings'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={tab === t
                ? {background:'linear-gradient(135deg, #7c3aed, #06b6d4)', color:'white'}
                : {color:'#64748b'}}>
              {t === 'houses' ? 'Casas' : 'Ganhos dos usuários'}
            </button>
          ))}
        </div>

        {tab === 'houses' ? <HousesTab /> : <EarningsTab />}
      </div>
    </div>
  );
}

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

  if (houses === null) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
    </div>
  );

  const inputStyle = {background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)'};

  return (
    <div className="pb-12">
      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-400">{houses.length} casas cadastradas</span>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
          style={{background:'linear-gradient(135deg, #7c3aed, #06b6d4)'}}>
          + Nova casa
        </button>
      </div>

      <div className="space-y-2">
        {houses.map(h => (
          <div key={h.id}
            className="rounded-xl border p-4 transition-all"
            style={{
              background: h.active ? 'rgba(13,19,33,0.8)' : 'rgba(13,19,33,0.4)',
              borderColor: h.active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
              opacity: h.active ? 1 : 0.6,
            }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-white" style={{fontFamily:'Syne,sans-serif'}}>{h.name}</span>
                  <span className="text-xs text-slate-600">#{h.id}</span>
                </div>
                <a href={h.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-slate-600 hover:text-violet-400 transition-colors truncate block mt-0.5">
                  {h.url}
                </a>
                <div className="flex flex-wrap gap-1 mt-2">
                  {h.roletas.map((r, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-md text-slate-400"
                      style={{background:'rgba(255,255,255,0.06)'}}>
                      {r.label}
                    </span>
                  ))}
                  {h.roletas.length === 0 && <span className="text-xs text-slate-600">sem roletas</span>}
                </div>
                {h.note && <div className="text-xs text-amber-600 mt-1.5">{h.note}</div>}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => handleToggleActive(h)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={h.active
                    ? {background:'rgba(52,211,153,0.1)', color:'#34d399', border:'1px solid rgba(52,211,153,0.2)'}
                    : {background:'rgba(255,255,255,0.05)', color:'#64748b', border:'1px solid rgba(255,255,255,0.08)'}}>
                  {h.active ? 'Ativa' : 'Inativa'}
                </button>
                <button onClick={() => setEditing(h)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)'}}>
                  Editar
                </button>
                <button onClick={() => handleDelete(h.id)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                  style={{background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)'}}>
                  Remover
                </button>
              </div>
            </div>
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

interface HouseFormState {
  id: string; name: string; url: string;
  roletas: { label: string; url: string }[];
  active: boolean; note: string;
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
    setForm(f => ({ ...f, roletas: f.roletas.map((r, i) => i === idx ? { ...r, [field]: value } : r) }));
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
    if (!form.id || !form.name || !form.url) { setError('id, nome e url são obrigatórios'); return; }
    const roletas = form.roletas.filter(r => r.label.trim() && r.url.trim());
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateHouse(house!.id, { name: form.name, url: form.url, roletas, active: form.active, note: form.note || undefined });
      } else {
        await api.createHouse({ id: form.id.toLowerCase().trim(), name: form.name, url: form.url, roletas, active: form.active, note: form.note || undefined });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none border transition-colors";
  const inputStyle = {background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)'};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)'}}
      onClick={onClose}>
      <form className="w-full max-w-md rounded-2xl border border-white/[0.1] p-5 max-h-[90vh] overflow-y-auto"
        style={{background:'rgba(13,19,33,0.98)', boxShadow:'0 32px 80px rgba(0,0,0,0.6)'}}
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}>

        <div className="font-bold text-white mb-5 text-base" style={{fontFamily:'Syne,sans-serif'}}>
          {isEdit ? `Editar ${house!.name}` : 'Nova casa'}
        </div>

        <div className="flex flex-col gap-3">
          {!isEdit && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">ID (slug)</label>
              <input className={inputCls} style={inputStyle} value={form.id}
                onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="ex: novacasa" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</label>
            <input className={inputCls} style={inputStyle} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Nova Casa" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">URL principal</label>
            <input className={inputCls} style={inputStyle} value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Roletas / bônus</label>
            {form.roletas.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputCls} style={inputStyle} value={r.label}
                  onChange={e => updateRoleta(i, 'label', e.target.value)} placeholder="Rótulo" />
                <input className={inputCls} style={inputStyle} value={r.url}
                  onChange={e => updateRoleta(i, 'url', e.target.value)} placeholder="URL" />
                <button type="button" onClick={() => removeRoleta(i)}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                  style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addRoleta}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors text-left py-1">
              + Adicionar roleta
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Observação (opcional)</label>
            <input className={inputCls} style={inputStyle} value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="ex: Bônus com condições ruins" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input type="checkbox" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-300">Casa ativa</span>
          </label>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mt-3">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-5">
          <button type="button" onClick={onClose}
            className="py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
            style={{background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)'}}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{background:'linear-gradient(135deg, #7c3aed, #06b6d4)'}}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

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

  if (overview === null) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
    </div>
  );

  return (
    <div className="pb-12">
      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      <div className="text-sm text-slate-400 mb-3">{overview.length} usuários</div>

      <div className="space-y-2">
        {overview.map(row => (
          <div key={row.user.id} className="rounded-xl border border-white/[0.07] overflow-hidden"
            style={{background:'rgba(13,19,33,0.8)'}}>
            <button className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors text-left"
              onClick={() => toggleExpand(row.user.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white" style={{fontFamily:'Syne,sans-serif'}}>{row.user.name}</span>
                  {row.user.role === 'admin' && (
                    <span className="text-xs px-1.5 py-0.5 rounded text-violet-300"
                      style={{background:'rgba(139,92,246,0.2)'}}>admin</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">@{row.user.username || row.user.email}</span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs font-semibold text-emerald-400">{fmtMoney(row.ganhoHoje)}</div>
                  <div className="text-[10px] text-slate-600">hoje</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-white">{fmtMoney(row.totalGanho)}</div>
                  <div className="text-[10px] text-slate-600">total</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-300">{row.totalSpins}</div>
                  <div className="text-[10px] text-slate-600">spins</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-slate-600 transition-transform"
                  style={{transform: expanded === row.user.id ? 'rotate(180deg)' : 'none'}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </button>

            {expanded === row.user.id && (
              <div className="border-t border-white/[0.06] px-4 py-3">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Histórico recente</div>
                {(userSpins[row.user.id] ?? []).length === 0 ? (
                  <div className="text-xs text-slate-600 py-2">Sem registros</div>
                ) : (
                  <div className="space-y-1">
                    {(userSpins[row.user.id] ?? []).map(spin => (
                      <div key={spin._id} className="flex items-center gap-3 py-1.5 text-xs">
                        <span className="text-slate-300 font-medium min-w-0 flex-1 truncate">{spin.houseName}</span>
                        <span className="text-slate-500 truncate">{spin.roletaLabel}</span>
                        <span className="text-slate-600 flex-shrink-0">{fmtDateTime(spin.playedAt)}</span>
                        <span className="text-emerald-400 font-semibold flex-shrink-0">{fmtMoney(spin.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
