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

Ver [`docs/api/_index.md`](./_index.md) para índice completo de módulos, prefixos e arquivos de contrato.
