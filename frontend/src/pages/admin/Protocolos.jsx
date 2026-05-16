// Página standalone de protocolos — utilizada via Link interno (AlunoDetalhe → Protocolos tab).
// A rota /admin/alunos/:id/protocolos/:protocoloId leva direto ao ProtocoloBuilder,
// então esta página existe como utilitário/listagem caso o orquestrador prefira navegação separada.

import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}

export default function Protocolos() {
  const { alunoId } = useParams();
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/alunos/${alunoId}/protocolos`);
      setData(res.data);
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setLoading(false); }
  }, [alunoId, toast]);

  useEffect(() => { load(); }, [load]);

  async function alternar(p) {
    try {
      await api.patch(`/admin/protocolos/${p.id}/${p.ativo ? 'desativar' : 'ativar'}`);
      load();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <header>
        <Link to={`/admin/alunos/${alunoId}`} className="text-xs uppercase tracking-widest text-zinc-500 hover:text-brand">
          ← Voltar ao aluno
        </Link>
        <h1 className="text-page-title mt-3">Protocolos</h1>
      </header>

      {loading && <div className="text-section-label animate-pulse">Carregando…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!loading && data.length === 0 && (
          <Card className="md:col-span-2 p-10 text-center text-zinc-500 text-sm">
            Nenhum protocolo cadastrado para este aluno.
          </Card>
        )}
        {data.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-white truncate">{p.nome}</h3>
                <div className="text-xs text-zinc-500 uppercase tracking-widest">{p.fase || '—'}</div>
              </div>
              <span className={
                'text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ' +
                (p.ativo
                  ? 'bg-green-950 border-green-900 text-green-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500')
              }>{p.ativo ? 'Ativo' : 'Inativo'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 mb-4">
              <div>Início: <span className="text-white tabular-nums">{formatDate(p.data_inicio)}</span></div>
              <div>Fim: <span className="text-white tabular-nums">{formatDate(p.data_fim)}</span></div>
            </div>

            <div className="flex items-center gap-2">
              <Link to={`/admin/alunos/${alunoId}/protocolos/${p.id}`} className="text-xs uppercase tracking-widest font-bold text-brand hover:text-brand-dark">
                Editar →
              </Link>
              <Button variant="ghost" size="sm" onClick={() => alternar(p)} className="ml-auto">
                {p.ativo ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
