Preciso corrigir e melhorar vários pontos na área do aluno do projeto Coach System.
Leia o CLAUDE.md antes de começar.
NÃO reescrever arquivos inteiros — alterações cirúrgicas em cada ponto.
Execute um problema por vez na ordem abaixo.

---

## PROBLEMA 1 — Água: remover redundância e persistir valor

### 1.1 — Remover tracker de água da Dieta.jsx
Manter o tracker de água APENAS no Home.jsx.
Remover completamente o bloco de água da Dieta.jsx.

### 1.2 — Persistir valor da água no localStorage
O valor da água não pode resetar ao trocar de aba.
Usar localStorage com chave: `agua_${userId}_${dataHoje}` (ex: agua_abc123_2025-05-20)
Isso garante que reseta automaticamente a cada novo dia.

  const dataHoje = new Date().toISOString().split('T')[0];
  const chaveAgua = `agua_${user.id}_${dataHoje}`;

  const [aguaIngerida, setAguaIngerida] = useState(() => {
    return Number(localStorage.getItem(chaveAgua) || 0);
  });

  function salvarAgua(valor) {
    setAguaIngerida(valor);
    localStorage.setItem(chaveAgua, valor);
  }

Adicionar botão "Salvar" ao lado do slider:

  <div className="flex items-center gap-3">
    <span className="text-2xl">💧</span>
    <input type="range" ... onChange={(e) => setAguaIngerida(Number(e.target.value))} />
    <button
      onClick={() => salvarAgua(aguaIngerida)}
      className="shrink-0 bg-brand text-white text-xs font-black px-3 py-2 rounded-full"
    >
      Salvar
    </button>
  </div>

### 1.3 — Meta de água configurável pelo admin no protocolo

#### Backend — banco de dados

  -- M011: meta de água no protocolo
  ALTER TABLE protocolos ADD COLUMN IF NOT EXISTS meta_agua_litros NUMERIC(4,1) DEFAULT 2.5;

Adicionar ao migrate.js.

#### Backend — rotas afetadas

PUT /api/admin/protocolos/:id → aceitar campo meta_agua_litros
GET /api/aluno/protocolos/:id → incluir meta_agua_litros na response

#### Frontend — ProtocoloBuilder.jsx (área do admin)

Adicionar card "Hidratação" na sidebar de módulos do ProtocoloBuilder:

  {/* Card de Hidratação — sempre visível, não é módulo separado */}
  <div className="mt-4 border-t border-surface-border pt-4">
    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Hidratação</p>
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0.5"
        max="10"
        step="0.5"
        value={metaAgua}
        onChange={(e) => setMetaAgua(Number(e.target.value))}
        className="w-20 bg-surface-input border border-surface-border text-white
          rounded px-2 py-1.5 text-sm text-center focus:border-brand focus:outline-none"
      />
      <span className="text-zinc-400 text-sm">litros / dia</span>
    </div>
    <button onClick={salvarMetaAgua}
      className="mt-2 text-xs text-brand border border-brand/40 px-3 py-1 rounded
        hover:bg-brand/10 font-bold">
      Salvar meta
    </button>
  </div>

#### Frontend — Home.jsx (área do aluno)

Buscar meta_agua_litros do protocolo ativo e usar como META_AGUA:

  const META_AGUA = protocolo?.meta_agua_litros || 2.5;

Exibir no badge: {META_AGUA} L

---

## PROBLEMA 2 — Treino: peso/reps por série, vídeo e observações

### 2.1 — Salvar peso e reps por série

No TreinoExecucao.jsx, criar estado para registrar peso e reps de cada série
de cada exercício. Persistir em localStorage para não perder ao navegar:

  const chaveRegistro = `treino_${treinoId}_${dataHoje}`;

  const [registro, setRegistro] = useState(() => {
    try { return JSON.parse(localStorage.getItem(chaveRegistro) || '{}'); }
    catch { return {}; }
  });

  // Estrutura: registro[exercicioId][numeroSerie] = { peso, reps }
  function atualizarRegistro(exercicioId, serie, campo, valor) {
    const novo = {
      ...registro,
      [exercicioId]: {
        ...(registro[exercicioId] || {}),
        [serie]: { ...(registro[exercicioId]?.[serie] || {}), [campo]: valor }
      }
    };
    setRegistro(novo);
    localStorage.setItem(chaveRegistro, JSON.stringify(novo));
  }

