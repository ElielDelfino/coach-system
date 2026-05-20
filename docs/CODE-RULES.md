# Regras de Código

## Backend (Node.js + Express)

### Padrões obrigatórios
- `async/await` em todo o código — sem callbacks
- `try/catch` em todo controller
- Erros retornam sempre: `{ message: "descrição clara" }`
- Senhas: `bcryptjs` com salt 12 — nunca texto puro
- Variáveis: sempre via `process.env` — nunca hardcoded
- Queries SQL: sempre com parâmetros posicionais ($1, $2) — nunca interpolação de string

### Estrutura de pastas — um arquivo por domínio

```
backend/src/
├── controllers/
│   ├── admin/
│   │   ├── alunos.js          ← um controller por domínio (alunos, medidas, fotos, ...)
│   │   ├── medidas.js
│   │   └── ...
│   ├── alunoController.js     ← self-service do aluno (uma única tela única)
│   └── authController.js
├── models/
│   ├── _shared.js             ← helpers cross-domínio (puros, sem I/O)
│   ├── alunos.js              ← um model por domínio
│   ├── medidas.js
│   ├── ...
│   └── index.js               ← barrel re-export — controllers importam daqui
└── routes/
    └── admin.js               ← mapeia URL → controller de domínio
```

**Regras do padrão:**
- Um arquivo de model **por domínio** (uma ou duas tabelas relacionadas). Quando passar de ~200 linhas ou começar a misturar dois domínios, separa.
- **Helpers cross-domínio** (cálculo de macros, status SQL, normalização de fatura) vivem em `models/_shared.js`. Nunca duplicar entre arquivos.
- Toda função puramente SQL fica no model. Validação, status HTTP e mensagens vivem no controller.
- Queries cross-tabela (PDF de protocolo precisa de refeições + treinos + medidas) são compostas no **controller**, chamando várias funções model. Não criar "model misturado".
- Controllers fazem `require('../../models')` (o barrel). Não importar arquivo de domínio direto, para manter o ponto único de evolução.
- Cada controller importa **apenas** o que precisa do `services/` (storage, pdf, email) — não imports gerais.

### Status codes
| Código | Uso |
|--------|-----|
| 200 | Sucesso |
| 201 | Criado |
| 400 | Dados inválidos |
| 401 | Sem token ou token inválido |
| 403 | Token válido mas sem permissão |
| 404 | Recurso não encontrado |
| 500 | Erro inesperado |

### Queries paginadas
Sempre separar `filterParams` de `[limit, offset]`:
```js
const filterParams = [];
// ... montar conditions
const dataParams = [...filterParams, limit, offset];
const limitIdx   = dataParams.length - 1;
const offsetIdx  = dataParams.length;
// usar $${limitIdx} e $${offsetIdx} na query
// countQ usa apenas filterParams
```

### Reordenação (drag and drop)
Sempre usar `unnest` — nunca loop:
```sql
UPDATE tabela AS t SET ordem = v.ordem
FROM unnest($1::uuid[], $2::int[]) AS v(id, ordem)
WHERE t.id = v.id AND t.parent_id = $3;
```

### Upload S3
- Arquivo: `backend/src/middlewares/upload.js`
- Ao deletar: sempre chamar `deletarArquivo(s3_key)` antes de remover do banco
- Limites: imagens 15MB, vídeos 500MB

### PDF (Puppeteer)
- Retornar buffer com `res.end(pdfBuffer, 'binary')` — não `res.send()`
- Incluir `--disable-dev-shm-usage` nos args do Chromium no Docker

---

## Frontend (React)

### Padrões obrigatórios
- Access token: NUNCA em localStorage — apenas React Context (AuthContext)
- Todo fetch: via instância Axios em `services/api.js` — nunca `fetch()` direto
- Erros: exibir sempre `err.response?.data?.message` no toast
- Interceptor: 401 → POST /auth/refresh → reenviar original → falha → logout + /login

### Padrão de página com dados assíncronos
```jsx
const [dados, setDados] = useState([]);
const [loading, setLoading] = useState(true);
const [erro, setErro] = useState(null);

async function carregar() {
  setLoading(true); setErro(null);
  try {
    const res = await api.get('/rota');
    setDados(res.data);
  } catch (err) {
    setErro(err.response?.data?.message || 'Erro ao carregar.');
  } finally {
    setLoading(false);
  }
}
useEffect(() => { carregar(); }, []);

if (loading) return <PageLoader />;
if (erro)    return <ErrorState mensagem={erro} onRetry={carregar} />;
```

### Padrão de botão com loading
```jsx
const [salvando, setSalvando] = useState(false);
async function handleSalvar() {
  setSalvando(true);
  try {
    await api.post('/rota', dados);
    toast.success('Salvo!');
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erro ao salvar.');
  } finally { setSalvando(false); }
}
<Button disabled={salvando} onClick={handleSalvar}>
  {salvando ? <><Spinner size="sm" /> Salvando...</> : 'Salvar'}
</Button>
```

### Download de PDF
```jsx
const res = await api.get('/rota/pdf', { responseType: 'blob' }); // CRÍTICO: blob
const blob = new Blob([res.data], { type: 'application/pdf' });
const url  = URL.createObjectURL(blob);
const a    = document.createElement('a');
a.href = url; a.download = 'arquivo.pdf'; a.click();
URL.revokeObjectURL(url);
```

### Dropdown com busca (evitar bug de blur/click)
```jsx
// Usar onMouseDown + preventDefault no item — nunca onClick
<button onMouseDown={(e) => { e.preventDefault(); selecionarItem(item); }}>
  {item.nome}
</button>
```

### Responsividade
- Tabelas: sempre `overflow-x-auto` com `min-w-full`
- Tabs: `overflow-x-auto scrollbar-none` com `min-w-max` nos itens
- Modais: bottom sheet no mobile, centralizado no desktop
- Inputs: `text-base md:text-sm` para evitar zoom automático no iOS
- Botões: altura mínima `min-h-[44px]` no mobile

### localStorage (dados temporários do aluno)
- Água: `agua_{userId}_{dataHoje}` — reseta por dia automaticamente
- Progresso de treino: `treino_{treinoId}_{dataHoje}`
- Exercícios concluídos: `concluidos_{treinoId}_{dataHoje}`
- Treino planejado por dia: `treino_dia_{userId}_{dataHoje}`

---

## Área do aluno — estrutura mobile-first

A área do aluno usa layout com **bottom navigation fixo** (AlunoLayout.jsx):
- Home → `/aluno/home`
- Treino → `/aluno/treino`
- Dieta → `/aluno/dieta`
- Perfil → `/aluno/perfil`

Página de execução do treino (`/aluno/treino/:protocoloId/:treinoId`):
- Timer de descanso regressivo
- Registro de peso/reps por série (localStorage)
- Barra de progresso por exercícios concluídos
- Tela de parabéns com Web Share API ao concluir todos

---

## Alterações cirúrgicas

Ao modificar qualquer arquivo existente:
1. Ler o arquivo completo primeiro
2. Fazer apenas as alterações necessárias
3. Nunca reescrever o arquivo inteiro sem necessidade
4. Manter o estilo e padrões do código existente
