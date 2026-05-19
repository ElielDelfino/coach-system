import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast, errorMessage } from '../../components/ui/Toast';
import PageLoader from '../../components/ui/PageLoader';

function formatarTempo(segundos) {
  const seg = Math.max(0, Math.floor(segundos));
  const m = Math.floor(seg / 60).toString().padStart(2, '0');
  const s = (seg % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function TreinoExecucao() {
  const { protocoloId, treinoId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const dataHoje = new Date().toISOString().split('T')[0];
  const chaveRegistro = `treino_${treinoId}_${dataHoje}`;
  const chaveConcluidos = `concluidos_${treinoId}_${dataHoje}`;

  const [treino, setTreino] = useState(null);
  const [loading, setLoading] = useState(true);

  const [exercicioAtual, setExercicioAtual] = useState(0);
  const [serieAtual, setSerieAtual] = useState(0);

  const [timer, setTimer] = useState(0);
  const [timerAtivo, setTimerAtivo] = useState(false);
  const [tempoTreino, setTempoTreino] = useState(0);

  const [registro, setRegistro] = useState(() => {
    try { return JSON.parse(localStorage.getItem(chaveRegistro) || '{}'); }
    catch { return {}; }
  });

  const [concluidos, setConcluidos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(chaveConcluidos) || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/aluno/protocolos/${protocoloId}/treinos`);
        if (cancelled) return;
        const encontrado = (res.data || []).find((t) => t.id === treinoId);
        setTreino(encontrado || null);

        if (encontrado && user?.id) {
          const dados = {
            id: encontrado.id,
            nome: encontrado.nome,
            totalExercicios: encontrado.exercicios?.length || 0,
          };
          localStorage.setItem(`treino_dia_${user.id}_${dataHoje}`, JSON.stringify(dados));
        }
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [protocoloId, treinoId, toast, user, dataHoje]);

  useEffect(() => {
    const interval = setInterval(() => setTempoTreino((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!timerAtivo) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          setTimerAtivo(false);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerAtivo]);

  const exercicios = useMemo(() => treino?.exercicios || [], [treino]);
  const exercicio = exercicios[exercicioAtual] || null;
  const descansoPadrao = exercicio?.descanso_seg || 60;

  function atualizarRegistro(exercicioId, serie, campo, valor) {
    const novo = {
      ...registro,
      [exercicioId]: {
        ...(registro[exercicioId] || {}),
        [serie]: { ...(registro[exercicioId]?.[serie] || {}), [campo]: valor },
      },
    };
    setRegistro(novo);
    localStorage.setItem(chaveRegistro, JSON.stringify(novo));
  }

  function irParaExercicio(novoIdx) {
    setExercicioAtual(novoIdx);
    setSerieAtual(0);
    setTimer(0);
    setTimerAtivo(false);
  }

  function iniciarDescanso() {
    setTimer(descansoPadrao);
    setTimerAtivo(true);
  }

  function cancelarDescanso() {
    setTimerAtivo(false);
    setTimer(0);
  }

  function concluirExercicio() {
    if (!exercicio) return;
    const novos = [...new Set([...concluidos, exercicio.id])];
    setConcluidos(novos);
    localStorage.setItem(chaveConcluidos, JSON.stringify(novos));

    if (exercicioAtual < exercicios.length - 1) {
      const proximoIdx = exercicioAtual + 1;
      setExercicioAtual(proximoIdx);
      setSerieAtual(0);
      setTimer(exercicios[proximoIdx]?.descanso_seg || 60);
      setTimerAtivo(false);
    }
  }

  async function compartilhar() {
    const texto = `🏆 Treino concluído!\n${treino.nome} - ${exercicios.length} exercícios em ${formatarTempo(tempoTreino)}\n💪 #CoachSystem`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Treino concluído!', text: texto });
      } else {
        await navigator.clipboard.writeText(texto);
        toast.success('Texto copiado! Cole no Instagram ou WhatsApp.');
      }
    } catch {
      // compartilhamento cancelado
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface max-w-md mx-auto">
        <PageLoader mensagem="Carregando treino..." />
      </div>
    );
  }

  if (!treino || !exercicio) {
    return (
      <div className="min-h-screen bg-surface max-w-md mx-auto flex flex-col items-center justify-center p-6">
        <p className="text-zinc-400 text-sm mb-4">Treino não encontrado.</p>
        <button
          onClick={() => navigate('/aluno/treino')}
          className="bg-brand text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-wide"
        >
          ← Voltar
        </button>
      </div>
    );
  }

  const treinoConcluido =
    exercicios.length > 0 && concluidos.length >= exercicios.length;

  if (treinoConcluido) {
    return (
      <div className="min-h-screen bg-surface max-w-md mx-auto flex flex-col
        items-center justify-center px-6 text-center">
        <div className="text-8xl mb-6 animate-bounce">🏆</div>
        <h1 className="text-4xl font-black text-white mb-2">Treino concluído!</h1>
        <p className="text-brand text-xl font-bold mb-1">{treino.nome}</p>
        <p className="text-zinc-500 text-sm mb-8">
          {exercicios.length} exercícios em {formatarTempo(tempoTreino)}
        </p>

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

  const numSeries = Number(exercicio.series) || 0;
  const timerDisplay = timer > 0 ? timer : descansoPadrao;
  const exConcluido = concluidos.includes(exercicio.id);
  const pctProgresso = exercicios.length > 0
    ? (concluidos.length / exercicios.length) * 100
    : 0;

  return (
    <div className="min-h-screen bg-surface max-w-md mx-auto flex flex-col">
      <div className="flex items-center justify-between px-5 pt-8 pb-4">
        <button
          onClick={() => navigate('/aluno/treino')}
          className="flex items-center gap-2 bg-brand text-white
            text-xs font-black px-4 py-2 rounded-full hover:bg-brand-dark transition-colors"
        >
          ← Voltar
        </button>
        <p className="text-zinc-400 text-sm">
          Tempo do treino:{' '}
          <span className="text-white font-bold tabular-nums">
            {formatarTempo(tempoTreino)}
          </span>
        </p>
      </div>

      <div className="px-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-zinc-500 text-xs">
            {concluidos.length}/{exercicios.length} exercícios
          </p>
          <p className="text-zinc-500 text-xs">{Math.round(pctProgresso)}%</p>
        </div>
        <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${pctProgresso}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-5 pt-4">
        <h1 className="text-3xl font-black text-white text-center mb-6 leading-tight">
          {exercicio.nome_exercicio}
        </h1>

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

        {numSeries > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap justify-center">
            {Array.from({ length: numSeries }).map((_, i) => (
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

        <div className="flex gap-3 mb-6 w-full">
          <div className="flex-1 flex items-center gap-3 border border-brand rounded-2xl p-4">
            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white shrink-0">
              🏋️
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-400 text-xs mb-1">Peso (kg)</p>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={registro[exercicio.id]?.[serieAtual]?.peso || ''}
                onChange={(e) => atualizarRegistro(exercicio.id, serieAtual, 'peso', e.target.value)}
                className="w-full bg-transparent text-white font-black text-lg focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 flex items-center gap-3 border border-brand rounded-2xl p-4">
            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white shrink-0">
              📊
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-400 text-xs mb-1">Reps feitas</p>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={registro[exercicio.id]?.[serieAtual]?.reps || ''}
                onChange={(e) => atualizarRegistro(exercicio.id, serieAtual, 'reps', e.target.value)}
                className="w-full bg-transparent text-white font-black text-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        {exercicio.video_tipo === 'youtube' && exercicio.video_embed_url && (
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-black mb-4">
            <iframe
              src={exercicio.video_embed_url}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={exercicio.nome_exercicio}
            />
          </div>
        )}

        {exercicio.video_tipo === 's3' && exercicio.video_url && (
          <div className="w-full mb-4">
            <video
              src={exercicio.video_url}
              controls
              playsInline
              preload="metadata"
              className="w-full rounded-xl bg-black"
            >
              Seu navegador não suporta vídeos.
            </video>
          </div>
        )}

        {exercicio.observacoes_tecnicas && (
          <div className="w-full bg-surface-elevated border border-surface-border
            rounded-2xl p-4 mb-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
              Observações técnicas
            </p>
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
              {exercicio.observacoes_tecnicas}
            </p>
          </div>
        )}

        {exercicio.execucao_correta && (
          <div className="w-full bg-green-950/30 border border-green-900/50 rounded-2xl p-4 mb-4">
            <p className="text-xs uppercase tracking-widest text-green-600 mb-2">✓ Execução correta</p>
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{exercicio.execucao_correta}</p>
          </div>
        )}

        {exercicio.execucao_errada && (
          <div className="w-full bg-red-950/30 border border-red-900/50 rounded-2xl p-4 mb-4">
            <p className="text-xs uppercase tracking-widest text-red-600 mb-2">✗ Evite</p>
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{exercicio.execucao_errada}</p>
          </div>
        )}

        {exercicio.observacao && (
          <p className="text-zinc-500 text-xs text-center mb-6 px-4">
            {exercicio.observacao}
          </p>
        )}
      </div>

      <div className="px-5 mb-4">
        <button
          onClick={concluirExercicio}
          className={`w-full py-4 rounded-2xl font-black text-base
            transition-all active:scale-95
            ${exConcluido
              ? 'bg-green-900 text-green-400 border border-green-800'
              : 'bg-brand text-white hover:bg-brand-dark'
            }`}
        >
          {exConcluido ? '✓ Exercício concluído' : 'Concluir exercício'}
        </button>
      </div>

      <div className="flex items-center justify-between px-8 pb-4">
        <button
          onClick={() => irParaExercicio(Math.max(0, exercicioAtual - 1))}
          disabled={exercicioAtual === 0}
          className="text-white text-3xl disabled:opacity-20 p-2"
        >
          ‹
        </button>

        <p className="text-zinc-500 text-xs tabular-nums">
          {exercicioAtual + 1} / {exercicios.length}
        </p>

        <button
          onClick={() => irParaExercicio(Math.min(exercicios.length - 1, exercicioAtual + 1))}
          disabled={exercicioAtual === exercicios.length - 1}
          className="text-white text-3xl disabled:opacity-20 p-2"
        >
          ›
        </button>
      </div>

      <div className="flex flex-col items-center pb-10">
        <p className="text-white text-7xl font-black tracking-tighter mb-4 tabular-nums">
          {formatarTempo(timerDisplay)}
        </p>
        <button
          onClick={timerAtivo ? cancelarDescanso : iniciarDescanso}
          className="w-14 h-14 rounded-full bg-brand flex items-center justify-center
            text-2xl hover:bg-brand-dark active:scale-95 transition-all"
        >
          {timerAtivo ? '⏹' : '🔄'}
        </button>
        <p className="text-zinc-600 text-xs mt-2">
          {timerAtivo ? 'Toque para cancelar' : 'Iniciar descanso'}
        </p>
      </div>
    </div>
  );
}
