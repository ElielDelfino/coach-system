# Estado atual — Coach System

_Última atualização: 2026-05-26._

**Refatoração pré-produção: CONCLUÍDA** — todos os 6 blocos entregues nas sessões de 2026-05-19 e 2026-05-20.

## O que foi feito (resumo)

| Bloco | Item | Status |
|-------|------|--------|
| 1 — Production safety | `pg_advisory_lock` no boot, healthcheck, `envalid` | ✅ |
| 2 — Frontend confiável | `ErrorBoundary`, ESLint + Prettier (front + back) | ✅ |
| 3 — Validação backend | `zod` + middleware `validate` em 30+ rotas | ✅ |
| 4 — Split de páginas gigantes | `AlunoDetalhe` (2046l→138l), `ProtocoloBuilder` (2030l→121l) | ✅ |
| 5 — Performance | `React.lazy()` nas rotas admin, cache Redis inadimplência (TTL 60s), pool tuning `pg` | ✅ |
| 6 — Observabilidade | Logger pino + request-id (105 `console.*` migrados), vitest (29 testes) | ✅ |

## Trabalho em andamento (não commitado)

Arquivos modificados:
- `backend/server.js`
- `frontend/src/components/protocolo-builder/ModuloAlimentar.jsx`
- `frontend/src/components/protocolo-builder/ModuloTreino.jsx`
- `frontend/src/pages/admin/Alimentos.jsx`
- `frontend/src/pages/admin/Exercicios.jsx`

Arquivos novos não rastreados:
- `alimentos-biblioteca-base.txt` — biblioteca de alimentos para seed
- `backend/src/config/seedAlimentos.js` — seed de alimentos
- `frontend/src/lib/categoriasAlimentos.js` — categorias de alimentos
- `frontend/src/lib/gruposMusculares.js` — grupos musculares

## Pendentes (baixa prioridade — não bloqueiam deploy)

1. Expandir testes vitest para outros models críticos (faturas, protocolos, refeicoes) — padrão: `vi.spyOn(pool, 'query')` em `.test.cjs`.
2. C3 — separar `users.js` de `models/alunos.js` quando a app crescer.
3. C4 — remover `version: "3.9"` obsoleto do `docker-compose.yml` (cosmético).
4. C5 — considerar TypeScript progressivo em arquivos novos.

**Estado de produção:** Nada foi deployado ainda. Código está no working tree — commitar os arquivos em andamento antes do deploy.
