Preciso melhorar a experiência do usuário no projeto Coach System.
Leia o CLAUDE.md antes de começar.
NÃO reescrever páginas inteiras — alterações cirúrgicas em cada componente.

---

## PARTE 1 — Componentes reutilizáveis de UX

Crie os seguintes componentes em frontend/src/components/ui/:

### Spinner.jsx
Indicador de carregamento inline:

  function Spinner({ size = 'md', className = '' }) {
    const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
    return (
      <div className={`${sizes[size]} border-2 border-surface-border border-t-brand
        rounded-full animate-spin ${className}`} />
    );
  }
  export default Spinner;

### PageLoader.jsx
Loading de página inteira enquanto carrega dados:

  function PageLoader({ mensagem = 'Carregando...' }) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Spinner size="lg" />
        <p className="text-zinc-500 text-sm">{mensagem}</p>
      </div>
    );
  }
  export default PageLoader;

### EmptyState.jsx
Estado vazio reutilizável:

  function EmptyState({ icone = '📭', titulo, descricao, acao }) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3
        border border-dashed border-surface-border rounded-xl text-center px-6">
        <span className="text-4xl">{icone}</span>
        <p className="text-white font-bold text-sm">{titulo}</p>
        {descricao && <p className="text-zinc-500 text-xs max-w-xs">{descricao}</p>}
        {acao && <div className="mt-2">{acao}</div>}
      </div>
    );
  }
  export default EmptyState;

### ErrorState.jsx
Estado de erro com opção de tentar novamente:

  function ErrorState({ mensagem, onRetry }) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3
        border border-red-900/50 bg-red-950/20 rounded-xl text-center px-6">
        <span className="text-3xl">⚠️</span>
        <p className="text-red-400 font-bold text-sm">Algo deu errado</p>
        <p className="text-zinc-500 text-xs max-w-xs">
          {mensagem || 'Não foi possível carregar os dados. Verifique sua conexão.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs text-brand border border-brand/40
              px-3 py-1 rounded hover:bg-brand/10 font-bold"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }
  export default ErrorState;

### ConfirmModal.jsx
Modal de confirmação reutilizável para ações destrutivas:

  function ConfirmModal({ aberto, titulo, descricao, textoBotao = 'Confirmar',
    variante = 'danger', onConfirmar, onCancelar, carregando }) {
    if (!aberto) return null;
    const cores = {
      danger:  'bg-red-600 hover:bg-red-700',
      warning: 'bg-yellow-600 hover:bg-yellow-700',
      primary: 'bg-brand hover:bg-brand-dark',
    };
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-surface-card border border-surface-border rounded-xl p-6 w-full max-w-sm mx-4">
          <h3 className="text-white font-black text-base mb-2">{titulo}</h3>
          {descricao && <p className="text-zinc-400 text-sm mb-6">{descricao}</p>}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancelar}
              disabled={carregando}
              className="text-xs text-zinc-400 border border-surface-border
                px-4 py-2 rounded hover:text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={carregando}
              className={`text-xs text-white font-bold px-4 py-2 rounded
                disabled:opacity-50 ${cores[variante]}`}
            >
              {carregando ? 'Aguarde...' : textoBotao}
            </button>
          </div>
        </div>
      </div>
    );
  }
  export default ConfirmModal;

---

## PARTE 2 — Skeleton loading para tabelas e cards