Substituir os cards de Peso e Reps por inputs editáveis:

  {/* Cards de peso e reps editáveis */}
  <div className="flex gap-3 mb-6 w-full">
    <div className="flex-1 flex items-center gap-3 border border-brand rounded-2xl p-4">
      <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white">
        🏋️
      </div>
      <div className="flex-1">
        <p className="text-zinc-400 text-xs mb-1">Peso (kg)</p>
        <input
          type="number"
          placeholder="0"
          value={registro[exercicio.id]?.[serieAtual]?.peso || ''}
          onChange={(e) => atualizarRegistro(exercicio.id, serieAtual, 'peso', e.target.value)}
          className="w-full bg-transparent text-white font-black text-lg focus:outline-none"
        />
      </div>
    </div>
    <div className="flex-1 flex items-center gap-3 border border-brand rounded-2xl p-4">
      <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white">
        📊
      </div>
      <div className="flex-1">
        <p className="text-zinc-400 text-xs mb-1">Reps feitas</p>
        <input
          type="number"
          placeholder="0"
          value={registro[exercicio.id]?.[serieAtual]?.reps || ''}
          onChange={(e) => atualizarRegistro(exercicio.id, serieAtual, 'reps', e.target.value)}
          className="w-full bg-transparent text-white font-black text-lg focus:outline-none"
        />
      </div>
    </div>
  </div>

Ao trocar de série (setSerieAtual), NÃO limpar os dados — os valores já preenchidos
ficam salvos no registro e reaparecem ao voltar para a série.

### 2.2 — Exibir vídeo e observações técnicas do exercício

Após os cards de peso/reps, adicionar seção de informações do exercício:

  {/* Observações técnicas */}
  {exercicio.observacoes_tecnicas && (
    <div className="w-full bg-surface-elevated border border-surface-border
      rounded-2xl p-4 mb-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
        Observações técnicas
      </p>
      <p className="text-zinc-300 text-sm leading-relaxed">
        {exercicio.observacoes_tecnicas}
      </p>
    </div>
  )}

  {/* Execução correta */}
  {exercicio.execucao_correta && (
    <div className="w-full bg-green-950/30 border border-green-900/50 rounded-2xl p-4 mb-4">
      <p className="text-xs uppercase tracking-widest text-green-600 mb-2">✓ Execução correta</p>
      <p className="text-zinc-300 text-sm leading-relaxed">{exercicio.execucao_correta}</p>
    </div>
  )}

  {/* Execução errada */}
  {exercicio.execucao_errada && (
    <div className="w-full bg-red-950/30 border border-red-900/50 rounded-2xl p-4 mb-4">
      <p className="text-xs uppercase tracking-widest text-red-600 mb-2">✗ Evite</p>
      <p className="text-zinc-300 text-sm leading-relaxed">{exercicio.execucao_errada}</p>
    </div>
  )}

### 2.3 — Corrigir exibição de vídeo (remover thumbnail, exibir vídeo direto)

#### Backend — Exercicios model

Na query de busca de exercícios, garantir que video_url, video_tipo,
video_embed_url, observacoes_tecnicas, execucao_correta, execucao_errada
estão sendo retornados.

Remover thumbnail_url das queries de listagem — manter apenas no detalhe.

#### Frontend — Exercicios.jsx (admin)

Remover campo de thumbnail completamente.
Na exibição do exercício (modal de detalhe), mostrar o vídeo diretamente:

  {/* Vídeo do exercício */}
  {exercicio.video_tipo === 'youtube' && exercicio.video_embed_url && (
    <div className="w-full aspect-video rounded-xl overflow-hidden bg-black mb-4">
      <iframe
        src={exercicio.video_embed_url}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        allowFullScreen
      />
    </div>
  )}

  {exercicio.video_tipo === 's3' && exercicio.video_url && (
    <div className="w-full mb-4">
      <video
        src={exercicio.video_url}
        controls
        className="w-full rounded-xl bg-black"
        preload="metadata"
      >
        Seu navegador não suporta vídeos.
      </video>
    </div>
  )}

  {!exercicio.video_tipo && (
    <p className="text-zinc-600 text-xs text-center py-4">Nenhuma mídia adicionada.</p>
  )}

Na listagem de exercícios (cards), remover thumbnail — mostrar apenas nome,
grupo muscular e nível.

---

## PROBLEMA 3 — Barra de progresso do treino e botão "Concluir exercício"

### No TreinoExecucao.jsx

