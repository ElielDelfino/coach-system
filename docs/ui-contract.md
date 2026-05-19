# Coach System — Contrato UI

> Documento para o agente-ui (Fase 3). Descreve o que o front-end recebe de cada rota implementada no back-end.
> Base URL: `/api` | Auth: `Authorization: Bearer <accessToken>` | Cookie: `refreshToken` httpOnly

---

## AUTENTICAÇÃO

### POST /api/auth/login
Retorna o `accessToken` no body — front-end deve guardar **em memória** (nunca em localStorage).
```json
{
  "accessToken": "string",
  "user": { "id": "uuid", "email": "string", "role": "admin | aluno" }
}
```
Cookie `refreshToken` definido automaticamente pelo servidor.

### POST /api/auth/refresh
Chame quando o `accessToken` expirar (interceptor Axios 401).
```json
{ "accessToken": "string" }
```

### POST /api/auth/logout
Limpa cookie do servidor. Front-end deve descartar o `accessToken` da memória.
```json
{ "message": "Sessão encerrada com sucesso." }
```

---

## ADMIN — DASHBOARD

### GET /api/admin/dashboard/evolucao
Evolução agregada da base nos últimos 90 dias (médias por dia).
```json
{
  "evolucao": [
    { "data": "2026-01-15", "media_peso_kg": 82.3, "media_percentual_gordura": 18.5, "total_alunos_medidos": 12 }
  ]
}
```
- `data` formato `YYYY-MM-DD`, ordem cronológica ascendente.
- Valores numéricos com 1 casa decimal; podem vir `null`.
- Front exibe um `LineChart` (peso médio) e um `AreaChart` (%BF médio) — eixo X formatado como `DD/MM`.

### GET /api/admin/dashboard/resumo
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
- `ativos | inadimplentes | neutros` cobrem apenas alunos com `ativo = true`.
- `receita_mes` = soma do valor final das faturas pagas no mês corrente.
- `a_receber_mes` = soma do valor final das faturas pendentes com `data_vencimento` no mês.
- `alunos_sem_medicao_30d` alimenta o card de alerta amarelo no dashboard.

---

## ADMIN — ALUNOS

### GET /api/admin/alunos
```json
{
  "data": [{
    "id": "uuid", "user_id": "uuid", "nome": "string", "email": "string",
    "telefone": "string", "ativo": true,
    "vencimento_plano": "date | null",
    "status": "ativo | inadimplente | inativo",
    "created_at": "timestamp"
  }],
  "total": 42, "page": 1, "limit": 20
}
```
**Query params:** `ativo` (bool, default `true`), `busca` (string), `page`, `limit`

**`status` calculado dinamicamente — use para colorir badges:**
- `ativo` → verde
- `inadimplente` → vermelho
- `inativo` → cinza

### POST /api/admin/alunos → 201
```json
{ "id": "uuid", "user_id": "uuid", "nome": "string", "email": "string", "created_at": "timestamp" }
```

### GET /api/admin/alunos/:id
```json
{
  "id": "uuid", "user_id": "uuid", "nome": "string", "email": "string",
  "telefone": "string", "data_nascimento": "date", "sexo": "M | F | outro",
  "objetivo": "string", "restricoes": "string", "lesoes": "string",
  "observacoes": "string", "ativo": true,
  "status": "ativo | inadimplente | inativo",
  "vencimento_plano": "date | null",
  "ultima_medicao": {
    "data_medicao": "date", "peso_kg": 80.5, "percentual_gordura": 18.2,
    "peso_magro_kg": 65.9, "peso_gordo_kg": 14.6
  },
  "created_at": "timestamp", "updated_at": "timestamp"
}
```

### GET /api/admin/alunos/:id/medidas
Array ordenado por `data_medicao DESC`. Campos: todos de `aluno_medidas` + `created_at`.

### POST /api/admin/alunos/:id/medidas → 201
```json
{ "id": "uuid", "data_medicao": "date", "created_at": "timestamp" }
```

### GET /api/admin/alunos/:id/fotos
```json
[{ "id": "uuid", "url": "string", "posicao": "frente|costas|lado_dir|lado_esq", "data_foto": "date", "created_at": "timestamp" }]
```

