Preciso tornar o projeto Coach System totalmente responsivo para celular.
Leia o CLAUDE.md antes de começar.
NÃO reescrever páginas inteiras — alterações cirúrgicas focadas em responsividade.
Breakpoint mobile: < 768px (md: no Tailwind)
Breakpoint tablet: 768px - 1024px (lg: no Tailwind)

---

## PROBLEMA 1 — Sidebar: ocultar no mobile e virar menu hamburguer

### Navbar.jsx

A sidebar atualmente ocupa 208px fixos na lateral. No mobile deve:
- Ficar oculta por padrão
- Abrir como drawer (painel deslizante da esquerda) ao clicar no hamburguer
- Fechar ao clicar em qualquer item do menu ou no overlay

Adicione estado de controle:
  const [menuAberto, setMenuAberto] = useState(false);

Estrutura do layout no mobile:

  {/* Overlay escuro quando menu aberto */}
  {menuAberto && (
    <div
      className="fixed inset-0 z-30 bg-black/60 md:hidden"
      onClick={() => setMenuAberto(false)}
    />
  )}

  {/* Sidebar — drawer no mobile, fixa no desktop */}
  <aside className={`
    fixed inset-y-0 left-0 z-40 w-52 bg-surface-card border-r border-surface-border
    flex flex-col transition-transform duration-200
    ${menuAberto ? 'translate-x-0' : '-translate-x-full'}
    md:relative md:translate-x-0 md:flex
  `}>
    {/* Botão fechar dentro do drawer (mobile) */}
    <button
      className="absolute top-4 right-4 text-zinc-500 hover:text-white md:hidden"
      onClick={() => setMenuAberto(false)}
    >
      ✕
    </button>
    {/* conteúdo existente da sidebar */}
  </aside>

  {/* Topbar mobile com botão hamburguer */}
  <div className="flex items-center gap-3 px-4 py-3 bg-surface-card border-b border-surface-border md:hidden">
    <button
      onClick={() => setMenuAberto(true)}
      className="text-zinc-400 hover:text-white p-1"
    >
      {/* Ícone hamburguer */}
      <div className="space-y-1">
        <div className="w-5 h-0.5 bg-current" />
        <div className="w-5 h-0.5 bg-current" />
        <div className="w-5 h-0.5 bg-current" />
      </div>
    </button>
    <span className="text-base font-black tracking-tight text-white">
      COACH<span className="text-brand">.</span>SYS
    </span>
  </div>

  {/* Conteúdo principal */}
  <main className="flex-1 overflow-y-auto">
    ...
  </main>

No App.jsx ou layout principal, o wrapper deve ser:
  <div className="flex h-screen bg-surface overflow-hidden">

Ao clicar em qualquer item do menu no mobile:
  onClick={() => { navigate('/rota'); setMenuAberto(false); }}

---

## PROBLEMA 2 — Tabelas: scroll horizontal e versão compacta

### Todas as tabelas do sistema

Envolva toda tabela em:
  <div className="overflow-x-auto -mx-4 md:mx-0">
    <table className="min-w-full">
      ...
    </table>
  </div>

Para tabelas muito largas (medidas, protocolo), adicione versão card no mobile:

Padrão de card mobile para substituir linhas de tabela:
  {/* Desktop: tabela normal */}
  <div className="hidden md:block overflow-x-auto">
    <table>...</table>
  </div>

  {/* Mobile: cards empilhados */}
  <div className="md:hidden space-y-3">
    {itens.map(item => (
      <div key={item.id} className="bg-surface-elevated border border-surface-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar iniciais={iniciais(item.nome)} />
            <div>
              <p className="text-white font-bold text-sm">{item.nome}</p>
              <p className="text-zinc-500 text-xs">{item.email}</p>
            </div>
          </div>
          <StatusBadge status={item.status} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-zinc-600 uppercase tracking-wide">Vencimento</p>
            <p className="text-zinc-300">{formatarData(item.vencimento_plano)}</p>
          </div>
          <div>
            <p className="text-zinc-600 uppercase tracking-wide">Plano</p>
            <p className="text-zinc-300">{item.plano || '—'}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => navigate(`/admin/alunos/${item.id}`)}
            className="flex-1 text-xs border border-surface-border text-zinc-400
              hover:text-white py-1.5 rounded text-center">
            Ver detalhes
          </button>
        </div>
      </div>
    ))}
  </div>

Aplicar versão card mobile nas seguintes tabelas:
- Alunos.jsx (lista de alunos)
- AlunoDetalhe.jsx (tab Faturas)
- AlunoDetalhe.jsx (tab Medidas — mostrar só campos principais no card)
- Perfil.jsx aluno (tab Faturas)
- Exercicios.jsx (virar grid de cards)
- Alimentos.jsx (virar grid de cards)

---

## PROBLEMA 3 — Modais: tela cheia no mobile

### Todos os modais (Modal.jsx)