Adicionar estado de exercícios concluídos:

  const [concluidos, setConcluidos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`concluidos_${treinoId}_${dataHoje}`) || '[]'); }
    catch { return []; }
  });

  function concluirExercicio() {
    const novos = [...new Set([...concluidos, exercicio.id])];
    setConcluidos(novos);
    localStorage.setItem(`concluidos_${treinoId}_${dataHoje}`, JSON.stringify(novos));

    // Avançar para próximo exercício se houver
    if (exercicioAtual < exercicios.length - 1) {
      setExercicioAtual(e => e + 1);
      setSerieAtual(0);
      setTimer(exercicios[exercicioAtual + 1]?.descanso_seg || 60);
      setTimerAtivo(false);
    }
  }

Barra de progresso no topo (abaixo da topbar):

  {/* Barra de progresso */}
  <div className="px-5 mb-4">
    <div className="flex items-center justify-between mb-1">
      <p className="text-zinc-500 text-xs">{concluidos.length}/{exercicios.length} exercícios</p>
      <p className="text-zinc-500 text-xs">{Math.round((concluidos.length/exercicios.length)*100)}%</p>
    </div>
    <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
      <div
        className="h-full bg-brand rounded-full transition-all duration-500"
        style={{ width: `${(concluidos.length/exercicios.length)*100}%` }}
      />
    </div>
  </div>

Botão "Concluir exercício" — adicionar acima do timer de descanso:

  <button
    onClick={concluirExercicio}
    className={`w-full mx-5 py-4 rounded-2xl font-black text-base mb-6
      transition-all active:scale-95
      ${concluidos.includes(exercicio.id)
        ? 'bg-green-900 text-green-400 border border-green-800'
        : 'bg-brand text-white hover:bg-brand-dark'
      }`}
    style={{ width: 'calc(100% - 40px)' }}
  >
    {concluidos.includes(exercicio.id) ? '✓ Exercício concluído' : 'Concluir exercício'}
  </button>

### Tela de parabéns ao concluir todos os exercícios

Quando concluidos.length === exercicios.length, mostrar tela de congratulations
no lugar do conteúdo normal:

  if (treinoConcluido) {
    return (
      <div className="min-h-screen bg-surface max-w-md mx-auto flex flex-col
        items-center justify-center px-6 text-center">

        {/* Emoji animado */}
        <div className="text-8xl mb-6 animate-bounce">🏆</div>

        <h1 className="text-4xl font-black text-white mb-2">Treino concluído!</h1>
        <p className="text-brand text-xl font-bold mb-1">{treino.nome}</p>
        <p className="text-zinc-500 text-sm mb-8">
          {exercicios.length} exercícios em {formatarTempo(tempoTreino)}
        </p>

        {/* Stats do treino */}
        <div className="w-full bg-surface-card border border-surface-border
          rounded-2xl p-5 mb-8 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Exercícios</p>
            <p className="text-3xl font-black text-brand">{exercicios.length}</p>
          </div>
          <div className="text-center">
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Tempo total</p>
            <p className="text-3xl font-black text-brand">{formatarTempo(tempoTreino)}</p>
          </div>
          <div className="text-center">
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Séries totais</p>
            <p className="text-3xl font-black text-white">
              {exercicios.reduce((s, e) => s + (Number(e.series) || 0), 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Treino</p>
            <p className="text-xl font-black text-white">{treino.nome}</p>
          </div>
        </div>

        {/* Botão compartilhar */}
        <button
          onClick={compartilhar}
          className="w-full bg-brand text-white font-black text-base py-4
            rounded-2xl mb-3 hover:bg-brand-dark active:scale-95"
        >
          📤 Compartilhar conquista
        </button>

        <button
          onClick={() => navigate('/aluno/treino')}
          className="w-full border border-surface-border text-zinc-400 font-bold
            text-sm py-3 rounded-2xl hover:text-white"
        >
          Voltar para treinos
        </button>
      </div>
    );
  }

Função de compartilhar usando Web Share API:

  async function compartilhar() {
    const texto = `🏆 Treino concluído!\n${treino.nome} - ${exercicios.length} exercícios em ${formatarTempo(tempoTreino)}\n💪 #CoachSystem`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Treino concluído!', text: texto });
      } else {
        await navigator.clipboard.writeText(texto);
        alert('Texto copiado! Cole no Instagram ou WhatsApp.');
      }
    } catch (err) {
      console.log('Compartilhamento cancelado');
    }
  }

---

## PROBLEMA 4 — Dieta: calendário com histórico e planejamento de treino

### 4.1 — Calendário com histórico por dia

