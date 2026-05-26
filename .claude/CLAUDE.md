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

@docs/core/DESIGN-SYSTEM.md

---

## Contratos & documentação

- `docs/schema.sql` — Schema + migrações M001-M005, M008, M009
- `docs/api-contract.md` — Todas as rotas (body + response)
- `docs/ui-contract.md` — Shapes JSON do frontend
- `docs/ops/docker.md` — Comandos Docker completos

**Regra crítica:** Nenhum agente inventa campos ou rotas. Se não estiver no contrato, perguntar antes.

---

## Estado atual

@docs/STATUS.md
