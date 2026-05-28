# Design System — Coach System

**Estilo:** Neon-on-black, cyber-fitness — *"Neon on black. Performance in the dark."*
Identidade "Pulse": magenta neon + acid lime sobre preto profundo, glow usado com parcimônia.

> Tokens canônicos vivem em `frontend/tailwind.config.js` e `frontend/src/index.css`.
> O kit de referência (HTML/JSX) está em `pulse-coach-system-design-system/` (handoff do claude.ai/design).

## Paleta (tailwind.config.js)
```js
colors: {
  brand:  { DEFAULT: '#FF1E73', dark: '#C70E55', light: '#FF4D93', dim: '#7A1242' }, // magenta — a "pulse"
  accent: { DEFAULT: '#C2FF36', dark: '#8BC400', light: '#D6FF6B', dim: '#4A5E12' }, // acid lime — dados/estrutura/links
  surface: {
    DEFAULT: '#07070B', base: '#0C0C12', card: '#13131C',
    elevated: '#1B1B26', pop: '#242431', input: '#1B1B26',
    border: '#26263212', // hairline translúcida (use também white/10, white/[0.07])
  },
  ok:     { DEFAULT: '#2BE07A' }, // current/paid
  warn:   { DEFAULT: '#FFC23D' }, // pending
  danger: { DEFAULT: '#FF3347' }, // overdue/delinquent
}
```

## Tipografia
| Uso | Família | Classe Tailwind |
|-----|---------|-----------------|
| Display / impacto (headings, labels, numerais hero) | Saira | `font-display` (h1/h2/h3 já adotam via base) |
| UI / prose | Hanken Grotesk | `font-sans` (default) |
| Dados / métricas (timers, contagens, IDs, dinheiro) | JetBrains Mono | `font-mono` + `tabular-nums` |

Carregadas via Google Fonts CDN no `index.html`. "Os números são heróis" → métricas grandes em mono.

## Tokens principais
| Elemento | Classe |
|----------|--------|
| Fundo página | `bg-surface` (#07070B) |
| Cards | `bg-surface-card` + `bg-grad-surface` + `border-white/[0.07]` |
| Elevado | `bg-surface-elevated` |
| Inputs | `bg-surface-input` + `border-white/10` |
| Primária (CTA) | `bg-brand text-[#0A0A0E]` + `glow-magenta-sm` |
| Secundária / links | `text-accent border-accent/30` |
| Texto | `text-white` (#F5F3F9) |
| Secundário | `text-zinc-400` |
| Labels | `text-section-label` (Saira uppercase tracking-widest) |
| Métrica | `text-metric` (mono, magenta, tabular) |

## Glow / luminância (a assinatura)
Usar com parcimônia — só em CTA hero, nav ativa, 1 métrica-chave por view, focus, logo.
Utilities: `glow-magenta` / `glow-magenta-sm` / `glow-lime` / `glow-lime-sm`, texto: `text-glow-magenta` / `text-glow-lime`. Spotlight de palco atrás de heros: `bg-spot`. **Nunca** dar glow em texto de corpo ou em mais de ~2 elementos por viewport.

## Badges de status
| Status | Classes |
|--------|---------|
| em_dia / pago | `bg-ok/15 text-ok border-ok/35` |
| pendente | `bg-warn/15 text-warn border-warn/35` |
| inadimplente / vencido | `bg-danger/15 text-danger border-danger/40` |
| neutro / inativo | `bg-zinc-800/60 text-zinc-400 border-zinc-700` |

Badge: pill (`rounded-full`), Saira uppercase, `tracking-widest`. Status = ícone + cor neon, nunca emoji.

## Marca
- Logo: `frontend/public/logo-pulse.svg` (wordmark COACH SYSTEM + glyph pulse-wave).
- App mark / favicon: `frontend/public/mark-pulse.svg`.

## Proibido
- Fundo branco ou cinza claro
- Azul padrão de SaaS (sky/blue/indigo) — proteína usa `text-accent`
- Laranja (identidade antiga removida)
- Glow excessivo (mais de ~2 elementos por viewport)
- JWT em localStorage
- fetch() direto (sempre Axios)
- Senha em texto puro
- Variáveis hardcoded
- Sem shadcn/ui — componentes próprios em src/components/ui/

## Pendências de fidelidade (follow-ups)
- **Ícones:** o kit usa Lucide (stroke neon). O app ainda usa emoji em nav/labels — migrar para `lucide-react` quando priorizado.
- **Fontes:** via CDN. Para produção offline/licenciada, self-hostar em `public/fonts/`.
