import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import PageLoader from '../ui/PageLoader';
import { useFeedbacksAluno, useMarcarFeedbackLido } from '../../hooks/admin/feedbacks';

const ESCALAS_LABEL = {
  humor: { label: 'Humor', icone: '😊' },
  energia: { label: 'Energia', icone: '⚡' },
  dificuldade: { label: 'Dificuldade', icone: '🔥' },
};

const EMOJIS_ESCALA = ['😖', '😕', '😐', '🙂', '🤩'];

function formatSemana(data) {
  if (!data) return '—';
  const d = new Date(String(data).slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDataHora(data) {
  if (!data) return '—';
  return new Date(data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function CardFeedback({ feedback, onMarcarLido }) {
  const [expandido, setExpandido] = useState(!feedback.lido_pelo_coach);
  const naoLido = !feedback.lido_pelo_coach;

  function marcar(e) {
    e.stopPropagation();
    onMarcarLido(feedback.id);
  }

  return (
    <motion.div
      layout
      className={`bg-surface-elevated border rounded-2xl overflow-hidden
        ${naoLido ? 'border-brand/40 shadow-lg shadow-brand/5' : 'border-surface-border'}`}
    >
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="w-full px-5 py-4 flex items-start gap-4 text-left"
      >
        <div className={`mt-1 w-2 h-2 rounded-full shrink-0
          ${naoLido ? 'bg-brand animate-pulse' : 'bg-zinc-700'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={`font-bold text-sm ${naoLido ? 'text-white' : 'text-zinc-400'}`}>
              Semana de {formatSemana(feedback.semana_inicio)}
            </p>
            {naoLido && (
              <span className="text-[9px] font-black bg-brand text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                Nova
              </span>
            )}
          </div>
          <p className={`text-sm ${naoLido ? 'text-zinc-300' : 'text-zinc-500'} line-clamp-2`}>
            {feedback.texto}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1.5">
            Enviado em {formatDataHora(feedback.created_at)}
            {feedback.lido_em && ` · Lido em ${formatDataHora(feedback.lido_em)}`}
          </p>
        </div>
        <span className="text-zinc-500 text-sm mt-1">{expandido ? '↑' : '↓'}</span>
      </button>

      <AnimatePresence initial={false}>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 border-t border-surface-border space-y-4">
              {/* Texto completo */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Mensagem completa</p>
                <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {feedback.texto}
                </p>
              </div>

              {/* Escalas */}
              {(feedback.humor || feedback.energia || feedback.dificuldade) && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Como o aluno se sentiu</p>
                  <div className="flex flex-wrap gap-2">
                    {['humor', 'energia', 'dificuldade'].map((k) => {
                      const v = feedback[k];
                      if (!v) return null;
                      const meta = ESCALAS_LABEL[k];
                      return (
                        <div key={k} className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-xl px-3 py-2">
                          <span className="text-base">{meta.icone}</span>
                          <span className="text-zinc-500 text-xs">{meta.label}</span>
                          <span className="text-lg leading-none">{EMOJIS_ESCALA[v - 1]}</span>
                          <span className="text-zinc-400 text-xs font-bold tabular-nums">{v}/5</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Medidas auto-reportadas */}
              {(feedback.peso_kg || feedback.percentual_gordura || feedback.cintura_cm) && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Medidas auto-reportadas</p>
                  <div className="grid grid-cols-3 gap-2">
                    {feedback.peso_kg != null && (
                      <div className="bg-surface-card border border-surface-border rounded-xl p-3 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Peso</p>
                        <p className="text-white font-black text-base tabular-nums mt-0.5">{Number(feedback.peso_kg).toFixed(1)}<span className="text-xs text-zinc-500"> kg</span></p>
                      </div>
                    )}
                    {feedback.percentual_gordura != null && (
                      <div className="bg-surface-card border border-surface-border rounded-xl p-3 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500">%BF</p>
                        <p className="text-white font-black text-base tabular-nums mt-0.5">{Number(feedback.percentual_gordura).toFixed(1)}<span className="text-xs text-zinc-500"> %</span></p>
                      </div>
                    )}
                    {feedback.cintura_cm != null && (
                      <div className="bg-surface-card border border-surface-border rounded-xl p-3 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Cintura</p>
                        <p className="text-white font-black text-base tabular-nums mt-0.5">{Number(feedback.cintura_cm).toFixed(1)}<span className="text-xs text-zinc-500"> cm</span></p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {naoLido && (
                <button
                  type="button"
                  onClick={marcar}
                  className="w-full bg-brand text-white font-black text-xs uppercase tracking-widest
                    py-3 rounded-xl hover:bg-brand-dark transition-colors"
                >
                  ✓ Marcar como lido
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function TabMensagens({ alunoId }) {
  const { data: feedbacks, isLoading } = useFeedbacksAluno(alunoId);
  const marcarLido = useMarcarFeedbackLido();

  if (isLoading) return <PageLoader mensagem="Carregando mensagens..." />;

  const lista = feedbacks || [];
  const naoLidos = lista.filter((f) => !f.lido_pelo_coach).length;

  if (!lista.length) {
    return (
      <EmptyState
        icone="📭"
        titulo="Nenhuma mensagem ainda"
        descricao="O aluno ainda não enviou nenhum feedback semanal."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Caixa de mensagens</p>
          <p className="text-white font-black text-lg mt-0.5">
            {lista.length} feedback{lista.length === 1 ? '' : 's'} no total
          </p>
        </div>
        {naoLidos > 0 && (
          <div className="bg-brand/20 border border-brand/40 rounded-full px-3 py-1.5">
            <p className="text-brand font-black text-sm">
              {naoLidos} não lid{naoLidos === 1 ? 'o' : 'os'}
            </p>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {lista.map((f) => (
          <CardFeedback
            key={f.id}
            feedback={f}
            onMarcarLido={(id) => marcarLido.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
