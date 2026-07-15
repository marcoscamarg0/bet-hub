import { useState, useEffect, useCallback, useRef } from 'react';
import { houses as localHouses } from './data';
import { api, type ApiHouse } from './api';
import { useAuth } from './AuthContext';
import { LoginScreen } from './Login';
import { AdminPanel } from './AdminPanel';
import { MemeWheel } from './components/MemeWheel';
import { MinesGame } from './components/Mines';
import { GatesOfForest } from './components/GatesOfForest';
import { FortuneDragon } from './components/FortuneDragon';
import { GlobalRanking } from './components/GlobalRanking';
import { LiveAlert } from './components/LiveAlert';

// ── Helpers ──────────────────────────────────────────────────
function rk(houseId: string, idx: number) { return `${houseId}:${idx}`; }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtMoney(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type Tab = 'roletas' | 'gorjetas' | 'deposite' | 'jogos';

type BonusLink = {
  gorjeta?: string;
  deposite?: string;
};

// Links manuais (sem depender do Admin/Backend).
// Use o id da casa (house.id) como chave.
const bonusLinks: Record<string, BonusLink> = {
  lottu: {
    gorjeta: 'https://lottu-steluto.gorjeta.net/publico',
  },
};


function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function fallbackHouses(): ApiHouse[] {
  return localHouses.map((h, i) => ({
    _id: h.id, id: h.id, name: h.name, url: h.url,
    roletas: h.roletas, active: h.active, note: h.note, order: i,
  }));
}

// ── Tab icons ─────────────────────────────────────────────────
function IconRoleta() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IconGorjeta() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}
function IconDeposite() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  );
}
function IconJogos() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/>
    </svg>
  );
}

