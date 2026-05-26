# Convenções da API

> **Base URL:** `/api`
> **Auth:** Bearer token no header `Authorization: Bearer <access_token>`
> **Refresh token:** cookie httpOnly `refreshToken`
> Todo erro retorna `{ "message": "string" }`.
>
> **Hardening de produção:**
> - `helmet` aplica headers de segurança em todas as respostas.
> - `express.json()` com limite de `1mb` no body.
> - Rate limit em `/api/auth/login`: 10 requisições / 15 min por IP.
> - Rate limit geral em `/api`: 120 requisições / minuto por IP.
> - Endpoint `GET /health` retorna `{ "status": "ok" }` (sem auth, sem rate limit aplicado em outras camadas).
>
> Quando o rate limit é atingido a resposta é `429 Too Many Requests` com `{ "message": "..." }`.

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
