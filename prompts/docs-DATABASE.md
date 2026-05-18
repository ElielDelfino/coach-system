# Database & Modelo Financeiro

## 16 tabelas

```
IDENTIDADE          FINANCEIRO    BIBLIOTECAS       PROTOCOLO
users               faturas       exercicios        protocolos
alunos                            alimentos         refeicoes
aluno_medidas                     cardio            refeicao_itens
aluno_fotos                                         refeicao_item_substitutos
                                                    treinos
                                                    treino_exercicios
                                                    suplementacao
```

## Migrações aplicadas (idempotentes)

- **M001:** `ALTER TABLE users ADD COLUMN nome`
- **M002:** `ALTER TABLE alunos ADD COLUMN peso_atual_kg, altura_cm, percentual_gordura, peso_magro_kg, peso_gordo_kg`
- **M003:** `ALTER TABLE alunos ADD COLUMN dias_tolerancia, periodicidade_dias`
- **M004:** `CREATE TABLE faturas (...)`
- **M005:** `ALTER TABLE faturas ADD COLUMN desconto_tipo, desconto_valor`

Executadas via `config/migrate.js` — roda `schema.sql` + migrações na ordem.

## Modelo Financeiro — Faturas

Sistema usa **faturas**, não pagamentos diretos.

### Fluxo
1. Admin lança fatura: `POST /admin/alunos/:id/faturas`
2. Aluno paga → admin dá baixa: `PATCH /admin/faturas/:id/baixa`
3. Status calculado dinamicamente — nunca coluna persistida

### Status do aluno (SQL)

| Status | Condição |
|--------|----------|
| `neutro` | Sem nenhuma fatura lançada |
| `em_dia` | Faturas pagas **OU** dentro do prazo de tolerância |
| `inadimplente` | Fatura pendente com `data_vencimento + dias_tolerancia < NOW()` |
| `inativo` | `aluno.ativo = false` |

### Campos críticos

- `alunos.dias_tolerancia` (default 7 dias) — dias após vencimento antes de bloquear
- `alunos.periodicidade_dias` (default 30) — ciclo do plano do aluno
- `faturas.status` → `pendente | pago | vencido`
- `faturas.desconto_tipo` → `valor | percentual | null`
- `faturas.desconto_valor` → `numeric | null`
- `faturas.valor_final` → **calculado na query, nunca persistido**

### Regras

- Fatura paga **não pode ser editada nem removida**
- Aluno inadimplente é bloqueado automaticamente em rotas `/aluno/*`
- Middleware `auth.js` bloqueia inadimplente com `403 code: INADIMPLENTE`

## Geração de PDF & Email

**Biblioteca:** Puppeteer (renderiza HTML → PDF em buffer)  
**Email:** Resend (@resend/node)

**Arquivos:**
- `backend/src/services/pdf.js` — gera PDF via Puppeteer
- `backend/src/services/email.js` — envia via Resend
- `backend/src/templates/protocolo.html` — template HTML

**Rota:**
```
POST /api/admin/protocolos/:id/enviar-pdf
→ Busca dados do protocolo
→ Gera PDF em buffer
→ Envia por email para o aluno
→ 200: { message: "Protocolo enviado para email@aluno.com" }
```

**Email remetente:** `process.env.EMAIL_FROM` (onboarding@resend.dev em dev)
