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

## Regras de código

@docs/core/CODE-RULES.md

---

## Docs sob demanda (carregar conforme tarefa)

| Tarefa | Docs adicionais |
|--------|----------------|
| Backend / schema | `docs/core/DATABASE.md`, `docs/core/AUTH.md` |
| Frontend / UI | `docs/core/DESIGN-SYSTEM.md` |
| Deploy / infra | `docs/core/STACK.md`, `docs/ops/docker.md` |
| Auth | `docs/core/AUTH.md`, `docs/api/auth.md` |

Ver `docs/README.md` para a matriz completa.

---

## Contratos & documentação

- `docs/schema.sql` — Schema + migrações M001-M012
- `docs/api/<dominio>.md` — Contrato de rotas + Shape UI por domínio (ver `docs/api/_index.md`)
- `docs/api/_conventions.md` — Convenções transversais (auth, erros, rate limit)
- `docs/ops/docker.md` — Comandos Docker completos

**Regra crítica:** Nenhum agente inventa campos ou rotas. Se não estiver no contrato, perguntar antes.

---

## Estado atual

@docs/STATUS.md
