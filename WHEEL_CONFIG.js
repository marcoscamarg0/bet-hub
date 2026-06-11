/**
 * 🎡 GUIA COMPLETO DE CUSTOMIZAÇÃO DA ROLETA MEME
 * ================================================
 * 
 * Edite o arquivo: src/components/MemeWheel.tsx
 * 
 * ESTRUTURA DE CADA ITEM:
 * {
 *   id: string              → ID único (ex: '1', '2', '3')
 *   name: string            → Nome/texto que aparece na roleta
 *   color: string           → Cor em hexadecimal (ex: '#FF6B6B')
 *   weight?: number         → Chance relativa (padrão: 1)
 *   fake?: boolean          → Se true, redireciona para outro item
 *   redirectTo?: string     → ID do item para redirecionar quando fake
 * }
 */

// ═════════════════════════════════════════════════════════════════
// EXEMPLO 1: ROLETA BÁSICA (4 itens com chances iguais)
// ═════════════════════════════════════════════════════════════════
export const WHEEL_BASIC = [
  { id: '1', name: 'GANHOU 🎉', color: '#FF6B6B' },
  { id: '2', name: 'PERDEU 😢', color: '#4ECDC4' },
  { id: '3', name: 'PARABÉNS 🚀', color: '#FFE66D' },
  { id: '4', name: 'INCRÍVEL ⭐', color: '#95E1D3' },
];

// ═════════════════════════════════════════════════════════════════
// EXEMPLO 2: COM CHANCES DIFERENTES
// ═════════════════════════════════════════════════════════════════
export const WHEEL_CUSTOM_CHANCES = [
  { id: '1', name: 'GANHOU GRANDE 💰', color: '#FF6B6B', weight: 10 },     // 10% chance
  { id: '2', name: 'TENTE NOVAMENTE', color: '#4ECDC4', weight: 50 },      // 50% chance
  { id: '3', name: 'MISERÁVEL 💀', color: '#FFE66D', weight: 30 },         // 30% chance
  { id: '4', name: 'VOCÊ GANHOU 🚀', color: '#95E1D3', weight: 10 },       // 10% chance
];
// Total: 100 (10+50+30+10)
// CÁLCULO: item1 = 10/100 = 10%

// ═════════════════════════════════════════════════════════════════
// EXEMPLO 3: COM ITEM FAKE (REDIRECIONA PARA OUTRO)
// ═════════════════════════════════════════════════════════════════
export const WHEEL_WITH_FAKE = [
  { 
    id: '1', 
    name: 'VOCÊ GANHOU R$1000 reais🎉', 
    color: '#FF6B6B', 
    weight: 10,
    fake: true,        // ← IMPORTANTE: Marca como fake
    redirectTo: '4'    // ← Redireciona para id 4
  },
  { id: '2', name: 'TENTE NOVAMENTE', color: '#4ECDC4', weight: 50 },
  { id: '3', name: 'MISERÁVEL 💀', color: '#FFE66D', weight: 30 },
  { id: '4', name: 'VOCÊ GANHOU UMA JATADA NA CARA 🚀', color: '#95E1D3', weight: 50 },
];

// ═════════════════════════════════════════════════════════════════
// EXEMPLO 4: MÚLTIPLOS ITEMS FAKE
// ═════════════════════════════════════════════════════════════════
export const WHEEL_MULTIPLE_FAKE = [
  { 
    id: '1', 
    name: 'PRÊMIO FANTASMA 👻', 
    color: '#FF6B6B', 
    weight: 15,
    fake: true,
    redirectTo: '3'    // Redireciona para id 3
  },
  { 
    id: '2', 
    name: 'SORTE FALSA 🎪', 
    color: '#4ECDC4', 
    weight: 20,
    fake: true,
    redirectTo: '4'    // Redireciona para id 4
  },
  { id: '3', name: 'VOCÊ PERDEU 😢', color: '#FFE66D', weight: 50 },
  { id: '4', name: 'CONSOLAÇÃO 🍫', color: '#95E1D3', weight: 40 },
];

// ═════════════════════════════════════════════════════════════════
// EXEMPLO 5: CORES E EMOJIS PERSONALIZADOS
// ═════════════════════════════════════════════════════════════════
export const WHEEL_FANCY = [
  { 
    id: '1', 
    name: 'MONEY MONEY 💵💵💵', 
    color: '#2ECC71',    // Verde
    weight: 5 
  },
  { 
    id: '2', 
    name: 'MÁS SORTE PRÓXIMA VEZ 🍀', 
    color: '#E74C3C',    // Vermelho
    weight: 60 
  },
  { 
    id: '3', 
    name: 'PRÊMIO SECRETO 🎁', 
    color: '#9B59B6',    // Roxo
    weight: 20 
  },
  { 
    id: '4', 
    name: 'RODA-RODA PREMIUM ⭐⭐⭐', 
    color: '#F39C12',    // Laranja
    weight: 15 
  },
];

// ═════════════════════════════════════════════════════════════════
// CORES ÚTEIS (HEXADECIMAL)
// ═════════════════════════════════════════════════════════════════
// #FF6B6B → Vermelho
// #4ECDC4 → Turquesa
// #FFE66D → Amarelo
// #95E1D3 → Verde claro
// #F38181 → Rosa
// #AA96DA → Lilás
// #FCBAD3 → Rosa claro
// #A8D8EA → Azul claro
// #2ECC71 → Verde
// #E74C3C → Vermelho escuro
// #9B59B6 → Roxo
// #F39C12 → Laranja
// #3498DB → Azul
// #1ABC9C → Turquesa escuro

// ═════════════════════════════════════════════════════════════════
// VELOCIDADE DA ANIMAÇÃO LENTA (PARA ITEMS FAKE)
// ═════════════════════════════════════════════════════════════════
// No arquivo MemeWheel.tsx, procure por:
// const slowDuration = 3000;  // ← AQUI (em milissegundos)
//
// Valores recomendados:
// 1000  → Muito rápido
// 2000  → Rápido
// 3000  → Normal (padrão)
// 4000  → Lento
// 5000+ → Muito lento

// ═════════════════════════════════════════════════════════════════
// COMO USAR
// ═════════════════════════════════════════════════════════════════
// 1. Abra: src/components/MemeWheel.tsx
// 2. Encontre: const DEFAULT_ITEMS = [...]
// 3. Substitua por um dos exemplos acima
// 4. Customize conforme necessário
// 5. Salve e recarregue o navegador

// ═════════════════════════════════════════════════════════════════
// DICAS IMPORTANTES
// ═════════════════════════════════════════════════════════════════
// ✓ IDs devem ser ÚNICOS
// ✓ redirectTo deve apontar para um ID que existe
// ✓ Quanto maior o weight, maior a chance
// ✓ Se não especificar weight, o padrão é 1
// ✓ fake: true FAZ o item redirecionar (tira chance de ganhar)
// ✓ Emojis são bem-vindos no name!
// ✓ Cores devem estar em hexadecimal

// ═════════════════════════════════════════════════════════════════
// EXEMPLOS DE MATH
// ═════════════════════════════════════════════════════════════════
// Se temos 4 items com weights: 10, 50, 30, 10
// Total: 100
// 
// Item 1: 10/100 = 10%
// Item 2: 50/100 = 50%  ← MAIS COMUM
// Item 3: 30/100 = 30%
// Item 4: 10/100 = 10%
//
// Para que um item NUNCA apareça: weight: 0 (mas deve ser fake!)
// Para que seja muito raro: weight: 1
// Para que seja comum: weight: 50+
