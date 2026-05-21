import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import { iniciais } from '../../components/aluno-detalhe/shared';
import TabPerfil from '../../components/aluno-detalhe/TabPerfil';
import TabMedidas from '../../components/aluno-detalhe/TabMedidas';
import TabFotos from '../../components/aluno-detalhe/TabFotos';
import TabFaturas from '../../components/aluno-detalhe/TabFaturas';
import TabProtocolos from '../../components/aluno-detalhe/TabProtocolos';

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'medidas', label: 'Medidas' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'faturas', label: 'Faturas' },
  { id: 'protocolos', label: 'Protocolos' },
];

export default function AlunoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [aluno, setAluno] = useState(null);
  const [tab, setTab] = useState('perfil');
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/alunos/${id}`);
      setAluno(res.data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setNaoEncontrado(true);
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  async function alternarAtivo() {
    try {
      const action = aluno.ativo ? 'desativar' : 'ativar';
      await api.patch(`/admin/alunos/${id}/${action}`);
      toast.success(`Aluno ${action === 'ativar' ? 'ativado' : 'desativado'}.`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (loading) {
    return <PageLoader mensagem="Carregando perfil do aluno..." />;
  }

  if (naoEncontrado || !aluno) {
    return (
      <div className="p-4 md:p-8 max-w-7xl">
        <EmptyState
          icone="❌"
          titulo="Aluno não encontrado"
          acao={<Button onClick={() => navigate('/admin/alunos')}>Voltar</Button>}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 max-w-7xl">
      <div>
        <Link to="/admin/alunos" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-brand">
          ← Voltar
        </Link>
      </div>

      <header className="flex flex-col md:flex-row md:items-start gap-4 md:gap-5">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-brand flex items-center justify-center text-lg md:text-xl font-black text-white shrink-0">
            {iniciais(aluno.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-page-title truncate">{aluno.nome}</h1>
              <StatusBadge status={aluno.status} />
            </div>
            <div className="text-zinc-400 text-sm mt-0.5 truncate">{aluno.email}</div>
            <div className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
              Tolerância: <span className="text-zinc-300 tabular-nums normal-case tracking-normal">{aluno.dias_tolerancia ?? 7} dias</span>
              <span className="mx-2 text-zinc-700">·</span>
              Plano: <span className="text-zinc-300 tabular-nums normal-case tracking-normal">{aluno.periodicidade_dias ?? 30} dias</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={aluno.ativo ? 'danger' : 'primary'} onClick={alternarAtivo}>
            {aluno.ativo ? 'Desativar aluno' : 'Ativar aluno'}
          </Button>
        </div>
      </header>

      <nav className="border-b border-surface-border -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'px-4 md:px-5 py-3 text-xs uppercase tracking-widest font-bold transition-colors -mb-px whitespace-nowrap',
                tab === t.id
                  ? 'text-white border-b-2 border-brand'
                  : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {tab === 'perfil' && <TabPerfil aluno={aluno} onReload={load} />}
      {tab === 'medidas' && <TabMedidas alunoId={id} />}
      {tab === 'fotos' && <TabFotos alunoId={id} aluno={aluno} onReload={load} />}
      {tab === 'faturas' && <TabFaturas alunoId={id} alunoTolerancia={aluno.dias_tolerancia ?? 7} onReload={load} />}
      {tab === 'protocolos' && <TabProtocolos alunoId={id} />}
    </div>
  );
}
