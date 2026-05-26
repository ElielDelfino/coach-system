# Pagamentos e Faturas — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| GET | `/api/admin/pagamentos` | admin |
| GET | `/api/admin/alunos/:id/pagamentos` | admin |
| POST | `/api/admin/alunos/:id/pagamentos` | admin |
| GET | `/api/admin/alunos/:id/faturas` | admin |
| POST | `/api/admin/alunos/:id/faturas` | admin |
| PUT | `/api/admin/faturas/:id` | admin |
| PATCH | `/api/admin/faturas/:id/baixa` | admin |
| DELETE | `/api/admin/faturas/:id` | admin |

---

## GET /api/admin/pagamentos

**Auth:** Bearer token
**Role:** admin

**Query params (opcionais):**
- `aluno_id` — uuid
- `vencendo_em` — número de dias (retorna quem vence nos próximos N dias)
- `page`, `limit`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "aluno_id": "uuid",
      "nome_aluno": "string",
      "valor": 150.00,
      "data_pagamento": "date",
      "metodo": "pix",
      "vencimento": "date",
      "registrado_por": "uuid",
      "observacoes": "string",
      "created_at": "timestamp"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão

### Shape UI

```json
{
  "data": [{
    "id": "uuid", "aluno_id": "uuid", "nome_aluno": "string",
    "valor": 150.00, "data_pagamento": "date", "metodo": "string",
    "vencimento": "date", "registrado_por": "uuid",
    "observacoes": "string", "created_at": "timestamp"
  }],
  "total": 10, "page": 1, "limit": 20
}
```
**Query params:** `aluno_id`, `vencendo_em` (int: dias), `page`, `limit`

---

## GET /api/admin/alunos/:id/pagamentos

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
[
  {
    "id": "uuid",
    "valor": 150.00,
    "data_pagamento": "date",
    "metodo": "string",
    "vencimento": "date",
    "observacoes": "string",
    "created_at": "timestamp"
  }
]
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

### Shape UI

Array de pagamentos do aluno (sem `nome_aluno`).

---

## POST /api/admin/alunos/:id/pagamentos

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "valor": 150.00,
  "data_pagamento": "date",
  "metodo": "dinheiro | pix | cartao_credito | cartao_debito | transferencia",
  "vencimento": "date",
  "observacoes": "string?"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "valor": 150.00,
  "data_pagamento": "date",
  "vencimento": "date",
  "created_at": "timestamp"
}
```

**Erros:**
- `400` — Campos obrigatórios ausentes ou valor inválido
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

### Shape UI

**Body:**
```json
{
  "valor": 150.00, "data_pagamento": "date",
  "metodo": "dinheiro|pix|cartao_credito|cartao_debito|transferencia",
  "vencimento": "date", "observacoes": "string?"
}
```
**Response:** `{ "id": "uuid", "valor": 150.00, "data_pagamento": "date", "vencimento": "date", "created_at": "timestamp" }`

---

## Faturas

> Faturas substituem o modelo antigo de pagamentos. O status do aluno (`em_dia`, `inadimplente`, `neutro`, `inativo`) é calculado dinamicamente a partir das faturas e do campo `ativo`/`dias_tolerancia`. A baixa é registrada via `PATCH /faturas/:id/baixa`.

> Modelo financeiro do sistema é por **faturas** — pagamentos são apenas o registro de baixa. Status do aluno (`em_dia | inadimplente | neutro`) deriva da existência e do vencimento das faturas.

---

## GET /api/admin/alunos/:id/faturas

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
[
  {
    "id": "uuid",
    "valor": 150.00,
    "data_vencimento": "date",
    "data_baixa": "date | null",
    "metodo_baixa": "dinheiro | pix | cartao_credito | cartao_debito | transferencia | null",
    "status": "pendente | pago | vencido",
    "observacoes": "string | null",
    "desconto_tipo": "valor | percentual | null",
    "desconto_valor": "number | null",
    "valor_final": "number",
    "created_at": "timestamp"
  }
]
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

### Shape UI

```json
[{
  "id": "uuid", "valor": 200.00, "data_vencimento": "date",
  "status": "pendente | pago | vencido",
  "data_baixa": "date | null",
  "metodo_baixa": "string | null",
  "desconto_tipo": "valor | percentual | null",
  "desconto_valor": "number | null",
  "valor_final": "number",
  "observacoes": "string | null"
}]
```

---

## POST /api/admin/alunos/:id/faturas

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "valor": 150.00,
  "data_vencimento": "date",
  "observacoes": "string?",
  "desconto_tipo": "valor | percentual | null",
  "desconto_valor": "number?"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "valor": 150.00,
  "data_vencimento": "date",
  "status": "pendente",
  "observacoes": "string | null",
  "desconto_tipo": "valor | percentual | null",
  "desconto_valor": "number | null",
  "valor_final": "number",
  "created_at": "timestamp"
}
```

