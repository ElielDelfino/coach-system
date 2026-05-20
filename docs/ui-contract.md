# Coach System — Contrato UI

> Documento para o agente-ui. Descreve o que o front-end recebe (e envia) em cada rota implementada no back-end.
> Base URL: `/api` | Auth: `Authorization: Bearer <accessToken>` | Cookie: `refreshToken` httpOnly
>
> **Hardening de produção em vigor (não muda o shape, mas afeta UX):**
> - `helmet` em todas as respostas.
> - `POST /api/auth/login` limitado a 10 tentativas / 15 min por IP.
> - `/api` em geral limitado a 120 requisições / minuto por IP.
> - Quando o limite é atingido: HTTP `429` com `{ "message": "Muitas requisições..." }` — trate como qualquer outro erro de toast.
> - `GET /health` disponível para infra (não usado pelo front).

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
Limpa cookie do servidor e adiciona o access token corrente à blacklist. Front-end deve descartar o `accessToken` da memória.
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
- `data` no formato `YYYY-MM-DD`, ordem cronológica ascendente.
- Valores numéricos com 1 casa decimal; podem vir `null` quando o campo não foi preenchido em nenhuma medição do dia.
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

### POST /api/admin/alunos → 201
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

### GET /api/admin/alunos/:id
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

### PUT /api/admin/alunos/:id
Todos os campos do POST opcionais (sem `email` e `senha`). Retorna `{ "message": "Aluno atualizado com sucesso." }`.

### PATCH /api/admin/alunos/:id/ativar | /desativar
Body vazio. Retorna `{ "message": "..." }`. Em desativar, o servidor adiciona o `user_id` à blacklist do Redis por 7 dias — sessões ativas do aluno são derrubadas no próximo request.

### PATCH /api/admin/alunos/:id/senha
**Body:** `{ "senha": "string (>=8)" }`. Re-hash com bcrypt cost 12. Sessões já ativas continuam até o access token expirar.

### GET /api/admin/alunos/:id/medidas
Array ordenado por `data_medicao DESC`. Campos: todos de `aluno_medidas` + `created_at`.

### POST /api/admin/alunos/:id/medidas → 201
```json
{ "id": "uuid", "data_medicao": "date", "created_at": "timestamp" }
```

### GET /api/admin/alunos/:id/medidas/:medidaId
Objeto completo da medição. `404` se `medidaId` não pertencer ao `:id` informado.

### PUT /api/admin/alunos/:id/medidas/:medidaId
Mesmo schema do POST (todos os campos opcionais). Retorna `{ "message": "Medição atualizada." }`.

### DELETE /api/admin/alunos/:id/medidas/:medidaId
Retorna `{ "message": "Medição removida." }`.

### GET /api/admin/alunos/:id/fotos
```json
[{
  "id": "uuid", "url": "string", "s3_key": "string",
  "posicao": "frente|costas|lado_dir|lado_esq",
  "data_foto": "date", "created_at": "timestamp"
}]
```

### PATCH /api/admin/alunos/:id/liberar-fotos
Libera/bloqueia o upload de fotos pelo aluno.
**Body:** `{ "liberado": true }`
**Response:** `{ "message": "...", "envio_fotos_liberado": true }`

> Não existe endpoint admin para fazer upload de foto do aluno — o upload é feito apenas pelo próprio aluno em `POST /api/aluno/fotos` quando liberado.

### DELETE /api/admin/alunos/:alunoId/fotos/:fotoId
Remove a foto no banco e o arquivo correspondente no S3. Retorna `{ "message": "Foto removida com sucesso." }`.

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
**Body:**
```json
{
  "valor": 150.00, "data_pagamento": "date",
  "metodo": "dinheiro|pix|cartao_credito|cartao_debito|transferencia",
  "vencimento": "date", "observacoes": "string?"
}
```
**Response:** `{ "id": "uuid", "valor": 150.00, "data_pagamento": "date", "vencimento": "date", "created_at": "timestamp" }`

---

## ADMIN — FATURAS

> Modelo financeiro do sistema é por **faturas** — pagamentos são apenas o registro de baixa. Status do aluno (`em_dia | inadimplente | neutro`) deriva da existência e do vencimento das faturas.

