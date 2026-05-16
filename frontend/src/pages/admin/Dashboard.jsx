import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { MetricCard, Card } from '../../components/ui/Card';
import StatusBadge from '../../components/StatusBadge';

function iniciais(nome) {
  if (!nome) return '?';
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return d;
  }
}

export default function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState({ total: 0, vencendo: 0 });
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [resAtivos, resInativos, resVencendo] = await Promise.all([
          api.get('/admin/alunos', { params: { ativo: true, limit: 100 } }),
          api.get('/admin/alunos', { params: { ativo: false, limit: 100 } }),
          api.get('/admin/pagamentos', { params: { vencendo_em: 7 } }),
        ]);

        const ativos = resAtivos.data.data || [];
        const inativos = resInativos.data.data || [];

        setAlunos(ativos.slice(0, 8));
        setStats({
          total: (resAtivos.data.total || 0) + (resInativos.data.total || 0),
          ativos: ativos.filter((a) => a.status === 'ativo').length,
          inadimplentes: ativos.filter((a) => a.status === 'inadimplente').length + inativos.filter((a) => a.status === 'inadimplente').length,
          vencendo: resVencendo.data.total || 0,
        });
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <header>
        <div className="text-section-label">Visão geral</div>
        <h1 className="text-page-title mt-1">Dashboard</h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total de alunos" value={loading ? '…' : stats.total} accent />
        <MetricCard label="Ativos" value={loading ? '…' : stats.ativos ?? 0} />
        <MetricCard label="Inadimplentes" value={loading ? '…' : stats.inadimplentes ?? 0} />
        <MetricCard label="Vencendo em 7 dias" value={loading ? '…' : stats.vencendo ?? 0} />
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-section-label">Alunos recentes</h2>
          <Link
            to="/admin/alunos"
            className="text-xs uppercase tracking-widest font-bold text-brand hover:text-brand-dark"
          >
            Ver todos →
          </Link>
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-section-label border-b border-surface-border">
                <th className="text-left px-5 py-3 font-semibold">Aluno</th>
                <th className="text-left px-5 py-3 font-semibold">E-mail</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Vencimento</th>
                <th className="text-right px-5 py-3 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="text-center text-zinc-500 py-10">
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && alunos.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-zinc-500 py-10">
                    Nenhum aluno cadastrado.
                  </td>
                </tr>
              )}
              {alunos.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-surface-border text-zinc-300 hover:bg-surface-elevated transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-xs font-black text-white">
                        {iniciais(a.nome)}
                      </div>
                      <span className="font-semibold text-white">{a.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-400">{a.email}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-3 text-zinc-400 tabular-nums">
                    {formatDate(a.vencimento_plano)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to={`/admin/alunos/${a.id}`}
                      className="text-xs uppercase tracking-widest font-bold text-brand hover:text-brand-dark"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
