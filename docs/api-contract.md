# Coach System — Contrato de API

> **Base URL:** `/api`
> **Auth:** Bearer token no header `Authorization: Bearer <access_token>`
> **Refresh token:** cookie httpOnly `refreshToken`
> Todo erro retorna `{ "message": "string" }`.

---

## Sumário de rotas

| Módulo | Prefixo |
|---|---|
| Autenticação | `/api/auth` |
| Admin → Dashboard | `/api/admin/dashboard` |
| Admin → Alunos | `/api/admin/alunos` |
| Admin → Pagamentos | `/api/admin/pagamentos` e `/api/admin/alunos/:id/pagamentos` |
| Admin → Faturas | `/api/admin/faturas/:id` e `/api/admin/alunos/:id/faturas` |
| Admin → Exercícios | `/api/admin/exercicios` |
| Admin → Alimentos | `/api/admin/alimentos` |
| Admin → Cardio | `/api/admin/cardio` |
| Admin → Protocolos | `/api/admin/protocolos` e `/api/admin/alunos/:id/protocolos` |
| Admin → Refeições | `/api/admin/refeicoes` e `/api/admin/protocolos/:id/refeicoes` |
| Admin → Treinos | `/api/admin/treinos` e `/api/admin/protocolos/:id/treinos` |
| Admin → Suplementação | `/api/admin/suplementacao` e `/api/admin/protocolos/:id/suplementacao` |
| Aluno (self) | `/api/aluno` |

---

# AUTENTICAÇÃO

---

## POST /api/auth/login

**Auth:** Nenhum
**Role:** público

**Body:**
```json
{
  "email": "string",
  "senha": "string"
}
```

**Response 200:**
```json
{
  "accessToken": "string (JWT, expira em 1h)",
  "user": {
    "id": "uuid",
    "email": "string",
    "role": "admin | aluno"
  }
}
```
Cookie `refreshToken` (httpOnly, SameSite=Strict) definido automaticamente.

**Erros:**
- `400` — Body inválido (campo ausente)
- `401` — Credenciais inválidas
- `403` — Conta desativada

---

## POST /api/auth/refresh

**Auth:** Cookie `refreshToken` (httpOnly)
**Role:** público

**Body:** vazio

**Response 200:**
```json
{
  "accessToken": "string (novo JWT)"
}
```

**Erros:**
- `401` — Refresh token ausente, expirado ou na blacklist do Redis

---

## POST /api/auth/logout

**Auth:** Bearer token
**Role:** admin | aluno

**Body:** vazio

**Response 200:**
```json
{ "message": "Sessão encerrada com sucesso." }
```
Cookie `refreshToken` removido. Access token adicionado à blacklist do Redis até seu vencimento.

**Erros:**
- `401` — Token inválido ou ausente

---

# ADMIN — DASHBOARD

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

---

# ADMIN — ALUNOS

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

---

## POST /api/admin/alunos/:id/fotos

**Auth:** Bearer token
**Role:** admin

**Body:**
```json
{
  "url": "string",
  "posicao": "frente | costas | lado_dir | lado_esq",
  "data_foto": "date?"
}
```

**Response 201:**
```json
{ "id": "uuid", "url": "string", "posicao": "string", "data_foto": "date" }
```

**Erros:**
- `400` — url ausente ou posição inválida
- `401` — Não autenticado
- `403` — Perfil sem permissão
- `404` — Aluno não encontrado

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

---

# ADMIN — PAGAMENTOS

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

---

# ADMIN — FATURAS

> Faturas substituem o modelo antigo de pagamentos. O status do aluno (`em_dia`, `inadimplente`, `neutro`, `inativo`) é calculado dinamicamente a partir das faturas e do campo `ativo`/`dias_tolerancia`. A baixa é registrada via `PATCH /faturas/:id/baixa`.

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

---

# ADMIN — EXERCÍCIOS

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

---

# ADMIN — ALIMENTOS

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

---

# ADMIN — CARDIO

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

---

# ADMIN — PROTOCOLOS

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

---

## PATCH /api/admin/protocolos/:id/ativar

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Protocolo ativado." }
```

**Erros:** `401`, `403`, `404`

---

## PATCH /api/admin/protocolos/:id/desativar

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Protocolo desativado." }
```

**Erros:** `401`, `403`, `404`

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

---

# ADMIN — REFEIÇÕES

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

---

## DELETE /api/admin/refeicoes/:refeicaoId/itens/:itemId/substitutos/:substitutoId

**Auth:** Bearer token
**Role:** admin

**Response 200:**
```json
{ "message": "Substituto removido." }
```

**Erros:** `401`, `403`, `404`

---

# ADMIN — TREINOS

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

---

# ADMIN — SUPLEMENTAÇÃO

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

---

# ALUNO — ROTAS SELF-SERVICE

> Todas as rotas abaixo retornam apenas dados do aluno autenticado. O `aluno_id` é extraído do JWT — nunca exposto como parâmetro de URL.

