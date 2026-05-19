Preciso reformular completamente a área do aluno no projeto Coach System.
Leia o CLAUDE.md antes de começar.
A área do aluno deve parecer um app mobile nativo, inspirado nas referências visuais passadas.
Substituir completamente as páginas atuais do aluno.

---

## ESTRUTURA NOVA DA ÁREA DO ALUNO

Substituir o layout atual por um layout mobile-first com bottom navigation:

frontend/src/pages/aluno/
  AlunoLayout.jsx     ← layout com bottom nav fixo
  Home.jsx            ← dashboard principal
  Treino.jsx          ← lista de treinos em grid
  TreinoExecucao.jsx  ← execução de treino com timer
  Dieta.jsx           ← plano alimentar do dia
  RefeicaoDetalhe.jsx ← detalhe de uma refeição
  Perfil.jsx          ← perfil, fotos, medidas (existente — adaptar)

Rotas no App.jsx (substituir /aluno/*):
  /aluno/home
  /aluno/treino
  /aluno/treino/:protocoloId/:treinoId
  /aluno/dieta
  /aluno/dieta/:refeicaoId
  /aluno/perfil
  /aluno → redirect para /aluno/home

---

## COMPONENTE: AlunoLayout.jsx

Layout base com bottom navigation fixo:

  function AlunoLayout({ children, paginaAtiva }) {
    const navigate = useNavigate();

    const itens = [
      { id: 'home',   label: 'Home',   icone: '🏠', rota: '/aluno/home' },
      { id: 'treino', label: 'Treino', icone: '🏋️', rota: '/aluno/treino' },
      { id: 'dieta',  label: 'Dieta',  icone: '🍽️', rota: '/aluno/dieta' },
      { id: 'perfil', label: 'Perfil', icone: '👤', rota: '/aluno/perfil' },
    ];

    return (
      <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto relative">
        {/* Conteúdo com padding bottom para não ficar atrás do nav */}
        <div className="flex-1 overflow-y-auto pb-20">
          {children}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto
          bg-surface-card border-t border-surface-border z-50">
          <div className="flex items-center justify-around px-4 py-2">
            {itens.map(item => {
              const ativo = paginaAtiva === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.rota)}
                  className="flex flex-col items-center gap-1 py-2 px-4 min-w-[60px]"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center
                    ${ativo ? 'bg-brand' : 'bg-transparent'}`}>
                    <span className="text-lg">{item.icone}</span>
                  </div>
                  <span className={`text-xs font-bold
                    ${ativo ? 'text-brand' : 'text-zinc-500'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

---

## PÁGINA: Home.jsx

Consome:
- GET /api/aluno/perfil
- GET /api/aluno/protocolos (pegar o mais recente ativo)
- GET /api/aluno/protocolos/:id/treinos
- GET /api/aluno/protocolos/:id/refeicoes

  function Home() {
    // Estado local para tracker de água
    const [aguaIngerida, setAguaIngerida] = useState(0);
    const META_AGUA = 3.5; // litros — fixo por enquanto

    return (
      <AlunoLayout paginaAtiva="home">
        <div className="px-5 pt-8 pb-4">

          {/* Saudação */}
          <p className="text-zinc-400 text-sm">Bem vindo(a),</p>
          <h1 className="text-3xl font-black text-white tracking-tight mb-6">
            {aluno.nome.split(' ')[0]}
          </h1>

          {/* Card: Treinos da semana */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🏋️</span>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Treinos da semana</p>
                {/* Barra de progresso */}
                <div className="mt-2 h-2 bg-surface-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-500"
                    style={{ width: `${(treinosFeitos / totalTreinos) * 100}%` }}
                  />
                </div>
                <p className="text-zinc-500 text-xs mt-1">{treinosFeitos}/{totalTreinos}</p>
              </div>
            </div>
          </div>

          {/* Card: Próximo treino */}
          {proximoTreino && (
            <div className="bg-surface-card border border-brand/30 rounded-2xl p-5 mb-4">
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
                Próximo treino
              </p>
              <p className="text-brand text-2xl font-black mb-3">{proximoTreino.nome}</p>
              <button
                onClick={() => navigate(`/aluno/treino/${protocoloId}/${proximoTreino.id}`)}
                className="bg-brand text-white text-xs font-black px-4 py-2 rounded-full
                  uppercase tracking-wide hover:bg-brand-dark"
              >
                Ir para o treino
              </button>
            </div>
          )}

          {/* Card: Próxima refeição */}
          {proximaRefeicao && (
            <div className="bg-surface-card border border-brand/30 rounded-2xl p-5 mb-4">
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
                Próxima refeição
              </p>
              <p className="text-brand text-2xl font-black mb-3">{proximaRefeicao.nome}</p>
              <button
                onClick={() => navigate(`/aluno/dieta/${proximaRefeicao.id}`)}
                className="bg-brand text-white text-xs font-black px-4 py-2 rounded-full
                  uppercase tracking-wide hover:bg-brand-dark"
              >
                Ir para refeição
              </button>
            </div>
          )}

          {/* Tracker de água */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white text-2xl font-black">Água</h2>
              <div className="flex items-center gap-2 border border-brand rounded-full px-3 py-1">
                <span className="text-brand text-xs">🎯</span>
                <span className="text-white font-bold text-sm">{META_AGUA} L</span>
              </div>
            </div>
            <p className="text-zinc-500 text-xs mb-2">Ingerido</p>

            {/* Slider de água */}
            <div className="relative flex items-center gap-3">
              <span className="text-2xl">💧</span>
              <input
                type="range"
                min="0"
                max={META_AGUA}
                step="0.25"
                value={aguaIngerida}
                onChange={(e) => setAguaIngerida(Number(e.target.value))}
                className="flex-1 h-2 appearance-none bg-surface-elevated rounded-full
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-brand
                  [&::-webkit-slider-thumb]:cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f97316 ${(aguaIngerida/META_AGUA)*100}%, #161616 ${(aguaIngerida/META_AGUA)*100}%)`
                }}
              />
            </div>
            <p className="text-zinc-400 text-sm mt-2">{aguaIngerida.toFixed(1)} litros</p>
          </div>

        </div>
      </AlunoLayout>
    );
  }

Nota sobre "treinos feitos": por enquanto usar 0 como padrão — implementar
tracking de treinos completos em iteração futura se necessário.
"Próximo treino" = primeiro treino da lista do protocolo ativo.
"Próxima refeição" = primeira refeição da lista (por horario_sugerido se disponível).

---

## PÁGINA: Treino.jsx

Consome: GET /api/aluno/protocolos (ativo) → GET /api/aluno/protocolos/:id/treinos

  function Treino() {
    return (
      <AlunoLayout paginaAtiva="treino">
        <div className="px-5 pt-8">
          <h1 className="text-3xl font-black text-white mb-1">Treinos</h1>

          {/* Botão observações gerais */}
          {protocolo.observacoes && (
            <button
              onClick={() => setObsAberta(true)}
              className="flex items-center gap-2 border border-surface-border
                rounded-full px-3 py-1.5 text-brand text-xs font-bold mb-6"
            >
              📝 Observações gerais
            </button>
          )}

          {/* Grid de treinos */}
          <div className="grid grid-cols-2 gap-3">
            {treinos.map((treino, index) => (
              <button
                key={treino.id}
                onClick={() => navigate(`/aluno/treino/${protocoloId}/${treino.id}`)}
                className="bg-surface-elevated border border-surface-border rounded-2xl
                  p-5 text-left hover:border-brand/40 transition-colors active:scale-95"
              >
                <p className="text-white font-black text-base mb-1">{treino.nome}</p>
                <p className="text-zinc-500 text-xs">
                  {treino.exercicios?.length || 0} exercícios
                </p>
              </button>
            ))}
          </div>
        </div>
      </AlunoLayout>
    );
  }

---

## PÁGINA: TreinoExecucao.jsx

Consome: GET /api/aluno/protocolos/:protocoloId/treinos → filtrar pelo treinoId

Esta é a página mais interativa — execução exercício por exercício.

  function TreinoExecucao() {
    const { protocoloId, treinoId } = useParams();
    const [exercicioAtual, setExercicioAtual] = useState(0);
    const [serieAtual, setSerieAtual] = useState(0);
    const [timer, setTimer] = useState(null);       // tempo de descanso em segundos
    const [timerAtivo, setTimerAtivo] = useState(false);
    const [tempoTreino, setTempoTreino] = useState(0); // segundos desde início

    // Timer de treino (cronômetro crescente)
    useEffect(() => {
      const interval = setInterval(() => setTempoTreino(t => t + 1), 1000);
      return () => clearInterval(interval);
    }, []);

    // Timer de descanso (contagem regressiva)
    useEffect(() => {
      if (!timerAtivo || timer <= 0) return;
      const interval = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            setTimerAtivo(false);
            // vibrar se disponível
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }, [timerAtivo, timer]);

    function formatarTempo(segundos) {
      const m = Math.floor(segundos / 60).toString().padStart(2, '0');
      const s = (segundos % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }

    function iniciarDescanso() {
      const descanso = exercicio.descanso_seg || 60;
      setTimer(descanso);
      setTimerAtivo(true);
    }

    const exercicio = exercicios[exercicioAtual];
    if (!exercicio) return null;

    return (
      <div className="min-h-screen bg-surface max-w-md mx-auto flex flex-col">

        {/* Topbar */}
        <div className="flex items-center justify-between px-5 pt-8 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-brand text-white
              text-xs font-black px-4 py-2 rounded-full"
          >
            ← Voltar
          </button>
          <p className="text-zinc-400 text-sm">
            Tempo do treino: <span className="text-white font-bold">{formatarTempo(tempoTreino)}</span>
          </p>
        </div>

        {/* Nome do exercício */}
        <div className="flex-1 flex flex-col items-center justify-start px-5 pt-4">
          <h1 className="text-3xl font-black text-white text-center mb-6 leading-tight">
            {exercicio.nome_exercicio}
          </h1>

          {/* Séries e repetições */}
          <div className="flex flex-col gap-2 mb-6 w-full">
            {exercicio.series && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <p className="text-white text-sm">{exercicio.series} séries válidas</p>
              </div>
            )}
            {exercicio.repeticoes && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand" />
                <p className="text-white text-sm">{exercicio.repeticoes} repetições</p>
              </div>
            )}
          </div>

          {/* Seletor de série atual */}
          {exercicio.series && (
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
              {Array.from({ length: Number(exercicio.series) || 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSerieAtual(i)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-colors
                    ${serieAtual === i
                      ? 'bg-brand text-white'
                      : 'border border-brand text-brand'
                    }`}
                >
                  {i + 1}ª série
                </button>
              ))}
            </div>
          )}

          {/* Cards de peso e reps (editáveis futuramente) */}
          <div className="flex gap-3 mb-6 w-full">
            <div className="flex-1 flex items-center gap-3 border border-brand
              rounded-2xl p-4">
              <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center">
                🏋️
              </div>
              <div>
                <p className="text-zinc-400 text-xs">Peso</p>
                <p className="text-white font-black text-lg">— kg</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-3 border border-brand
              rounded-2xl p-4">
              <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center">
                📊
              </div>
              <div>
                <p className="text-zinc-400 text-xs">Reps feitas</p>
                <p className="text-white font-black text-lg">— reps</p>
              </div>
            </div>
          </div>

          {/* Botão ver vídeo */}
          {(exercicio.video_embed_url || exercicio.video_url) && (
            <button
              onClick={() => setVideoAberto(true)}
              className="flex items-center gap-2 border border-surface-border
                rounded-full px-5 py-2.5 text-brand text-sm font-bold mb-6"
            >
              ▶ Ver vídeo do exercício
            </button>
          )}

          {/* Observação do exercício */}
          {exercicio.observacao && (
            <p className="text-zinc-500 text-xs text-center mb-6 px-4">
              {exercicio.observacao}
            </p>
          )}
        </div>

        {/* Navegação entre exercícios */}
        <div className="flex items-center justify-between px-8 pb-4">
          <button
            onClick={() => { setExercicioAtual(e => Math.max(0, e - 1)); setSerieAtual(0); }}
            disabled={exercicioAtual === 0}
            className="text-white text-3xl disabled:opacity-20 p-2"
          >
            ‹
          </button>

          <p className="text-zinc-500 text-xs">
            {exercicioAtual + 1} / {exercicios.length}
          </p>

          <button
            onClick={() => { setExercicioAtual(e => Math.min(exercicios.length - 1, e + 1)); setSerieAtual(0); }}
            disabled={exercicioAtual === exercicios.length - 1}
            className="text-white text-3xl disabled:opacity-20 p-2"
          >
            ›
          </button>
        </div>

        {/* Timer de descanso */}
        <div className="flex flex-col items-center pb-10">
          <p className="text-white text-8xl font-black tracking-tighter mb-4">
            {formatarTempo(timer || (exercicio.descanso_seg || 60))}
          </p>
          <button
            onClick={timerAtivo ? () => { setTimerAtivo(false); setTimer(exercicio.descanso_seg || 60); } : iniciarDescanso}
            className="w-14 h-14 rounded-full bg-brand flex items-center justify-center
              text-2xl hover:bg-brand-dark active:scale-95 transition-all"
          >
            {timerAtivo ? '⏹' : '🔄'}
          </button>
          <p className="text-zinc-600 text-xs mt-2">
            {timerAtivo ? 'Toque para cancelar' : 'Iniciar descanso'}
          </p>
        </div>

        {/* Modal de vídeo */}
        {videoAberto && (
          <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
            <button onClick={() => setVideoAberto(false)}
              className="self-end text-white text-2xl mb-4">✕</button>
            {exercicio.video_embed_url ? (
              <iframe src={exercicio.video_embed_url} className="w-full aspect-video rounded-xl"
                allowFullScreen />
            ) : (
              <video src={exercicio.video_url} controls className="w-full rounded-xl" />
            )}
          </div>
        )}

      </div>
    );
  }

---

## PÁGINA: Dieta.jsx

Consome: GET /api/aluno/protocolos (ativo) → GET /api/aluno/protocolos/:id/refeicoes

  function Dieta() {
    const hoje = new Date();
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Gerar 7 dias centrados no hoje
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - hoje.getDay() + i);
      return d;
    });

    return (
      <AlunoLayout paginaAtiva="dieta">
        <div className="px-5 pt-6">

          {/* Calendário semanal */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {dias.map((dia, i) => {
              const isHoje = dia.toDateString() === hoje.toDateString();
              return (
                <div key={i} className={`flex flex-col items-center gap-1 min-w-[44px]
                  rounded-xl py-2 px-1 ${isHoje ? 'bg-brand' : ''}`}>
                  <span className={`text-xs font-bold ${isHoje ? 'text-white' : 'text-zinc-500'}`}>
                    {diasSemana[dia.getDay()]}
                  </span>
                  <span className={`text-base font-black ${isHoje ? 'text-white' : 'text-zinc-300'}`}>
                    {dia.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          <h1 className="text-2xl font-black text-white mb-1">Dieta do dia</h1>

          {/* Observações gerais */}
          {protocolo?.observacoes && (
            <button
              onClick={() => setObsAberta(true)}
              className="flex items-center gap-2 border border-surface-border
                rounded-full px-3 py-1.5 text-brand text-xs font-bold mb-4"
            >
              📝 Observações gerais
            </button>
          )}

          {/* Lista de refeições */}
          <div className="space-y-3 mb-6">
            {refeicoes.map(ref => (
              <button
                key={ref.id}
                onClick={() => navigate(`/aluno/dieta/${ref.id}`)}
                className="w-full flex items-center gap-4 bg-surface-elevated
                  border border-surface-border rounded-2xl px-4 py-4 text-left
                  hover:border-brand/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full border-2 border-surface-border
                  flex items-center justify-center text-zinc-600 shrink-0">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">{ref.nome}</p>
                  {ref.horario_sugerido && (
                    <p className="text-zinc-500 text-xs">{ref.horario_sugerido}</p>
                  )}
                </div>
                <p className="text-zinc-500 text-xs">{Number(ref.total_kcal || 0).toFixed(0)} kcal</p>
              </button>
            ))}
          </div>

          {/* Tracker de água */}
          <div className="mt-2 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white text-2xl font-black">Água</h2>
              <div className="flex items-center gap-2 border border-brand rounded-full px-3 py-1">
                <span className="text-brand text-xs">🎯</span>
                <span className="text-white font-bold text-sm">3,5 L</span>
              </div>
            </div>
            <p className="text-zinc-500 text-xs mb-2">Ingerido</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl">💧</span>
              <input
                type="range" min="0" max="3.5" step="0.25"
                value={aguaIngerida}
                onChange={(e) => setAguaIngerida(Number(e.target.value))}
                className="flex-1 h-2 appearance-none bg-surface-elevated rounded-full
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand"
                style={{
                  background: `linear-gradient(to right, #f97316 ${(aguaIngerida/3.5)*100}%, #161616 ${(aguaIngerida/3.5)*100}%)`
                }}
              />
            </div>
            <p className="text-zinc-400 text-sm mt-2">{aguaIngerida.toFixed(1)} litros</p>
          </div>

        </div>
      </AlunoLayout>
    );
  }

---

## PÁGINA: RefeicaoDetalhe.jsx

Consome: GET /api/aluno/protocolos/:id/refeicoes → filtrar pelo refeicaoId

  function RefeicaoDetalhe() {
    const { refeicaoId } = useParams();
    const [expandidos, setExpandidos] = useState({});

    function toggleExpansao(itemId) {
      setExpandidos(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    }

    return (
      <div className="min-h-screen bg-surface max-w-md mx-auto">
        {/* Topbar */}
        <div className="px-5 pt-8 pb-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-brand text-white
              text-xs font-black px-4 py-2 rounded-full mb-4">
            ← Voltar
          </button>
          <h1 className="text-3xl font-black text-white">{refeicao.nome}</h1>
          {refeicao.horario_sugerido && (
            <p className="text-zinc-500 text-sm mt-1">{refeicao.horario_sugerido}</p>
          )}
        </div>

        {/* Lista de itens */}
        <div className="px-5 space-y-2 mb-24">
          {refeicao.itens.map(item => (
            <div key={item.id}
              className="bg-surface-elevated border border-surface-border rounded-2xl overflow-hidden">

              {/* Item principal */}
              <button
                onClick={() => item.substitutos?.length > 0 && toggleExpansao(item.id)}
                className="w-full flex items-center justify-between px-4 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  {/* Ícone de expandir se tem substitutos */}
                  {item.substitutos?.length > 0 && (
                    <span className="text-brand text-lg">
                      {expandidos[item.id] ? '↑' : '↓'}
                    </span>
                  )}
                  <p className={`font-bold text-sm
                    ${item.substitutos?.length > 0 ? 'text-brand' : 'text-white'}`}>
                    {item.nome_alimento}
                  </p>
                </div>
                <span className="bg-brand text-white text-xs font-black
                  px-3 py-1.5 rounded-full shrink-0">
                  {item.quantidade_g} g
                </span>
              </button>

              {/* Substitutos expandidos */}
              {expandidos[item.id] && item.substitutos?.map(sub => (
                <div key={sub.id}
                  className="flex items-center justify-between px-4 py-3
                    border-t border-surface-border bg-surface-card">
                  <p className="text-zinc-300 text-sm">{sub.nome_alimento}</p>
                  <span className="bg-surface-elevated text-zinc-300 text-xs font-bold
                    px-3 py-1.5 rounded-full border border-surface-border">
                    {sub.quantidade_g} g
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Rodapé fixo com totais */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto
          bg-surface-card border-t border-surface-border px-5 py-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Kcal', valor: refeicao.total_kcal },
              { label: 'Carb', valor: refeicao.total_carb },
              { label: 'Prot', valor: refeicao.total_prot },
              { label: 'Gord', valor: refeicao.total_gord },
            ].map(m => (
              <div key={m.label}>
                <p className="text-zinc-600 text-xs uppercase tracking-wide">{m.label}</p>
                <p className="text-white font-black text-base">
                  {Number(m.valor || 0).toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

---

## PERFIL DO ALUNO: adaptar Perfil.jsx existente

Manter o conteúdo existente mas adaptar o layout:
- Usar AlunoLayout paginaAtiva="perfil"
- Remover sidebar/topbar existente
- Adicionar seção "Fotos de atualização" com botão grande estilo referência:

  <div className="mt-6">
    <h2 className="text-2xl font-black text-white mb-1">Fotos de atualização</h2>
    <p className="text-zinc-500 text-sm mb-4">
      Tire as fotos sempre com o mesmo ângulo e a mesma luz.
    </p>
    <button
      onClick={abrirModalFotos}
      className="w-full flex items-center gap-4 bg-brand text-white
        font-black text-base py-4 px-6 rounded-2xl hover:bg-brand-dark"
    >
      <span className="text-2xl">⬆</span>
      Enviar fotos
    </button>
  </div>

---

## NOVAS ROTAS NO App.jsx

Substituir rotas /aluno/* existentes por:

  import AlunoHome from './pages/aluno/Home';
  import AlunoTreino from './pages/aluno/Treino';
  import TreinoExecucao from './pages/aluno/TreinoExecucao';
  import AlunoDieta from './pages/aluno/Dieta';
  import RefeicaoDetalhe from './pages/aluno/RefeicaoDetalhe';

  <Route path="/aluno" element={<PrivateRoute role="aluno"><Navigate to="/aluno/home" /></PrivateRoute>} />
  <Route path="/aluno/home" element={<PrivateRoute role="aluno"><AlunoHome /></PrivateRoute>} />
  <Route path="/aluno/treino" element={<PrivateRoute role="aluno"><AlunoTreino /></PrivateRoute>} />
  <Route path="/aluno/treino/:protocoloId/:treinoId" element={<PrivateRoute role="aluno"><TreinoExecucao /></PrivateRoute>} />
  <Route path="/aluno/dieta" element={<PrivateRoute role="aluno"><AlunoDieta /></PrivateRoute>} />
  <Route path="/aluno/dieta/:refeicaoId" element={<PrivateRoute role="aluno"><RefeicaoDetalhe /></PrivateRoute>} />
  <Route path="/aluno/perfil" element={<PrivateRoute role="aluno"><AlunoPerfil /></PrivateRoute>} />

Após login com role=aluno, redirecionar para /aluno/home (atualizar AuthContext).

---

## AO FINALIZAR

1. Confirme que bottom navigation funciona nas 4 abas
2. Confirme que Home mostra saudação, progresso de treinos, próximo treino, próxima refeição e tracker de água
3. Confirme que Treino mostra grid de cards clicáveis
4. Confirme que TreinoExecucao tem timer de descanso com contagem regressiva
5. Confirme que Dieta tem calendário semanal e lista de refeições
6. Confirme que RefeicaoDetalhe mostra substitutos expansíveis com badge laranja de gramas
7. Confirme que Perfil usa AlunoLayout com bottom nav
8. Execute o rebuild do frontend:
   docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
   docker service update --force --image coach-frontend:latest coach_frontend
