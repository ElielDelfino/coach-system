# Autenticação — Contrato

> Convenções gerais: ver [`_conventions.md`](./_conventions.md)
> Schema das tabelas: ver [`../core/DATABASE.md`](../core/DATABASE.md)

## Rotas

| Método | Rota | Autorização |
|---|---|---|
| POST | `/api/auth/login` | público |
| POST | `/api/auth/refresh` | público |
| POST | `/api/auth/logout` | admin \| aluno |

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

### Shape UI

Retorna o `accessToken` no body — front-end deve guardar **em memória** (nunca em localStorage).
```json
{
  "accessToken": "string",
  "user": { "id": "uuid", "email": "string", "role": "admin | aluno" }
}
```
Cookie `refreshToken` definido automaticamente pelo servidor.

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

### Shape UI

Chame quando o `accessToken` expirar (interceptor Axios 401).
```json
{ "accessToken": "string" }
```

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

### Shape UI

Limpa cookie do servidor e adiciona o access token corrente à blacklist. Front-end deve descartar o `accessToken` da memória.
```json
{ "message": "Sessão encerrada com sucesso." }
```