### GET /api/admin/alunos/:id/faturas
```json
[{
  "id": "uuid", "valor": 200.00, "data_vencimento": "date",
  "status": "pendente | pago | vencido",
  "data_baixa": "date | null",
  "metodo_baixa": "string | null",
  "desconto_tipo": "valor | percentual | null",
  "desconto_valor": "number | null",
  "valor_final": "number",
  "observacoes": "string | null"
}]
```

### POST /api/admin/alunos/:id/faturas → 201
**Body:**
```json
{
  "valor": 200.00,
  "data_vencimento": "date",
  "observacoes": "string?",
  "desconto_tipo": "valor | percentual | null",
  "desconto_valor": "number?"
}
```
`valor_final` é calculado no servidor; o front nunca envia.

### PUT /api/admin/faturas/:id
Edita campos da fatura ainda em aberto (`valor`, `data_vencimento`, descontos, observações). Retorna `{ "message": "Fatura atualizada.", "fatura": { ... } }`.

### PATCH /api/admin/faturas/:id/baixa
Marca como paga.
**Body:** `{ "data_baixa": "date", "metodo_baixa": "dinheiro|pix|cartao_credito|cartao_debito|transferencia", "observacoes": "string?" }`
**Response:** objeto da fatura atualizada. Retorna `400` se já estiver paga.

### DELETE /api/admin/faturas/:id
Retorna `{ "message": "Fatura removida." }`.

---

## ADMIN — EXERCÍCIOS

### GET /api/admin/exercicios
```json
{ "data": [{
  "id":"uuid","nome":"string","grupo_muscular":"string","equipamento":"string",
  "nivel":"string","thumbnail_url":"string","ativo":true
}], "total": 50 }
```
**Query params:** `grupo_muscular`, `nivel`, `ativo`, `busca`

### GET /api/admin/exercicios/:id
Objeto completo com: `video_url`, `video_youtube_url`, `video_embed_url` (derivado), `observacoes_tecnicas`, `execucao_correta`, `execucao_errada`, `descanso_padrao_seg`, `series_recomendadas`, `repeticoes_recomendadas`, `cadencia`, `exercicio_substituto_id`.

> `video_embed_url` vem montado pelo backend a partir de `video_youtube_url` — front só precisa renderizar no `<iframe>`.

### PUT /api/admin/exercicios/:id/thumbnail (multipart)
- Field: `thumbnail` (file) — JPG/PNG/WebP, máx. 15MB
- Retorna `{ "thumbnail_url": "https://..." }` (URL pública do S3).

### PUT /api/admin/exercicios/:id/video (multipart)
- Field: `video` (file) — MP4/WebM/MOV/AVI, máx. 500MB
- Retorna `{ "video_url": "https://...", "s3_key": "exercicios/videos/..." }`.

> Modos suportados em exercícios: arquivo S3 (`video_url`) **ou** YouTube (`video_youtube_url`). Front escolhe um deles na UI de criação/edição.

---

## ADMIN — ALIMENTOS

### GET /api/admin/alimentos
```json
{ "data": [{
  "id":"uuid","nome":"string","categoria":"string",
  "quantidade_base":100,"unidade":"gramas",
  "calorias":89.0,"proteinas":1.1,"carboidratos":22.8,"gorduras":0.3,
  "ativo":true
}], "total": 200 }
```

### GET /api/admin/alimentos/:id
Objeto completo com: `fibra`, `sodio`, `foto_url`.

### PUT /api/admin/alimentos/:id/foto (multipart)
- Field: `foto` (file) — JPG/PNG/WebP, máx. 15MB
- Retorna `{ "foto_url": "https://..." }`.

---

## ADMIN — CARDIO

### GET /api/admin/cardio
```json
{ "data": [{
  "id":"uuid","tipo":"corrida","intensidade":"moderada",
  "duracao_min":30,"gasto_calorico_estimado":300.0,
  "inclinacao":1.0,"velocidade":10.0,"ativo":true
}], "total": 15 }
```

---

## ADMIN — PROTOCOLOS