// ── Main Dashboard ──────────────────────────────────────────
function Dashboard() {
  const { user, logout } = useAuth();

  const [houses, setHouses] = useState<ApiHouse[] | null>(null);
  const [liveStreamers, setLiveStreamers] = useState<any[]>([]);
  const [checked, setChecked] = useState<Record<string, { ts: string; amount: number }>>({});
  const [totalGanhoHoje, setTotalGanhoHoje] = useState(0);
  const [gorjetas, setGorjetas] = useState(0);
  const [depositos, setDepositos] = useState(0);
  const [ganhos, setGanhos] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('roletas');
  const [showAdmin, setShowAdmin] = useState(false);
  const [amountModal, setAmountModal] = useState<{ houseId: string; idx: number; label: string } | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [apiError, setApiError] = useState(false);
  const [manualAmountType, setManualAmountType] = useState<'gorjeta' | 'deposito' | 'ganho' | null>(null);
  const [manualAmountInput, setManualAmountInput] = useState('');
  const [openGame, setOpenGame] = useState<'mines' | 'forest' | 'dragon' | 'ranking' | null>(null);

  const midnightTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [housesRes, todayRes, streamersRes] = await Promise.all([
          api.getHouses(), 
          api.getMyToday(),
          api.getLiveStreamers().catch(() => ({ streamers: [] }))
        ]);
        if (cancelled) return;
        setHouses(housesRes.houses);
        setLiveStreamers(streamersRes.streamers);
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
  const isGorjetaHouse = (h: ApiHouse) => Boolean(h.gorjeta);
  const isDepositeHouse = (h: ApiHouse) => Boolean(h.deposito);

  // Roletas tab: excludes gorjeta houses
  const roletaHouses = activeHouses.filter(h => !isGorjetaHouse(h) && !isDepositeHouse(h));
  const gorjetaHouses = activeHouses.filter(isGorjetaHouse);
  const depositeHouses = activeHouses.filter(isDepositeHouse);

  const totalRoletas = roletaHouses.reduce((s, h) => s + h.roletas.length, 0);
  const doneCount = roletaHouses.reduce((s, h) => s + h.roletas.filter((_, i) => !!checked[rk(h.id, i)]).length, 0);
  const pct = totalRoletas > 0 ? Math.round((doneCount / totalRoletas) * 100) : 0;
  const allDone = doneCount >= totalRoletas && totalRoletas > 0;

  const pendingCount = roletaHouses.reduce((s, h) =>
    s + h.roletas.filter((_, i) => !checked[rk(h.id, i)]).length, 0);

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

  const totalManual = gorjetas + depositos + ganhos;
  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

  const tabs: { id: Tab; label: string; count: number; icon: JSX.Element; color: string }[] = [
    { id: 'roletas',  label: 'Roletas',  count: pendingCount, icon: <IconRoleta />,  color: '#8b5cf6' },
    { id: 'gorjetas', label: 'Gorjetas', count: gorjetaHouses.length, icon: <IconGorjeta />, color: '#f59e0b' },
    { id: 'deposite', label: 'Deposite', count: depositeHouses.length, icon: <IconDeposite />, color: '#22d3ee' },
    { id: 'jogos',    label: 'Cassino',  count: 3, icon: <IconJogos />,    color: '#ec4899' },
  ];

  const currentHouses = activeTab === 'roletas' ? roletaHouses
    : activeTab === 'gorjetas' ? gorjetaHouses
    : depositeHouses;

  if (houses === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#070b14'}}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <span className="text-slate-500 text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  if (showAdmin && user?.role === 'admin') {
    return <AdminPanel onBack={() => setShowAdmin(false)} />;
  }

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse 80% 50% at 20% -10%, rgba(124,58,237,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 110%, rgba(6,182,212,0.12) 0%, transparent 60%), #060a12'
    }}>

      {/* TOP BAR */}
      <header className="sticky top-0 z-30" style={{
        background: 'rgba(6,10,18,0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.055)'
      }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg"
              style={{background:'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow:'0 0 16px rgba(139,92,246,0.35)'}}>
              <span className="text-white font-bold text-xs" style={{fontFamily:'Syne,sans-serif'}}>B</span>
            </div>
            <span className="font-bold text-white text-base tracking-tight" style={{fontFamily:'Syne,sans-serif'}}>BetHub</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-slate-600 text-xs capitalize">{dateStr}</span>
            <span className="text-slate-300 text-sm font-medium">{user?.username || user?.name}</span>
            {user?.role === 'admin' && (
              <button onClick={() => setShowAdmin(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={{background:'rgba(139,92,246,0.12)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.25)'}}>
                Admin
              </button>
            )}
            <button onClick={logout} title="Sair"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors"
              style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.05)'}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {apiError && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-amber-400/90 text-xs border"
            style={{background:'rgba(245,158,11,0.07)', borderColor:'rgba(245,158,11,0.15)'}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
            Modo offline — progresso não será salvo
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pb-28 pt-4 space-y-4">

        {/* STATS CARD */}
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.028)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
          }}>
          {/* glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-60"
            style={{background: allDone ? 'rgba(52,211,153,0.1)' : 'rgba(139,92,246,0.1)'}} />

          <div className="flex items-center justify-between mb-5 relative">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1.5"
                style={{color: allDone ? '#34d399' : '#8b5cf6', letterSpacing:'0.08em'}}>
                {allDone ? '✦ Missão completa' : 'Roletas do dia'}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>{doneCount}</span>
                <span className="text-slate-600 text-lg font-medium">/ {totalRoletas}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide" style={{fontSize:'0.65rem'}}>Ganho hoje</div>
              <div className="font-bold text-xl" style={{
                fontFamily:'Syne,sans-serif',
                color: totalGanhoHoje > 0 ? '#34d399' : '#cbd5e1'
              }}>
                {fmtMoney(totalGanhoHoje)}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: allDone
                  ? 'linear-gradient(90deg, #34d399, #10b981)'
                  : 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                boxShadow: allDone ? '0 0 8px rgba(52,211,153,0.6)' : '0 0 8px rgba(139,92,246,0.6)'
              }} />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-700">{pendingCount} pendentes</span>
            <span className="text-xs font-semibold" style={{color: allDone ? '#34d399' : '#6b7280'}}>{pct}%</span>
          </div>
        </div>

        {/* MANUAL COUNTER CARDS */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'gorjeta' as const, label: 'Gorjetas', emoji: '💰', value: gorjetas, setter: setGorjetas, accent: '#a78bfa' },
            { key: 'deposito' as const, label: 'Depósitos', emoji: '🏦', value: depositos, setter: setDepositos, accent: '#22d3ee' },
            { key: 'ganho' as const, label: 'Extras', emoji: '🎁', value: ganhos, setter: setGanhos, accent: '#34d399' },
          ].map(card => (
            <div key={card.key} className="rounded-xl p-3 flex flex-col gap-2"
              style={{
                background:'rgba(255,255,255,0.025)',
                border:'1px solid rgba(255,255,255,0.06)'
              }}>
              <div className="flex items-center justify-between">
                <span className="text-base">{card.emoji}</span>
                <span className="text-xs font-bold" style={{color:card.accent}}>{fmtMoney(card.value)}</span>
              </div>
              <div className="text-xs font-medium" style={{color:'#4b5563'}}>{card.label}</div>
              <div className="flex gap-1">
                <input
                  type="number" inputMode="decimal" step="0.01" min="0" placeholder="0,00"
                  value={manualAmountType === card.key ? manualAmountInput : ''}
                  onChange={e => { setManualAmountType(card.key); setManualAmountInput(e.target.value); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && manualAmountInput) {
                      const amount = parseFloat(manualAmountInput.replace(',', '.')) || 0;
                      card.setter(prev => prev + amount);
                      setManualAmountInput(''); setManualAmountType(null);
                    }
                  }}
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs text-white placeholder-slate-700 outline-none"
                  style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', fontFamily:'Inter,sans-serif'}}
                />
                <button
                  onClick={() => {
                    const amount = parseFloat(manualAmountInput.replace(',', '.')) || 0;
                    if (amount > 0) {
                      card.setter(prev => prev + amount);
                      setManualAmountInput(''); setManualAmountType(null);
                    }
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 transition-all hover:opacity-80"
                  style={{background:`${card.accent}33`, border:`1px solid ${card.accent}44`}}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalManual > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.1)'}}>
            <span className="text-xs text-slate-600">Total manual</span>
            <span className="text-sm font-bold text-emerald-400">{fmtMoney(totalManual)}</span>
          </div>
        )}

        <div className="flex gap-2 mb-6 p-1.5 rounded-2xl w-fit mx-auto" 
          style={{background:'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'}}>
          {[
            { id: 'roletas', label: 'Roletas', count: totalRoletas > 0 ? `${doneCount}/${totalRoletas}` : 0, icon: <IconRoleta />, color: '#7c3aed' },
            { id: 'gorjetas', label: 'Gorjetas', count: gorjetaHouses.length, icon: <IconGorjeta />, color: '#f59e0b' },
            { id: 'deposite', label: 'Deposite', count: depositeHouses.length, icon: <IconDeposite />, color: '#10b981' },
            { id: 'jogos', label: 'Cassino', count: 3, icon: <IconJogos />, color: '#ec4899' },
          ].map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-syne font-bold transition-all duration-300 flex items-center gap-2 ${active ? 'scale-105' : 'hover:bg-white/5'}`}
                style={active ? {
                  background: `linear-gradient(135deg, ${tab.color} 0%, ${tab.color}99 100%)`,
                  color: 'white',
                  boxShadow: `0 8px 20px -5px ${tab.color}66, inset 0 2px 5px rgba(255,255,255,0.2)`
                } : {
                  color: '#94a3b8'
                }}>
                <span className="opacity-80 scale-110">{tab.icon}</span>
                {tab.label}
                {tab.count !== 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold"
                    style={{
                      background: active ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.08)',
                      color: active ? '#fff' : tab.color,
                      boxShadow: active ? 'inset 0 1px 3px rgba(0,0,0,0.3)' : 'none'
                    }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab description for gorjetas */}
        {activeTab === 'gorjetas' && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-amber-400/80 text-xs"
            style={{background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.12)'}}>
            <span>💰</span>
            <span>Casas com gorjetas disponíveis — clique para acessar e coletar</span>
          </div>
        )}

        {/* LIVE STREAMERS */}
        {activeTab === 'gorjetas' && liveStreamers.map((s, i) => (
          <div key={s._id} className="rounded-xl p-5 border flex items-center gap-4 fade-in-up"
            style={{
              background: 'linear-gradient(145deg, rgba(239,68,68,0.08) 0%, rgba(20,10,10,0.5) 100%)', 
              borderColor: 'rgba(239,68,68,0.2)',
              boxShadow: '0 8px 32px rgba(239,68,68,0.1)',
              animationDelay: `${i * 0.1}s`
            }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(239,68,68,0.3)] border border-red-500/30"
              style={{background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)'}}>
              <span className="live-pulse text-white">🔴</span>
            </div>
            <div className="flex-1">
              <div className="text-lg font-syne font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                {s.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{s.streamTitle || 'Ao vivo agora!'}</div>
            </div>
            <div className="flex gap-2">
              <a href={s.streamUrl} target="_blank" rel="noopener noreferrer" 
                className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                Assistir
              </a>
              {s.tipUrl && (
                <a href={s.tipUrl} target="_blank" rel="noopener noreferrer" 
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                  Enviar Gorjeta
                </a>
              )}
            </div>
          </div>
        ))}

        {/* GAMES GRID */}
        {activeTab === 'jogos' && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div 
              onClick={() => setOpenGame('mines')}
              className="rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.03]"
              style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="text-3xl mb-2 filter drop-shadow-md">💣</div>
              <div className="font-bold text-white mb-1 tracking-tight" style={{fontFamily:'Syne,sans-serif'}}>Mines</div>
              <div className="text-[10px] text-slate-400 leading-tight">Desvie das minas e multiplique!</div>
            </div>
            
            <div 
              onClick={() => setOpenGame('forest')}
              className="rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.03]"
              style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)', border: '1px solid rgba(52,211,153,0.3)' }}
            >
              <div className="text-3xl mb-2 filter drop-shadow-md">🌿</div>
              <div className="font-bold text-white mb-1 tracking-tight" style={{fontFamily:'Syne,sans-serif'}}>Gates of Forest</div>
              <div className="text-[10px] text-emerald-200/80 leading-tight">Slots místico · Cascatas</div>
            </div>
            
            <div 
              onClick={() => setOpenGame('dragon')}
              className="rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.03]"
              style={{ background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <div className="text-3xl mb-2 filter drop-shadow-md">🐉</div>
              <div className="font-bold text-white mb-1 tracking-tight" style={{fontFamily:'Syne,sans-serif'}}>Fortune Dragon</div>
              <div className="text-[10px] text-red-200/80 leading-tight">20 linhas · Multiplicadores</div>
            </div>
            
            <div 
              onClick={() => setOpenGame('ranking')}
              className="rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.03]"
              style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              <div className="text-3xl mb-2 filter drop-shadow-md">🏆</div>
              <div className="font-bold text-white mb-1 tracking-tight" style={{fontFamily:'Syne,sans-serif'}}>Ranking Global</div>
              <div className="text-[10px] text-violet-200/80 leading-tight">Maiores ganhadores</div>
            </div>
          </div>
        )}

        {/* HOUSES LIST */}
        <div className="space-y-2">
          {currentHouses.map((house, hi) => {
            const houseDone = house.roletas.every((_, i) => !!checked[rk(house.id, i)]);
            const hasDouble = house.roletas.length > 1;
                    const tags = bonusLinks[house.id];
                    const tabColor = activeTab === 'gorjetas' ? '#f59e0b'

              : activeTab === 'deposite' ? '#22d3ee' : '#8b5cf6';

            return (
              <div key={house.id}
                className="rounded-xl border transition-all duration-300 anim-fade-up overflow-hidden"
                style={{
                  animationDelay: `${hi * 18}ms`,
                  background: houseDone ? 'rgba(52,211,153,0.035)' : 'rgba(255,255,255,0.02)',
                  borderColor: houseDone ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.065)',
                }}>
                <div className="flex items-start gap-3 p-4">
                  {/* Index number */}
                  <span className="flex-shrink-0 text-xs font-mono mt-0.5"
                    style={{color: houseDone ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)'}}>
                    {String(hi + 1).padStart(2, '0')}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <a href={house.url} target="_blank" rel="noopener noreferrer"
                        className="font-semibold text-sm hover:underline transition-colors"
                        style={{
                          color: houseDone ? '#34d399' : '#e2e8f0',
                          fontFamily:'Syne,sans-serif',
                          textDecorationColor: 'rgba(255,255,255,0.2)'
                        }}>
                        {house.name}
                      </a>
                      {hasDouble && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                          style={{background:`${tabColor}18`, color:tabColor, fontSize:'0.65rem'}}>
                          ×{house.roletas.length}
                        </span>
                      )}
                      {activeTab === 'gorjetas' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{background:'rgba(245,158,11,0.1)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.2)'}}>
                          Gorjeta
                        </span>
                      )}
                      {activeTab === 'deposite' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{background:'rgba(34,211,238,0.1)', color:'#22d3ee', border:'1px solid rgba(34,211,238,0.2)'}}>
                          Deposite+
                        </span>
                      )}
                    </div>

                    {house.note && (
                      <div className="text-xs text-slate-600 mb-2 leading-relaxed">{house.note}</div>
                    )}
                    {(tags?.gorjeta || tags?.deposite) && (
                      <div className="text-xs text-slate-700 mb-2">
                        {[tags?.gorjeta, tags?.deposite].filter(Boolean).join(' · ')}
                      </div>
                    )}

                    {/* Roleta buttons */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {house.roletas.map((r, ri) => {
                        const key = rk(house.id, ri);
                        const entry = checked[key];
                        const done = !!entry;

                        return (
                          <div key={ri} className="flex flex-col gap-0.5">
                            <button
                              onClick={() => done ? unmark(house.id, ri) : openAmountModal(house.id, ri, r.label)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-[1.03]"
                              style={done
                                ? { background:'rgba(52,211,153,0.1)', color:'#34d399', border:'1px solid rgba(52,211,153,0.22)' }
                                : { background:'rgba(255,255,255,0.04)', color:'#94a3b8', border:'1px solid rgba(255,255,255,0.07)' }}>
                              <span className="text-[10px]">{done ? '✓' : '○'}</span>
                              {r.label}
                            </button>
                            {done && entry && (
                              <span className="text-[9px] text-slate-700 px-1">
                                {fmtTime(entry.ts)} · {fmtMoney(entry.amount)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* External link button */}
                  <a href={house.url} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors mt-0.5"
                    style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', color:'#374151'}}
                    onMouseEnter={e => (e.currentTarget.style.color = tabColor)}
                    onMouseLeave={e => (e.currentTarget.style.color = '#374151')}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                    </svg>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {currentHouses.length === 0 && activeTab !== 'jogos' && (
          <div className="text-center py-16 text-slate-700">
            <div className="text-4xl mb-3 opacity-50">
              {activeTab === 'gorjetas' ? '💰' : activeTab === 'deposite' ? '🏦' : '🎯'}
            </div>
            <div className="text-sm">
              {activeTab === 'gorjetas' ? 'Nenhuma casa com gorjeta cadastrada'
                : activeTab === 'deposite' ? 'Nenhuma casa com promoção'
                : 'Nenhuma roleta disponível'}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/[0.035]"
        style={{background:'rgba(6,10,18,0.92)', backdropFilter:'blur(20px)'}}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-700">Jogue com responsabilidade · 18+</span>
          <span className="text-xs text-slate-800">Reset à meia-noite</span>
        </div>
      </footer>

      <LiveAlert onGoToGorjetas={() => setActiveTab('gorjetas')} />
      <MemeWheel />
      <MinesGame isOpen={openGame === 'mines'} onClose={() => setOpenGame(null)} />
      <GatesOfForest isOpen={openGame === 'forest'} onClose={() => setOpenGame(null)} />
      <FortuneDragon isOpen={openGame === 'dragon'} onClose={() => setOpenGame(null)} />
      <GlobalRanking isOpen={openGame === 'ranking'} onClose={() => setOpenGame(null)} />

      {/* AMOUNT MODAL */}
      {amountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.75)', backdropFilter:'blur(12px)'}}
          onClick={closeAmountModal}>
          <div className="w-full max-w-xs rounded-2xl p-6 border border-white/[0.09] anim-fade-up"
            style={{background:'rgba(10,14,26,0.99)', boxShadow:'0 32px 80px rgba(0,0,0,0.7)'}}
            onClick={e => e.stopPropagation()}>
            <div className="text-base font-bold text-white mb-1" style={{fontFamily:'Syne,sans-serif'}}>
              Quanto você ganhou?
            </div>
            <div className="text-xs text-slate-600 mb-5">{amountModal.label}</div>
            <input
              type="number" inputMode="decimal" step="0.01" min="0" placeholder="0,00"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') confirmAmount(); }}
              className="w-full px-4 py-3.5 rounded-xl text-white text-xl text-center outline-none mb-4"
              style={{
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(139,92,246,0.35)',
                fontFamily:'Syne,sans-serif',
                caretColor: '#8b5cf6'
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={closeAmountModal}
                className="py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)'}}>
                Cancelar
              </button>
              <button onClick={confirmAmount}
                className="py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{background:'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow:'0 6px 20px rgba(139,92,246,0.35)'}}>
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
      <div className="min-h-screen flex items-center justify-center" style={{background:'#060a12'}}>
        <div className="w-9 h-9 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  return <Dashboard />;
}
