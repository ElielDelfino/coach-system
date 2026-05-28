import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { MODULOS } from '../../components/protocolo-builder/shared';
import HidratacaoCard from '../../components/protocolo-builder/HidratacaoCard';
import ModuloAlimentar from '../../components/protocolo-builder/ModuloAlimentar';
import ModuloTreino from '../../components/protocolo-builder/ModuloTreino';
import ModuloSuplementacao from '../../components/protocolo-builder/ModuloSuplementacao';
import ModuloObservacoes from '../../components/protocolo-builder/ModuloObservacoes';

export default function ProtocoloBuilder() {
  const { alunoId, id } = useParams();
  const toast = useToast();
  const [protocolo, setProtocolo] = useState(null);
  const [modulo, setModulo] = useState('alimentar');
  const [loading, setLoading] = useState(true);

  const loadProtocolo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/protocolos/${id}`);
      setProtocolo(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { loadProtocolo(); }, [loadProtocolo]);

  if (loading || !protocolo) {
    return <div className="p-4 md:p-8 text-section-label animate-pulse">Carregando…</div>;
  }

  return (
    <div className="md:flex md:h-screen">
      {/* Mobile: header + tabs horizontais */}
      <div className="md:hidden bg-surface-card border-b border-surface-border">
        <div className="px-4 py-3">
          <Link to={`/admin/alunos/${alunoId}`} className="text-xs uppercase tracking-widest text-zinc-500 hover:text-brand">
            ← Voltar ao aluno
          </Link>
          <h1 className="text-base font-black text-white mt-2 truncate">{protocolo.nome}</h1>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">{protocolo.fase}</div>
        </div>
        <div className="border-t border-surface-border">
          <div className="flex flex-wrap gap-1 px-3 py-2">
            {MODULOS.map((m) => {
              const enabled = !m.flag || protocolo[m.flag];
              return (
                <button
                  key={m.id}
                  disabled={!enabled}
                  onClick={() => setModulo(m.id)}
                  className={clsx(
                    'text-[11px] uppercase tracking-widest px-3 py-2 rounded-lg whitespace-nowrap font-bold',
                    modulo === m.id
                      ? 'bg-brand text-[#0A0A0E]'
                      : enabled
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-700 cursor-not-allowed'
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop: sidebar lateral */}
      <aside className="hidden md:flex w-60 shrink-0 bg-surface-card border-r border-surface-border flex-col">
        <div className="px-5 py-4 border-b border-surface-border">
          <Link to={`/admin/alunos/${alunoId}`} className="text-xs uppercase tracking-widest text-zinc-500 hover:text-brand">
            ← Voltar ao aluno
          </Link>
          <h1 className="text-lg font-black text-white mt-3 truncate">{protocolo.nome}</h1>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">{protocolo.fase}</div>
        </div>

        <nav className="flex-1 py-2">
          {MODULOS.map((m) => {
            const enabled = !m.flag || protocolo[m.flag];
            return (
              <button
                key={m.id}
                disabled={!enabled}
                onClick={() => setModulo(m.id)}
                className={clsx(
                  'w-full flex items-center px-5 py-2.5 text-xs uppercase tracking-widest font-bold transition-colors text-left',
                  modulo === m.id
                    ? 'border-l-2 border-brand bg-surface-elevated text-white'
                    : enabled
                    ? 'border-l-2 border-transparent text-zinc-500 hover:text-zinc-300'
                    : 'border-l-2 border-transparent text-zinc-700 cursor-not-allowed'
                )}
              >
                {m.label}
                {!enabled && <span className="ml-auto text-[9px] text-zinc-700 normal-case tracking-normal">off</span>}
              </button>
            );
          })}
        </nav>

        <HidratacaoCard protocolo={protocolo} onSaved={loadProtocolo} />
      </aside>

      {/* Conteúdo central */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6">
        {modulo === 'alimentar' && <ModuloAlimentar protocoloId={id} />}
        {modulo === 'treino' && <ModuloTreino protocoloId={id} />}
        {modulo === 'suplementacao' && <ModuloSuplementacao protocoloId={id} />}
        {modulo === 'observacoes' && <ModuloObservacoes protocolo={protocolo} onSaved={loadProtocolo} />}
      </main>
    </div>
  );
}
