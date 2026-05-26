# Banco de Dados

## Conexão
- Pool via `pg.Pool` usando `process.env.DATABASE_URL`
- Arquivo: `backend/src/config/db.js`

---

## 16 Tabelas

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

---

## Migrações aplicadas (migrate.js)

| ID | Descrição |
|----|-----------|
| M001 | ALTER TABLE users ADD COLUMN nome |
| M002 | ALTER TABLE alunos ADD COLUMN peso_atual_kg, altura_cm, percentual_gordura, peso_magro_kg, peso_gordo_kg |
| M003 | ALTER TABLE alunos ADD COLUMN dias_tolerancia (default 7), periodicidade_dias (default 30) |
| M004 | CREATE TABLE faturas |
| M005 | ALTER TABLE faturas ADD COLUMN desconto_tipo, desconto_valor |
| M006 | ALTER TABLE aluno_fotos ADD COLUMN s3_key, enviada_por |
| M007 | ALTER TABLE exercicios ADD COLUMN thumbnail_s3_key, video_s3_key, ALTER TABLE alimentos ADD COLUMN foto_s3_key |
| M008 | ALTER TABLE aluno_fotos ADD COLUMN (já em M006 — idempotente) |
| M009 | ALTER TABLE aluno_medidas ADD COLUMN abdomen_cm, antebraco_dir_cm, antebraco_esq_cm, panturrilha_dir_cm, panturrilha_esq_cm |
| M010 | ALTER TABLE exercicios ADD COLUMN video_youtube_url, video_tipo |
| M011 | ALTER TABLE protocolos ADD COLUMN meta_agua_litros (default 2.5) |
| M012 | ALTER TABLE alunos ADD COLUMN envio_fotos_liberado (default false) |
| M013 | Flag de protocolo finalizado (distinto de inativo) |
| M014 | Histórico de sessões de treino executadas pelo aluno |
| M015 | Check-ins diários de refeição (engajamento + aderência) |
| M016 | Feedback semanal do aluno (auto-relato + medidas + humor) |
| M017 | Audit trail de operações críticas (tabela `audit_log`) |

---

## Modelo financeiro — Faturas

Status do aluno calculado dinamicamente no SQL (nunca armazenado):

```sql
CASE
  WHEN a.ativo = false THEN 'inativo'
  WHEN NOT EXISTS (SELECT 1 FROM faturas WHERE aluno_id = a.id) THEN 'neutro'
  WHEN EXISTS (
    SELECT 1 FROM faturas
    WHERE aluno_id = a.id
    AND status = 'pendente'
    AND data_vencimento + (a.dias_tolerancia || ' days')::interval < NOW()
  ) THEN 'inadimplente'
  ELSE 'em_dia'
END as status
```

**Campos relevantes em alunos:**
- `dias_tolerancia` — dias após vencimento antes de bloquear (default 7)
- `periodicidade_dias` — periodicidade do plano (default 30)
- `envio_fotos_liberado` — se o admin liberou envio de fotos (default false)

**Tabela faturas:**
- `status`: pendente | pago | vencido
- `desconto_tipo`: valor | percentual | null
- `desconto_valor`: numeric | null
- `valor_final`: CALCULADO na query — nunca persistido
- Fatura paga: não pode ser editada nem removida

---

## Campos de medidas (aluno_medidas)

Todos os 17 campos:
`data_medicao, peso_kg, altura_cm, percentual_gordura, peso_magro_kg, peso_gordo_kg,
cintura_cm, quadril_cm, abdomen_cm, braco_dir_cm, braco_esq_cm,
antebraco_dir_cm, antebraco_esq_cm, coxa_dir_cm, coxa_esq_cm,
panturrilha_dir_cm, panturrilha_esq_cm`

---

## Exercícios — vídeo

- `video_tipo`: 's3' | 'youtube' | null
- `video_url`: URL S3 se tipo='s3'
- `video_youtube_url`: URL original se tipo='youtube'
- `video_embed_url`: calculado na query como `https://www.youtube.com/embed/{id}`
- **Sem thumbnail** — vídeo exibido diretamente

---

## Padrões do schema

- IDs: UUID com `gen_random_uuid()`
- Timestamps: `created_at` e `updated_at` em todas as tabelas
- `updated_at`: atualizado automaticamente via trigger `trigger_set_updated_at`
- Soft delete: coluna `ativo BOOLEAN DEFAULT true` (nunca DELETE físico de users/alunos)
- Enums: via CHECK constraints, não tipo ENUM do PostgreSQL
- Nomes: snake_case
