import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import PageLoader from '../../components/ui/PageLoader';

function fmtNum(v) {
  return Number(v || 0).toFixed(1);
}

const TROCAS_KEY_PREFIX = 'refeicao_trocas_';

function lerTrocas(refeicaoId) {
  try {
    return JSON.parse(localStorage.getItem(TROCAS_KEY_PREFIX + refeicaoId) || '{}');
  } catch { return {}; }
}

function salvarTrocas(refeicaoId, trocas) {
  localStorage.setItem(TROCAS_KEY_PREFIX + refeicaoId, JSON.stringify(trocas));
}

export default function RefeicaoDetalhe() {
  const { refeicaoId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [refeicao, setRefeicao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trocas, setTrocas] = useState(() => lerTrocas(refeicaoId));
  const [sheetItem, setSheetItem] = useState(null);

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

  function trocar(itemId, substituto) {
    const novas = { ...trocas, [itemId]: substituto.id };
    setTrocas(novas);
    salvarTrocas(refeicaoId, novas);
    setSheetItem(null);
    if (navigator.vibrate) navigator.vibrate(40);
    toast.success(`Trocado para ${substituto.nome_alimento}`);
  }

  function reverter(itemId) {
    const novas = { ...trocas };
    delete novas[itemId];
    setTrocas(novas);
    salvarTrocas(refeicaoId, novas);
    if (navigator.vibrate) navigator.vibrate(20);
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

      <div className="px-5 space-y-2 pb-28">
        {itens.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">
            Nenhum alimento cadastrado nessa refeição.
          </p>
        )}

        {itens.map((item) => {
          const trocadoId = trocas[item.id];
          const substituto = trocadoId
            ? item.substitutos?.find((s) => s.id === trocadoId)
            : null;
          const exibido = substituto || item;
          const temSubs = item.substitutos?.length > 0;

          return (
            <motion.div
              key={item.id}
              layout
              className={`bg-surface-elevated border rounded-2xl px-4 py-3.5
                ${substituto ? 'border-brand/40' : 'border-surface-border'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`font-bold text-sm truncate
                    ${substituto ? 'text-brand' : 'text-white'}`}>
                    {exibido.nome_alimento}
                  </p>
                  {substituto && (
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                      Substituindo {item.nome_alimento}
                    </p>
                  )}
                </div>
                <span className="bg-brand text-white text-xs font-black
                  px-3 py-1.5 rounded-full shrink-0">
                  {exibido.quantidade_g} g
                </span>
              </div>

              {temSubs && (
                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    onClick={() => setSheetItem(item)}
                    className="flex-1 text-xs font-bold text-zinc-400 hover:text-brand
                      border border-surface-border rounded-full py-1.5
                      transition-colors"
                  >
                    🔄 Trocar ({item.substitutos.length})
                  </button>
                  {substituto && (
                    <button
                      onClick={() => reverter(item.id)}
                      className="text-xs font-bold text-zinc-500 hover:text-white
                        border border-surface-border rounded-full px-3 py-1.5"
                    >
                      ↩
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Macros fixos no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto
        bg-surface-card border-t border-surface-border px-4 py-3 z-40"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
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

      {/* Bottom sheet de substituição */}
      <AnimatePresence>
        {sheetItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70"
            onClick={() => setSheetItem(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-md bg-surface-card border-t border-surface-border
                rounded-t-2xl px-5 pt-3"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pb-2">
                <div className="w-10 h-1 bg-zinc-700 rounded-full" />
              </div>
              <p className="text-zinc-500 text-[11px] uppercase tracking-widest mb-1">
                Trocar
              </p>
              <p className="text-white font-black text-lg mb-3">
                {sheetItem.nome_alimento}
              </p>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto -mx-1 px-1">
                {sheetItem.substitutos.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => trocar(sheetItem.id, sub)}
                    className="w-full flex items-center justify-between px-4 py-3
                      bg-surface-elevated border border-surface-border rounded-xl
                      hover:border-brand/40 transition-colors text-left"
                  >
                    <p className="text-white font-bold text-sm">{sub.nome_alimento}</p>
                    <span className="bg-surface-card text-zinc-300 text-xs font-bold
                      px-3 py-1 rounded-full border border-surface-border tabular-nums">
                      {sub.quantidade_g} g
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSheetItem(null)}
                className="w-full mt-3 py-2 text-zinc-500 text-sm"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