### GET /api/admin/alunos/:id/protocolos
```json
[{
  "id":"uuid","nome":"string","objetivo":"string",
  "fase":"cutting|bulking|manutencao|recomposicao",
  "data_inicio":"date","data_fim":"date","ativo":true,
  "modulo_alimentar":true,"modulo_treino":true,
  "modulo_cardio":false,"modulo_suplementacao":true
}]
```

### GET /api/admin/protocolos/:id
Objeto completo do protocolo com todos os campos.

### PUT /api/admin/protocolos/:id
Body com schema do POST (todos opcionais). Retorna `{ "message": "Protocolo atualizado com sucesso." }`.

### PATCH /api/admin/protocolos/:id/ativar | /desativar
Body vazio. Retorna `{ "message": "Protocolo ativado." | "Protocolo desativado." }`.

### DELETE /api/admin/protocolos/:id
Cascata: refeições, itens, substitutos, treinos, exercícios do treino, suplementação. Retorna `{ "message": "Protocolo removido." }`.

### GET /api/admin/protocolos/:id/pdf
Download direto do PDF do protocolo. `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="protocolo-<slug>.pdf"`.

> Front deve disparar o download com `axios({ responseType: 'blob' })` ou abrir em nova aba.

### POST /api/admin/protocolos/:id/enviar-pdf
Body vazio. Gera o PDF e envia para o email cadastrado do aluno via Resend.
Retorna `{ "message": "Protocolo enviado para email@aluno.com" }`. Erros típicos: `400` (aluno sem email), `500` (falha Puppeteer/Resend — mensagem indica a origem).

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
**Body:** `{ "numero_refeicao_destino": 5 }` (obrigatório).
**Response:** `{ "id":"uuid","numero_refeicao":5,"nome":"string","created_at":"timestamp" }`. `400` se já existir refeição com o mesmo `numero_refeicao` no protocolo.

### PATCH /api/admin/refeicoes/:refeicaoId/itens/reordenar
Body: `{ "ordem": [{ "id": "uuid", "ordem": 0 }, ...] }`. Resposta: `{ "message": "..." }`.

### POST /api/admin/refeicoes/:refeicaoId/itens/:itemId/substitutos
**Body:** `{ "alimento_id": "uuid", "quantidade_g": 120.0 }`.

### DELETE /api/admin/refeicoes/:refeicaoId/itens/:itemId/substitutos/:substitutoId
Resposta: `{ "message": "..." }`.

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

### POST /api/admin/treinos/:id/duplicar → 201
Cria um novo treino no mesmo protocolo, copiando todos os itens.
**Body (opcional):** `{ "nome": "string?", "ordem": 0 }`. Sem `nome` → `"<original> (cópia)"`. Sem `ordem` → fica após o último treino.

### PATCH /api/admin/treinos/:treinoId/exercicios/reordenar
Body: `{ "ordem": [{ "id": "uuid", "ordem": 0 }, ...] }`.

---

## ADMIN — SUPLEMENTAÇÃO

### GET /api/admin/protocolos/:id/suplementacao
```json
[{ "id":"uuid","nome_suplemento":"Whey Protein","dose":"30g","horario":"Pós-treino","observacao":"string","ordem":0 }]
```

---

## ALUNO — SELF-SERVICE

> Todas as rotas usam o `aluno_id` do JWT — nunca exposto como parâmetro.
> O middleware bloqueia o acesso quando o aluno está inativo (`403 code: "INATIVO"`) ou inadimplente (`403 code: "INADIMPLENTE"`). O front deve tratar esses códigos para exibir tela específica de bloqueio.

### GET /api/aluno/perfil
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

### GET /api/aluno/medidas
Mesmo formato de `GET /api/admin/alunos/:id/medidas`.

### GET /api/aluno/evolucao
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

### GET /api/aluno/fotos
Mesmo formato de `GET /api/admin/alunos/:id/fotos`.

### POST /api/aluno/fotos (multipart) → 201
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

### GET /api/aluno/pagamentos
```json
[{ "id":"uuid","valor":150.00,"data_pagamento":"date","metodo":"pix","vencimento":"date" }]
```

### GET /api/aluno/faturas
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

