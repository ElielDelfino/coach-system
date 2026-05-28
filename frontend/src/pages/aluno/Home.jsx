import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '../../components/ui/Toast';
import PageLoader from '../../components/ui/PageLoader';
import { useAlunoStore } from '../../store/aluno';
import StreakCard from '../../components/aluno/StreakCard';
import ScoreLegenda from '../../components/aluno/ScoreLegenda';
import {
  usePerfil,
  useProtocoloAtivo,
  useRefeicoes,
  useProgressoSemanal,
  useProximoTreino,
  useStreak,
} from '../../hooks/aluno/queries';

function primeiroNome(nome) {
  if (!nome) return 'Aluno';
  return nome.trim().split(/\s+/)[0];
}

function saudacao() {
  const h = new Date().getHours();
  if (h < 6) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Home() {
  const navigate = useNavigate();
  const toast = useToast();

  const perfilQ = usePerfil();
  const protocoloQ = useProtocoloAtivo();
  const refeicoesQ = useRefeicoes(protocoloQ.data?.id);
  const progressoQ = useProgressoSemanal();
  const proximoQ = useProximoTreino();
  const streakQ = useStreak();

  const dataHoje = new Date().toISOString().split('T')[0];
  const aguaIngerida = useAlunoStore((s) => s.agua[dataHoje] || 0);
  const registrarAgua = useAlunoStore((s) => s.registrarAgua);

  const proximaRefeicao = useMemo(() => {
    const lista = refeicoesQ.data || [];
    if (!lista.length) return null;
    return [...lista].sort((a, b) => {
      const ha = a.horario_sugerido || '';
      const hb = b.horario_sugerido || '';
      if (ha && hb) return ha.localeCompare(hb);
      return (a.ordem ?? 0) - (b.ordem ?? 0);
    })[0];
  }, [refeicoesQ.data]);

  if (perfilQ.isLoading || !perfilQ.data) {
    return <PageLoader mensagem="Carregando..." />;
  }

  const perfil = perfilQ.data;
  const protocolo = protocoloQ.data;
  const progresso = progressoQ.data;
  const proximoTreino = proximoQ.data?.treino || null;
  const proximoProtocoloId = proximoQ.data?.protocolo_id || protocolo?.id || null;

  const META_AGUA = Number(protocolo?.meta_agua_litros) || 2.5;
  const pctAgua = META_AGUA > 0 ? Math.min(100, (aguaIngerida / META_AGUA) * 100) : 0;

  function salvarAgua(valor) {
    registrarAgua(dataHoje, valor);
    toast.success(`Água registrada: ${Number(valor).toFixed(1)} L`);
  }

  return (
    <div className="px-5 pt-8 pb-4">
      <p className="text-zinc-400 text-[11px] font-display font-semibold uppercase tracking-widest">{saudacao()}</p>
      <h1 className="text-3xl font-display font-extrabold text-white tracking-tight mb-6">
        {primeiroNome(perfil.nome)}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <StreakCard streak={streakQ.data} />
        <ScoreLegenda progresso={progresso} />
      </div>

      {proximoTreino && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-surface-card bg-spot
            border border-brand/35 rounded-2xl p-5 mb-4 shadow-glow-magenta-sm
            hover:scale-[1.01] transition-transform"
        >
          <p className="text-brand text-xs font-display font-semibold uppercase tracking-widest mb-2">
            Próximo treino
          </p>
          <p className="text-white text-2xl font-display font-extrabold mb-3">{proximoTreino.nome}</p>
          <button
            onClick={() => navigate(`/aluno/treino/${proximoProtocoloId}/${proximoTreino.id}`)}
            className="bg-brand text-[#0A0A0E] text-xs font-display font-bold px-4 py-2 rounded-full
              uppercase tracking-wide glow-magenta-sm hover:bg-brand-light transition-colors active:scale-[0.97]"
          >
            Ir para o treino
          </button>
        </motion.div>
      )}

      {proximaRefeicao && (
        <div className="bg-surface-card border border-accent/30 rounded-2xl p-5 mb-4
          hover:scale-[1.01] transition-transform">
          <p className="text-accent text-xs font-display font-semibold uppercase tracking-widest mb-2">
            Próxima refeição
          </p>
          <p className="text-white text-2xl font-display font-extrabold mb-3">{proximaRefeicao.nome}</p>
          <button
            onClick={() => navigate(`/aluno/dieta/${proximaRefeicao.id}`)}
            className="bg-transparent text-accent border border-accent/40 text-xs font-display font-bold px-4 py-2 rounded-full
              uppercase tracking-wide hover:border-accent/70 transition-colors active:scale-[0.97]"
          >
            Ir para refeição
          </button>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-2xl font-display font-extrabold">Água</h2>
          <div className="flex items-center gap-2 border border-brand/50 rounded-full px-3 py-1">
            <span className="text-brand text-xs">🎯</span>
            <span className="text-white font-mono font-bold text-sm">{META_AGUA} L</span>
          </div>
        </div>
        <p className="text-zinc-500 text-xs mb-2">Ingerido</p>

        <div className="relative flex items-center gap-3">
          <span className="text-2xl">💧</span>
          <input
            type="range"
            min="0"
            max={META_AGUA}
            step="0.25"
            defaultValue={aguaIngerida}
            onChange={(e) => salvarAgua(Number(e.target.value))}
            className="flex-1 h-2 appearance-none rounded-full
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-brand
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-brand
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer"
            style={{
              background: `linear-gradient(to right, #FF1E73 ${pctAgua}%, #1B1B26 ${pctAgua}%)`,
            }}
          />
        </div>
        <p className="text-zinc-400 text-sm mt-2">{aguaIngerida.toFixed(1)} litros</p>
      </div>
    </div>
  );
}
