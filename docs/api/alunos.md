# Alunos — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| GET | `/api/admin/alunos` | admin |
| POST | `/api/admin/alunos` | admin |
| GET | `/api/admin/alunos/:id` | admin |
| PUT | `/api/admin/alunos/:id` | admin |
| PATCH | `/api/admin/alunos/:id/ativar` | admin |
| PATCH | `/api/admin/alunos/:id/desativar` | admin |
| PATCH | `/api/admin/alunos/:id/senha` | admin |
| GET | `/api/admin/alunos/:id/medidas` | admin |
| POST | `/api/admin/alunos/:id/medidas` | admin |
| GET | `/api/admin/alunos/:id/medidas/:medidaId` | admin |
| PUT | `/api/admin/alunos/:id/medidas/:medidaId` | admin |
| DELETE | `/api/admin/alunos/:id/medidas/:medidaId` | admin |
| GET | `/api/admin/alunos/:id/fotos` | admin |
| PATCH | `/api/admin/alunos/:id/liberar-fotos` | admin |
| DELETE | `/api/admin/alunos/:alunoId/fotos/:fotoId` | admin |

---

## GET /api/admin/alunos

**Auth:** Bearer token
**Role:** admin

**Query params (opcionais):**
- `ativo` — `true | false` (padrão: `true`)
- `busca` — string (filtra por nome ou email)
- `page` — número da página (padrão: 1)
- `limit` — itens por página (padrão: 20)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "nome": "string",
      "email": "string",
      "telefone": "string",
      "ativo": true,
      "status": "neutro | em_dia | inadimplente | inativo",
      "dias_tolerancia": 7,
      "periodicidade_dias": 30,
      "created_at": "timestamp"
    }
  ],
  "total": 42,
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
    "id": "uuid", "user_id": "uuid", "nome": "string", "email": "string",
    "telefone": "string", "ativo": true,
    "status": "neutro | em_dia | inadimplente | inativo",
    "dias_tolerancia": 7,
    "periodicidade_dias": 30,
    "created_at": "timestamp"
  }],
  "total": 42, "page": 1, "limit": 20
}
```
**Query params:** `ativo` (bool, default `true`), `busca` (string), `page`, `limit`

**`status` calculado dinamicamente no SQL — use para colorir badges:**
- `em_dia` → verde
- `inadimplente` → vermelho
- `neutro` (sem fatura ainda) → cinza neutro
- `inativo` → cinza apagado

> Importante: o front nunca deve recalcular esse status — sempre confie no campo.

---

## POST /api/admin/alunos

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "nome": "string",
  "email": "string",
  "senha": "string (mín. 8 chars)",
  "telefone": "string?",
  "data_nascimento": "date?",
  "sexo": "M | F | outro | null",
  "objetivo": "string?",
  "restricoes": "string?",
  "lesoes": "string?",
  "dias_tolerancia": "int (default 7)",
  "periodicidade_dias": "int (default 30)"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "nome": "string",
  "email": "string",
  "dias_tolerancia": 7,
  "periodicidade_dias": 30,
  "created_at": "timestamp"
}
```

**Erros:**
- `400` — Campos obrigatórios ausentes ou e-mail já cadastrado
- `401` — Não autenticado
- `403` — Perfil sem permissão

### Shape UI

**Body:**
```json
{
  "nome": "string", "email": "string", "senha": "string (>=8)",
  "telefone": "string?", "data_nascimento": "date?", "sexo": "M|F|outro|null",
  "objetivo": "string?", "restricoes": "string?", "lesoes": "string?",
  "dias_tolerancia": 7, "periodicidade_dias": 30
}
```
**Response:**
```json
{
  "id": "uuid", "user_id": "uuid", "nome": "string", "email": "string",
  "dias_tolerancia": 7, "periodicidade_dias": 30, "created_at": "timestamp"
}
```

---

## GET /api/admin/alunos/:id

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "nome": "string",
  "email": "string",
  "telefone": "string",
  "data_nascimento": "date",
  "sexo": "M | F | outro",
  "objetivo": "string",
  "restricoes": "string",
  "lesoes": "string",
  "observacoes": "string",
  "ativo": true,
  "status": "neutro | em_dia | inadimplente | inativo",
  "dias_tolerancia": 7,
  "periodicidade_dias": 30,
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "ultima_medicao": {
    "data_medicao": "date",
    "peso_kg": 80.5,
    "percentual_gordura": 18.2,
    "peso_magro_kg": 65.9,
    "peso_gordo_kg": 14.6
  }
}
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