Crie frontend/src/components/ui/Skeleton.jsx:

  function Skeleton({ className = '' }) {
    return (
      <div className={`animate-pulse bg-surface-elevated rounded ${className}`} />
    );
  }

  export function SkeletonTabela({ linhas = 5, colunas = 5 }) {
    return (
      <div className="space-y-1">
        {Array.from({ length: linhas }).map((_, i) => (
          <div key={i} className="flex gap-4 px-5 py-3 border-b border-surface-border">
            {Array.from({ length: colunas }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  export function SkeletonCard() {
    return (
      <div className="bg-surface-elevated border border-surface-border rounded-xl p-4 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  export default Skeleton;

---

## PARTE 3 — Aplicar UX em todas as páginas

Para cada página abaixo, aplique o padrão:

  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const res = await api.get('/rota');
      setDados(res.data);
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  if (loading) return <PageLoader mensagem="Carregando..." />;
  if (erro)    return <ErrorState mensagem={erro} onRetry={carregar} />;

### Dashboard.jsx
- Loading: SkeletonCard nos 4 KPIs + SkeletonTabela na lista de alunos
- Empty: EmptyState icone="🏋️" titulo="Nenhum aluno cadastrado ainda"
  descricao="Comece cadastrando seu primeiro aluno."
  acao=<Button onClick={() => navigate('/admin/alunos')}>Cadastrar aluno</Button>

### Alunos.jsx
- Loading: SkeletonTabela linhas=8
- Empty (sem busca): EmptyState icone="👥" titulo="Nenhum aluno cadastrado"
  descricao="Clique em '+ Novo aluno' para começar."
- Empty (com busca ativa): EmptyState icone="🔍" titulo="Nenhum aluno encontrado"
  descricao={`Nenhum resultado para "${busca}".`}
  acao=<button onClick={() => setBusca('')}>Limpar busca</button>

### AlunoDetalhe.jsx
- Loading inicial: PageLoader mensagem="Carregando perfil do aluno..."
- Erro 404: EmptyState icone="❌" titulo="Aluno não encontrado"
  acao=<Button onClick={() => navigate('/admin/alunos')}>Voltar</Button>
- Tab Medidas vazia: EmptyState icone="📏" titulo="Nenhuma medição registrada"
  descricao="Registre a primeira medição do aluno."
- Tab Fotos vazia: EmptyState icone="📷" titulo="Nenhuma foto enviada"
  descricao="O aluno ainda não enviou fotos de progresso."
- Tab Faturas vazia: EmptyState icone="💰" titulo="Nenhuma fatura lançada"
  descricao="Lance a primeira fatura para este aluno."
- Tab Protocolos vazia: EmptyState icone="📋" titulo="Nenhum protocolo criado"
  descricao="Crie o primeiro protocolo para este aluno."

### Exercicios.jsx
- Loading: grid de 6 SkeletonCards
- Empty: EmptyState icone="💪" titulo="Nenhum exercício cadastrado"
  descricao="Comece montando sua biblioteca de exercícios."

### Alimentos.jsx
- Loading: grid de 6 SkeletonCards
- Empty: EmptyState icone="🥗" titulo="Nenhum alimento cadastrado"
  descricao="Cadastre os alimentos para montar planos alimentares."

### Cardio.jsx
- Loading: SkeletonTabela linhas=5
- Empty: EmptyState icone="🏃" titulo="Nenhum cardio cadastrado"
  descricao="Cadastre tipos de cardio para usar nos protocolos."

### Perfil.jsx (aluno)
- Loading inicial: PageLoader mensagem="Carregando seu perfil..."
- Tab Medidas vazia: EmptyState icone="📏" titulo="Nenhuma medição ainda"
  descricao="Seu professor ainda não registrou suas medidas."
- Tab Fotos vazia: EmptyState icone="📷" titulo="Nenhuma foto enviada"
  descricao="Envie suas fotos de progresso para acompanhar sua evolução."
  acao=<Button onClick={abrirModalFotos}>Enviar fotos</Button>
- Tab Faturas vazia: EmptyState icone="✅" titulo="Nenhuma fatura em aberto"
  descricao="Você está em dia!"

### MeuProtocolo.jsx (aluno)
- Loading: PageLoader mensagem="Carregando seu protocolo..."
- Sem protocolo: EmptyState icone="📋" titulo="Nenhum protocolo ativo"
  descricao="Seu professor ainda não criou um protocolo para você."

---

## PARTE 4 — Confirmação antes de ações destrutivas

Substituir todos os confirm() nativos do browser por ConfirmModal:

Ações que precisam de confirmação:
- Excluir aluno → variante: danger, texto: "Excluir aluno"
- Desativar aluno → variante: warning, texto: "Desativar acesso"
- Excluir foto → variante: danger, texto: "Excluir foto"
- Excluir fatura → variante: danger, texto: "Excluir fatura"
- Excluir exercício → variante: danger, texto: "Excluir exercício"
- Excluir alimento → variante: danger, texto: "Excluir alimento"
- Excluir medição → variante: danger, texto: "Excluir medição"

Padrão de uso:
  const [confirm, setConfirm] = useState({ aberto: false, id: null });

  <ConfirmModal
    aberto={confirm.aberto}
    titulo="Excluir foto?"
    descricao="Esta ação não pode ser desfeita."
    textoBotao="Excluir"
    variante="danger"
    carregando={deletando}
    onConfirmar={() => handleDeletar(confirm.id)}
    onCancelar={() => setConfirm({ aberto: false, id: null })}
  />

---

## PARTE 5 — Feedback de ações (loading em botões)

Todo botão que dispara uma ação assíncrona deve ter estado de loading:

  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    setSalvando(true);
    try {
      await api.post('/rota', dados);
      toast.success('Salvo com sucesso!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  <Button disabled={salvando} onClick={handleSalvar}>
    {salvando ? <><Spinner size="sm" className="mr-2" />Salvando...</> : 'Salvar'}
  </Button>

Aplicar em todos os botões de: salvar, criar, editar, excluir, dar baixa, enviar PDF,
enviar email, fazer upload.

---

## PARTE 6 — Mensagens de toast padronizadas

Verificar se já existe um sistema de toast (Toast.jsx em components/ui/).
Se não existir, criar usando apenas React + CSS (sem biblioteca externa):

  // Hook useToast
  function useToast() {
    const [toasts, setToasts] = useState([]);

    function toast(mensagem, tipo = 'success') {
      const id = Date.now();
      setToasts(prev => [...prev, { id, mensagem, tipo }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }

    return {
      toasts,
      success: (msg) => toast(msg, 'success'),
      error:   (msg) => toast(msg, 'error'),
      info:    (msg) => toast(msg, 'info'),
    };
  }

  // Componente ToastContainer (adicionar no App.jsx)
  function ToastContainer({ toasts }) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg text-sm font-medium shadow-lg
            animate-in slide-in-from-bottom-2 duration-200
            ${t.tipo === 'success' ? 'bg-green-900 text-green-300 border border-green-800' : ''}
            ${t.tipo === 'error'   ? 'bg-red-900 text-red-300 border border-red-800' : ''}
            ${t.tipo === 'info'    ? 'bg-surface-card text-zinc-300 border border-surface-border' : ''}
          `}>
            {t.mensagem}
          </div>
        ))}
      </div>
    );
  }

Mensagens padronizadas para usar em todo o sistema:

  // Sucessos
  toast.success('Aluno cadastrado com sucesso!')
  toast.success('Medição registrada.')
  toast.success('Fatura lançada.')
  toast.success('Baixa registrada.')
  toast.success('Protocolo salvo.')
  toast.success('PDF enviado para o email do aluno.')
  toast.success('Foto enviada com sucesso.')
  toast.success('Alterações salvas.')

  // Erros (usar sempre err.response?.data?.message como prioridade)
  toast.error(err.response?.data?.message || 'Erro inesperado. Tente novamente.')

---

## AO FINALIZAR

1. Confirme que Spinner, PageLoader, EmptyState, ErrorState, ConfirmModal e Skeleton
   estão criados em frontend/src/components/ui/
2. Confirme que todas as páginas listadas têm loading, empty e error states
3. Confirme que confirm() nativo foi substituído por ConfirmModal em todas as ações destrutivas
4. Confirme que todos os botões de ação têm estado de loading
5. Confirme que toasts aparecem no canto inferior direito
6. Execute o rebuild do frontend:
   docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
   docker service update --force --image coach-frontend:latest coach_frontend
