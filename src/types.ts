export type Category = 'esportes' | 'cassino' | 'ao-vivo' | 'ambos';

export interface House {
  id: string;
  name: string;
  url: string;
  hasDaily: boolean;
  dailyUrl?: string;
  active: boolean;
}

export interface BettingHouse {
  id: string;
  name: string;
  url: string;
  emoji: string;
  color: string;
  rating: number;
  featured?: boolean;
  isTrash?: boolean;
  category: Category[];
  bonus: {
    label: string;
    detail: string;
  };
  tags: string[];
  note?: string;
}
