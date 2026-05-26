# Alimentos — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| GET | `/api/admin/alimentos` | admin |
| POST | `/api/admin/alimentos` | admin |
| GET | `/api/admin/alimentos/:id` | admin |
| PUT | `/api/admin/alimentos/:id` | admin |
| PUT | `/api/admin/alimentos/:id/foto` | admin |
| PATCH | `/api/admin/alimentos/:id/ativar` | admin |
| PATCH | `/api/admin/alimentos/:id/desativar` | admin |

---

## GET /api/admin/alimentos

**Auth:** Bearer token
**Role:** admin

**Query params (opcionais):**
- `categoria` — string
- `ativo` — `true | false`
- `busca` — string

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nome": "string",
      "categoria": "string",
      "quantidade_base": 100,
      "unidade": "gramas",
      "calorias": 89.0,
      "proteinas": 1.1,
      "carboidratos": 22.8,
      "gorduras": 0.3,
      "ativo": true
    }
  ],
  "total": 200
}
```

**Erros:** `401`, `403`

### Shape UI

```json
{ "data": [{
  "id":"uuid","nome":"string","categoria":"string",
  "quantidade_base":100,"unidade":"gramas",
  "calorias":89.0,"proteinas":1.1,"carboidratos":22.8,"gorduras":0.3,
  "ativo":true
}], "total": 200 }
```

---

## POST /api/admin/alimentos

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "nome": "string",
  "categoria": "string?",
  "quantidade_base": 100,
  "unidade": "gramas | ml | unidade | colher_sopa | colher_cha | scoop",
  "calorias": 89.0,
  "proteinas": 1.1,
  "carboidratos": 22.8,
  "gorduras": 0.3,
  "fibra": 2.6,
  "sodio": 1.0,
  "foto_url": "string?"
}
```

**Response 201:**
```json
{ "id": "uuid", "nome": "string", "created_at": "timestamp" }
```

**Erros:**
- `400` — nome, calorias, proteinas, carboidratos ou gorduras ausentes
- `401`, `403`

---

## GET /api/admin/alimentos/:id

**Auth:** Bearer token
**Role:** admin

**Response 200:** objeto completo do alimento

**Erros:** `401`, `403`, `404`

### Shape UI

Objeto completo com: `fibra`, `sodio`, `foto_url`.

---

## PUT /api/admin/alimentos/:id

**Auth:** Bearer token
**Role:** admin

**Body:** mesmo schema do POST (todos opcionais)

**Response 200:**
```json
{ "message": "Alimento atualizado com sucesso." }
```

**Erros:** `400`, `401`, `403`, `404`

---

## PUT /api/admin/alimentos/:id/foto

**Auth:** Bearer token
**Role:** admin
**Content-Type:** `multipart/form-data`

**Fields:**
- `foto` (file) — JPG/PNG/WebP, máx. 15MB

**Response 200:**
```json
{
  "message": "Foto atualizada.",
  "foto_url": "https://...",
  "foto_s3_key": "alimentos/fotos/{uuid}.jpg"
}
```

A foto anterior (se houver `foto_s3_key`) é removida do S3 automaticamente.

**Erros:** `400`, `401`, `403`, `404`

### Shape UI

- Field: `foto` (file) — JPG/PNG/WebP, máx. 15MB
- Retorna `{ "foto_url": "https://..." }`.

---

## PATCH /api/admin/alimentos/:id/ativar

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Alimento ativado." }
```

**Erros:** `401`, `403`, `404`

---

## PATCH /api/admin/alimentos/:id/desativar

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Alimento desativado." }
```

**Erros:** `401`, `403`, `404`
