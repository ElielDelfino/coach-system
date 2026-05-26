# Treinos — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| GET | `/api/admin/protocolos/:id/treinos` | admin |
| POST | `/api/admin/protocolos/:id/treinos` | admin |
| PUT | `/api/admin/treinos/:id` | admin |
| DELETE | `/api/admin/treinos/:id` | admin |
| POST | `/api/admin/treinos/:id/duplicar` | admin |
| POST | `/api/admin/treinos/:id/exercicios` | admin |
| PUT | `/api/admin/treinos/:treinoId/exercicios/:itemId` | admin |
| DELETE | `/api/admin/treinos/:treinoId/exercicios/:itemId` | admin |
| PATCH | `/api/admin/treinos/:treinoId/exercicios/reordenar` | admin |

---

## GET /api/admin/protocolos/:id/treinos

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
[
  {
    "id": "uuid",
    "nome": "Treino A",
    "ordem": 0,
    "exercicios": [
      {
        "id": "uuid",
        "tipo": "exercicio",
        "exercicio_id": "uuid",
        "nome_exercicio": "string",
        "series": 4,
        "repeticoes": "8-12",
        "descanso_seg": 90,
        "observacao": "string",
        "ordem": 0,
        "grupo_superset": null
      }
    ]
  }
]
```

**Erros:** `401`, `403`, `404`

### Shape UI

Estrutura aninhada com exercícios:
```json
[{
  "id": "uuid",
  "nome": "Treino A",
  "ordem": 0,
  "exercicios": [{
    "id": "uuid",
    "tipo": "exercicio | cardio",
    "exercicio_id": "uuid | null",
    "cardio_id": "uuid | null",
    "nome_exercicio": "string",
    "series": 4,
    "repeticoes": "8-12",
    "descanso_seg": 90,
    "observacao": "string",
    "ordem": 0,
    "grupo_superset": "A | null"
  }]
}]
```

---

## POST /api/admin/protocolos/:id/treinos

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "nome": "Treino A",
  "ordem": 0
}
```

**Response 201:**
```json
{ "id": "uuid", "nome": "string", "created_at": "timestamp" }
```

**Erros:**
- `400` — nome ausente
- `401`, `403`, `404`

---

## PUT /api/admin/treinos/:id

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "nome": "string?",
  "ordem": 0
}
```

**Response 200:**
```json
{ "message": "Treino atualizado." }
```

**Erros:** `400`, `401`, `403`, `404`

---

## DELETE /api/admin/treinos/:id

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Treino removido." }
```

**Erros:** `401`, `403`, `404`

---

## POST /api/admin/treinos/:id/duplicar

**Auth:** Bearer token
**Role:** admin

Cria um novo treino no mesmo protocolo do treino de origem, copiando todos os itens (`treino_exercicios`) — incluindo séries, repetições, descanso, intensidade e referências a exercícios/cardio.

**Body (opcional):**
```json
{ "nome": "string?", "ordem": 0 }
```

Se `nome` não for enviado, o treino duplicado recebe `"<nome original> (cópia)"`. Se `ordem` não for enviada, é colocado após o último treino do protocolo.

**Response 201:** objeto do novo treino (mesmos campos do `POST /protocolos/:id/treinos`).

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Treino de origem não encontrado

### Shape UI

Cria um novo treino no mesmo protocolo, copiando todos os itens.
**Body (opcional):** `{ "nome": "string?", "ordem": 0 }`. Sem `nome` → `"<original> (cópia)"`. Sem `ordem` → fica após o último treino.

---

## POST /api/admin/treinos/:id/exercicios

**Auth:** Bearer token
**Role:** admin

**Body (tipo = "exercicio"):**
```json
{
  "tipo": "exercicio",
  "exercicio_id": "uuid",
  "series": 4,
  "repeticoes": "8-12",
  "descanso_seg": 90,
  "observacao": "string?",
  "ordem": 0,
  "grupo_superset": "A"
}
```

**Body (tipo = "cardio"):**
```json
{
  "tipo": "cardio",
  "cardio_id": "uuid",
  "observacao": "string?",
  "ordem": 0,
  "grupo_superset": null
}
```

**Response 201:**
```json
{ "id": "uuid", "tipo": "string", "ordem": 0 }
```

**Erros:**
- `400` — tipo inválido; exercicio_id/cardio_id ausente conforme o tipo
- `401`, `403`, `404`

---

## PUT /api/admin/treinos/:treinoId/exercicios/:itemId

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "series": 4,
  "repeticoes": "10-12",
  "descanso_seg": 60,
  "observacao": "string?",
  "ordem": 1,
  "grupo_superset": "B"
}
```

**Response 200:**
```json
{ "message": "Item de treino atualizado." }
```

**Erros:** `400`, `401`, `403`, `404`

---

## DELETE /api/admin/treinos/:treinoId/exercicios/:itemId

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Item de treino removido." }
```

**Erros:** `401`, `403`, `404`

---

## PATCH /api/admin/treinos/:treinoId/exercicios/reordenar

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{ "ordem": [{ "id": "uuid", "ordem": 0 }, { "id": "uuid", "ordem": 1 }] }
```

**Response 200:**
```json
{ "message": "Exercícios reordenados." }
```

**Erros:**
- `400` — array inválido (vazio, ids inexistentes ou não pertencentes ao treino)
- `401`, `403`, `404`

### Shape UI

Body: `{ "ordem": [{ "id": "uuid", "ordem": 0 }, ...] }`.
