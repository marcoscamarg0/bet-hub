// ============================================================
//  API Client — BetHub Frontend
//  Configure VITE_API_URL no arquivo .env do projeto:
//    VITE_API_URL=https://sua-api.onrender.com
//  Para dev local:
//    VITE_API_URL=http://localhost:4000
// ============================================================

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const TOKEN_KEY = 'bh_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }

  if (!res.ok) {
    const msg = (body as { error?: string })?.error || `Erro ${res.status}`;
    throw new ApiError(res.status, msg);
  }

  return body as T;
}

// ── Types ─────────────────────────────────────────────────────
export interface Roleta {
  label: string;
  url: string;
}

export interface ApiHouse {
  _id: string;
  id: string;
  name: string;
  url: string;
  roletas: Roleta[];
  active: boolean;
  note?: string;
  order: number;
  gorjeta?: boolean;
  deposito?: boolean;
}

export interface ApiUser {
  id?: string;
  _id?: string;
  name: string;
  username?: string;
  email: string;
  role: 'user' | 'admin';
  balance?: number;
  createdAt?: string;
}

export interface ApiSpin {
  _id: string;
  user: string;
  houseId: string;
  houseName: string;
  roletaLabel: string;
  amount: number;
  currency: string;
  playedAt: string;
}

export interface EarningsRow {
  user: { id: string; name: string; username?: string; email: string; role: 'user' | 'admin'; createdAt: string };
  totalGanho: number;
  totalSpins: number;
  lastPlayedAt: string | null;
  ganhoHoje: number;
  spinsHoje: number;
}

export interface ApiScore {
  _id: string;
  name: string;
  amount: number;
  mines?: number;
  cells?: number;
  game: 'mines' | 'forest' | 'dragon';
  userId?: string;
  username?: string;
  createdAt: string;
}

export interface ApiStreamer {
  _id: string;
  name: string;
  platform: 'twitch' | 'youtube';
  channelId: string;
  tipUrl?: string;
  isLive: boolean;
  streamTitle?: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  lastChecked: string;
}

// ── Auth ──────────────────────────────────────────────────────
export const api = {
  register: (name: string, username: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, password }),
    }),

  login: (username: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<{ user: ApiUser }>('/api/auth/me'),

  // ── Houses ──
  getHouses: () => request<{ houses: ApiHouse[] }>('/api/houses'),

  createHouse: (house: Partial<ApiHouse>) =>
    request<{ house: ApiHouse }>('/api/houses', {
      method: 'POST',
      body: JSON.stringify(house),
    }),

  updateHouse: (id: string, updates: Partial<ApiHouse>) =>
    request<{ house: ApiHouse }>(`/api/houses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteHouse: (id: string) =>
    request<{ ok: true }>(`/api/houses/${id}`, { method: 'DELETE' }),

  // ── Spins ──
  createSpin: (data: { houseId: string; roletaLabel: string; amount?: number; playedAt?: string }) =>
    request<{ spin: ApiSpin }>('/api/spins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyToday: () =>
    request<{ spins: ApiSpin[]; totalGanhoHoje: number; date: string }>('/api/spins/me/today'),

  getMySpins: (params?: { from?: string; to?: string; houseId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.houseId) qs.set('houseId', params.houseId);
    if (params?.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ spins: ApiSpin[]; totalGanho: number; count: number }>(`/api/spins/me${suffix}`);
  },

  // ── Admin ──
  adminGetUsers: () => request<{ users: ApiUser[] }>('/api/admin/users'),

  adminGetEarnings: () => request<{ overview: EarningsRow[] }>('/api/admin/earnings'),

  adminGetUserSpins: (userId: string, params?: { from?: string; to?: string; houseId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.houseId) qs.set('houseId', params.houseId);
    if (params?.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ spins: ApiSpin[]; totalGanho: number; count: number }>(`/api/admin/users/${userId}/spins${suffix}`);
  },

  adminSetRole: (userId: string, role: 'user' | 'admin') =>
    request<{ user: ApiUser }>(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  // ── Scores / Ranking ──
  getScores: (params?: { game?: 'mines' | 'forest' | 'dragon'; period?: 'today' | 'week' | 'all'; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.game) qs.set('game', params.game);
    if (params?.period && params.period !== 'all') qs.set('period', params.period);
    if (params?.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<ApiScore[]>(`/api/score${suffix}`);
  },

  postScore: (data: { name: string; amount: number; game: 'mines' | 'forest' | 'dragon'; mines?: number; cells?: number; metadata?: Record<string, unknown> }) =>
    request<ApiScore>('/api/score', { method: 'POST', body: JSON.stringify(data) }),

  // ── Balance ──
  getBalance: () =>
    request<{ balance: number; canClaimDaily: boolean; lastDailyReset: string | null }>('/api/balance'),

  claimDaily: () =>
    request<{ balance: number; claimed: number }>('/api/balance/claim', { method: 'POST' }),

  spendBalance: (amount: number) =>
    request<{ balance: number; spent: number }>('/api/balance/spend', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  addBalance: (amount: number) =>
    request<{ balance: number; added: number }>('/api/balance/add', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  // ── Streamers ──
  getLiveStreamers: () => request<{ streamers: ApiStreamer[] }>('/api/streamers/live'),

  adminGetStreamers: () => request<{ streamers: ApiStreamer[] }>('/api/admin/streamers'),

  adminCreateStreamer: (data: Partial<ApiStreamer>) =>
    request<{ streamer: ApiStreamer }>('/api/admin/streamers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adminUpdateStreamer: (id: string, data: Partial<ApiStreamer>) =>
    request<{ streamer: ApiStreamer }>(`/api/admin/streamers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  adminDeleteStreamer: (id: string) =>
    request<{ ok: true }>(`/api/admin/streamers/${id}`, { method: 'DELETE' }),
};