### Shape UI

```json
{
  "id": "uuid", "user_id": "uuid", "nome": "string", "email": "string",
  "telefone": "string", "data_nascimento": "date", "sexo": "M|F|outro",
  "objetivo": "string", "restricoes": "string", "lesoes": "string",
  "observacoes": "string", "ativo": true,
  "status": "neutro | em_dia | inadimplente | inativo",
  "dias_tolerancia": 7, "periodicidade_dias": 30,
  "ultima_medicao": {
    "data_medicao": "date", "peso_kg": 80.5, "percentual_gordura": 18.2,
    "peso_magro_kg": 65.9, "peso_gordo_kg": 14.6
  },
  "created_at": "timestamp", "updated_at": "timestamp"
}
```

---

## PUT /api/admin/alunos/:id

**Auth:** Bearer token
**Role:** admin

**Body (todos opcionais):**
```json
{
  "nome": "string?",
  "telefone": "string?",
  "data_nascimento": "date?",
  "sexo": "M | F | outro | null",
  "objetivo": "string?",
  "restricoes": "string?",
  "lesoes": "string?",
  "observacoes": "string?",
  "dias_tolerancia": "int?",
  "periodicidade_dias": "int?"
}
```

**Response 200:**
```json
{ "message": "Aluno atualizado com sucesso." }
```

**Erros:**
- `400` — Dados inválidos
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

### Shape UI

Todos os campos do POST opcionais (sem `email` e `senha`). Retorna `{ "message": "Aluno atualizado com sucesso." }`.

---

## PATCH /api/admin/alunos/:id/ativar

**Auth:** Bearer token
**Role:** admin

**Body:** vazio

**Response 200:**
```json
{ "message": "Aluno ativado com sucesso." }
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

### Shape UI

Body vazio. Retorna `{ "message": "..." }`. Em desativar, o servidor adiciona o `user_id` à blacklist do Redis por 7 dias — sessões ativas do aluno são derrubadas no próximo request.

---

## PATCH /api/admin/alunos/:id/desativar

**Auth:** Bearer token
**Role:** admin

**Body:** vazio

**Response 200:**
```json
{ "message": "Aluno desativado com sucesso." }
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

### Shape UI

Body vazio. Retorna `{ "message": "..." }`. Em desativar, o servidor adiciona o `user_id` à blacklist do Redis por 7 dias — sessões ativas do aluno são derrubadas no próximo request.

---

## PATCH /api/admin/alunos/:id/senha

**Auth:** Bearer token
**Role:** admin

Redefine a senha do usuário vinculado ao aluno. A senha é re-hasheada com bcrypt (cost 12). Sessões existentes do aluno continuam válidas até o access token expirar — apenas o login com a senha antiga deixa de funcionar.

**Body:**
```json
{ "senha": "string (mín. 8 chars)" }
```

**Response 200:**
```json
{ "message": "Senha redefinida com sucesso." }
```

**Erros:**
- `400` — Senha ausente ou com menos de 8 caracteres
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

### Shape UI

**Body:** `{ "senha": "string (>=8)" }`. Re-hash com bcrypt cost 12. Sessões já ativas continuam até o access token expirar.

---

