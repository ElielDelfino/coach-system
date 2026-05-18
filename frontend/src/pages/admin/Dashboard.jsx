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

export default function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState({ total: 0 });
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [resAtivos, resInativos] = await Promise.all([
          api.get('/admin/alunos', { params: { ativo: true, limit: 200 } }),
          api.get('/admin/alunos', { params: { ativo: false, limit: 200 } }),
        ]);

        const ativos = resAtivos.data.data || [];
        const inativos = resInativos.data.data || [];
        const todos = [...ativos, ...inativos];

        setAlunos(ativos.slice(0, 8));
        setStats({
          total: (resAtivos.data.total || 0) + (resInativos.data.total || 0),
          em_dia: todos.filter((a) => a.status === 'em_dia').length,
          inadimplentes: todos.filter((a) => a.status === 'inadimplente').length,
          neutros: todos.filter((a) => a.status === 'neutro').length,
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
        <MetricCard label="Em dia" value={loading ? '…' : stats.em_dia ?? 0} />
        <MetricCard label="Inadimplentes" value={loading ? '…' : stats.inadimplentes ?? 0} />
        <MetricCard label="Sem fatura" value={loading ? '…' : stats.neutros ?? 0} />
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
                <th className="text-left px-5 py-3 font-semibold">Tolerância</th>
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
                    {a.dias_tolerancia ?? 7} dias
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