### GET /api/aluno/protocolos
Mesmo formato de `GET /api/admin/alunos/:id/protocolos`.

### GET /api/aluno/protocolos/:id
Objeto completo. Retorna `403` se o protocolo não pertencer ao aluno autenticado.

### GET /api/aluno/protocolos/:id/refeicoes
Mesmo formato de `GET /api/admin/protocolos/:id/refeicoes` (com totais e substitutos).

### GET /api/aluno/protocolos/:id/treinos
Mesmo formato de `GET /api/admin/protocolos/:id/treinos`.

### GET /api/aluno/protocolos/:id/suplementacao
Mesmo formato de `GET /api/admin/protocolos/:id/suplementacao`.

### GET /api/aluno/protocolos/:id/pdf
Download direto do PDF do próprio protocolo. `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="protocolo-<slug>.pdf"`. `403` se o protocolo não pertencer ao aluno.

---

## DECISÕES TÉCNICAS PARA O AGENTE-UI

1. **Token storage:** `accessToken` fica **em memória** (variável de estado ou Context). Nunca em `localStorage`/`sessionStorage`. O refresh é httpOnly cookie e o servidor injeta automaticamente.

2. **Interceptor Axios 401:** quando qualquer chamada (exceto `/auth/login` e `/auth/refresh`) retornar 401, chame `POST /api/auth/refresh` automaticamente e reenvie a requisição original. Se o refresh também falhar, dispare `onUnauthorized()` → redireciona para `/login`. Implementação atual em `frontend/src/services/api.js`.

3. **ToastProvider estável:** a API exposta por `useToast()` (success/error/info) está memoizada com `useMemo` — pode ir nas dependências de `useEffect`/`useCallback` sem causar loops.

4. **Campo `status` do aluno:** quatro estados — `em_dia | inadimplente | neutro | inativo`. Calculado no SQL via `STATUS_SQL` no model. O front **não recalcula** — só renderiza badge.

5. **Macros calculados:** `kcal_calculado`, `prot_calculado`, `carb_calculado`, `gord_calculado` já vêm do servidor. Os totais por refeição (`total_kcal`, etc.) também. Front apenas exibe.

6. **Reordenação (drag-and-drop):** envie o array completo de `{ id, ordem }` para os endpoints `PATCH .../reordenar`. A operação é atômica no servidor via `unnest`. Importante: rotas `.../reordenar` devem vir **antes** das rotas com `:itemId` no Express — já está assim em `routes/admin.js`.

7. **Rotas `/api/admin/*`:** acessíveis apenas com `role = "admin"`. Token com `role = "aluno"` recebe `403`.

8. **Rotas `/api/aluno/*`:** o `aluno_id` vem do JWT — nunca enviado como param/body. Se o aluno estiver inativo/inadimplente, qualquer chamada retorna `403` com `code` informando o motivo.

9. **Erros padronizados:** todo erro retorna `{ "message": "string" }`. Utilitário `errorMessage(err)` em `frontend/src/components/ui/Toast.jsx` extrai a string. Exiba via `toast.error(errorMessage(err))`.

10. **Rate limit (429):** ao receber `429`, o `errorMessage` já entrega a string vinda do servidor. Considere desabilitar botões de submit por alguns segundos para evitar repetição.

11. **Paginação:** `GET /api/admin/alunos` e `GET /api/admin/pagamentos` são paginados (`page`, `limit`, `total`). Demais listas não são paginadas — front recebe tudo.

12. **Uploads multipart:** thumbnails/fotos (15MB) e vídeos (500MB) vão direto para S3 via `multer-s3`. O servidor devolve a `url` pública (`S3_PUBLIC_URL/<key>`). Sempre use `FormData` no front (não JSON).

13. **Vídeo de exercício — dois modos:** `video_url` (arquivo S3) ou `video_youtube_url` (link YT). O backend devolve `video_embed_url` pronto quando há YouTube — basta colocar em `<iframe src=...>`.

14. **Download de PDF:** prefira `axios.get(url, { responseType: 'blob' })` + `URL.createObjectURL` para evitar dependência do refresh do cookie em popup. O `Content-Disposition` já vem preparado pelo backend.