## GET /api/admin/alunos/:id/medidas

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
[
  {
    "id": "uuid",
    "data_medicao": "date",
    "peso_kg": 80.5,
    "altura_cm": 175.0,
    "percentual_gordura": 18.2,
    "peso_magro_kg": 65.9,
    "peso_gordo_kg": 14.6,
    "cintura_cm": 82.0,
    "quadril_cm": 95.0,
    "torax_cm": 100.0,
    "braco_dir_cm": 34.0,
    "braco_esq_cm": 33.5,
    "antebraco_dir_cm": 27.0,
    "antebraco_esq_cm": 26.5,
    "coxa_dir_cm": 56.0,
    "coxa_esq_cm": 55.5,
    "panturrilha_dir_cm": 37.0,
    "panturrilha_esq_cm": 36.5,
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

Array ordenado por `data_medicao DESC`. Campos: todos de `aluno_medidas` + `created_at`.

---

## POST /api/admin/alunos/:id/medidas

**Auth:** Bearer token
**Role:** admin

**Body (todos opcionais exceto data_medicao):**
```json
{
  "data_medicao": "date",
  "peso_kg": 80.5,
  "altura_cm": 175.0,
  "percentual_gordura": 18.2,
  "peso_magro_kg": 65.9,
  "peso_gordo_kg": 14.6,
  "cintura_cm": 82.0,
  "quadril_cm": 95.0,
  "torax_cm": 100.0,
  "braco_dir_cm": 34.0,
  "braco_esq_cm": 33.5,
  "antebraco_dir_cm": 27.0,
  "antebraco_esq_cm": 26.5,
  "coxa_dir_cm": 56.0,
  "coxa_esq_cm": 55.5,
  "panturrilha_dir_cm": 37.0,
  "panturrilha_esq_cm": 36.5,
  "observacoes": "string?"
}
```

**Response 201:**
```json
{ "id": "uuid", "data_medicao": "date", "created_at": "timestamp" }
```

**Erros:**
- `400` — data_medicao ausente
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

### Shape UI

```json
{ "id": "uuid", "data_medicao": "date", "created_at": "timestamp" }
```

---

## GET /api/admin/alunos/:id/medidas/:medidaId

**Auth:** Bearer token
**Role:** admin

Retorna uma medição específica do aluno. O `:id` valida o vínculo entre a medição e o aluno (evita acesso cruzado).

**Response 200:** objeto completo da medição (mesmos campos do POST + `id`, `created_at`, `updated_at`).

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Medição não encontrada ou não pertence ao aluno

### Shape UI

Objeto completo da medição. `404` se `medidaId` não pertencer ao `:id` informado.

---

## PUT /api/admin/alunos/:id/medidas/:medidaId

**Auth:** Bearer token
**Role:** admin

**Body:** mesmo schema do `POST /alunos/:id/medidas` (todos os campos opcionais).

**Response 200:**
```json
{ "message": "Medição atualizada." }
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Medição não encontrada ou não pertence ao aluno

### Shape UI

Mesmo schema do POST (todos os campos opcionais). Retorna `{ "message": "Medição atualizada." }`.

---

## DELETE /api/admin/alunos/:id/medidas/:medidaId

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Medição removida." }
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Medição não encontrada ou não pertence ao aluno

### Shape UI

Retorna `{ "message": "Medição removida." }`.

---

## GET /api/admin/alunos/:id/fotos

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
[
  {
    "id": "uuid",
    "url": "string",
    "posicao": "frente | costas | lado_dir | lado_esq",
    "data_foto": "date",
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
  "id": "uuid", "url": "string", "s3_key": "string",
  "posicao": "frente|costas|lado_dir|lado_esq",
  "data_foto": "date", "created_at": "timestamp"
}]
```

---

## PATCH /api/admin/alunos/:id/liberar-fotos

**Auth:** Bearer token
**Role:** admin

Libera ou bloqueia o envio de fotos de progresso pelo aluno. Quando bloqueado, o `POST /api/aluno/fotos` responde `403`.

**Body:**
```json
{ "liberado": true }
```

**Response 200:**
```json
{
  "message": "Envio de fotos liberado.",
  "envio_fotos_liberado": true
}
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

> Observação: o upload de fotos do aluno só ocorre via `POST /api/aluno/fotos` (rota self-service). Não existe endpoint admin para upload de fotos do aluno.

### Shape UI

Libera/bloqueia o upload de fotos pelo aluno.
**Body:** `{ "liberado": true }`
**Response:** `{ "message": "...", "envio_fotos_liberado": true }`

> Não existe endpoint admin para fazer upload de foto do aluno — o upload é feito apenas pelo próprio aluno em `POST /api/aluno/fotos` quando liberado.

---

## DELETE /api/admin/alunos/:alunoId/fotos/:fotoId

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Foto removida com sucesso." }
```

**Erros:**
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Foto ou aluno não encontrado

### Shape UI

Remove a foto no banco e o arquivo correspondente no S3. Retorna `{ "message": "Foto removida com sucesso." }`.
