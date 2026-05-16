import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import MacroBar from '../../components/MacroBar';

const TABS = [
  { id: 'alimentacao', label: 'Alimentação' },
  { id: 'treino', label: 'Treino' },
  { id: 'suplementacao', label: 'Suplementação' },
];

function fmt(v, d = 1) {
  if (v == null || isNaN(Number(v))) return '0';
  const n = Number(v);
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(d);
}

export default function MeuProtocolo() {
  const { id } = useParams();
  const toast = useToast();
  const [protocolo, setProtocolo] = useState(null);
  const [refeicoes, setRefeicoes] = useState([]);
  const [treinos, setTreinos] = useState([]);
  const [sups, setSups] = useState([]);
  const [tab, setTab] = useState('alimentacao');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, r, t, s] = await Promise.all([
          api.get(`/aluno/protocolos/${id}`),
          api.get(`/aluno/protocolos/${id}/refeicoes`),
          api.get(`/aluno/protocolos/${id}/treinos`),
          api.get(`/aluno/protocolos/${id}/suplementacao`),
        ]);
        setProtocolo(p.data);
        setRefeicoes(r.data);
        setTreinos(t.data);
        setSups(s.data);
      } catch (err) { toast.error(errorMessage(err)); }
      finally { setLoading(false); }
    })();
  }, [id, toast]);

  const total = useMemo(() => refeicoes.reduce((a, r) => ({
    kcal: a.kcal + Number(r.total_kcal || 0),
    prot: a.prot + Number(r.total_prot || 0),
    carb: a.carb + Number(r.total_carb || 0),
    gord: a.gord + Number(r.total_gord || 0),
  }), { kcal: 0, prot: 0, carb: 0, gord: 0 }), [refeicoes]);

  if (loading || !protocolo) {
    return <div className="p-8 text-section-label animate-pulse">Carregando…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
      <Link to="/aluno/perfil" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-brand">
        ← Meu perfil
      </Link>

      <header>
        <div className="text-section-label">Protocolo</div>
        <h1 className="text-page-title mt-1">{protocolo.nome}</h1>
        <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{protocolo.fase}</div>
      </header>

      <nav className="flex border-b border-surface-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-5 py-3 text-xs uppercase tracking-widest font-bold transition-colors -mb-px',
              tab === t.id
                ? 'text-white border-b-2 border-brand'
                : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'alimentacao' && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="text-section-label mb-3">Total do dia</div>
            <MacroBar kcal={total.kcal} prot={total.prot} carb={total.carb} gord={total.gord} />
          </Card>

          {refeicoes.length === 0 && (
            <Card className="p-8 text-center text-zinc-500 text-sm">Nenhuma refeição cadastrada.</Card>
          )}

          {refeicoes.map((r) => (
            <Card key={r.id} className="p-5">
              <header className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-section-label">Refeição {r.numero_refeicao}</div>
                  <h3 className="text-lg font-black text-white">{r.nome}</h3>
                  {r.horario_sugerido && (
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">{r.horario_sugerido}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-brand tabular-nums">{fmt(r.total_kcal)} kcal</div>
                  <div className="text-[10px] text-zinc-500 tabular-nums uppercase tracking-widest">
                    P {fmt(r.total_prot)} · C {fmt(r.total_carb)} · G {fmt(r.total_gord)}
                  </div>
                </div>
              </header>

              <ul className="divide-y divide-surface-border">
                {r.itens.map((item) => (
                  <li key={item.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{item.nome_alimento}</div>
                        <div className="text-xs text-zinc-500 tabular-nums">
                          {item.quantidade_g}g · P {fmt(item.prot_calculado)} · C {fmt(item.carb_calculado)} · G {fmt(item.gord_calculado)}
                        </div>
                      </div>
                      <div className="text-brand font-bold tabular-nums shrink-0">{fmt(item.kcal_calculado)} kcal</div>
                    </div>
                    {item.observacoes && (
                      <div className="text-xs text-zinc-500 mt-1 pl-2 border-l-2 border-surface-border">
                        {item.observacoes}
                      </div>
                    )}
                    {item.substitutos?.length > 0 && (
                      <div className="mt-2 ml-2 pl-3 border-l-2 border-brand/40">
                        <div className="text-[10px] uppercase tracking-widest text-brand mb-1">OU</div>
                        <ul className="space-y-1">
                          {item.substitutos.map((s) => (
                            <li key={s.id} className="text-xs text-zinc-400">
                              <span className="text-white">{s.nome_alimento}</span>
                              <span className="text-zinc-500 tabular-nums ml-2">{s.quantidade_g}g</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {tab === 'treino' && (
        <div className="space-y-6">
          {treinos.length === 0 && (
            <Card className="p-8 text-center text-zinc-500 text-sm">Nenhum treino cadastrado.</Card>
          )}
          {treinos.map((t) => (
            <Card key={t.id} className="p-5">
              <h3 className="text-lg font-black text-white mb-4">{t.nome}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-section-label border-b border-surface-border">
                      <th className="text-left px-2 py-2 font-semibold">Exercício</th>
                      <th className="text-center px-2 py-2 font-semibold">Séries</th>
                      <th className="text-center px-2 py-2 font-semibold">Reps.</th>
                      <th className="text-center px-2 py-2 font-semibold">Descanso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.exercicios.map((ex) => (
                      <tr key={ex.id} className={clsx('border-b border-surface-border text-zinc-300', ex.grupo_superset && 'bg-brand/5')}>
                        <td className="px-2 py-2.5">
                          {ex.grupo_superset && (
                            <span className="text-[9px] uppercase tracking-widest font-black text-brand bg-brand/20 px-1.5 py-0.5 rounded border border-brand/40 mr-2">
                              SUPER {ex.grupo_superset}
                            </span>
                          )}
                          <span className="text-[10px] uppercase tracking-widest text-zinc-600 mr-2">{ex.tipo}</span>
                          <span className="font-semibold text-white">{ex.nome_exercicio}</span>
                          {ex.observacao && <div className="text-xs text-zinc-500 mt-1">{ex.observacao}</div>}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{ex.series ?? '—'}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{ex.repeticoes ?? '—'}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{ex.descanso_seg ? `${ex.descanso_seg}s` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'suplementacao' && (
        <div className="space-y-3">
          {sups.length === 0 && (
            <Card className="p-8 text-center text-zinc-500 text-sm">Nenhum suplemento cadastrado.</Card>
          )}
          {sups.map((s) => (
            <Card key={s.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-white">{s.nome_suplemento}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  <span className="font-bold text-brand">{s.dose}</span>
                  {s.horario && <span> · {s.horario}</span>}
                </div>
                {s.observacao && <div className="text-xs text-zinc-500 mt-1">{s.observacao}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
