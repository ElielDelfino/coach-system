# Documentação — Coach System

Índice mestre da documentação do projeto. Este arquivo é o ponto de entrada
para qualquer agente de IA. Use a matriz abaixo para carregar apenas os
arquivos relevantes à tarefa em vez de varrer todo o diretório.

## Estrutura

| Caminho | Função |
|---|---|
| `.claude/CLAUDE.md` | Entrada da IA. Carregado automaticamente. |
| `docs/README.md` | Este índice. |
| `docs/STATUS.md` | Estado vivo do projeto (deploy, pendentes). |
| `docs/core/STACK.md` | Tecnologias, infra, Docker Swarm, envs. |
| `docs/core/AUTH.md` | Fluxo JWT, middlewares, blacklist Redis. |
| `docs/core/DATABASE.md` | Tabelas, migrações, modelo financeiro. |
| `docs/core/CODE-RULES.md` | Padrões obrigatórios backend + frontend. |
| `docs/core/DESIGN-SYSTEM.md` | Paleta, tokens, badges, proibições visuais. |
| `docs/schema.sql` | DDL real + migrações aplicadas. |
| `docs/api/_index.md` | Índice mestre de rotas (módulo → arquivo). |
| `docs/api/_conventions.md` | Convenções transversais (auth, erros, rate limit). |
| `docs/api/<dominio>.md` | Contrato API + Shape UI por domínio (12 arquivos). |
| `docs/ui/decisoes-agente-ui.md` | Decisões UI transversais. |
| `docs/ops/docker.md` | Comandos operacionais Docker Swarm. |
| `prompts/archive/` | Histórico arqueológico — NÃO é especificação vigente. |

## Dependência entre documentos

- `CLAUDE.md` e `docs/README.md` são os únicos arquivos que referenciam muitos outros.
- `docs/core/*` são folhas — não dependem entre si.
- `docs/api/<dominio>.md` referenciam `docs/api/_conventions.md` e `docs/core/DATABASE.md`.
- Sem ciclos. `core/*` nunca referencia `docs/api/*`.

## Ordem de leitura pela IA

Toda sessão (auto-carregado via `@include`):
1. `.claude/CLAUDE.md`
2. `docs/README.md` (este arquivo)

Sob demanda, conforme o tipo de tarefa — ver matriz abaixo.

## Matriz: tipo de tarefa → arquivos a carregar

| Tarefa | Sempre | Conforme contexto |
|---|---|---|
| **Backend** (endpoint, model, controller) | `docs/core/CODE-RULES.md`, `docs/api/_conventions.md` | `docs/api/<dominio>.md` (consultar `_index.md`), `docs/core/DATABASE.md`, `docs/core/AUTH.md` (se rota autenticada) |
| **Frontend** (página, componente) | `docs/core/CODE-RULES.md`, `docs/core/DESIGN-SYSTEM.md` | `docs/api/<dominio>.md` (rota consumida), `docs/ui/decisoes-agente-ui.md` |
| **Auth** (login, refresh, autorização) | `docs/core/AUTH.md`, `docs/api/auth.md` | `docs/core/CODE-RULES.md` |
| **Bugfix** | `docs/core/CODE-RULES.md` | `docs/api/<dominio>.md` do bug + código relevante |
| **Refactor** | `docs/core/CODE-RULES.md` | `docs/api/<dominio>.md` (manter contrato), `docs/core/DATABASE.md` (se toca persistência) |
| **Feature nova** | `docs/core/CODE-RULES.md`, `docs/api/_conventions.md`, `docs/api/_index.md` | `docs/core/DATABASE.md` (se nova tabela), `docs/core/DESIGN-SYSTEM.md` (se UI), `docs/api/<dominio>.md` (se estende domínio) |
| **Testes** | `docs/core/CODE-RULES.md` | Arquivo de teste vizinho + model alvo (sem doc extra) |
| **Deploy** | `docs/ops/docker.md`, `docs/core/STACK.md`, `docs/STATUS.md` | — |

**Regra de ouro:** antes de carregar mais de 2 arquivos, consultar esta matriz.

## Manutenção

Ao alterar/adicionar rota:
- Atualizar `docs/api/<dominio>.md` (req, res, erros, Shape UI).
- Atualizar `docs/api/_index.md` se novo prefixo.
- Se nova tabela: atualizar `docs/schema.sql` + `docs/core/DATABASE.md`.

Nenhum agente inventa campos ou rotas. Se não estiver no contrato, perguntar.
