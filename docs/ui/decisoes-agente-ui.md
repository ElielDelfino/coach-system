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
