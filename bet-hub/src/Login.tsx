import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthContext';
import { ApiError } from './api';
import styles from './Login.module.css';

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
      else setError('Nao foi possivel conectar a API. Verifique se o backend esta rodando.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          BetHub
        </div>

        <div className={styles.heroText}>
          <strong>Entrar rapido, sem e-mail.</strong>
          <span>Use somente usuario e senha para acompanhar roletas, bonus e ganhos do dia.</span>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.tabOn : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.tabOn : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
            type="button"
          >
            Criar conta
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label}>Nome</label>
              <input
                className={styles.input}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Usuario</label>
            <input
              className={styles.input}
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="seuusuario"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Senha</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="********"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
