# Autenticação & Autorização

## Perfis de usuário

| Role | Acesso | Restrições |
|------|--------|-----------|
| `admin` | Dashboard, alunos, exercícios, alimentos, cardio, protocolos, faturas | Total |
| `aluno` | Perfil, medidas, fotos, faturas, protocolo | Apenas dados próprios |

**Regra crítica:** Aluno JAMAIS acessa rota ou componente de admin.

**Separação:**
- **Backend:** Middleware `authorize.js` — verifica role, retorna `403` se não bater
- **Frontend:** Componente `PrivateRoute` — protege por auth + role

## Admin padrão (criado pelo seed)

```
email: admin@coach.com
senha: Coach@2025
```

## Fluxo JWT

### Access Token
- **Expiração:** 1h
- **Armazenamento:** APENAS React Context (nunca localStorage)
- **Como enviar:** Header `Authorization: Bearer <token>`

### Refresh Token
- **Expiração:** 7 dias
- **Armazenamento:** Cookie httpOnly (frontend nunca lê diretamente)
- **Rota:** `POST /api/auth/refresh`

### Blacklist (Redis)
- Tokens invalidados ao: `logout()` ou desativar aluno
- Key pattern: `blacklist:{token_jti}`
- TTL: igual expiração do token

## Interceptor Axios (frontend)

1. Request falha com `401`
2. Tenta `POST /api/auth/refresh`
3. Se OK → reenviar request original com novo access token
4. Se falha → `logout()` + redirect `/login`

## Middleware auth.js (backend)

```js
// Verifica JWT validade + blacklist
if (token expirado ou na blacklist) return 401

// Bloqueia aluno inativo
if (aluno.ativo === false) return 403 { code: 'INATIVO' }

// Bloqueia aluno inadimplente
if (status === 'inadimplente') return 403 { code: 'INADIMPLENTE' }
```

## Middleware authorize.js (backend)

```js
if (user.role !== permitido para esta rota) return 403
```

## Senha

- **Biblioteca:** bcryptjs
- **Salt:** 12 rounds
- **Regra:** Nunca armazenar ou transmitir em texto puro

## Frontend — Tela de bloqueio

Se aluno tenta acessar `/aluno/*` e recebe `403 code=INADIMPLENTE`:
- Exibir tela bloqueio com mensagem de inadimplência
- Não renderizar conteúdo protegido
- Link para contatar admin/suporte

(Implementado em página pai, ex: `Perfil.jsx`)
