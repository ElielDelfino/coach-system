import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import PageLoader from '../../components/ui/PageLoader';

function fmtNum(v) {
  return Number(v || 0).toFixed(1);
}

export default function RefeicaoDetalhe() {
  const { refeicaoId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [refeicao, setRefeicao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandidos, setExpandidos] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const protocolosRes = await api.get('/aluno/protocolos');
        const lista = protocolosRes.data || [];
        const ativo = lista.find((p) => p.ativo) || lista[0] || null;
        if (!ativo) {
          if (!cancelled) setLoading(false);
          return;
        }
        const refRes = await api.get(`/aluno/protocolos/${ativo.id}/refeicoes`);
        if (cancelled) return;
        const encontrada = (refRes.data || []).find((r) => r.id === refeicaoId);
        setRefeicao(encontrada || null);
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refeicaoId, toast]);

  function toggleExpansao(itemId) {
    setExpandidos((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface max-w-md mx-auto">
        <PageLoader mensagem="Carregando refeição..." />
      </div>
    );
  }

  if (!refeicao) {
    return (
      <div className="min-h-screen bg-surface max-w-md mx-auto flex flex-col items-center justify-center p-6">
        <p className="text-zinc-400 text-sm mb-4">Refeição não encontrada.</p>
        <button
          onClick={() => navigate('/aluno/dieta')}
          className="bg-brand text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-wide"
        >
          ← Voltar
        </button>
      </div>
    );
  }

  const itens = refeicao.itens || [];

  return (
    <div className="min-h-screen bg-surface max-w-md mx-auto">
      <div className="px-5 pt-8 pb-4">
        <button
          onClick={() => navigate('/aluno/dieta')}
          className="inline-flex items-center gap-2 bg-brand text-white
            text-xs font-black px-4 py-2 rounded-full mb-4 hover:bg-brand-dark transition-colors"
        >
          ← Voltar
        </button>
        <h1 className="text-3xl font-black text-white">{refeicao.nome}</h1>
        {refeicao.horario_sugerido && (
          <p className="text-zinc-500 text-sm mt-1">{refeicao.horario_sugerido}</p>
        )}
      </div>

      <div className="px-5 space-y-2 mb-28">
        {itens.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">
            Nenhum alimento cadastrado nessa refeição.
          </p>
        )}

        {itens.map((item) => {
          const temSubs = item.substitutos?.length > 0;
          const aberto = expandidos[item.id];
          return (
            <div
              key={item.id}
              className="bg-surface-elevated border border-surface-border rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => temSubs && toggleExpansao(item.id)}
                className="w-full flex items-center justify-between px-4 py-4 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {temSubs && (
                    <span className="text-brand text-lg shrink-0">
                      {aberto ? '↑' : '↓'}
                    </span>
                  )}
                  <p className={`font-bold text-sm truncate
                    ${temSubs ? 'text-brand' : 'text-white'}`}>
                    {item.nome_alimento}
                  </p>
                </div>
                <span className="bg-brand text-white text-xs font-black
                  px-3 py-1.5 rounded-full shrink-0 ml-2">
                  {item.quantidade_g} g
                </span>
              </button>

              {aberto && item.substitutos?.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between px-4 py-3
                    border-t border-surface-border bg-surface-card"
                >
                  <p className="text-zinc-300 text-sm">{sub.nome_alimento}</p>
                  <span className="bg-surface-elevated text-zinc-300 text-xs font-bold
                    px-3 py-1.5 rounded-full border border-surface-border">
                    {sub.quantidade_g} g
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto
        bg-surface-card border-t border-surface-border px-4 py-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Kcal', valor: refeicao.total_kcal, cor: 'text-brand',        bg: 'bg-brand/10' },
            { label: 'Carb', valor: refeicao.total_carb, cor: 'text-yellow-400',   bg: 'bg-yellow-950/40' },
            { label: 'Prot', valor: refeicao.total_prot, cor: 'text-blue-400',     bg: 'bg-blue-950/40' },
            { label: 'Gord', valor: refeicao.total_gord, cor: 'text-red-400',      bg: 'bg-red-950/40' },
          ].map((m) => (
            <div key={m.label} className={`${m.bg} rounded-xl py-2 text-center`}>
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-0.5">{m.label}</p>
              <p className={`${m.cor} font-black text-sm tabular-nums`}>
                {fmtNum(m.valor)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
