import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

export default function Treino() {
  const navigate = useNavigate();
  const toast = useToast();

  const [protocolo, setProtocolo] = useState(null);
  const [treinos, setTreinos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [obsAberta, setObsAberta] = useState(false);

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

        const [protocoloRes, treinosRes] = await Promise.all([
          api.get(`/aluno/protocolos/${ativo.id}`),
          api.get(`/aluno/protocolos/${ativo.id}/treinos`),
        ]);
        if (cancelled) return;
        setProtocolo(protocoloRes.data);
        setTreinos(treinosRes.data || []);
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  if (loading) {
    return <PageLoader mensagem="Carregando treinos..." />;
  }

  if (!protocolo) {
    return (
      <div className="px-5 pt-12">
        <EmptyState
          icone="🏋️"
          titulo="Nenhum protocolo ativo"
          descricao="Seu professor ainda não criou um protocolo para você."
        />
      </div>
    );
  }

  return (
    <>
      <div className="px-5 pt-8">
        <h1 className="text-3xl font-black text-white mb-3">Treinos</h1>

        {protocolo.observacoes && (
          <button
            onClick={() => setObsAberta(true)}
            className="inline-flex items-center gap-2 border border-surface-border
              rounded-full px-3 py-1.5 text-brand text-xs font-bold mb-6"
          >
            📝 Observações gerais
          </button>
        )}

        {treinos.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icone="🏋️"
              titulo="Nenhum treino cadastrado"
              descricao="Aguarde o professor cadastrar seus treinos."
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {treinos.map((treino) => (
              <button
                key={treino.id}
                onClick={() => navigate(`/aluno/treino/${protocolo.id}/${treino.id}`)}
                className="bg-surface-elevated border border-surface-border rounded-2xl
                  p-5 text-left hover:border-brand/40 transition-all active:scale-95"
              >
                <p className="text-white font-black text-base mb-1">{treino.nome}</p>
                <p className="text-zinc-500 text-xs">
                  {treino.exercicios?.length || 0} exercícios
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

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
