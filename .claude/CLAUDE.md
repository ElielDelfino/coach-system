# Coach System — Contexto do projeto

> Este arquivo é lido automaticamente pelo Claude Code em toda sessão.
> Qualquer agente que atuar neste projeto deve seguir estas regras sem exceção.

---

## Essencial do projeto

| Aspecto | Informação |
|---------|-----------|
| **Tipo** | Sistema de coaching — admin + alunos |
| **Status** | Em produção com Docker Swarm |
| **Banco** | PostgreSQL 16 |
| **Linguagens** | React (frontend) + Node.js/Express (backend) |
| **Autenticação** | JWT — access token em Context, refresh em httpOnly cookie |
| **Estado financeiro** | Faturas (não pagamentos) — alunos inadimplentes bloqueados |

---

## Mapa da documentação

@docs/README.md

---

## Stack resumido

@docs/core/STACK.md

---

## Banco de dados & migrações

@docs/core/DATABASE.md

---

## Autenticação & autorização

@docs/core/AUTH.md

---

## Regras de código

@docs/core/CODE-RULES.md

---

## Design system

**Paleta:** Brand `#f97316` em fundo escuro (`#0a0a0a`)  
**Estilo:** Bold & energético (Nike Training / crossfit)  
**Tokens obrigatórios:**
- Fundo: `bg-surface` | Cards: `bg-surface-card` | Inputs: `bg-surface-input`
- Texto: `text-white` (principal) | `text-zinc-400` (secundário)
- Labels: `text-xs uppercase tracking-widest text-zinc-600`
- Status badges: `bg-{color}-950 text-{color}-400` (verde/vermelho/amarelo/cinza)

**Proibido:** Fundo branco/cinza claro, azul SaaS padrão, JWT em localStorage, fetch() direto, senha em texto puro, variáveis hardcoded.

---

## Contratos & documentação

- `docs/schema.sql` — Schema + migrações M001-M005, M008, M009
- `docs/api-contract.md` — Todas as rotas (body + response)
- `docs/ui-contract.md` — Shapes JSON do frontend
- `docs/ops/docker.md` — Comandos Docker completos

**Regra crítica:** Nenhum agente inventa campos ou rotas. Se não estiver no contrato, perguntar antes.

---

## Estado atual

_Última atualização: 2026-05-20. Detalhes históricos em [@prompts/HANDOFF.md]._

**Refatoração pré-produção: CONCLUÍDA** — todos os 6 blocos entregues nas sessões de 2026-05-19 e 2026-05-20.

### O que foi feito (resumo)

| Bloco | Item | Status |
|-------|------|--------|
| 1 — Production safety | `pg_advisory_lock` no boot, healthcheck, `envalid` | ✅ |
| 2 — Frontend confiável | `ErrorBoundary`, ESLint + Prettier (front + back) | ✅ |
| 3 — Validação backend | `zod` + middleware `validate` em 30+ rotas | ✅ |
| 4 — Split de páginas gigantes | `AlunoDetalhe` (2046l→138l), `ProtocoloBuilder` (2030l→121l) | ✅ |
| 5 — Performance | `React.lazy()` nas rotas admin, cache Redis inadimplência (TTL 60s), pool tuning `pg` | ✅ |
| 6 — Observabilidade | Logger pino + request-id (105 `console.*` migrados), vitest (29 testes) | ✅ |

### Pendentes (baixa prioridade — não bloqueiam deploy)

1. Expandir testes vitest para outros models críticos (faturas, protocolos, refeicoes) — padrão: `vi.spyOn(pool, 'query')` em `.test.cjs`.
2. C3 — separar `users.js` de `models/alunos.js` quando a app crescer.
3. C4 — remover `version: "3.9"` obsoleto do `docker-compose.yml` (cosmético).
4. C5 — considerar TypeScript progressivo em arquivos novos.

**Estado de produção:** Nada foi deployado ainda. Código está no working tree — falta commitar os splits do Bloco 4 (`aluno-detalhe/` e `protocolo-builder/`).
