# Suplementação — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| GET | `/api/admin/protocolos/:id/suplementacao` | admin |
| POST | `/api/admin/protocolos/:id/suplementacao` | admin |
| PUT | `/api/admin/suplementacao/:id` | admin |
| DELETE | `/api/admin/suplementacao/:id` | admin |

---

## GET /api/admin/protocolos/:id/suplementacao

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
[
  {
    "id": "uuid",
    "nome_suplemento": "Whey Protein",
    "dose": "30g",
    "horario": "Pós-treino",
    "observacao": "string",
    "ordem": 0
  }
]
```

**Erros:** `401`, `403`, `404`

### Shape UI

```json
[{ "id":"uuid","nome_suplemento":"Whey Protein","dose":"30g","horario":"Pós-treino","observacao":"string","ordem":0 }]
```

---

## POST /api/admin/protocolos/:id/suplementacao

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "nome_suplemento": "Whey Protein",
  "dose": "30g",
  "horario": "Pós-treino",
  "observacao": "string?",
  "ordem": 0
}
```

**Response 201:**
```json
{ "id": "uuid", "nome_suplemento": "string" }
```

**Erros:**
- `400` — nome_suplemento ou dose ausente
- `401`, `403`, `404`

---

## PUT /api/admin/suplementacao/:id

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "nome_suplemento": "string?",
  "dose": "string?",
  "horario": "string?",
  "observacao": "string?",
  "ordem": 0
}
```

**Response 200:**
```json
{ "message": "Suplemento atualizado." }
```

**Erros:** `400`, `401`, `403`, `404`

---

## DELETE /api/admin/suplementacao/:id

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Suplemento removido." }
```

**Erros:** `401`, `403`, `404`
