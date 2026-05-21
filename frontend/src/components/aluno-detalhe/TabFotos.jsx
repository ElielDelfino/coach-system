import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import api from '../../services/api';
import { useToast, errorMessage } from '../ui/Toast';
import { Card } from '../ui/Card';
import PageLoader from '../ui/PageLoader';
import EmptyState from '../ui/EmptyState';
import ConfirmModal from '../ui/ConfirmModal';

const POSICOES = [
  { id: 'frente', label: 'Frente' },
  { id: 'costas', label: 'Costas' },
  { id: 'lado_esq', label: 'Lado esquerdo' },
  { id: 'lado_dir', label: 'Lado direito' },
];

function formatDataExtensa(data) {
  if (!data) return '—';
  try {
    return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return data; }
}

function FotoLightbox({ foto, onClose }) {
  useEffect(() => {
    if (!foto) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [foto, onClose]);

  if (!foto) return null;

  const posLabel = POSICOES.find((p) => p.id === foto.posicao)?.label || foto.posicao;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        title="Fechar"
        className="fixed top-4 right-4 z-[51] w-10 h-10 rounded-full bg-black/70 border border-zinc-700 text-white hover:bg-zinc-800 flex items-center justify-center text-lg"
      >
        ✕
      </button>
      <img
        src={foto.url}
        alt={posLabel}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] object-contain"
      />
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/70 border border-zinc-700 rounded-md px-3 py-1.5 text-xs uppercase tracking-widest text-white">
        {posLabel} · {formatDataExtensa(foto.data)}
      </div>
    </div>
  );
}

async function baixarFoto(foto) {
  const posLabel = (POSICOES.find((p) => p.id === foto.posicao)?.label || foto.posicao)
    .toLowerCase().replace(/\s+/g, '-');
  const filename = `foto-${posLabel}-${foto.data || 'sem-data'}.jpg`;
  try {
    const res = await fetch(foto.url, { mode: 'cors' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // fallback: abre em nova aba
    const a = document.createElement('a');
    a.href = foto.url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

export default function TabFotos({ alunoId, aluno, onReload }) {
  const toast = useToast();
  const [blocos, setBlocos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState({ aberto: false, fotoId: null });
  const [deletando, setDeletando] = useState(false);
  const [togglingLib, setTogglingLib] = useState(false);
  const [lightboxFoto, setLightboxFoto] = useState(null);

  async function toggleLiberacao() {
    setTogglingLib(true);
    try {
      const novo = !aluno?.envio_fotos_liberado;
      await api.patch(`/admin/alunos/${alunoId}/liberar-fotos`, { liberado: novo });
      toast.success(novo ? 'Envio liberado.' : 'Envio bloqueado.');
      onReload?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTogglingLib(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/alunos/${alunoId}/fotos`);
      setBlocos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [alunoId, toast]);

  useEffect(() => { load(); }, [load]);

  function pedirRemover(fotoId) {
    setConfirmDel({ aberto: true, fotoId });
  }

  async function confirmarRemover() {
    const fotoId = confirmDel.fotoId;
    if (!fotoId) return;
    setDeletando(true);
    try {
      await api.delete(`/admin/alunos/${alunoId}/fotos/${fotoId}`);
      toast.success('Foto removida.');
      setConfirmDel({ aberto: false, fotoId: null });
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeletando(false);
    }
  }

  if (loading) {
    return <PageLoader mensagem="Carregando fotos..." />;
  }

  const headerLib = (
    <div className="flex justify-end mb-4">
      <button
        onClick={toggleLiberacao}
        disabled={togglingLib}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50',
          aluno?.envio_fotos_liberado
            ? 'bg-green-950 text-green-400 border border-green-800'
            : 'bg-surface-elevated text-zinc-400 border border-surface-border'
        )}
      >
        {aluno?.envio_fotos_liberado ? '🔓 Envio liberado' : '🔒 Liberar envio'}
      </button>
    </div>
  );

  if (blocos.length === 0) {
    return (
      <div>
        {headerLib}
        <EmptyState
          icone="📷"
          titulo="Nenhuma foto enviada"
          descricao="O aluno ainda não enviou fotos de progresso."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {headerLib}
      {blocos.map((bloco) => (
        <Card key={bloco.data} className="p-5">
          <div className="text-section-label mb-4">{formatDataExtensa(bloco.data)}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {POSICOES.map((pos) => {
              const foto = bloco.fotos.find((f) => f.posicao === pos.id);
              return (
                <div key={pos.id} className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600">{pos.label}</div>
                  {foto ? (
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-black border border-surface-border group">
                      <button
                        type="button"
                        onClick={() => setLightboxFoto({ ...foto, data: bloco.data })}
                        className="absolute inset-0 w-full h-full"
                        title="Abrir em tela cheia"
                      >
                        <img src={foto.url} alt={pos.label} className="w-full h-full object-cover" loading="lazy" />
                      </button>
                      <button
                        onClick={() => setLightboxFoto({ ...foto, data: bloco.data })}
                        title="Tela cheia"
                        className="absolute top-1.5 left-1.5 w-8 h-8 rounded-md bg-black/70 border border-zinc-700 text-white hover:bg-zinc-800 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                      >
                        ⤢
                      </button>
                      <button
                        onClick={() => baixarFoto({ ...foto, data: bloco.data })}
                        title="Baixar foto"
                        className="absolute bottom-1.5 left-1.5 w-8 h-8 rounded-md bg-black/70 border border-zinc-700 text-white hover:bg-zinc-800 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                      >
                        ⬇
                      </button>
                      <button
                        onClick={() => pedirRemover(foto.id)}
                        title="Excluir foto"
                        className="absolute top-1.5 right-1.5 w-8 h-8 rounded-md bg-black/70 border border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        🗑
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-[3/4] w-full rounded-md border-2 border-dashed border-surface-border flex items-center justify-center text-zinc-700 text-[10px] uppercase tracking-widest">
                      Sem foto
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <ConfirmModal
        aberto={confirmDel.aberto}
        titulo="Excluir foto?"
        descricao="Esta ação não pode ser desfeita."
        textoBotao="Excluir foto"
        variante="danger"
        carregando={deletando}
        onConfirmar={confirmarRemover}
        onCancelar={() => setConfirmDel({ aberto: false, fotoId: null })}
      />

      <FotoLightbox foto={lightboxFoto} onClose={() => setLightboxFoto(null)} />
    </div>
  );
}
