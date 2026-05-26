# Design System — Coach System

**Estilo:** Bold & Energético — crossfit / Nike Training.

## Paleta (tailwind.config.js)
```js
colors: {
  brand: { DEFAULT: '#f97316', dark: '#ea6c0a', light: '#fed7aa' },
  surface: {
    DEFAULT: '#0a0a0a', card: '#111111',
    elevated: '#161616', border: '#1f1f1f', input: '#1a1a1a',
  },
}
```

## Tokens principais
| Elemento | Classe |
|----------|--------|
| Fundo | `bg-surface` |
| Cards | `bg-surface-card` |
| Elevado | `bg-surface-elevated` |
| Bordas | `border-surface-border` |
| Inputs | `bg-surface-input` |
| Primária | `bg-brand` / `text-brand` |
| Texto | `text-white` |
| Secundário | `text-zinc-400` |
| Labels | `text-zinc-600 uppercase tracking-widest text-xs` |

## Badges de status
| Status | Classes |
|--------|---------|
| neutro | `bg-zinc-800 text-zinc-400` |
| em_dia | `bg-green-950 text-green-400` |
| inadimplente | `bg-red-950 text-red-400` |
| inativo | `bg-zinc-700 text-zinc-500` |
| pendente | `bg-yellow-950 text-yellow-400` |
| pago | `bg-green-950 text-green-400` |
| vencido | `bg-red-950 text-red-400` |

## Proibido
- Fundo branco ou cinza claro
- Azul padrão de SaaS
- JWT em localStorage
- fetch() direto (sempre Axios)
- Senha em texto puro
- Variáveis hardcoded
- Sem shadcn/ui — componentes próprios em src/components/ui/