No Dieta.jsx, ao clicar em um dia do calendário, mostrar o resumo daquele dia:

  const [diaSelecionado, setDiaSelecionado] = useState(hoje);

  // Buscar dados do dia selecionado do localStorage
  const dataStr = diaSelecionado.toISOString().split('T')[0];
  const aguaDia = Number(localStorage.getItem(`agua_${user.id}_${dataStr}`) || 0);
  const treinoDia = JSON.parse(localStorage.getItem(`treino_dia_${user.id}_${dataStr}`) || 'null');
  const concluidosDia = JSON.parse(localStorage.getItem(`concluidos_${treinoDia?.id}_${dataStr}`) || '[]');

Ao selecionar um dia diferente do hoje, mostrar painel de histórico:

  {diaSelecionado.toDateString() !== hoje.toDateString() && (
    <div className="bg-surface-elevated border border-surface-border rounded-2xl p-4 mb-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
        {diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {treinoDia ? (
        <div className="flex items-center justify-between mb-2">
          <p className="text-white text-sm font-bold">🏋️ {treinoDia.nome}</p>
          <span className="text-xs text-green-400">
            {concluidosDia.length}/{treinoDia.totalExercicios} exercícios
          </span>
        </div>
      ) : (
        <p className="text-zinc-600 text-sm mb-2">🏋️ Sem treino registrado</p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-sm">💧 Água</p>
        <p className="text-white text-sm font-bold">{aguaDia.toFixed(1)} L</p>
      </div>
    </div>
  )}

### 4.2 — Registrar treino planejado por dia

No Dieta.jsx (ou em modal ao clicar no dia), botão "Adicionar treino do dia":

  async function adicionarTreinoDia(treino) {
    const dataStr = diaSelecionado.toISOString().split('T')[0];
    const dados = {
      id: treino.id,
      nome: treino.nome,
      totalExercicios: treino.exercicios?.length || 0,
    };
    localStorage.setItem(`treino_dia_${user.id}_${dataStr}`, JSON.stringify(dados));
    setTreinoDia(dados);
    toast.success(`Treino ${treino.nome} adicionado para ${dataStr}`);
  }

Modal de seleção de treino ao clicar no dia futuro:

  {modalTreino && (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface-card border-t border-surface-border
        rounded-t-2xl p-5">
        <p className="text-white font-black mb-4">Selecionar treino para o dia</p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {treinos.map(t => (
            <button key={t.id} onClick={() => { adicionarTreinoDia(t); setModalTreino(false); }}
              className="w-full text-left px-4 py-3 bg-surface-elevated border
                border-surface-border rounded-xl text-white font-bold text-sm
                hover:border-brand/40">
              {t.nome}
            </button>
          ))}
        </div>
        <button onClick={() => setModalTreino(false)}
          className="w-full mt-3 py-2 text-zinc-500 text-sm">
          Cancelar
        </button>
      </div>
    </div>
  )}

Marcar dias com treino planejado no calendário com ponto laranja:

  {localStorage.getItem(`treino_dia_${user.id}_${dia.toISOString().split('T')[0]}`) && (
    <div className="w-1.5 h-1.5 rounded-full bg-brand mt-0.5" />
  )}

### 4.3 — Melhorar layout de macros na RefeicaoDetalhe.jsx

Substituir o rodapé de macros atual por cards mais visuais e identificáveis:

  <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto
    bg-surface-card border-t border-surface-border px-4 py-3">
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: 'Kcal', valor: refeicao.total_kcal, cor: 'text-brand', bg: 'bg-brand/10' },
        { label: 'Carb', valor: refeicao.total_carb, cor: 'text-yellow-400', bg: 'bg-yellow-950/40' },
        { label: 'Prot', valor: refeicao.total_prot, cor: 'text-blue-400', bg: 'bg-blue-950/40' },
        { label: 'Gord', valor: refeicao.total_gord, cor: 'text-red-400', bg: 'bg-red-950/40' },
      ].map(m => (
        <div key={m.label} className={`${m.bg} rounded-xl py-2 text-center`}>
          <p className="text-zinc-500 text-xs uppercase tracking-wide mb-0.5">{m.label}</p>
          <p className={`${m.cor} font-black text-sm`}>
            {Number(m.valor || 0).toFixed(1)}
          </p>
        </div>
      ))}
    </div>
  </div>

---

## PROBLEMA 5 — Perfil: responsividade e fotos com aprovação do admin

### 5.1 — Corrigir tabs scrollando para os lados