### POST /api/admin/alunos/:id/fotos → 201
```json
{ "id": "uuid", "url": "string", "posicao": "string", "data_foto": "date" }
```

---

## ADMIN — PAGAMENTOS

### GET /api/admin/pagamentos
```json
{
  "data": [{
    "id": "uuid", "aluno_id": "uuid", "nome_aluno": "string",
    "valor": 150.00, "data_pagamento": "date", "metodo": "string",
    "vencimento": "date", "registrado_por": "uuid",
    "observacoes": "string", "created_at": "timestamp"
  }],
  "total": 10, "page": 1, "limit": 20
}
```
**Query params:** `aluno_id`, `vencendo_em` (int: dias), `page`, `limit`

### GET /api/admin/alunos/:id/pagamentos
Array de pagamentos do aluno (sem `nome_aluno`).

### POST /api/admin/alunos/:id/pagamentos → 201
```json
{ "id": "uuid", "valor": 150.00, "data_pagamento": "date", "vencimento": "date", "created_at": "timestamp" }
```

---

## ADMIN — EXERCÍCIOS

### GET /api/admin/exercicios
```json
{ "data": [{ "id":"uuid","nome":"string","grupo_muscular":"string","equipamento":"string","nivel":"string","thumbnail_url":"string","ativo":true }], "total": 50 }
```
**Query params:** `grupo_muscular`, `nivel`, `ativo`, `busca`

### GET /api/admin/exercicios/:id
Objeto completo com: `video_url`, `observacoes_tecnicas`, `execucao_correta`, `execucao_errada`, `descanso_padrao_seg`, `series_recomendadas`, `repeticoes_recomendadas`, `cadencia`, `exercicio_substituto_id`.

---

## ADMIN — ALIMENTOS

### GET /api/admin/alimentos
```json
{ "data": [{ "id":"uuid","nome":"string","categoria":"string","quantidade_base":100,"unidade":"gramas","calorias":89.0,"proteinas":1.1,"carboidratos":22.8,"gorduras":0.3,"ativo":true }], "total": 200 }
```

### GET /api/admin/alimentos/:id
Objeto completo com: `fibra`, `sodio`, `foto_url`.

---

## ADMIN — CARDIO

### GET /api/admin/cardio
```json
{ "data": [{ "id":"uuid","tipo":"corrida","intensidade":"moderada","duracao_min":30,"gasto_calorico_estimado":300.0,"inclinacao":1.0,"velocidade":10.0,"ativo":true }], "total": 15 }
```

---

## ADMIN — PROTOCOLOS

### GET /api/admin/alunos/:id/protocolos
```json
[{ "id":"uuid","nome":"string","objetivo":"string","fase":"cutting|bulking|manutencao|recomposicao","data_inicio":"date","data_fim":"date","ativo":true,"modulo_alimentar":true,"modulo_treino":true,"modulo_cardio":false,"modulo_suplementacao":true }]
```

### GET /api/admin/protocolos/:id
Objeto completo do protocolo com todos os campos.

---

## ADMIN — REFEIÇÕES

### GET /api/admin/protocolos/:id/refeicoes
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

### POST /api/admin/refeicoes/:id/itens → 201
Macros já calculados e retornados:
```json
{ "id":"uuid","alimento_id":"uuid","quantidade_g":150.0,"kcal_calculado":200.0,"prot_calculado":15.0,"carb_calculado":20.0,"gord_calculado":5.0 }
```

### POST /api/admin/refeicoes/:id/duplicar → 201
```json
{ "id":"uuid","numero_refeicao":5,"nome":"string","created_at":"timestamp" }
```

### PATCH /api/admin/refeicoes/:refeicaoId/itens/reordenar
Body: `{ "ordem": [{ "id": "uuid", "ordem": 0 }, ...] }`

---

## ADMIN — TREINOS

### GET /api/admin/protocolos/:id/treinos
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

### PATCH /api/admin/treinos/:treinoId/exercicios/reordenar
Body: `{ "ordem": [{ "id": "uuid", "ordem": 0 }, ...] }`

