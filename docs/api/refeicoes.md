# Refeições — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| GET | `/api/admin/protocolos/:id/refeicoes` | admin |
| POST | `/api/admin/protocolos/:id/refeicoes` | admin |
| POST | `/api/admin/refeicoes/:id/duplicar` | admin |
| PUT | `/api/admin/refeicoes/:id` | admin |
| DELETE | `/api/admin/refeicoes/:id` | admin |
| POST | `/api/admin/refeicoes/:id/itens` | admin |
| PUT | `/api/admin/refeicoes/:refeicaoId/itens/:itemId` | admin |
| DELETE | `/api/admin/refeicoes/:refeicaoId/itens/:itemId` | admin |
| PATCH | `/api/admin/refeicoes/:refeicaoId/itens/reordenar` | admin |
| POST | `/api/admin/refeicoes/:refeicaoId/itens/:itemId/substitutos` | admin |
| DELETE | `/api/admin/refeicoes/:refeicaoId/itens/:itemId/substitutos/:substitutoId` | admin |

---

## GET /api/admin/protocolos/:id/refeicoes

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
[
  {
    "id": "uuid",
    "numero_refeicao": 1,
    "nome": "Café da manhã",
    "ordem": 0,
    "horario_sugerido": "07:00",
    "total_kcal": 520.0,
    "total_prot": 35.0,
    "total_carb": 60.0,
    "total_gord": 12.0,
    "itens": [
      {
        "id": "uuid",
        "alimento_id": "uuid",
        "nome_alimento": "string",
        "quantidade_g": 150.0,
        "kcal_calculado": 200.0,
        "prot_calculado": 15.0,
        "carb_calculado": 20.0,
        "gord_calculado": 5.0,
        "ordem": 0,
        "observacoes": "string",
        "substitutos": [
          {
            "id": "uuid",
            "alimento_id": "uuid",
            "nome_alimento": "string",
            "quantidade_g": 120.0
          }
        ]
      }
    ]
  }
]
```

**Erros:** `401`, `403`, `404`

### Shape UI

Estrutura aninhada completa — **refeições com totais calculados e itens com substitutos:**
```json
[{
  "id": "uuid",
  "numero_refeicao": 1,
  "nome": "Café da manhã",
  "ordem": 0,
  "horario_sugerido": "07:00",
  "total_kcal": 520.0,
  "total_prot": 35.0,
  "total_carb": 60.0,
  "total_gord": 12.0,
  "itens": [{
    "id": "uuid",
    "alimento_id": "uuid",
    "nome_alimento": "string",
    "quantidade_g": 150.0,
    "kcal_calculado": 200.0,
    "prot_calculado": 15.0,
    "carb_calculado": 20.0,
    "gord_calculado": 5.0,
    "ordem": 0,
    "observacoes": "string",
    "substitutos": [{
      "id": "uuid", "alimento_id": "uuid", "nome_alimento": "string", "quantidade_g": 120.0
    }]
  }]
}]
```

---

## POST /api/admin/protocolos/:id/refeicoes

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "numero_refeicao": 1,
  "nome": "Café da manhã",
  "ordem": 0,
  "horario_sugerido": "07:00"
}
```

**Response 201:**
```json
{ "id": "uuid", "numero_refeicao": 1, "nome": "string" }
```

**Erros:**
- `400` — numero_refeicao ou nome ausente; numero_refeicao já existe no protocolo
- `401`, `403`, `404`

---

## POST /api/admin/refeicoes/:id/duplicar

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{ "numero_refeicao_destino": 5 }
```

**Response 201:**
```json
{ "id": "uuid", "numero_refeicao": 5, "nome": "string", "created_at": "timestamp" }
```

**Erros:**
- `400` — numero_refeicao_destino ausente ou já existe refeição com esse número neste protocolo
- `401`, `403`, `404`

### Shape UI

**Body:** `{ "numero_refeicao_destino": 5 }` (obrigatório).
**Response:** `{ "id":"uuid","numero_refeicao":5,"nome":"string","created_at":"timestamp" }`. `400` se já existir refeição com o mesmo `numero_refeicao` no protocolo.

---

## PUT /api/admin/refeicoes/:id

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "nome": "string?",
  "ordem": 0,
  "horario_sugerido": "string?"
}
```

**Response 200:**
```json
{ "message": "Refeição atualizada." }
```

**Erros:** `400`, `401`, `403`, `404`

---

## DELETE /api/admin/refeicoes/:id

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Refeição removida." }
```

**Erros:** `401`, `403`, `404`

---

## POST /api/admin/refeicoes/:id/itens

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "alimento_id": "uuid",
  "quantidade_g": 150.0,
  "ordem": 0,
  "observacoes": "string?"
}
```
Macros são calculados automaticamente pelo back-end com base na tabela `alimentos`.

**Response 201:**
```json
{
  "id": "uuid",
  "alimento_id": "uuid",
  "quantidade_g": 150.0,
  "kcal_calculado": 200.0,
  "prot_calculado": 15.0,
  "carb_calculado": 20.0,
  "gord_calculado": 5.0
}
```

**Erros:**
- `400` — alimento_id ou quantidade_g ausente
- `401`, `403`, `404`

### Shape UI

Macros já calculados e retornados:
```json
{ "id":"uuid","alimento_id":"uuid","quantidade_g":150.0,"kcal_calculado":200.0,"prot_calculado":15.0,"carb_calculado":20.0,"gord_calculado":5.0 }
```

---

## PUT /api/admin/refeicoes/:refeicaoId/itens/:itemId

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "quantidade_g": 200.0,
  "ordem": 1,
  "observacoes": "string?"
}
```
Macros são recalculados automaticamente.

**Response 200:**
```json
{ "message": "Item atualizado." }
```

**Erros:** `400`, `401`, `403`, `404`

---

## DELETE /api/admin/refeicoes/:refeicaoId/itens/:itemId

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Item removido." }
```

**Erros:** `401`, `403`, `404`

---

## PATCH /api/admin/refeicoes/:refeicaoId/itens/reordenar

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{ "ordem": [{ "id": "uuid", "ordem": 0 }, { "id": "uuid", "ordem": 1 }] }
```

**Response 200:**
```json
{ "message": "Itens reordenados." }
```

**Erros:**
- `400` — array inválido (vazio, ids inexistentes ou não pertencentes à refeição)
- `401`, `403`, `404`

### Shape UI

Body: `{ "ordem": [{ "id": "uuid", "ordem": 0 }, ...] }`. Resposta: `{ "message": "..." }`.

---

## POST /api/admin/refeicoes/:refeicaoId/itens/:itemId/substitutos

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "alimento_id": "uuid",
  "quantidade_g": 120.0
}
```

**Response 201:**
```json
{ "id": "uuid", "alimento_id": "uuid", "quantidade_g": 120.0 }
```

**Erros:**
- `400` — alimento_id ou quantidade_g ausente; substituto já cadastrado para este item
- `401`, `403`, `404`

### Shape UI

**Body:** `{ "alimento_id": "uuid", "quantidade_g": 120.0 }`.

---

## DELETE /api/admin/refeicoes/:refeicaoId/itens/:itemId/substitutos/:substitutoId

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Substituto removido." }
```

**Erros:** `401`, `403`, `404`

### Shape UI

Resposta: `{ "message": "..." }`.
