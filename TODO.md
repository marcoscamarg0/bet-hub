# TODO - ajustes BetHub

## 1) Gorjetas em aba separada
- [x] (já implementado) Editar `bet-hub/src/App.tsx`
  - Criar nova aba "Gorjetas" (mantendo "todas", "pendentes", "deposite").
  - Atualizar `displayed` e contadores para que
    - abas principais *ignorem* casas com `gorjeta: true`.
    - aba "Gorjetas" liste apenas `gorjeta: true`.

## 2) Mines voltar a funcionar
- [x] (já implementado) Editar `bet-hub/src/App.tsx`
  - Garantir que `MinesGame` seja importado e renderizado (como `<MinesGame />`).

## 3) Física da roleta meme melhor
- [ ] Editar `bet-hub/src/components/MemeWheel.tsx`
  - Remover winner hardcode em id '4' (feito).
  - Ajustar landing para alinhar com ponteiro.

## 4) Validação
- [ ] Rodar `npm run dev` e testar:
  - Aba "Gorjetas" funciona.
  - Mines abre e fecha.
  - Roleta meme para corretamente.

## 5) Ranking global do Mines (mudança de escopo)
- [ ] Backend: criar/armar endpoints para leaderboard global do Mines (usar coleção Mongo global).
- [ ] Frontend: trocar armazenamento de cookie local por chamadas ao backend.
- [ ] Validar que todos os usuários/dispositivos veem o mesmo ranking.