---

## ADMIN — SUPLEMENTAÇÃO

### GET /api/admin/protocolos/:id/suplementacao
```json
[{ "id":"uuid","nome_suplemento":"Whey Protein","dose":"30g","horario":"Pós-treino","observacao":"string","ordem":0 }]
```

---

## ALUNO — SELF-SERVICE

> Todas as rotas usam o `aluno_id` do JWT — nunca exposto como parâmetro.

### GET /api/aluno/perfil
```json
{
  "id": "uuid", "nome": "string", "email": "string",
  "telefone": "string", "data_nascimento": "date", "sexo": "M|F|outro",
  "objetivo": "string", "restricoes": "string", "lesoes": "string",
  "ativo": true,
  "status": "ativo | inadimplente | inativo",
  "vencimento_plano": "date | null"
}
```

### GET /api/aluno/medidas
Mesmo formato de `GET /api/admin/alunos/:id/medidas`.

### GET /api/aluno/evolucao
Série cronológica de medições do aluno autenticado, usada nos gráficos da aba “Minhas Medidas”.
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

### GET /api/aluno/fotos
Mesmo formato de `GET /api/admin/alunos/:id/fotos`.

### GET /api/aluno/pagamentos
```json
[{ "id":"uuid","valor":150.00,"data_pagamento":"date","metodo":"pix","vencimento":"date" }]
```

### GET /api/aluno/protocolos
Mesmo formato de `GET /api/admin/alunos/:id/protocolos`.

### GET /api/aluno/protocolos/:id
Objeto completo. Retorna 403 se o protocolo não pertencer ao aluno autenticado.

### GET /api/aluno/protocolos/:id/refeicoes
Mesmo formato de `GET /api/admin/protocolos/:id/refeicoes` (com totais e substitutos).

### GET /api/aluno/protocolos/:id/treinos
Mesmo formato de `GET /api/admin/protocolos/:id/treinos`.

### GET /api/aluno/protocolos/:id/suplementacao
Mesmo formato de `GET /api/admin/protocolos/:id/suplementacao`.

---

## DECISÕES TÉCNICAS PARA O AGENTE-UI

1. **Token storage:** `accessToken` deve ficar **em memória** (variável de estado ou Context). Nunca em `localStorage` ou `sessionStorage`.

2. **Interceptor Axios 401:** quando qualquer chamada retornar 401, chame `POST /api/auth/refresh` automaticamente e reenvie a requisição original. Se o refresh também falhar, redirecione para `/login`.

3. **Campo `status`:** retornado em `GET /api/admin/alunos`, `GET /api/admin/alunos/:id` e `GET /api/aluno/perfil`. Use para colorir badges sem precisar calcular no front-end.

4. **Macros calculados:** `kcal_calculado`, `prot_calculado`, `carb_calculado`, `gord_calculado` já vêm calculados do servidor. O front-end **não deve** recalcular — apenas exibir. Os totais (`total_kcal`, etc.) por refeição também são calculados no back-end.

5. **Reordenação (drag-and-drop):** envie o array completo de `{ id, ordem }` para os endpoints `PATCH .../reordenar`. A operação é atômica no servidor via `unnest`.

6. **Rotas `/api/admin/*`:** acessíveis apenas com `role = "admin"`. Se o accessToken tiver `role = "aluno"`, o servidor retornará 403.

7. **Rotas `/api/aluno/*`:** o `aluno_id` vem do JWT — não envie como parâmetro de URL ou body.

8. **Erros padronizados:** todo erro retorna `{ "message": "string" }`. Exiba `response.data.message` nos toasts/alerts.

9. **Paginação:** `GET /api/admin/alunos` e `GET /api/admin/pagamentos` são paginados. Use `?page=1&limit=20`. A resposta inclui `total` para calcular número de páginas.

10. **Dockerfiles trocados:** `backend.Dockerfile` é na verdade o frontend (nginx) e `frontend.Dockerfile` é o backend (Node.js). O agente-docker deve corrigir os nomes antes do deploy.
