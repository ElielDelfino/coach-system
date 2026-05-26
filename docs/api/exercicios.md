# Exercícios — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| GET | `/api/admin/exercicios` | admin |
| POST | `/api/admin/exercicios` | admin |
| GET | `/api/admin/exercicios/:id` | admin |
| PUT | `/api/admin/exercicios/:id` | admin |
| PUT | `/api/admin/exercicios/:id/thumbnail` | admin |
| PUT | `/api/admin/exercicios/:id/video` | admin |
| PATCH | `/api/admin/exercicios/:id/ativar` | admin |
| PATCH | `/api/admin/exercicios/:id/desativar` | admin |

---

## GET /api/admin/exercicios

**Auth:** Bearer token
**Role:** admin

**Query params (opcionais):**
- `grupo_muscular` — string
- `nivel` — `iniciante | intermediario | avancado`
- `ativo` — `true | false` (padrão: `true`)
- `busca` — string

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nome": "string",
      "grupo_muscular": "string",
      "equipamento": "string",
      "nivel": "string",
      "thumbnail_url": "string",
      "ativo": true
    }
  ],
  "total": 50
}
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão

### Shape UI

```json
{ "data": [{
  "id":"uuid","nome":"string","grupo_muscular":"string","equipamento":"string",
  "nivel":"string","thumbnail_url":"string","ativo":true
}], "total": 50 }
```
**Query params:** `grupo_muscular`, `nivel`, `ativo`, `busca`

---

## POST /api/admin/exercicios

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "nome": "string",
  "grupo_muscular": "string",
  "equipamento": "string?",
  "nivel": "iniciante | intermediario | avancado",
  "video_url": "string?",
  "thumbnail_url": "string?",
  "observacoes_tecnicas": "string?",
  "execucao_correta": "string?",
  "execucao_errada": "string?",
  "descanso_padrao_seg": 60,
  "series_recomendadas": 4,
  "repeticoes_recomendadas": "8-12",
  "cadencia": "2-1-2",
  "exercicio_substituto_id": "uuid?"
}
```

**Response 201:**
```json
{ "id": "uuid", "nome": "string", "created_at": "timestamp" }
```

**Erros:**
- `400` — nome ou grupo_muscular ausente
- `401` — Não autenticado
- `403` — Perfil sem permissão

---

## GET /api/admin/exercicios/:id

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{
  "id": "uuid",
  "nome": "string",
  "grupo_muscular": "string",
  "equipamento": "string",
  "nivel": "string",
  "video_url": "string",
  "thumbnail_url": "string",
  "observacoes_tecnicas": "string",
  "execucao_correta": "string",
  "execucao_errada": "string",
  "descanso_padrao_seg": 60,
  "series_recomendadas": 4,
  "repeticoes_recomendadas": "8-12",
  "cadencia": "2-1-2",
  "exercicio_substituto_id": "uuid",
  "ativo": true,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Exercício não encontrado

### Shape UI

Objeto completo com: `video_url`, `video_youtube_url`, `video_embed_url` (derivado), `observacoes_tecnicas`, `execucao_correta`, `execucao_errada`, `descanso_padrao_seg`, `series_recomendadas`, `repeticoes_recomendadas`, `cadencia`, `exercicio_substituto_id`.

> `video_embed_url` vem montado pelo backend a partir de `video_youtube_url` — front só precisa renderizar no `<iframe>`.

---

## PUT /api/admin/exercicios/:id

**Auth:** Bearer token
**Role:** admin

**Body:** mesmo schema do POST (todos opcionais)

**Response 200:**
```json
{ "message": "Exercício atualizado com sucesso." }
```

**Erros:**
- `400` — Dados inválidos
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Exercício não encontrado

---

## PUT /api/admin/exercicios/:id/thumbnail

**Auth:** Bearer token
**Role:** admin
**Content-Type:** `multipart/form-data`

**Fields:**
- `thumbnail` (file) — JPG/PNG/WebP, máx. 15MB

**Response 200:**
```json
{
  "message": "Thumbnail atualizada.",
  "thumbnail_url": "https://...",
  "thumbnail_s3_key": "exercicios/thumbs/{uuid}.jpg"
}
```

A thumbnail anterior (se houver `thumbnail_s3_key`) é removida do S3 automaticamente.

**Erros:** `400`, `401`, `403`, `404`

### Shape UI

- Field: `thumbnail` (file) — JPG/PNG/WebP, máx. 15MB
- Retorna `{ "thumbnail_url": "https://..." }` (URL pública do S3).

---

## PUT /api/admin/exercicios/:id/video

**Auth:** Bearer token
**Role:** admin
**Content-Type:** `multipart/form-data`

**Fields:**
- `video` (file) — MP4/WebM/MOV/AVI, máx. 500MB

**Response 200:**
```json
{
  "message": "Vídeo atualizado.",
  "video_url": "https://...",
  "video_s3_key": "exercicios/videos/{uuid}.mp4",
  "video_tipo": "s3"
}
```

Define `video_tipo = 's3'`, limpa `video_youtube_url` e remove o vídeo S3 anterior (se houver).

**Erros:** `400`, `401`, `403`, `404`

### Shape UI

- Field: `video` (file) — MP4/WebM/MOV/AVI, máx. 500MB
- Retorna `{ "video_url": "https://...", "s3_key": "exercicios/videos/..." }`.

> Modos suportados em exercícios: arquivo S3 (`video_url`) **ou** YouTube (`video_youtube_url`). Front escolhe um deles na UI de criação/edição.

---

## Vídeo de exercício — YouTube vs S3

Os exercícios podem ter vídeo em duas formas:

| Tipo | Campos preenchidos | Como salvar |
|------|--------------------|-------------|
| `youtube` | `video_youtube_url`, `video_tipo='youtube'`, `video_embed_url` (calculado) | `PUT /exercicios/:id` com `video_youtube_url` |
| `s3` | `video_url`, `video_s3_key`, `video_tipo='s3'` | `PUT /exercicios/:id/video` (upload) |

URLs aceitas para YouTube: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`, `youtube.com/shorts/`.

O response de `GET /api/admin/exercicios/:id` inclui:
- `video_tipo`: `'s3' | 'youtube' | null`
- `video_url`: URL S3 (quando `video_tipo='s3'`)
- `video_youtube_url`: URL original colada pelo professor
- `video_embed_url`: `https://www.youtube.com/embed/{videoId}` (calculado em runtime)
- `thumbnail_url`, `thumbnail_s3_key`

---

## PATCH /api/admin/exercicios/:id/ativar

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Exercício ativado." }
```

**Erros:** `401`, `403`, `404`

---

## PATCH /api/admin/exercicios/:id/desativar

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Exercício desativado." }
```

**Erros:** `401`, `403`, `404`
