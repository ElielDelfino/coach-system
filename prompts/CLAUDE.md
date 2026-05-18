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

## Stack resumido

@docs/STACK.md

---

## Banco de dados & migrações

@docs/DATABASE.md

---

## Autenticação & autorização

@docs/AUTH.md

---

## Regras de código

@docs/CODE-RULES.md

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

- `docs/schema.sql` — Schema + migrações M001-M005
- `docs/api-contract.md` — Todas as rotas (body + response)
- `docs/ui-contract.md` — Shapes JSON do frontend
- `docker-setup.md` — Comandos Docker completos

**Regra crítica:** Nenhum agente inventa campos ou rotas. Se não estiver no contrato, perguntar antes.

---

## Próximas tarefas / estado atual

_Atualize isso quando iniciar novo chat:_
- Última coisa que fizemos: [descrever]
- Em progresso: [o que está sendo feito]
- Bloqueadores: [se houver]
- Próximo passo: [para onde vamos]
