import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, errorMessage } from '../../components/ui/Toast';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import RefeicaoCard from '../../components/aluno/RefeicaoCard';
import ProgressoRingsDia from '../../components/aluno/ProgressoRingsDia';
import {
  useProtocoloAtivo,
  useRefeicoes,
  useTreinos,
  useCheckinsDia,
  useToggleCheckin,
} from '../../hooks/aluno/queries';
import { useAlunoStore } from '../../store/aluno';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function gerarSemana(base) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);
    d.setDate(base.getDate() - base.getDay() + i);
    return d;
  });
}

function dataStr(d) {
  return d.toISOString().split('T')[0];
}

export default function Dieta() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: protocoloAtivo, isLoading: loadingProt } = useProtocoloAtivo();
  const protocoloId = protocoloAtivo?.id;
  const { data: refeicoes = [], isLoading: loadingRef } = useRefeicoes(protocoloId);
  const { data: treinos = [] } = useTreinos(protocoloId);

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const dias = gerarSemana(hoje);
  const diaStr = dataStr(diaSelecionado);
  const isHoje = diaSelecionado.toDateString() === hoje.toDateString();

  const { data: checkinsHoje = [] } = useCheckinsDia(diaStr);
  const toggleCheckin = useToggleCheckin(diaStr);

  const agua = useAlunoStore((s) => s.agua[diaStr] || 0);
  const treinoDiaMap = useAlunoStore((s) => s.treinoDia);
  const treinoDia = treinoDiaMap[diaStr] || null;
  const marcarTreinoDia = useAlunoStore((s) => s.marcarTreinoDia);
  const removerTreinoDia = useAlunoStore((s) => s.removerTreinoDia);

  const [obsAberta, setObsAberta] = useState(false);
  const [modalTreino, setModalTreino] = useState(false);

  const loading = loadingProt || (protocoloId && loadingRef);

  if (loading) {
    return <PageLoader mensagem="Carregando dieta..." />;
  }

  if (!protocoloAtivo) {
    return (
      <div className="px-5 pt-12">
        <EmptyState
          icone="🍽️"
          titulo="Nenhum protocolo ativo"
          descricao="Seu professor ainda não criou um protocolo para você."
        />
      </div>
    );
  }

  function temTreinoDia(d) {
    return !!treinoDiaMap[dataStr(d)];
  }

  function adicionarTreinoDia(treino) {
    marcarTreinoDia(diaStr, {
      id: treino.id,
      nome: treino.nome,
      totalExercicios: treino.exercicios?.length || 0,
    });
    toast.success(`Treino ${treino.nome} adicionado.`);
    setModalTreino(false);
  }

  function onToggle(refeicaoId, ativo) {
    toggleCheckin.mutate(
      { refeicaoId, ativo },
      {
        onError: (err) => toast.error(errorMessage(err)),
      }
    );
  }

  const metaAgua = Number(protocoloAtivo.meta_agua_litros || 2.5);
  const refeicoesProgress = {
    feitas: checkinsHoje.length,
    total: refeicoes.length,
  };

  return (
    <>
      <div className="px-5 pt-6 pb-6">
        {/* Seletor de semana */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
          {dias.map((dia, i) => {
            const ativo = dia.toDateString() === diaSelecionado.toDateString();
            const ehHoje = dia.toDateString() === hoje.toDateString();
            const marcado = temTreinoDia(dia);
            return (
              <button
                key={i}
                onClick={() => setDiaSelecionado(dia)}
                className={`flex flex-col items-center gap-1 min-w-[44px] rounded-xl py-2 px-1 transition-colors
                  ${ativo ? 'bg-brand' : ehHoje ? 'border border-brand/40' : ''}`}
              >
                <span className={`text-xs font-bold ${ativo ? 'text-white' : 'text-zinc-500'}`}>
                  {DIAS_SEMANA[dia.getDay()]}
                </span>
                <span className={`text-base font-black ${ativo ? 'text-white' : 'text-zinc-300'}`}>
                  {dia.getDate()}
                </span>
                {marcado && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${ativo ? 'bg-white' : 'bg-brand'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Anéis de progresso — apenas para hoje */}
        {isHoje && (
          <ProgressoRingsDia
            refeicoes={refeicoesProgress}
            treinoConcluido={!!treinoDia}
            agua={agua}
            metaAgua={metaAgua}
          />
        )}

        {/* Card resumo do dia (passado/futuro) */}
        {!isHoje && (
          <div className="bg-surface-elevated border border-surface-border rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                {diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {treinoDia && (
                <button
                  onClick={() => removerTreinoDia(diaStr)}
                  className="text-zinc-500 text-xs hover:text-red-400"
                >
                  Remover treino
                </button>
              )}
            </div>

            {treinoDia ? (
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-bold">🏋 {treinoDia.nome}</p>
                <span className="text-xs text-green-400 font-bold">
                  {treinoDia.totalExercicios} exercícios
                </span>
              </div>
            ) : (
              <button
                onClick={() => setModalTreino(true)}
                className="w-full text-left text-zinc-500 text-sm mb-2 hover:text-zinc-300"
              >
                🏋 + Adicionar treino do dia
              </button>
            )}

            <div className="flex items-center justify-between">
              <p className="text-zinc-400 text-sm">💧 Água</p>
              <p className="text-white text-sm font-bold tabular-nums">{Number(agua).toFixed(1)} L</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-black text-white">Dieta do dia</h1>
          {protocoloAtivo.observacoes && (
            <button
              onClick={() => setObsAberta(true)}
              className="inline-flex items-center gap-1.5 border border-surface-border rounded-full
                px-3 py-1 text-brand text-[11px] font-bold uppercase tracking-wider"
            >
              📝 Notas
            </button>
          )}
        </div>

        {refeicoes.length === 0 ? (
          <EmptyState
            icone="🍽️"
            titulo="Nenhuma refeição cadastrada"
            descricao="Aguarde o professor montar sua dieta."
          />
        ) : (
          <div className="space-y-2.5">
            {refeicoes.map((ref) => (
              <RefeicaoCard
                key={ref.id}
                refeicao={ref}
                feito={isHoje && checkinsHoje.includes(ref.id)}
                disabled={!isHoje}
                onToggleCheckin={() => onToggle(ref.id, checkinsHoje.includes(ref.id))}
                onAbrir={() => navigate(`/aluno/dieta/${ref.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {modalTreino && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70">
          <div className="w-full max-w-md bg-surface-card border-t border-surface-border
            rounded-t-2xl p-5"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}>
            <p className="text-white font-black mb-4">Selecionar treino para o dia</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {treinos.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-4">
                  Nenhum treino disponível no protocolo.
                </p>
              )}
              {treinos.map((t) => (
                <button
                  key={t.id}
                  onClick={() => adicionarTreinoDia(t)}
                  className="w-full text-left px-4 py-3 bg-surface-elevated border
                    border-surface-border rounded-xl text-white font-bold text-sm
                    hover:border-brand/40"
                >
                  {t.nome}
                </button>
              ))}
            </div>
            <button
              onClick={() => setModalTreino(false)}
              className="w-full mt-3 py-2 text-zinc-500 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <Modal
        open={obsAberta}
        onClose={() => setObsAberta(false)}
        title="Observações gerais"
      >
        <p className="text-zinc-300 text-sm whitespace-pre-wrap">
          {protocoloAtivo.observacoes}
        </p>
      </Modal>
    </>
  );
}
