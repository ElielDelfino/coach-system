# Protocolos — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| GET | `/api/admin/alunos/:id/protocolos` | admin |
| POST | `/api/admin/alunos/:id/protocolos` | admin |
| GET | `/api/admin/protocolos/:id` | admin |
| PUT | `/api/admin/protocolos/:id` | admin |
| PATCH | `/api/admin/protocolos/:id/ativar` | admin |
| PATCH | `/api/admin/protocolos/:id/desativar` | admin |
| DELETE | `/api/admin/protocolos/:id` | admin |
| GET | `/api/admin/protocolos/:id/pdf` | admin |
| POST | `/api/admin/protocolos/:id/enviar-pdf` | admin |

---

## GET /api/admin/alunos/:id/protocolos

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
[
  {
    "id": "uuid",
    "nome": "string",
    "fase": "cutting | bulking | manutencao | recomposicao",
    "data_inicio": "date",
    "data_fim": "date",
    "ativo": true,
    "modulo_alimentar": true,
    "modulo_treino": true,
    "modulo_cardio": false,
    "modulo_suplementacao": true
  }
]
```

**Erros:** `401`, `403`, `404`

### Shape UI

```json
[{
  "id":"uuid","nome":"string","objetivo":"string",
  "fase":"cutting|bulking|manutencao|recomposicao",
  "data_inicio":"date","data_fim":"date","ativo":true,
  "modulo_alimentar":true,"modulo_treino":true,
  "modulo_cardio":false,"modulo_suplementacao":true
}]
```

---

## POST /api/admin/alunos/:id/protocolos

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "nome": "string",
  "objetivo": "string?",
  "fase": "cutting | bulking | manutencao | recomposicao",
  "data_inicio": "date?",
  "data_fim": "date?",
  "modulo_alimentar": false,
  "modulo_treino": false,
  "modulo_cardio": false,
  "modulo_suplementacao": false,
  "observacoes": "string?"
}
```

**Response 201:**
```json
{ "id": "uuid", "nome": "string", "created_at": "timestamp" }
```

**Erros:**
- `400` — nome ausente ou datas inválidas
- `401`, `403`, `404`

---

## GET /api/admin/protocolos/:id

**Auth:** Bearer token
**Role:** admin

**Response 200:** objeto completo do protocolo

**Erros:** `401`, `403`, `404`

### Shape UI

Objeto completo do protocolo com todos os campos.

---

## PUT /api/admin/protocolos/:id

**Auth:** Bearer token
**Role:** admin

**Body:** mesmo schema do POST (todos opcionais)

**Response 200:**
```json
{ "message": "Protocolo atualizado com sucesso." }
```

**Erros:** `400`, `401`, `403`, `404`

### Shape UI

Body com schema do POST (todos opcionais). Retorna `{ "message": "Protocolo atualizado com sucesso." }`.

---

## PATCH /api/admin/protocolos/:id/ativar

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Protocolo ativado." }
```

**Erros:** `401`, `403`, `404`

### Shape UI

Body vazio. Retorna `{ "message": "Protocolo ativado." | "Protocolo desativado." }`.

---

## PATCH /api/admin/protocolos/:id/desativar

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Protocolo desativado." }
```

**Erros:** `401`, `403`, `404`

### Shape UI

Body vazio. Retorna `{ "message": "Protocolo ativado." | "Protocolo desativado." }`.

---

## DELETE /api/admin/protocolos/:id

**Auth:** Bearer token
**Role:** admin

Remove o protocolo definitivamente. Em cascata: refeições, itens, substitutos, treinos, exercícios do treino e suplementação.

**Response 200:**
```json
{ "message": "Protocolo removido." }
```

**Erros:** `401`, `403`, `404`

### Shape UI

Cascata: refeições, itens, substitutos, treinos, exercícios do treino, suplementação. Retorna `{ "message": "Protocolo removido." }`.

---

## GET /api/admin/protocolos/:id/pdf

**Auth:** Bearer token
**Role:** admin

Gera o PDF completo do protocolo (cabeçalho com dados físicos + alimentação + treinos + suplementação, conforme módulos habilitados) e retorna o arquivo binário para download direto no navegador.

**Response 200:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="protocolo-<slug>.pdf"`
- Body: bytes do PDF.

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Protocolo ou aluno do protocolo não encontrado
- `500` — Falha ao gerar PDF (Puppeteer)

### Shape UI

Download direto do PDF do protocolo. `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="protocolo-<slug>.pdf"`.

> Front deve disparar o download com `axios({ responseType: 'blob' })` ou abrir em nova aba.

---

## POST /api/admin/protocolos/:id/enviar-pdf

**Auth:** Bearer token
**Role:** admin

Gera o PDF completo do protocolo (cabeçalho com dados físicos + alimentação + treinos + suplementação + observações, conforme os módulos habilitados) e envia para o email cadastrado do aluno via Resend. O conteúdo é montado a partir do estado atual do protocolo e da última medição registrada do aluno.

**Body:** vazio

**Response 200:**
```json
{ "message": "Protocolo enviado para email@aluno.com" }
```

**Erros:**
- `400` — Aluno sem email cadastrado
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Protocolo (ou aluno do protocolo) não encontrado
- `500` — Falha ao gerar PDF (Puppeteer) ou enviar email (Resend); a mensagem descreve a origem

### Shape UI

Body vazio. Gera o PDF e envia para o email cadastrado do aluno via Resend.
Retorna `{ "message": "Protocolo enviado para email@aluno.com" }`. Erros típicos: `400` (aluno sem email), `500` (falha Puppeteer/Resend — mensagem indica a origem).