**Erros:**
- `400` — Campos obrigatórios ausentes ou valor inválido
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

### Shape UI

**Body:**
```json
{
  "valor": 200.00,
  "data_vencimento": "date",
  "observacoes": "string?",
  "desconto_tipo": "valor | percentual | null",
  "desconto_valor": "number?"
}
```
`valor_final` é calculado no servidor; o front nunca envia.

---

## PUT /api/admin/faturas/:id

**Auth:** Bearer token
**Role:** admin

Só permite editar faturas com `status='pendente'` ou `status='vencido'`.

**Body (todos opcionais):**
```json
{
  "valor": 150.00,
  "data_vencimento": "date",
  "observacoes": "string?",
  "desconto_tipo": "valor | percentual | null",
  "desconto_valor": "number | null"
}
```
Para remover desconto: enviar `{ "desconto_tipo": null, "desconto_valor": null }`.

**Response 200:**
```json
{
  "message": "Fatura atualizada.",
  "fatura": {
    "id": "uuid",
    "valor": 150.00,
    "data_vencimento": "date",
    "status": "pendente | vencido",
    "observacoes": "string | null",
    "desconto_tipo": "valor | percentual | null",
    "desconto_valor": "number | null",
    "valor_final": "number"
  }
}
```

**Erros:**
- `400` — Fatura já baixada (`"Fatura já baixada não pode ser editada."`) ou dados inválidos
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Fatura não encontrada

### Shape UI

Edita campos da fatura ainda em aberto (`valor`, `data_vencimento`, descontos, observações). Retorna `{ "message": "Fatura atualizada.", "fatura": { ... } }`.

---

## PATCH /api/admin/faturas/:id/baixa

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "data_baixa": "date",
  "metodo_baixa": "dinheiro | pix | cartao_credito | cartao_debito | transferencia",
  "observacoes": "string?"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "valor": 150.00,
  "data_vencimento": "date",
  "data_baixa": "date",
  "metodo_baixa": "string",
  "status": "pago",
  "observacoes": "string | null",
  "desconto_tipo": "valor | percentual | null",
  "desconto_valor": "number | null",
  "valor_final": "number"
}
```

**Erros:**
- `400` — Fatura já está paga ou campos obrigatórios ausentes
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Fatura não encontrada

### Shape UI

Marca como paga.
**Body:** `{ "data_baixa": "date", "metodo_baixa": "dinheiro|pix|cartao_credito|cartao_debito|transferencia", "observacoes": "string?" }`
**Response:** objeto da fatura atualizada. Retorna `400` se já estiver paga.

---

## DELETE /api/admin/faturas/:id

**Auth:** Bearer token
**Role:** admin

Só permite remover faturas com `status='pendente'`.

**Response 200:**
```json
{ "message": "Fatura removida." }
```

**Erros:**
- `400` — Fatura está paga (não pode ser removida)
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Fatura não encontrada

### Shape UI

Retorna `{ "message": "Fatura removida." }`.
