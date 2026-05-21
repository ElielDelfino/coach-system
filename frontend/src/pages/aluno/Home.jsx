import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { useToast } from '../../components/ui/Toast';
import PageLoader from '../../components/ui/PageLoader';
import { useAlunoStore } from '../../store/aluno';
import {
  usePerfil,
  useProtocoloAtivo,
  useRefeicoes,
  useProgressoSemanal,
  useProximoTreino,
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

  const totalTreinos = progresso?.treinos?.meta ?? 0;
  const treinosFeitos = progresso?.treinos?.feitos ?? 0;
  const scoreSemana = progresso?.score_geral ?? 0;

  const META_AGUA = Number(protocolo?.meta_agua_litros) || 2.5;
  const pctAgua = META_AGUA > 0 ? Math.min(100, (aguaIngerida / META_AGUA) * 100) : 0;

  function salvarAgua(valor) {
    registrarAgua(dataHoje, valor);
    toast.success(`Água registrada: ${Number(valor).toFixed(1)} L`);
  }

  return (
    <div className="px-5 pt-8 pb-4">
      <p className="text-zinc-400 text-sm">{saudacao()},</p>
      <h1 className="text-3xl font-black text-white tracking-tight mb-6">
        {primeiroNome(perfil.nome)}
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-surface-card border border-surface-border rounded-2xl p-4 mb-4
          flex items-center gap-4"
      >
        <div className="w-20 h-20 shrink-0">
          <RadialBarChart
            width={80} height={80}
            innerRadius="70%" outerRadius="100%"
            data={[{ name: 'score', value: scoreSemana, fill: '#f97316' }]}
            startAngle={90} endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: '#262626' }} dataKey="value" cornerRadius={20} />
          </RadialBarChart>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Score semanal</p>
          <p className="text-white text-3xl font-black tabular-nums">{scoreSemana}</p>
          <p className="text-zinc-500 text-xs mt-1">{treinosFeitos}/{totalTreinos} treinos</p>
        </div>
      </motion.div>

      {proximoTreino && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-gradient-to-br from-zinc-900 to-zinc-950
            border border-brand/30 rounded-2xl p-5 mb-4
            hover:scale-[1.01] transition-transform"
        >
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
            Próximo treino
          </p>
          <p className="text-brand text-2xl font-black mb-3">{proximoTreino.nome}</p>
          <button
            onClick={() => navigate(`/aluno/treino/${proximoProtocoloId}/${proximoTreino.id}`)}
            className="bg-brand text-white text-xs font-black px-4 py-2 rounded-full
              uppercase tracking-wide hover:bg-brand-dark transition-colors"
          >
            Ir para o treino
          </button>
        </motion.div>
      )}

      {proximaRefeicao && (
        <div className="bg-surface-card border border-brand/30 rounded-2xl p-5 mb-4
          hover:scale-[1.01] transition-transform">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
            Próxima refeição
          </p>
          <p className="text-brand text-2xl font-black mb-3">{proximaRefeicao.nome}</p>
          <button
            onClick={() => navigate(`/aluno/dieta/${proximaRefeicao.id}`)}
            className="bg-brand text-white text-xs font-black px-4 py-2 rounded-full
              uppercase tracking-wide hover:bg-brand-dark transition-colors"
          >
            Ir para refeição
          </button>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-2xl font-black">Água</h2>
          <div className="flex items-center gap-2 border border-brand rounded-full px-3 py-1">
            <span className="text-brand text-xs">🎯</span>
            <span className="text-white font-bold text-sm">{META_AGUA} L</span>
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
              background: `linear-gradient(to right, #f97316 ${pctAgua}%, #161616 ${pctAgua}%)`,
            }}
          />
        </div>
        <p className="text-zinc-400 text-sm mt-2">{aguaIngerida.toFixed(1)} litros</p>
      </div>
    </div>
  );
}