No mobile, modais devem ocupar a tela inteira (bottom sheet):

  function Modal({ aberto, onFechar, titulo, children, tamanho = 'md' }) {
    if (!aberto) return null;

    const larguras = {
      sm: 'md:max-w-sm',
      md: 'md:max-w-lg',
      lg: 'md:max-w-2xl',
      xl: 'md:max-w-4xl',
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/70" onClick={onFechar} />

        {/* Modal — bottom sheet no mobile, centralizado no desktop */}
        <div className={`
          relative w-full bg-surface-card border-t md:border border-surface-border
          rounded-t-2xl md:rounded-xl
          max-h-[92vh] md:max-h-[85vh]
          overflow-y-auto
          ${larguras[tamanho]}
          z-10
        `}>
          {/* Handle bar (mobile) */}
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 bg-zinc-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4
            border-b border-surface-border sticky top-0 bg-surface-card z-10">
            <h2 className="text-white font-black text-base">{titulo}</h2>
            <button onClick={onFechar} className="text-zinc-500 hover:text-white text-lg">
              ✕
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-5">
            {children}
          </div>
        </div>
      </div>
    );
  }

---

## PROBLEMA 4 — Textos e botões: tamanho touch-friendly

### Botões

Altura mínima de 44px para todos os botões clicáveis no mobile (padrão Apple/Google):

No Button.jsx, garantir:
  className="... min-h-[44px] md:min-h-[36px] ..."

Botões de ação em tabelas (Ver, Editar, Excluir) no mobile:
- Virar botões maiores ou ícones com área de toque maior
- Padding mínimo: px-4 py-2

### Inputs e selects

Garantir font-size mínimo de 16px no mobile (evita zoom automático do iOS):
  className="... text-base md:text-sm ..."

No Input.jsx adicionar:
  className="... text-base md:text-sm ..."

### Cards de KPI no Dashboard

No mobile, grid de 2 colunas em vez de 4:
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">

---

## PROBLEMA 5 — ProtocoloBuilder: layout mobile

O builder de 3 colunas não funciona no mobile. Solução:

No mobile, usar tabs no topo em vez de sidebar lateral:

  {/* Mobile: tabs horizontais com scroll */}
  <div className="md:hidden overflow-x-auto border-b border-surface-border">
    <div className="flex gap-1 px-4 py-2 min-w-max">
      {modulos.map(modulo => (
        <button
          key={modulo.id}
          onClick={() => setModuloAtivo(modulo.id)}
          className={`text-xs px-3 py-2 rounded-lg whitespace-nowrap font-bold
            ${moduloAtivo === modulo.id
              ? 'bg-brand text-white'
              : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
          {modulo.label}
        </button>
      ))}
    </div>
  </div>

  {/* Desktop: sidebar lateral (existente) */}
  <div className="hidden md:flex ...">
    {/* sidebar de módulos existente */}
  </div>

  {/* Conteúdo do módulo ativo — ocupa tela toda no mobile */}
  <div className="flex-1 overflow-y-auto">
    <div className="md:grid md:grid-cols-[1fr_280px]">
      {/* Builder central */}
      <div className="p-4 md:p-6">
        {renderModuloAtivo()}
      </div>

      {/* Resumo nutricional — oculto no mobile, fixo no desktop */}
      <div className="hidden md:block border-l border-surface-border p-4 sticky top-0 h-screen overflow-y-auto">
        {/* resumo existente */}
      </div>
    </div>
  </div>

No mobile, o resumo nutricional vira um botão flutuante no canto inferior:
  <button
    onClick={() => setResumoAberto(true)}
    className="fixed bottom-4 right-4 z-20 md:hidden
      bg-brand text-white rounded-full px-4 py-2 text-xs font-black shadow-lg"
  >
    📊 Resumo
  </button>

  {/* Sheet de resumo no mobile */}
  {resumoAberto && (
    <div className="fixed inset-x-0 bottom-0 z-30 md:hidden
      bg-surface-card border-t border-surface-border rounded-t-2xl p-5 max-h-[70vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <p className="text-white font-black text-sm">Resumo nutricional</p>
        <button onClick={() => setResumoAberto(false)} className="text-zinc-500">✕</button>
      </div>
      {/* conteúdo do resumo existente */}
    </div>
  )}

---

## PROBLEMA 6 — Login.jsx: centralizado no mobile

A tela de login deve ser simples e funcional no mobile:

  <div className="min-h-screen bg-surface flex items-center justify-center px-4">
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white">
          COACH<span className="text-brand">.</span>SYS
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Acesse sua conta</p>
      </div>

      {/* Formulário */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 space-y-4">
        ...campos existentes...
      </div>
    </div>
  </div>

---

## PROBLEMA 7 — AlunoDetalhe.jsx: tabs no mobile

As tabs (Perfil, Medidas, Fotos, Faturas, Protocolos) devem ter scroll horizontal no mobile:

  <div className="overflow-x-auto border-b border-surface-border">
    <div className="flex min-w-max">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setTabAtiva(tab.id)}
          className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors
            ${tabAtiva === tab.id
              ? 'border-brand text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>

Aplicar o mesmo padrão de tabs com scroll horizontal em:
- AlunoDetalhe.jsx
- Perfil.jsx (aluno)
- ProtocoloBuilder.jsx (tabs de refeições e treinos)

---

## AO FINALIZAR

1. Confirme que a sidebar vira drawer com hamburguer no mobile
2. Confirme que tabelas têm scroll horizontal ou viram cards no mobile
3. Confirme que modais são bottom sheets no mobile
4. Confirme que inputs têm font-size 16px (sem zoom automático no iOS)
5. Confirme que botões têm altura mínima de 44px no mobile
6. Confirme que cards de KPI ficam em 2 colunas no mobile
7. Confirme que ProtocoloBuilder tem tabs horizontais no mobile
8. Confirme que Login.jsx está centralizado e funcional no mobile
9. Execute o rebuild do frontend:
   docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
   docker service update --force --image coach-frontend:latest coach_frontend
