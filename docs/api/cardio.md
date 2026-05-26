# Cardio — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| GET | `/api/admin/cardio` | admin |
| POST | `/api/admin/cardio` | admin |
| GET | `/api/admin/cardio/:id` | admin |
| PUT | `/api/admin/cardio/:id` | admin |
| PATCH | `/api/admin/cardio/:id/desativar` | admin |

---

## GET /api/admin/cardio

**Auth:** Bearer token
**Role:** admin

**Query params (opcionais):** `tipo`, `intensidade`, `ativo`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tipo": "corrida",
      "intensidade": "moderada",
      "duracao_min": 30,
      "gasto_calorico_estimado": 300.0,
      "inclinacao": 1.0,
      "velocidade": 10.0,
      "ativo": true
    }
  ],
  "total": 15
}
```

**Erros:** `401`, `403`

### Shape UI

```json
{ "data": [{
  "id":"uuid","tipo":"corrida","intensidade":"moderada",
  "duracao_min":30,"gasto_calorico_estimado":300.0,
  "inclinacao":1.0,"velocidade":10.0,"ativo":true
}], "total": 15 }
```

---

## POST /api/admin/cardio

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "tipo": "string",
  "intensidade": "leve | moderada | intensa | maxima",
  "duracao_min": 30,
  "gasto_calorico_estimado": 300.0,
  "inclinacao": 1.0,
  "velocidade": 10.0,
  "observacoes": "string?"
}
```

**Response 201:**
```json
{ "id": "uuid", "tipo": "string", "created_at": "timestamp" }
```

**Erros:**
- `400` — tipo ausente
- `401`, `403`

---

## GET /api/admin/cardio/:id

**Auth:** Bearer token
**Role:** admin

**Response 200:** objeto completo do cardio

**Erros:** `401`, `403`, `404`

---

## PUT /api/admin/cardio/:id

**Auth:** Bearer token
**Role:** admin

**Body:** mesmo schema do POST (todos opcionais)

**Response 200:**
```json
{ "message": "Cardio atualizado com sucesso." }
```

**Erros:** `400`, `401`, `403`, `404`

---

## PATCH /api/admin/cardio/:id/desativar

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Cardio desativado." }
```

**Erros:** `401`, `403`, `404`