Em Perfil.jsx e AlunoDetalhe.jsx, as tabs devem ter scroll horizontal suave:

  <div className="overflow-x-auto scrollbar-none border-b border-surface-border">
    <div className="flex min-w-max px-4">
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setTabAtiva(tab.id)}
          className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2
            transition-colors shrink-0
            ${tabAtiva === tab.id
              ? 'border-brand text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}>
          {tab.label}
        </button>
      ))}
    </div>
  </div>

Adicionar ao tailwind.config.js ou CSS global:
  .scrollbar-none { scrollbar-width: none; }
  .scrollbar-none::-webkit-scrollbar { display: none; }

### 5.2 — Fotos: upload liberado pelo professor + blocos por data

#### Backend — banco de dados

  -- M012: controle de liberação de envio de fotos por aluno
  ALTER TABLE alunos ADD COLUMN IF NOT EXISTS envio_fotos_liberado BOOLEAN DEFAULT false;

#### Backend — rotas

PATCH /api/admin/alunos/:id/liberar-fotos
  Body: { liberado: true | false }
  Lógica: atualiza alunos.envio_fotos_liberado

GET /api/aluno/perfil → incluir campo envio_fotos_liberado

POST /api/aluno/fotos → verificar se envio_fotos_liberado = true
  Se false: retornar 403 { message: 'Envio de fotos não liberado pelo professor.' }

#### Frontend — AlunoDetalhe.jsx (admin)

