# Aluno (Self-Service) — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

> Todas as rotas abaixo retornam apenas dados do aluno autenticado. O `aluno_id` é extraído do JWT — nunca exposto como parâmetro de URL.

> Todas as rotas usam o `aluno_id` do JWT — nunca exposto como parâmetro.
> O middleware bloqueia o acesso quando o aluno está inativo (`403 code: "INATIVO"`) ou inadimplente (`403 code: "INADIMPLENTE"`). O front deve tratar esses códigos para exibir tela específica de bloqueio.

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| GET | `/api/aluno/perfil` | aluno |
| GET | `/api/aluno/medidas` | aluno |
| GET | `/api/aluno/evolucao` | aluno |
| GET | `/api/aluno/fotos` | aluno |
| POST | `/api/aluno/fotos` | aluno |
| GET | `/api/aluno/pagamentos` | aluno |
| GET | `/api/aluno/faturas` | aluno |
| GET | `/api/aluno/protocolos` | aluno |
| GET | `/api/aluno/protocolos/:id` | aluno |
| GET | `/api/aluno/protocolos/:id/pdf` | aluno |
| GET | `/api/aluno/protocolos/:id/refeicoes` | aluno |
| GET | `/api/aluno/protocolos/:id/treinos` | aluno |
| GET | `/api/aluno/protocolos/:id/suplementacao` | aluno |

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

### Shape UI

```json
{
  "id": "uuid", "nome": "string", "email": "string",
  "telefone": "string", "data_nascimento": "date", "sexo": "M|F|outro",
  "objetivo": "string", "restricoes": "string", "lesoes": "string",
  "ativo": true,
  "status": "neutro | em_dia | inadimplente | inativo",
  "dias_tolerancia": 7, "periodicidade_dias": 30
}
```

---

## GET /api/aluno/medidas

**Auth:** Bearer token
**Role:** aluno

**Response 200:** mesmo formato de `GET /api/admin/alunos/:id/medidas`

**Erros:** `401`, `403`

### Shape UI

Mesmo formato de `GET /api/admin/alunos/:id/medidas`.

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

### Shape UI

Série cronológica de medições do aluno autenticado, usada nos gráficos da aba "Minhas Medidas".
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
- `data` em `YYYY-MM-DD`, ordenação ascendente.
- Campos numéricos podem vir `null`.
- Front usa três visões alternáveis: Peso (ComposedChart com peso total, magro e gordo), %BF (AreaChart com `ReferenceLine` no valor inicial) e Medidas (LineChart com cintura/quadril/braço/coxa).

---

## GET /api/aluno/fotos

**Auth:** Bearer token
**Role:** aluno

**Response 200:** mesmo formato de `GET /api/admin/alunos/:id/fotos`

**Erros:** `401`, `403`

### Shape UI

Mesmo formato de `GET /api/admin/alunos/:id/fotos`.

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

### Shape UI

- `Content-Type: multipart/form-data`
- Fields: `foto` (file, JPG/PNG/WebP, máx. 15MB) e `posicao` (`frente|costas|lado_dir|lado_esq`).
- Só funciona se o admin tiver chamado `PATCH /alunos/:id/liberar-fotos` com `liberado: true`. Caso contrário: `403 "Envio de fotos não liberado pelo professor."`.
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

### Shape UI

```json
[{ "id":"uuid","valor":150.00,"data_pagamento":"date","metodo":"pix","vencimento":"date" }]
```

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

### Shape UI

```json
[{
  "id": "uuid",
  "valor": 150.00,
  "data_vencimento": "date",
  "status": "pendente | pago | vencido",
  "data_baixa": "date | null",
  "desconto_tipo": "valor | percentual | null",
  "desconto_valor": "number | null",
  "valor_final": "number"
}]
```

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

### Shape UI

Mesmo formato de `GET /api/admin/alunos/:id/protocolos`.

---

## GET /api/aluno/protocolos/:id

**Auth:** Bearer token
**Role:** aluno

**Response 200:** objeto completo do protocolo (apenas se pertencer ao aluno autenticado)

**Erros:**
- `401` — Não autenticado
- `403` — Protocolo não pertence ao aluno autenticado
- `404` — Protocolo não encontrado

### Shape UI

Objeto completo. Retorna `403` se o protocolo não pertencer ao aluno autenticado.

---

## GET /api/aluno/protocolos/:id/pdf

**Auth:** Bearer token
**Role:** aluno

Gera o PDF do protocolo (apenas se pertencer ao aluno autenticado) e devolve o arquivo binário para download.

**Response 200:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="protocolo-<slug>.pdf"`
- Body: bytes do PDF.

**Erros:**
- `401` — Não autenticado
- `403` — Protocolo não pertence ao aluno autenticado
- `404` — Protocolo não encontrado
- `500` — Falha ao gerar PDF

### Shape UI

Download direto do PDF do próprio protocolo. `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="protocolo-<slug>.pdf"`. `403` se o protocolo não pertencer ao aluno.

---

## GET /api/aluno/protocolos/:id/refeicoes

**Auth:** Bearer token
**Role:** aluno

**Response 200:** mesmo formato de `GET /api/admin/protocolos/:id/refeicoes`

**Erros:** `401`, `403`, `404`

### Shape UI

Mesmo formato de `GET /api/admin/protocolos/:id/refeicoes` (com totais e substitutos).

---

## GET /api/aluno/protocolos/:id/treinos

**Auth:** Bearer token
**Role:** aluno

**Response 200:** mesmo formato de `GET /api/admin/protocolos/:id/treinos`

**Erros:** `401`, `403`, `404`

### Shape UI

Mesmo formato de `GET /api/admin/protocolos/:id/treinos`.

---

## GET /api/aluno/protocolos/:id/suplementacao

**Auth:** Bearer token
**Role:** aluno

**Response 200:** mesmo formato de `GET /api/admin/protocolos/:id/suplementacao`

**Erros:** `401`, `403`, `404`

### Shape UI

Mesmo formato de `GET /api/admin/protocolos/:id/suplementacao`.
