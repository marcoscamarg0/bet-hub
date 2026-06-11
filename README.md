# BetHub 🎯

Site pessoal para gerenciar suas casas de apostas favoritas com bônus.

## Como rodar

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

## Como editar

Toda a configuração fica em **`src/data.ts`**. Basta editar o array `houses`.

### Adicionar uma nova casa

```ts
{
  id: 'minhahouse',          // ID único (sem espaços)
  name: 'Minha House',       // Nome exibido
  url: 'https://...',        // Link de acesso
  emoji: '🎯',               // Emoji do card
  color: '#ff6b6b',          // Cor de destaque (hex)
  rating: 4,                 // Sua nota de 1 a 5
  category: ['esportes'],    // 'esportes' | 'cassino' | 'ao-vivo'
  bonus: {
    label: 'Nome do Bônus',
    detail: 'Descrição do bônus',
  },
  tags: ['tag1', 'tag2'],    // Tags livres
  note: 'Meu comentário',    // Opcional: nota pessoal
  featured: true,            // Opcional: badge "Top Pick"
  isTrash: false,            // Opcional: badge "Evitar" + filtro
},
```

### Remover uma casa

Apague o bloco `{ ... }` correspondente no array.

### Configurações gerais

Edite o objeto `siteConfig` no final de `src/data.ts`:

```ts
export const siteConfig = {
  title: 'BetHub',
  subtitle: 'Minhas Casas de Apostas',
  description: 'Texto do hero',
  ownerName: 'Seu Nome',
};
```

## Tecnologias

- **Vite** + **React** + **TypeScript**
- CSS Modules (sem dependências de UI)
- Fontes: Syne (display) + Inter (body)
