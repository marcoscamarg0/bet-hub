// ============================================================
//  ✏️  EDITE AQUI — adicione, remova ou reordene casas
// ============================================================

export interface House {
  id: string;
  name: string;
  url: string;
  hasDaily: boolean;   // true = tem roleta/bonus diário
  dailyUrl?: string;   // URL específica para o bônus diário (opcional)
  active: boolean;     // false = riscado/desativado na lista
}

export const houses: House[] = [
  { id: 'lotogreen',       name: 'LotoGreen',          url: 'https://lotogreen.bet.br/',                                           hasDaily: true,  active: true },
  { id: 'lottu',           name: 'Lottu',              url: 'https://www.lottu.bet.br/',                                           hasDaily: true,  active: true },
  { id: 'novibet',         name: 'Novibet',            url: 'https://www.novibet.bet.br/apostas-ao-vivo',                          hasDaily: false, active: true },
  { id: 'br4',             name: 'BR4',                url: 'https://br4.bet.br/',                                                  hasDaily: true,  active: true },
  { id: 'superbet',        name: 'Superbet',           url: 'https://superbet.bet.br/',                                            hasDaily: true,  active: true },
  { id: 'donald',          name: 'Donald Bet',         url: 'https://donald.bet.br/',                                              hasDaily: false, active: true },
  { id: 'ginga',           name: 'Ginga',              url: 'https://ginga.bet.br/',                                               hasDaily: true,  active: true },
  { id: 'betano',          name: 'Betano',             url: 'https://betano.bet.br/',                                              hasDaily: true,  active: true },
  { id: 'vaidebet',        name: 'VaideBet',           url: 'https://vaidebet.bet.br/',                                            hasDaily: true,  active: true },
  { id: 'hiper',           name: 'Hiper Bet',          url: 'https://hiper.bet.br/ptb/bet/main',                                   hasDaily: false, active: true },
  { id: 'esportesdasorte', name: 'Esportes da Sorte',  url: 'https://esportesdasorte.bet.br/ptb/bet/main',                        hasDaily: true,  active: true },
  { id: 'apostaganha',     name: 'ApostaGanha',        url: 'https://apostaganha.bet.br/cassino?_smartico_dp=dp:gf',               hasDaily: true,  active: true },
  { id: 'voudebet',        name: 'VoudeBet',           url: 'https://voudebet.tech/',                                              hasDaily: false, active: true },
  { id: 'vixe',            name: 'Vixe Bet',           url: 'https://vixe.bet/',                                                   hasDaily: true,  active: true },
  { id: 'upbet',           name: 'Up Bet',             url: 'https://up.bet.br/pt-BR',                                            hasDaily: false, active: true },
  { id: 'mma',             name: 'MMA Bet',            url: 'https://mma.bet.br/',                                                 hasDaily: false, active: true },
  { id: 'galera',          name: 'Galera Bet',         url: 'https://www.galera.bet.br/cassino',                                  hasDaily: false, active: false },
];

export const siteConfig = {
  title: 'BetHub',
};
