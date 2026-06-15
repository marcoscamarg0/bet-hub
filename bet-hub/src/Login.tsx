import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthContext';
import { ApiError } from './api';

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(name, username, password);
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Não foi possível conectar à API. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at top left, #7c3aed33 0%, transparent 50%), radial-gradient(ellipse at bottom right, #06b6d433 0%, transparent 50%), #070b14'
      }}>

      {/* Ambient orbs */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm anim-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/40">
              <span className="text-white font-bold text-sm" style={{fontFamily:'Syne,sans-serif'}}>B</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white" style={{fontFamily:'Syne,sans-serif'}}>BetHub</span>
          </div>
          <p className="text-slate-400 text-sm">Acompanhe roletas, bônus e ganhos do dia</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.07] p-6"
          style={{background:'rgba(13,19,33,0.9)', backdropFilter:'blur(20px)', boxShadow:'0 32px 80px rgba(0,0,0,0.5)'}}>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.05)'}}>
            {(['login','register'] as const).map(m => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={{fontFamily:'Syne,sans-serif'}}>
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Nome</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all border"
                  style={{background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)'}}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Usuário</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="seuusuario"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all border"
                style={{background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)'}}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all border"
                style={{background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)'}}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? 'rgba(139,92,246,0.4)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                boxShadow: loading ? 'none' : '0 8px 32px rgba(139,92,246,0.4)',
                fontFamily:'Syne,sans-serif',
              }}>
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">Jogue com responsabilidade · 18+</p>
      </div>
    </div>
  );
}
