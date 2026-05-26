# Documentação — Coach System

Índice mestre da documentação do projeto. Este arquivo é o ponto de entrada
para qualquer agente de IA. Use a matriz abaixo para carregar apenas os
arquivos relevantes à tarefa em vez de varrer todo o diretório.

## Estrutura

| Caminho | Função |
|---|---|
| `.claude/CLAUDE.md` | Entrada da IA. Carregado automaticamente. |
| `docs/README.md` | Este índice. |
| `docs/core/STACK.md` | Tecnologias, infra, Docker Swarm, envs. |
| `docs/core/AUTH.md` | Fluxo JWT, middlewares, blacklist Redis. |
| `docs/core/DATABASE.md` | Tabelas, migrações, modelo financeiro. |
| `docs/core/CODE-RULES.md` | Padrões obrigatórios backend + frontend. |
| `docs/schema.sql` | DDL real + migrações aplicadas. |
| `docs/api-contract.md` | Contrato de todas as rotas (req/res). |
| `docs/ui-contract.md` | Shapes JSON consumidos pelo frontend. |
| `docs/ops/docker.md` | Comandos operacionais Docker Swarm. |
| `prompts/HANDOFF.md` | Log temporal das sessões recentes. |
| `prompts/archive/` | Histórico arqueológico — NÃO é especificação vigente. |

## Dependência entre documentos

- `CLAUDE.md` e `docs/README.md` são os únicos arquivos que referenciam muitos outros.
- `docs/core/*` são folhas — não dependem entre si.
- `docs/api-contract.md` e `docs/ui-contract.md` referenciam tabelas em `docs/schema.sql` e `docs/core/DATABASE.md`.
- Sem ciclos. `core/*` nunca referencia `api-contract.md` ou `ui-contract.md`.

## Ordem de leitura pela IA

Toda sessão (auto-carregado via `@include`):
1. `.claude/CLAUDE.md`
2. `docs/README.md` (este arquivo)

Sob demanda, conforme o tipo de tarefa — ver matriz abaixo.

## Matriz: tipo de tarefa → arquivos a carregar

| Tarefa | Sempre | Conforme contexto |
|---|---|---|
| **Backend** (endpoint, model, controller) | `docs/core/CODE-RULES.md` | `docs/api-contract.md`, `docs/core/DATABASE.md`, `docs/core/AUTH.md` (se rota autenticada) |
| **Frontend** (página, componente) | `docs/core/CODE-RULES.md` | `docs/ui-contract.md` (rota consumida), `docs/api-contract.md` |
| **Auth** (login, refresh, autorização) | `docs/core/AUTH.md` | `docs/api-contract.md` (seção AUTENTICAÇÃO), `docs/core/CODE-RULES.md` |
| **Bugfix** | `docs/core/CODE-RULES.md` | Trecho do `docs/api-contract.md` correspondente ao bug, código relevante |
| **Refactor** | `docs/core/CODE-RULES.md` | `docs/api-contract.md` (manter contrato), `docs/core/DATABASE.md` (se toca persistência) |
| **Feature nova** | `docs/core/CODE-RULES.md`, `docs/api-contract.md` | `docs/core/DATABASE.md` (se nova tabela), `docs/ui-contract.md` (se UI) |
| **Testes** | `docs/core/CODE-RULES.md` | Arquivo de teste vizinho + model alvo (sem doc extra) |
| **Deploy** | `docs/ops/docker.md`, `docs/core/STACK.md` | `prompts/HANDOFF.md` (verificar bloqueios) |

**Regra de ouro:** antes de carregar mais de 2 arquivos, consultar esta matriz.

## Manutenção

Ao alterar/adicionar rota:
- Atualizar `docs/api-contract.md` (req, res, erros).
- Atualizar `docs/ui-contract.md` (shape JSON).
- Se nova tabela: atualizar `docs/schema.sql` + `docs/core/DATABASE.md`.

Nenhum agente inventa campos ou rotas. Se não estiver no contrato, perguntar.