---

## GET /api/aluno/perfil

**Auth:** Bearer token
**Role:** aluno

**Response 200:**
```json
{
  "id": "uuid",
  "nome": "string",
  "email": "string",
  "telefone": "string",
  "data_nascimento": "date",
  "sexo": "M | F | outro",
  "objetivo": "string",
  "restricoes": "string",
  "lesoes": "string",
  "ativo": true,
  "status": "neutro | em_dia | inadimplente | inativo",
  "dias_tolerancia": 7,
  "periodicidade_dias": 30
}
```

**Erros:**
- `401` — Não autenticado
- `403` — Conta desativada ou inadimplente (`code: "INATIVO" | "INADIMPLENTE"`)

---

## GET /api/aluno/medidas

**Auth:** Bearer token
**Role:** aluno

**Response 200:** mesmo formato de `GET /api/admin/alunos/:id/medidas`

**Erros:** `401`, `403`

---

## GET /api/aluno/evolucao

**Auth:** Bearer token
**Role:** aluno

Série de medições do aluno autenticado, ordenada cronologicamente para uso em gráficos.

**Response 200:**
```json
{
  "evolucao": [
    {
      "data": "2026-01-15",
      "peso_kg": 85.0,
      "percentual_gordura": 22.0,
      "peso_magro_kg": 66.3,
      "peso_gordo_kg": 18.7,
      "cintura_cm": 88.0,
      "quadril_cm": 102.0,
      "braco_dir_cm": 34.0,
      "braco_esq_cm": 33.5,
      "coxa_dir_cm": 58.0,
      "coxa_esq_cm": 57.5
    }
  ]
}
```

Notas:
- `data` no formato `YYYY-MM-DD`; ordenação cronológica ascendente.
- Campos numéricos podem vir `null` quando não foram preenchidos na medição.
- O `aluno_id` é resolvido a partir do JWT; nunca aceita parâmetro.

**Erros:** `401`, `403`

---

## GET /api/aluno/fotos

**Auth:** Bearer token
**Role:** aluno

**Response 200:** mesmo formato de `GET /api/admin/alunos/:id/fotos`

**Erros:** `401`, `403`

---

## POST /api/aluno/fotos

**Auth:** Bearer token
**Role:** aluno
**Content-Type:** `multipart/form-data`

**Fields:**
- `foto` (file) — JPG/PNG/WebP, máx. 15MB
- `posicao` (string) — `frente | costas | lado_dir | lado_esq`

**Response 201:**
```json
{
  "id": "uuid",
  "url": "https://coach-system-uploads.s3.us-east-1.amazonaws.com/alunos/fotos/...",
  "s3_key": "alunos/fotos/{uuid}.jpg",
  "posicao": "frente",
  "data_foto": "date",
  "created_at": "timestamp"
}
```

**Erros:**
- `400` — arquivo ausente, tipo inválido ou tamanho excedido
- `401`, `403`

---

## GET /api/aluno/pagamentos

**Auth:** Bearer token
**Role:** aluno

**Response 200:**
```json
[
  {
    "id": "uuid",
    "valor": 150.00,
    "data_pagamento": "date",
    "metodo": "pix",
    "vencimento": "date"
  }
]
```

**Erros:** `401`, `403`

---

## GET /api/aluno/faturas

**Auth:** Bearer token
**Role:** aluno

**Response 200:**
```json
[
  {
    "id": "uuid",
    "valor": 150.00,
    "data_vencimento": "date",
    "status": "pendente | pago | vencido",
    "data_baixa": "date | null",
    "desconto_tipo": "valor | percentual | null",
    "desconto_valor": "number | null",
    "valor_final": "number"
  }
]
```

**Erros:** `401`, `403`

---

## GET /api/aluno/protocolos

**Auth:** Bearer token
**Role:** aluno

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

**Erros:** `401`, `403`

---

## GET /api/aluno/protocolos/:id

**Auth:** Bearer token
**Role:** aluno

**Response 200:** objeto completo do protocolo (apenas se pertencer ao aluno autenticado)

**Erros:**
- `401` — Não autenticado
- `403` — Protocolo não pertence ao aluno autenticado
- `404` — Protocolo não encontrado

---

## GET /api/aluno/protocolos/:id/refeicoes

**Auth:** Bearer token
**Role:** aluno

**Response 200:** mesmo formato de `GET /api/admin/protocolos/:id/refeicoes`

**Erros:** `401`, `403`, `404`

---

## GET /api/aluno/protocolos/:id/treinos

**Auth:** Bearer token
**Role:** aluno

**Response 200:** mesmo formato de `GET /api/admin/protocolos/:id/treinos`

**Erros:** `401`, `403`, `404`

---

## GET /api/aluno/protocolos/:id/suplementacao

**Auth:** Bearer token
**Role:** aluno

**Response 200:** mesmo formato de `GET /api/admin/protocolos/:id/suplementacao`

**Erros:** `401`, `403`, `404`
