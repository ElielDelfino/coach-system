# Dashboard — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| GET | `/api/admin/dashboard/evolucao` | admin |
| GET | `/api/admin/dashboard/resumo` | admin |

---

## GET /api/admin/dashboard/evolucao

**Auth:** Bearer token
**Role:** admin

Evolução agregada das medições dos alunos nos últimos 90 dias, agrupada por data e ordenada cronologicamente.

**Response 200:**
```json
{
  "evolucao": [
    {
      "data": "2026-01-15",
      "media_peso_kg": 82.3,
      "media_percentual_gordura": 18.5,
      "total_alunos_medidos": 12
    }
  ]
}
```

Notas:
- `data` no formato `YYYY-MM-DD`.
- Valores numéricos arredondados a 1 casa decimal; podem vir `null` quando o campo não foi preenchido em nenhuma medição daquela data.
- Se não houver medições no período, `evolucao` é `[]`.

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão

### Shape UI

Evolução agregada da base nos últimos 90 dias (médias por dia).
```json
{
  "evolucao": [
    { "data": "2026-01-15", "media_peso_kg": 82.3, "media_percentual_gordura": 18.5, "total_alunos_medidos": 12 }
  ]
}
```
- `data` no formato `YYYY-MM-DD`, ordem cronológica ascendente.
- Valores numéricos com 1 casa decimal; podem vir `null` quando o campo não foi preenchido em nenhuma medição do dia.
- Front exibe um `LineChart` (peso médio) e um `AreaChart` (%BF médio) — eixo X formatado como `DD/MM`.

---

## GET /api/admin/dashboard/resumo

**Auth:** Bearer token
**Role:** admin

Resumo financeiro e operacional para o dashboard administrativo.

**Response 200:**
```json
{
  "total_alunos": 48,
  "ativos": 35,
  "inadimplentes": 7,
  "neutros": 6,
  "receita_mes": 4200.00,
  "a_receber_mes": 1800.00,
  "alunos_sem_medicao_30d": 15
}
```

Notas:
- `ativos`, `inadimplentes`, `neutros` consideram apenas alunos com `ativo = true`.
- `receita_mes` soma o valor final (após descontos) das faturas com `status = 'pago'` e `data_baixa` no mês corrente.
- `a_receber_mes` soma o valor final das faturas com `status = 'pendente'` e `data_vencimento` no mês corrente.
- `alunos_sem_medicao_30d` conta alunos ativos sem registro em `aluno_medidas` nos últimos 30 dias.

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão

### Shape UI

```json
{
  "total_alunos": 48,
  "ativos": 35,
  "inadimplentes": 7,
  "neutros": 6,
  "receita_mes": 4200.00,
  "a_receber_mes": 1800.00,
  "alunos_sem_medicao_30d": 15
}
```
- `ativos | inadimplentes | neutros` cobrem apenas alunos com `ativo = true`.
- `receita_mes` = soma do valor final das faturas pagas no mês corrente.
- `a_receber_mes` = soma do valor final das faturas pendentes com `data_vencimento` no mês.
- `alunos_sem_medicao_30d` alimenta o card de alerta amarelo no dashboard.
