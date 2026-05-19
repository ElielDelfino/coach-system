# Autenticação e Segurança

## Fluxo completo

```
1. POST /api/auth/login
   → valida email + senha (bcrypt)
   → verifica ativo = true
   → gera access token (JWT, 1h, JWT_SECRET)
   → gera refresh token (JWT, 7d, JWT_REFRESH_SECRET)
   → salva refresh token no banco (tabela refresh_tokens)
   → seta cookie httpOnly: refreshToken (SameSite=Strict)
   → retorna: { accessToken, user: { id, email, role } }

2. Requisição autenticada
   → frontend envia: Authorization: Bearer <accessToken>
   → middleware auth.js verifica JWT
   → checa blacklist no Redis (token individual)
   → checa blacklist por user_id (desativação em massa)
   → anexa req.user = { id, role }

3. Access token expirado (401)
   → Axios interceptor chama POST /api/auth/refresh
   → browser envia cookie refreshToken automaticamente
   → servidor valida + checa blacklist
   → retorna novo accessToken
   → interceptor reenvia requisição original

4. Logout
   → adiciona access token na blacklist Redis (TTL = tempo restante)
   → apaga cookie refreshToken

5. Desativar aluno
   → seta ativo = false no banco
   → adiciona chave blacklist:user:{user_id} no Redis
   → middleware auth.js checa essa chave em toda requisição do aluno
```

---

## Tokens

| Token | Expiração | Armazenamento | Usado para |
|-------|-----------|--------------|------------|
| Access token | 1 hora | React Context (memória) | Toda requisição autenticada |
| Refresh token | 7 dias | Cookie httpOnly | Renovar access token |

**Access token NUNCA em:**
- localStorage
- sessionStorage
- Cookie acessível pelo JS

---

## Redis — blacklist

Chaves usadas:
- `blacklist:{token}` → token individual invalidado (logout)
- `blacklist:user:{userId}` → todos os tokens do usuário invalidados (desativação)

TTL do token individual = tempo restante até expirar (`exp - now`).
TTL do user = 7 dias (tempo máximo do refresh token).

---

## Middleware auth.js

```
1. Extrair token do header: Authorization: Bearer <token>
2. jwt.verify(token, JWT_SECRET) → decodificar payload
3. Redis.get(`blacklist:${token}`) → se existe, retornar 401
4. Redis.get(`blacklist:user:${payload.id}`) → se existe, retornar 403 INATIVO
5. Se role = 'aluno': checar inadimplência no banco
   → Se inadimplente: retornar 403 INADIMPLENTE
6. Anexar req.user = { id, role }
7. next()
```

---

## Middleware authorize.js

```js
function authorize(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }
    next();
  };
}
```

---

## Rotas de autenticação

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /api/auth/login | Não | Login — retorna accessToken + seta cookie |
| POST | /api/auth/refresh | Cookie | Renova accessToken via refreshToken |
| POST | /api/auth/logout | Bearer | Invalida tokens |

---

## Frontend — AuthContext.jsx

```jsx
const [user, setUser]   = useState(null);
const [token, setToken] = useState(null);

// Ao carregar o app: tentar restaurar sessão via refresh
useEffect(() => {
  api.post('/auth/refresh')
    .then(res => { setToken(res.data.accessToken); setUser(res.data.user); })
    .catch(() => {}); // sem sessão ativa — ok
}, []);
```

---

## Frontend — services/api.js (interceptor)

```js
// REQUEST: adiciona token em toda requisição
api.interceptors.request.use(config => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// RESPONSE: renova token automaticamente no 401
api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      const res = await api.post('/auth/refresh');
      setToken(res.data.accessToken);
      err.config.headers.Authorization = `Bearer ${res.data.accessToken}`;
      return api(err.config);
    }
    if (err.response?.status === 403) {
      const code = err.response.data?.code;
      if (code === 'INADIMPLENTE' || code === 'INATIVO') {
        logout();
        navigate('/login');
      }
    }
    return Promise.reject(err);
  }
);
```

---

## Códigos de erro específicos

| Code | Status | Descrição |
|------|--------|-----------|
| INATIVO | 403 | Conta desativada pelo admin |
| INADIMPLENTE | 403 | Bloqueado por inadimplência |
