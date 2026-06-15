# TODO - ajustes BetHub

## 1) Gorjetas em aba separada
- [ ] Editar `bet-hub/src/App.tsx`
  - Criar nova aba "Gorjetas" (mantendo "todas", "pendentes", "deposite").
  - Atualizar `displayed` e contadores para que
    - abas principais *ignorem* casas com `gorjeta: true`.
    - aba "Gorjetas" liste apenas `gorjeta: true`.

## 2) Mines voltar a funcionar
- [ ] Editar `bet-hub/src/App.tsx`
  - Garantir que `MinesGame` seja importado e renderizado (como `<MinesGame />`).

## 3) Física da roleta meme melhor
- [ ] Editar `bet-hub/src/components/MemeWheel.tsx`
  - Remover winner hardcode em id '4'.
  - Escolher winner por peso `weight`.
  - Ajustar landing para alinhar com ponteiro.

## 4) Validação
- [ ] Rodar `npm run dev` e testar:
  - Aba "Gorjetas" funciona.
  - Mines abre e fecha.
  - Roleta meme para corretamente.

