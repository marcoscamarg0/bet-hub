export type Category = 'esportes' | 'cassino' | 'ao-vivo' | 'ambos';

export interface BonusInfo {
  label: string;
  detail: string;
}

export interface BettingHouse {
  id: string;
  name: string;
  url: string;
  emoji: string;          // icon emoji for the card
  color: string;          // accent hex color
  rating: number;         // 1–5 (your personal rating)
  category: Category[];
  bonus: BonusInfo;
  tags: string[];
  note?: string;          // optional personal comment shown on card
  isTrash?: boolean;      // marks it as "lixo" with warning badge
  featured?: boolean;     // shows a gold highlight ring
}
