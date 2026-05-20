import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast, errorMessage } from '../../components/ui/Toast';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

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
  const { user } = useAuth();

  const [protocolo, setProtocolo] = useState(null);
  const [refeicoes, setRefeicoes] = useState([]);
  const [treinos, setTreinos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [obsAberta, setObsAberta] = useState(false);
  const [modalTreino, setModalTreino] = useState(false);

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const dias = gerarSemana(hoje);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const protocolosRes = await api.get('/aluno/protocolos');
        const lista = protocolosRes.data || [];
        const ativo = lista.find((p) => p.ativo) || lista[0] || null;
        if (cancelled) return;

        if (!ativo) {
          setLoading(false);
          return;
        }

        const [protocoloRes, refeicoesRes, treinosRes] = await Promise.all([
          api.get(`/aluno/protocolos/${ativo.id}`),
          api.get(`/aluno/protocolos/${ativo.id}/refeicoes`),
          api.get(`/aluno/protocolos/${ativo.id}/treinos`).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setProtocolo(protocoloRes.data);
        setRefeicoes(refeicoesRes.data || []);
        setTreinos(treinosRes.data || []);
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  function getTreinoDia(d) {
    if (!user?.id) return null;
    try {
      return JSON.parse(localStorage.getItem(`treino_dia_${user.id}_${dataStr(d)}`) || 'null');
    } catch { return null; }
  }

  function adicionarTreinoDia(treino) {
    if (!user?.id) return;
    const dia = dataStr(diaSelecionado);
    const dados = {
      id: treino.id,
      nome: treino.nome,
      totalExercicios: treino.exercicios?.length || 0,
    };
    localStorage.setItem(`treino_dia_${user.id}_${dia}`, JSON.stringify(dados));
    toast.success(`Treino ${treino.nome} adicionado para ${dia}`);
    setModalTreino(false);
  }

  function removerTreinoDia() {
    if (!user?.id) return;
    localStorage.removeItem(`treino_dia_${user.id}_${dataStr(diaSelecionado)}`);
    toast.success('Treino removido do dia.');
    // forçar render
    setDiaSelecionado(new Date(diaSelecionado));
  }

  if (loading) {
    return <PageLoader mensagem="Carregando dieta..." />;
  }

  if (!protocolo) {
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

  const isHoje = diaSelecionado.toDateString() === hoje.toDateString();
  const diaStr = dataStr(diaSelecionado);
  const aguaDia = user?.id
    ? Number(localStorage.getItem(`agua_${user.id}_${diaStr}`) || 0)
    : 0;
  const treinoDia = getTreinoDia(diaSelecionado);
  const concluidosDia = treinoDia && user?.id
    ? JSON.parse(localStorage.getItem(`concluidos_${treinoDia.id}_${diaStr}`) || '[]')
    : [];

  return (
    <>
      <div className="px-5 pt-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
          {dias.map((dia, i) => {
            const ativo = dia.toDateString() === diaSelecionado.toDateString();
            const ehHoje = dia.toDateString() === hoje.toDateString();
            const temTreino = !!getTreinoDia(dia);
            return (
              <button
                key={i}
                onClick={() => setDiaSelecionado(dia)}
                className={`flex flex-col items-center gap-1 min-w-[44px]
                  rounded-xl py-2 px-1 transition-colors
                  ${ativo ? 'bg-brand' : ehHoje ? 'border border-brand/40' : ''}`}
              >
                <span className={`text-xs font-bold ${ativo ? 'text-white' : 'text-zinc-500'}`}>
                  {DIAS_SEMANA[dia.getDay()]}
                </span>
                <span className={`text-base font-black ${ativo ? 'text-white' : 'text-zinc-300'}`}>
                  {dia.getDate()}
                </span>
                {temTreino && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${ativo ? 'bg-white' : 'bg-brand'}`} />
                )}
              </button>
            );
          })}
        </div>

        {!isHoje && (
          <div className="bg-surface-elevated border border-surface-border rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                {diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {treinoDia && (
                <button
                  onClick={removerTreinoDia}
                  className="text-zinc-500 text-xs hover:text-red-400"
                >
                  Remover treino
                </button>
              )}
            </div>

            {treinoDia ? (
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-bold">🏋️ {treinoDia.nome}</p>
                <span className="text-xs text-green-400 font-bold">
                  {concluidosDia.length}/{treinoDia.totalExercicios} exercícios
                </span>
              </div>
            ) : (
              <button
                onClick={() => setModalTreino(true)}
                className="w-full text-left text-zinc-500 text-sm mb-2 hover:text-zinc-300"
              >
                🏋️ + Adicionar treino do dia
              </button>
            )}

            <div className="flex items-center justify-between">
              <p className="text-zinc-400 text-sm">💧 Água</p>
              <p className="text-white text-sm font-bold tabular-nums">{aguaDia.toFixed(1)} L</p>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-black text-white mb-2">Dieta do dia</h1>

        {protocolo.observacoes && (
          <button
            onClick={() => setObsAberta(true)}
            className="inline-flex items-center gap-2 border border-surface-border
              rounded-full px-3 py-1.5 text-brand text-xs font-bold mb-4"
          >
            📝 Observações gerais
          </button>
        )}

        <div className="space-y-3 mb-6">
          {refeicoes.length === 0 ? (
            <EmptyState
              icone="🍽️"
              titulo="Nenhuma refeição cadastrada"
              descricao="Aguarde o professor montar sua dieta."
            />
          ) : (
            refeicoes.map((ref) => (
              <button
                key={ref.id}
                onClick={() => navigate(`/aluno/dieta/${ref.id}`)}
                className="w-full flex items-center gap-4 bg-surface-elevated
                  border border-surface-border rounded-2xl px-4 py-4 text-left
                  hover:border-brand/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full border-2 border-surface-border
                  flex items-center justify-center text-zinc-600 shrink-0 text-xs">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{ref.nome}</p>
                  {ref.horario_sugerido && (
                    <p className="text-zinc-500 text-xs">{ref.horario_sugerido}</p>
                  )}
                </div>
                <p className="text-zinc-500 text-xs tabular-nums shrink-0">
                  {Number(ref.total_kcal || 0).toFixed(0)} kcal
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {modalTreino && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="w-full max-w-md bg-surface-card border-t border-surface-border
            rounded-t-2xl p-5">
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
          {protocolo.observacoes}
        </p>
      </Modal>
    </>
  );
}
