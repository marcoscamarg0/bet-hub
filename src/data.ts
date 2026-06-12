// ============================================================
//  ✏️  EDITE AQUI — adicione, remova ou reordene casas
// ============================================================

export interface Roleta {
  label: string;   // ex: "Roleta 1", "Raspadinha"
  url: string;
}

export interface House {
  id: string;
  name: string;
  url: string;           // url principal
  roletas: Roleta[];     // lista de roletas/bonus diários (pode ter 1 ou mais)
  active: boolean;       // false = riscado/evitar
  note?: string;         // observação adicional (ex: avisos)
}

export const houses: House[] = [
  {
    id: 'lotogreen',
    name: 'LotoGreen',
    url: 'https://lotogreen.bet.br/',
    roletas: [
      { label: 'Roleta 1', url: 'https://lotogreen.bet.br/' },
      { label: 'Roleta 2', url: 'https://lotogreen.bet.br/' },
    ],
    active: true,
  },
  {
    id: 'lottu',
    name: 'Lottu',
    url: 'https://www.lottu.bet.br/',
    roletas: [{ label: 'Roleta', url: 'https://www.lottu.bet.br/' }],
    active: true,
  },
  {
    id: 'novibet',
    name: 'Novibet',
    url: 'https://www.novibet.bet.br/apostas-ao-vivo',
    roletas: [{ label: 'Bônus', url: 'https://www.novibet.bet.br/apostas-ao-vivo' }],
    active: true,
  },
  {
    id: 'br4',
    name: 'BR4',
    url: 'https://br4.bet.br/',
    roletas: [
      { label: 'Roleta 1', url: 'https://br4.bet.br/' },
      { label: 'Roleta 2', url: 'https://br4.bet.br/' },
    ],
    active: true,
  },
  {
    id: 'superbet',
    name: 'Superbet',
    url: 'https://superbet.bet.br/',
    roletas: [{ label: 'Roleta', url: 'https://superbet.bet.br/' }],
    active: true,
  },
  {
    id: 'donald',
    name: 'Donald Bet',
    url: 'https://donald.bet.br/',
    roletas: [{ label: 'Bônus', url: 'https://donald.bet.br/' }],
    active: true,
  },
  {
    id: 'ginga',
    name: 'Ginga',
    url: 'https://ginga.bet.br/',
    roletas: [{ label: 'Roleta', url: 'https://ginga.bet.br/' }],
    active: true,
  },
  {
    id: 'betano',
    name: 'Betano',
    url: 'https://betano.bet.br/',
    roletas: [{ label: 'Roleta', url: 'https://betano.bet.br/' }],
    active: true,
  },
  {
    id: 'vaidebet',
    name: 'VaideBet',
    url: 'https://vaidebet.bet.br/',
    roletas: [{ label: 'Roleta', url: 'https://vaidebet.bet.br/' }],
    active: true,
  },
  {
    id: 'hiper',
    name: 'Hiper Bet',
    url: 'https://hiper.bet.br/ptb/bet/main',
    roletas: [{ label: 'Bônus', url: 'https://hiper.bet.br/ptb/bet/main' }],
    active: true,
  },
  {
    id: 'esportesdasorte',
    name: 'Esportes da Sorte',
    url: 'https://esportesdasorte.bet.br/ptb/bet/main',
    roletas: [{ label: 'Roleta', url: 'https://esportesdasorte.bet.br/ptb/bet/main' }],
    active: true,
  },
  {
    id: 'apostaganha',
    name: 'ApostaGanha',
    url: 'https://apostaganha.bet.br/cassino?_smartico_dp=dp:gf',
    roletas: [{ label: 'Roleta', url: 'https://apostaganha.bet.br/cassino?_smartico_dp=dp:gf' }],
    active: true,
  },
  {
    id: 'voudebet',
    name: 'VoudeBet',
    url: 'https://voudebet.tech/',
    roletas: [{ label: 'Bônus', url: 'https://voudebet.tech/' }],
    active: true,
  },
  {
    id: 'vixe',
    name: 'Vixe Bet',
    url: 'https://vixe.bet/',
    roletas: [{ label: 'Roleta', url: 'https://vixe.bet/' }],
    active: true,
  },
  {
    id: 'upbet',
    name: 'Up Bet',
    url: 'https://up.bet.br/pt-BR',
    roletas: [{ label: 'Bônus', url: 'https://up.bet.br/pt-BR' }],
    active: true,
  },
  {
    id: 'apostou',
    name: 'Apostou',
    url: 'https://www.apostou.bet.br/',
    roletas: [{ label: 'Roleta', url: 'https://www.apostou.bet.br/' }],
    active: true,
  },
  {
    id: 'ona',
    name: 'ONA',
    url: 'https://ona.bet.br/',
    roletas: [{ label: 'Roleta', url: 'https://ona.bet.br/' }],
    active: true,
  },
  {
    id: 'betnacional',
    name: 'Bet Nacional',
    url: 'https://betnacional.bet.br/promocoes',
    roletas: [{ label: 'Promoções', url: 'https://betnacional.bet.br/promocoes' }],
    active: true,
  },
  {
    id: 'jogao',
    name: 'Jogão',
    url: 'https://jogao.bet.br/',
    roletas: [{ label: 'Bônus', url: 'https://jogao.bet.br/' }],
    active: true,
  },
  {
    id: 'jogodeouro',
    name: 'Jogo de Ouro',
    url: 'https://jogodeouro.bet.br/',
    roletas: [{ label: 'Bônus', url: 'https://jogodeouro.bet.br/' }],
    active: true,
  },
  {
    id: 'galera',
    name: 'Galera Bet',
    url: 'https://www.galera.bet.br/cassino',
    roletas: [{ label: 'Cassino', url: 'https://www.galera.bet.br/cassino' }],
    active: true,
    note: '⚠️ Verificar disponibilidade de roleta diária antes de clicar',
  },
  {
    id: 'brasildasorte',
    name: 'Brasil da Sorte',
    url: 'https://brasildasorte.bet.br/',
    roletas: [{ label: 'Roleta', url: 'https://brasildasorte.bet.br/' }],
    active: true,
  },
  {
    id: 'kto',
    name: 'KTO',
    url: 'https://kto.bet.br/',
    roletas: [{ label: 'Roleta', url: 'https://kto.bet.br/' }],
    active: true,
  },
];