Na tab Fotos, adicionar botão de liberar/bloquear envio:

  <button
    onClick={toggleLiberacao}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
      transition-colors ${aluno.envio_fotos_liberado
        ? 'bg-green-950 text-green-400 border border-green-800'
        : 'bg-surface-elevated text-zinc-400 border border-surface-border'
      }`}
  >
    {aluno.envio_fotos_liberado ? '🔓 Envio liberado' : '🔒 Liberar envio'}
  </button>

#### Frontend — Fotos em blocos por data (admin e aluno)

Agrupar fotos por data no frontend (se o backend já retorna agrupado, usar direto):

  // Agrupar fotos por data
  const fotosPorData = fotos.reduce((acc, foto) => {
    const data = foto.data_foto;
    if (!acc[data]) acc[data] = [];
    acc[data].push(foto);
    return acc;
  }, {});

  const datasOrdenadas = Object.keys(fotosPorData).sort().reverse();

  {datasOrdenadas.map(data => (
    <div key={data} className="mb-6">
      {/* Título do bloco com a data */}
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
        📅 {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })}
      </p>

      {/* Grid 2x2 com as posições */}
      <div className="grid grid-cols-2 gap-2">
        {['frente', 'costas', 'lado_dir', 'lado_esq'].map(pos => {
          const foto = fotosPorData[data].find(f => f.posicao === pos);
          const labels = { frente: 'Frente', costas: 'Costas', lado_dir: 'Lado Dir.', lado_esq: 'Lado Esq.' };
          return (
            <div key={pos} className="relative">
              <p className="text-zinc-600 text-xs mb-1">{labels[pos]}</p>
              {foto ? (
                <div className="relative">
                  <img src={foto.url} alt={pos}
                    className="w-full aspect-square object-cover rounded-xl bg-surface-elevated" />
                  {/* Botão excluir — apenas admin */}
                  {isAdmin && (
                    <button onClick={() => handleExcluirFoto(foto.id)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full
                        text-red-400 text-xs flex items-center justify-center">
                      🗑
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-square rounded-xl border-2 border-dashed
                  border-surface-border flex items-center justify-center text-zinc-700 text-xs">
                  Sem foto
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  ))}

#### Frontend — Perfil.jsx (aluno) — botão enviar fotos

Mostrar botão "Enviar novas fotos" apenas se envio_fotos_liberado = true:

  {aluno.envio_fotos_liberado ? (
    <button onClick={() => setModalFotos(true)}
      className="w-full flex items-center gap-4 bg-brand text-white
        font-black text-base py-4 px-6 rounded-2xl">
      ⬆ Enviar fotos
    </button>
  ) : (
    <div className="w-full bg-surface-elevated border border-surface-border
      rounded-2xl py-4 px-6 text-center">
      <p className="text-zinc-500 text-sm">Envio de fotos não liberado pelo professor.</p>
    </div>
  )}

Modal de envio de fotos com confirmação:

  {modalFotos && (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface-card border-t border-surface-border
        rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">

        <div className="flex justify-between items-center mb-4">
          <p className="text-white font-black">Enviar fotos de hoje</p>
          <button onClick={() => setModalFotos(false)} className="text-zinc-500 text-xl">✕</button>
        </div>

        {/* 4 campos de upload, um por posição */}
        {['frente', 'costas', 'lado_dir', 'lado_esq'].map(pos => {
          const labels = { frente: 'Frente', costas: 'Costas', lado_dir: 'Lado Direito', lado_esq: 'Lado Esquerdo' };
          return (
            <div key={pos} className="mb-4">
              <p className="text-zinc-400 text-sm font-bold mb-2">{labels[pos]}</p>
              <ImageUpload
                label={`Foto ${labels[pos]}`}
                preview={previews[pos]}
                onUpload={(file) => {
                  setPreviews(p => ({ ...p, [pos]: URL.createObjectURL(file) }));
                  setArquivos(a => ({ ...a, [pos]: file }));
                }}
              />
            </div>
          );
        })}

        {/* Botão confirmar envio */}
        <button
          onClick={confirmarEnvioFotos}
          disabled={Object.keys(arquivos).length === 0 || enviando}
          className="w-full bg-brand text-white font-black py-4 rounded-2xl
            disabled:opacity-40 disabled:cursor-not-allowed mt-2"
        >
          {enviando ? 'Enviando...' : `Confirmar envio (${Object.keys(arquivos).length} foto${Object.keys(arquivos).length !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  )}

  async function confirmarEnvioFotos() {
    setEnviando(true);
    try {
      await Promise.all(
        Object.entries(arquivos).map(([posicao, file]) => {
          const formData = new FormData();
          formData.append('foto', file);
          formData.append('posicao', posicao);
          return api.post('/aluno/fotos', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        })
      );
      toast.success('Fotos enviadas com sucesso!');
      setModalFotos(false);
      setPreviews({});
      setArquivos({});
      await carregarFotos();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao enviar fotos.');
    } finally {
      setEnviando(false);
    }
  }

### 5.3 — Histórico de medidas: scroll e gráfico

Tabela de medidas — garantir scroll horizontal sem vazar:

  <div className="overflow-x-auto -mx-4 px-4 scrollbar-none">
    <table className="min-w-[800px]">
      ...
    </table>
  </div>

Gráfico de medidas — permitir selecionar qual métrica visualizar
(já implementado no prompt anterior com seletor Peso / %BF / Medidas).
Garantir que o gráfico de Medidas mostra TODAS as medidas disponíveis
com scroll de legenda se necessário.

No seletor de Medidas, adicionar scroll horizontal nas linhas da legenda:
  <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
    {linhasDisponiveis.map(...)}
  </div>

### 5.4 — Faturas: corrigir scroll lateral

Na tab Faturas (Perfil.jsx aluno e AlunoDetalhe.jsx admin):

  <div className="overflow-x-auto -mx-4 px-4 scrollbar-none">
    <table className="min-w-[500px] w-full">
      <thead>
        <tr>
          <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 whitespace-nowrap">Vencimento</th>
          <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 whitespace-nowrap">Valor</th>
          <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 whitespace-nowrap">Status</th>
          <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 whitespace-nowrap">Ações</th>
        </tr>
      </thead>
      ...
    </table>
  </div>

---

## AO FINALIZAR

1. Confirme que água só aparece no Home e persiste no localStorage por dia
2. Confirme que meta de água vem do protocolo (admin define no ProtocoloBuilder)
3. Confirme que peso e reps de cada série são salvos e não resetam ao trocar de série
4. Confirme que vídeo S3 (mp4) aparece como player de vídeo, sem thumbnail
5. Confirme que observações técnicas, execução correta e errada aparecem na execução
6. Confirme que barra de progresso avança ao clicar "Concluir exercício"
7. Confirme que tela de parabéns aparece ao concluir todos os exercícios
8. Confirme que botão compartilhar usa Web Share API
9. Confirme que calendário da Dieta mostra ponto laranja em dias com treino planejado
10. Confirme que macros da refeição têm cores distintas (laranja/amarelo/azul/vermelho)
11. Confirme que tabs não scrollam para os lados (scrollbar-none + overflow-x-auto)
12. Confirme que envio de fotos só aparece se admin liberou (envio_fotos_liberado = true)
13. Confirme que fotos aparecem em blocos por data com grid 2x2
14. Confirme que M011 e M012 estão no migrate.js
15. Execute o rebuild:
    docker build --no-cache -f docker/backend.Dockerfile -t coach-backend:latest .
    docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
    docker service update --force --image coach-backend:latest coach_backend
    docker service update --force --image coach-frontend:latest coach_frontend
