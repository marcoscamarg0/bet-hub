export interface Roleta {
  label: string;
  url: string;
}

export interface House {
  id: string;
  name: string;
  url: string;
  roletas: Roleta[];
  active: boolean;
}
