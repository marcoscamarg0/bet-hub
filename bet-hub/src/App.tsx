import { useState, useEffect, useCallback, useRef } from 'react';
import { houses as localHouses } from './data';
import { api, type ApiHouse } from './api';
import { useAuth } from './AuthContext';
import { LoginScreen } from './Login';
import { AdminPanel } from './AdminPanel';
import { MemeWheel } from './components/MemeWheel';
import { MinesGame } from './components/Mines';
// (Sem changes visuais por enquanto)





// ── Helpers ──────────────────────────────────────────────────
function rk(houseId: string, idx: number) { return `${houseId}:${idx}`; }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtMoney(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type Filter = 'todas' | 'pendentes' | 'gorjetas' | 'deposite';

// Tags “Gorjeta”/“Deposite” agora serão controladas pelo Admin via dados do backend.
// (No dashboard principal, "Gorjetas" será isolado em uma aba separada.)
const bonusTags: Record<string, { gorjeta?: string; deposite?: string }> = {};


function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

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

// ── Main Dashboard ──────────────────────────────────────────
function Dashboard() {

  const { user, logout } = useAuth();

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

  const unmark = useCallback((houseId: string, idx: number) => {
    const key = rk(houseId, idx);
    setChecked(prev => {
      const next = { ...prev };
      const removed = next[key];
      delete next[key];
      if (removed) setTotalGanhoHoje(t => Math.max(0, t - removed.amount));
      return next;
    });
  }, []);

  const gorjetaCount = activeHouses.filter((h) => Boolean((h as any).gorjeta)).length;
  const depositeCount = activeHouses.filter((h) => Boolean((h as any).deposito)).length;

  const isGorjetaHouse = (h: ApiHouse) => Boolean((h as any).gorjeta);

  const displayed = activeHouses.filter((h) => {
    // Aba principal ignora gorjetas (regra #1)
    if (filter === 'todas' || filter === 'pendentes') {
      if (isGorjetaHouse(h)) return false;
    }

    if (filter === 'pendentes') return h.roletas.some((_, i) => !checked[rk(h.id, i)]);
    if (filter === 'gorjetas') return isGorjetaHouse(h);
    if (filter === 'deposite') return Boolean((h as any).deposito);
    return true;
  });



  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (houses === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#070b14'}}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <span className="text-slate-400 text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  if (showAdmin && user?.role === 'admin') {
    return <AdminPanel onBack={() => setShowAdmin(false)} />;
  }

  const totalManual = gorjetas + depositos + ganhos;

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at top left, #7c3aed22 0%, transparent 40%), radial-gradient(ellipse at bottom right, #06b6d422 0%, transparent 40%), #070b14'
    }}>

      {/* TOP BAR */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06]" style={{background:'rgba(7,11,20,0.85)', backdropFilter:'blur(20px)'}}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
              <span className="text-white font-bold text-xs" style={{fontFamily:'Syne,sans-serif'}}>B</span>
            </div>
            <span className="font-bold text-white text-lg tracking-tight" style={{fontFamily:'Syne,sans-serif'}}>BetHub</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-slate-500 text-xs capitalize">{dateStr}</span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-300 text-sm font-medium">{user?.username || user?.name}</span>
              {user?.role === 'admin' && (
                <button onClick={() => setShowAdmin(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200"
                  style={{background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)'}}>
                  Admin
                </button>
              )}
              <button onClick={logout} title="Sair"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
                style={{background:'rgba(255,255,255,0.05)'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {apiError && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-amber-400 text-sm border border-amber-500/20"
            style={{background:'rgba(245,158,11,0.08)'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
            Modo offline — progresso não será salvo
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-4">

        {/* MISSION CARD */}
        <div className="rounded-2xl p-5 border border-white/[0.07] relative overflow-hidden"
          style={{background:'rgba(13,19,33,0.8)', backdropFilter:'blur(20px)'}}>
          {/* subtle glow behind */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-2xl pointer-events-none"
            style={{background: allDone ? 'rgba(52,211,153,0.12)' : 'rgba(139,92,246,0.12)'}} />

          <div className="flex items-start justify-between mb-4 relative">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{color: allDone ? '#34d399' : '#8b5cf6'}}>
                {allDone ? '✦ Missão completa!' : 'Roletas do dia'}
              </div>
              <div className="text-3xl font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>
                {doneCount}
                <span className="text-slate-500 font-normal text-xl"> / {totalRoletas}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-1">Ganho hoje</div>
              <div className="text-xl font-bold" style={{fontFamily:'Syne,sans-serif', color: totalGanhoHoje > 0 ? '#34d399' : '#fff'}}>
                {fmtMoney(totalGanhoHoje)}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: allDone
                  ? 'linear-gradient(90deg, #34d399, #10b981)'
                  : 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                boxShadow: allDone ? '0 0 12px rgba(52,211,153,0.5)' : '0 0 12px rgba(139,92,246,0.5)'
              }} />
          </div>
          <div className="text-right text-xs text-slate-500 mt-1.5">{pct}%</div>
        </div>

        {/* MANUAL CARDS */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'gorjeta' as const, label: 'Gorjetas', icon: '💰', value: gorjetas, setter: setGorjetas, color: '#a78bfa' },
            { key: 'deposito' as const, label: 'Depósitos', icon: '🏦', value: depositos, setter: setDepositos, color: '#22d3ee' },
            { key: 'ganho' as const, label: 'Extras', icon: '🎁', value: ganhos, setter: setGanhos, color: '#34d399' },
          ].map(card => (
            <div key={card.key} className="rounded-xl p-3 border border-white/[0.07] flex flex-col gap-2"
              style={{background:'rgba(13,19,33,0.8)'}}>
              <div className="flex items-center justify-between">
                <span className="text-lg">{card.icon}</span>
                <span className="text-xs font-medium" style={{color: card.color}}>{fmtMoney(card.value)}</span>
              </div>
              <div className="text-xs text-slate-500">{card.label}</div>
              <div className="flex gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={manualAmountType === card.key ? manualAmountInput : ''}
                  onChange={e => { setManualAmountType(card.key); setManualAmountInput(e.target.value); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && manualAmountInput) {
                      const amount = parseFloat(manualAmountInput.replace(',', '.')) || 0;
                      card.setter(prev => prev + amount);
                      setManualAmountInput('');
                      setManualAmountType(null);
                    }
                  }}
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs text-white placeholder-slate-600 outline-none border"
                  style={{background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)'}}
                />
                <button
                  onClick={() => {
                    const amount = parseFloat(manualAmountInput.replace(',', '.')) || 0;
                    if (amount > 0) {
                      card.setter(prev => prev + amount);
                      setManualAmountInput('');
                      setManualAmountType(null);
                    }
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 transition-all hover:scale-105"
                  style={{background:`linear-gradient(135deg, ${card.color}99, ${card.color}55)`}}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalManual > 0 && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.05]"
            style={{background:'rgba(255,255,255,0.03)'}}>
            <span className="text-xs text-slate-500">Total manual acumulado</span>
            <span className="text-sm font-semibold text-emerald-400">{fmtMoney(totalManual)}</span>
          </div>
        )}

        {/* FILTERS */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'todas' as Filter, label: 'Todas', count: activeHouses.length },
            { id: 'pendentes' as Filter, label: 'Pendentes', count: totalRoletas - doneCount },
            { id: 'gorjetas' as Filter, label: 'Gorjetas', count: gorjetaCount },
            { id: 'deposite' as Filter, label: 'Deposite e ganhe', count: depositeCount },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
              style={filter === f.id
                ? {background:'rgba(139,92,246,0.2)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.4)'}
                : {background:'rgba(255,255,255,0.04)', color:'#64748b', border:'1px solid rgba(255,255,255,0.06)'}}>
              {f.label}
              <span className="px-1.5 py-0.5 rounded-md text-xs"
                style={{background: filter === f.id ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)', color: filter === f.id ? '#c4b5fd' : '#475569'}}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* HOUSES LIST */}
        <div className="space-y-2">
          {displayed.map((house, hi) => {
            const houseDone = house.roletas.every((_, i) => !!checked[rk(house.id, i)]);
            const hasDouble = house.roletas.length > 1;
            const tags = bonusTags[house.id];

            return (
              <div key={house.id}
                className="rounded-xl border transition-all duration-300 anim-fade-up"
                style={{
                  animationDelay: `${hi * 20}ms`,
                  background: houseDone ? 'rgba(52,211,153,0.04)' : 'rgba(13,19,33,0.8)',
                  borderColor: houseDone ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(12px)',
                }}>
                <div className="flex items-start gap-3 p-4">
                  {/* Index */}
                  <span className="flex-shrink-0 text-xs font-mono mt-0.5"
                    style={{color: houseDone ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.15)'}}>
                    {String(hi + 1).padStart(2, '0')}
                  </span>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <a href={house.url} target="_blank" rel="noopener noreferrer"
                        className="font-semibold text-sm hover:text-violet-300 transition-colors"
                        style={{color: houseDone ? '#34d399' : '#e2e8f0', fontFamily:'Syne,sans-serif'}}>
                        {house.name}
                        {hasDouble && (
                          <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-md font-normal"
                            style={{background:'rgba(139,92,246,0.2)', color:'#a78bfa'}}>
                            ×{house.roletas.length}
                          </span>
                        )}
                      </a>
                      {tags?.gorjeta && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{background:'rgba(167,139,250,0.12)', color:'#a78bfa', border:'1px solid rgba(167,139,250,0.2)'}}>
                          Gorjeta
                        </span>
                      )}
                      {tags?.deposite && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{background:'rgba(34,211,238,0.1)', color:'#22d3ee', border:'1px solid rgba(34,211,238,0.2)'}}>
                          Deposite
                        </span>
                      )}
                    </div>

                    {house.note && (
                      <div className="text-xs text-slate-500 mb-2">{house.note}</div>
                    )}
                    {(tags?.gorjeta || tags?.deposite) && (
                      <div className="text-xs text-slate-600 mb-2">
                        {[tags?.gorjeta, tags?.deposite].filter(Boolean).join(' · ')}
                      </div>
                    )}

                    {/* Roletas */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {house.roletas.map((r, ri) => {
                        const key = rk(house.id, ri);
                        const entry = checked[key];
                        const done = !!entry;

                        return (
                          <div key={ri} className="flex flex-col gap-0.5">
                            <button
                              onClick={() => done ? unmark(house.id, ri) : openAmountModal(house.id, ri, r.label)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-[1.02]"
                              style={done
                                ? {background:'rgba(52,211,153,0.12)', color:'#34d399', border:'1px solid rgba(52,211,153,0.25)'}
                                : {background:'rgba(255,255,255,0.05)', color:'#94a3b8', border:'1px solid rgba(255,255,255,0.08)'}}>
                              <span className="text-[10px]">{done ? '✓' : '○'}</span>
                              {r.label}
                            </button>
                            {done && entry && (
                              <span className="text-[10px] text-slate-600 px-1">
                                {fmtTime(entry.ts)} · {fmtMoney(entry.amount)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* External link */}
                  <a href={house.url} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-violet-400 transition-colors mt-0.5"
                    style={{background:'rgba(255,255,255,0.04)'}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                    </svg>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {displayed.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            <div className="text-3xl mb-3">🎯</div>
            <div className="text-sm">Nenhuma casa neste filtro</div>
          </div>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/[0.04] py-3 text-center text-xs text-slate-700"
        style={{background:'rgba(7,11,20,0.9)', backdropFilter:'blur(20px)'}}>
        Jogue com responsabilidade · 18+ · Reset automático à meia-noite
      </footer>

      <MemeWheel />
      <MinesGame />


      {/* AMOUNT MODAL */}
      {amountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)'}}
          onClick={closeAmountModal}>
          <div className="w-full max-w-xs rounded-2xl p-6 border border-white/[0.1] anim-fade-up"
            style={{background:'rgba(13,19,33,0.98)', boxShadow:'0 32px 80px rgba(0,0,0,0.6)'}}
            onClick={e => e.stopPropagation()}>
            <div className="text-base font-semibold text-white mb-1" style={{fontFamily:'Syne,sans-serif'}}>
              Quanto você ganhou?
            </div>
            <div className="text-xs text-slate-500 mb-5">{amountModal.label}</div>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') confirmAmount(); }}
              className="w-full px-4 py-3 rounded-xl text-white text-lg text-center outline-none border mb-4"
              style={{background:'rgba(255,255,255,0.05)', borderColor:'rgba(139,92,246,0.4)', fontFamily:'Syne,sans-serif'}}
            />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={closeAmountModal}
                className="py-2.5 rounded-xl text-sm font-medium text-slate-400 transition-colors hover:text-slate-200"
                style={{background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)'}}>
                Cancelar
              </button>
              <button onClick={confirmAmount}
                className="py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{background:'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow:'0 8px 24px rgba(139,92,246,0.35)'}}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────
export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#070b14'}}>
        <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  return <Dashboard />;
}
