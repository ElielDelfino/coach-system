import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { MetricCard, Card } from '../../components/ui/Card';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonCard, SkeletonTabela } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';

function iniciais(nome) {
  if (!nome) return '?';
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function formatDateBR(d) {
  if (!d) return '';
  const [y, m, dd] = String(d).split('-');
  return `${dd}/${m}`;
}

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-bold">
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const toast = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0 });
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evolucao, setEvolucao] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [loadingGraficos, setLoadingGraficos] = useState(true);

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

  useEffect(() => {
    (async () => {
      try {
        const [ev, rs] = await Promise.all([
          api.get('/admin/dashboard/evolucao'),
          api.get('/admin/dashboard/resumo'),
        ]);
        const serie = (ev.data?.evolucao || []).map((p) => ({
          ...p,
          data_br: formatDateBR(p.data),
        }));
        setEvolucao(serie);
        setResumo(rs.data || null);
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setLoadingGraficos(false);
      }
    })();
  }, [toast]);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl">
      <header>
        <div className="text-section-label">Visão geral</div>
        <h1 className="text-page-title mt-1">Dashboard</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard label="Total de alunos" value={stats.total} accent />
            <MetricCard label="Em dia" value={stats.em_dia ?? 0} />
            <MetricCard label="Inadimplentes" value={stats.inadimplentes ?? 0} />
            <MetricCard label="Sem fatura" value={stats.neutros ?? 0} />
          </>
        )}
      </div>

      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
          Evolução média da base — últimos 90 dias
        </p>

        {loadingGraficos ? (
          <div className="text-zinc-600 text-sm text-center py-12 border border-dashed border-surface-border rounded-xl animate-pulse">
            Carregando gráficos…
          </div>
        ) : evolucao.length === 0 ? (
          <div className="text-zinc-600 text-sm text-center py-12 border border-dashed border-surface-border rounded-xl">
            Nenhuma medição registrada ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="p-5">
              <div className="text-section-label mb-3">Peso médio da base</div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucao} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
                    <XAxis dataKey="data_br" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip
                      content={<ChartTooltip formatter={(v) => `${Number(v).toFixed(1)} kg`} />}
                      cursor={{ stroke: '#404040', strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      name="Peso médio"
                      dataKey="media_peso_kg"
                      stroke="#FF1E73"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-section-label mb-3">%BF médio da base</div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolucao} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
                    <XAxis dataKey="data_br" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip
                      content={<ChartTooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />}
                      cursor={{ stroke: '#404040', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      name="%BF médio"
                      dataKey="media_percentual_gordura"
                      stroke="#FF1E73"
                      fill="#FF1E73"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {!loadingGraficos && resumo && resumo.alunos_sem_medicao_30d > 0 && (
          <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-xl p-4 flex items-center gap-3">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div>
              <p className="text-sm font-bold text-yellow-400">
                {resumo.alunos_sem_medicao_30d} aluno{resumo.alunos_sem_medicao_30d === 1 ? '' : 's'} sem medição nos últimos 30 dias
              </p>
              <p className="text-xs text-zinc-500">
                Registre medições regularmente para acompanhar a evolução.
              </p>
            </div>
          </div>
        )}
      </section>

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
        {loading ? (
          <Card className="overflow-hidden">
            <SkeletonTabela linhas={5} colunas={5} />
          </Card>
        ) : alunos.length === 0 ? (
          <EmptyState
            icone="🏋️"
            titulo="Nenhum aluno cadastrado ainda"
            descricao="Comece cadastrando seu primeiro aluno."
            acao={
              <Button onClick={() => navigate('/admin/alunos')}>
                Cadastrar aluno
              </Button>
            }
          />
        ) : (
        <>
          {/* Desktop: tabela */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
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
            </div>
          </Card>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {alunos.map((a) => (
              <Link
                key={a.id}
                to={`/admin/alunos/${a.id}`}
                className="block bg-surface-card border border-surface-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-xs font-black text-white shrink-0">
                      {iniciais(a.nome)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">{a.nome}</p>
                      <p className="text-zinc-500 text-xs truncate">{a.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest">
                  Tolerância: <span className="text-zinc-300">{a.dias_tolerancia ?? 7} dias</span>
                </div>
              </Link>
            ))}
          </div>
        </>
        )}
      </section>
    </div>
  );
}
