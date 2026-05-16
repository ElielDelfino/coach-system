import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import MacroBar from '../../components/MacroBar';
import { Field } from './Alunos';

const MODULOS = [
  { id: 'alimentar', label: 'Alimentar', flag: 'modulo_alimentar' },
  { id: 'treino', label: 'Treino', flag: 'modulo_treino' },
  { id: 'cardio', label: 'Cardio', flag: 'modulo_cardio' },
  { id: 'suplementacao', label: 'Suplementação', flag: 'modulo_suplementacao' },
  { id: 'observacoes', label: 'Observações', flag: null },
];

function fmt(v, d = 1) {
  if (v == null || isNaN(Number(v))) return '0';
  const n = Number(v);
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(d);
}

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
    return <div className="p-8 text-section-label animate-pulse">Carregando…</div>;
  }

  return (
    <div className="flex h-screen">
      {/* Coluna esquerda — módulos */}
      <aside className="w-60 shrink-0 bg-surface-card border-r border-surface-border flex flex-col">
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
      </aside>

      {/* Conteúdo central */}
      <main className="flex-1 min-w-0 overflow-y-auto p-6">
        {modulo === 'alimentar' && <ModuloAlimentar protocoloId={id} />}
        {modulo === 'treino' && <ModuloTreino protocoloId={id} />}
        {modulo === 'cardio' && <ModuloCardio />}
        {modulo === 'suplementacao' && <ModuloSuplementacao protocoloId={id} />}
        {modulo === 'observacoes' && <ModuloObservacoes protocolo={protocolo} onSaved={loadProtocolo} />}
      </main>
    </div>
  );
}

// ─── Módulo Alimentar ────────────────────────────────────────────────────────

function ModuloAlimentar({ protocoloId }) {
  const toast = useToast();
  const [refeicoes, setRefeicoes] = useState([]);
  const [refAtivaId, setRefAtivaId] = useState(null);
  const [openNova, setOpenNova] = useState(false);
  const [openDuplicar, setOpenDuplicar] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/protocolos/${protocoloId}/refeicoes`);
      setRefeicoes(res.data);
      if (res.data.length && !refAtivaId) setRefAtivaId(res.data[0].id);
      if (refAtivaId && !res.data.find((r) => r.id === refAtivaId)) {
        setRefAtivaId(res.data[0]?.id || null);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [protocoloId, refAtivaId, toast]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [protocoloId]);

  const refAtiva = refeicoes.find((r) => r.id === refAtivaId);
  const totalProto = useMemo(() => refeicoes.reduce((acc, r) => ({
    kcal: acc.kcal + Number(r.total_kcal || 0),
    prot: acc.prot + Number(r.total_prot || 0),
    carb: acc.carb + Number(r.total_carb || 0),
    gord: acc.gord + Number(r.total_gord || 0),
  }), { kcal: 0, prot: 0, carb: 0, gord: 0 }), [refeicoes]);

  async function removerRefeicao(refId) {
    if (!confirm('Remover esta refeição e todos seus itens?')) return;
    try {
      await api.delete(`/admin/refeicoes/${refId}`);
      toast.success('Refeição removida.');
      load();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 min-w-0 space-y-4">
        <header>
          <div className="text-section-label">Módulo</div>
          <h2 className="text-page-title mt-1">Alimentação</h2>
        </header>

        {/* Tabs de refeições */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {loading && <div className="text-zinc-500 text-sm">Carregando…</div>}
          {refeicoes.map((r) => (
            <button
              key={r.id}
              onClick={() => setRefAtivaId(r.id)}
              className={clsx(
                'shrink-0 px-3 py-2 rounded-md text-xs uppercase tracking-widest font-bold transition-colors border',
                refAtivaId === r.id
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface-elevated text-zinc-400 border-surface-border hover:text-white'
              )}
            >
              {r.numero_refeicao}. {r.nome}
            </button>
          ))}
          <button
            onClick={() => setOpenNova(true)}
            className="shrink-0 px-3 py-2 rounded-md text-xs uppercase tracking-widest font-bold text-brand border-2 border-dashed border-brand/40 hover:bg-brand/10"
          >
            + Nova
          </button>
        </div>

        {refAtiva ? (
          <RefeicaoEditor
            refeicao={refAtiva}
            onChange={load}
            onDuplicate={() => setOpenDuplicar(refAtiva)}
            onDelete={() => removerRefeicao(refAtiva.id)}
          />
        ) : (
          <Card className="p-10 text-center text-zinc-500 text-sm">
            Crie a primeira refeição para começar.
          </Card>
        )}
      </div>

      {/* Coluna direita — resumo nutricional */}
      <aside className="w-72 shrink-0 space-y-4">
        <Card className="p-5 sticky top-0">
          <div className="text-section-label">Total do protocolo</div>
          <div className="mt-3">
            <MacroBar
              kcal={totalProto.kcal}
              prot={totalProto.prot}
              carb={totalProto.carb}
              gord={totalProto.gord}
            />
          </div>
          <div className="border-t border-surface-border mt-5 pt-4 space-y-2">
            <div className="text-section-label">Por refeição</div>
            {refeicoes.map((r) => (
              <div key={r.id} className="flex items-baseline justify-between text-sm">
                <span className="text-zinc-400 truncate">{r.numero_refeicao}. {r.nome}</span>
                <span className="text-white font-bold tabular-nums shrink-0">{fmt(r.total_kcal)} kcal</span>
              </div>
            ))}
            {refeicoes.length === 0 && (
              <div className="text-xs text-zinc-600">Nenhuma refeição.</div>
            )}
          </div>
        </Card>
      </aside>

      <NovaRefeicaoModal
        open={openNova}
        onClose={() => setOpenNova(false)}
        protocoloId={protocoloId}
        proximoNumero={Math.max(0, ...refeicoes.map((r) => r.numero_refeicao)) + 1}
        onCreated={() => { setOpenNova(false); load(); }}
      />

      <DuplicarRefeicaoModal
        open={!!openDuplicar}
        onClose={() => setOpenDuplicar(null)}
        refeicao={openDuplicar}
        proximoNumero={Math.max(0, ...refeicoes.map((r) => r.numero_refeicao)) + 1}
        onDuplicated={() => { setOpenDuplicar(null); load(); }}
      />
    </div>
  );
}

function RefeicaoEditor({ refeicao, onChange, onDuplicate, onDelete }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [openAddItem, setOpenAddItem] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [orderedItens, setOrderedItens] = useState(refeicao.itens || []);

  useEffect(() => {
    setForm({ nome: refeicao.nome, horario_sugerido: refeicao.horario_sugerido || '' });
    setOrderedItens(refeicao.itens || []);
  }, [refeicao]);

  async function salvarMeta() {
    try {
      await api.put(`/admin/refeicoes/${refeicao.id}`, form);
      toast.success('Refeição atualizada.');
      setEditing(false);
      onChange();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  async function removerItem(itemId) {
    if (!confirm('Remover este item?')) return;
    try {
      await api.delete(`/admin/refeicoes/${refeicao.id}/itens/${itemId}`);
      onChange();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  // Drag and drop nativo
  function onDragStart(id) { setDraggedId(id); }
  function onDragOver(e, overId) {
    e.preventDefault();
    if (!draggedId || draggedId === overId) return;
    const arr = [...orderedItens];
    const fromIdx = arr.findIndex((i) => i.id === draggedId);
    const toIdx = arr.findIndex((i) => i.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    setOrderedItens(arr);
  }
  async function onDragEnd() {
    if (!draggedId) return;
    setDraggedId(null);
    const payload = orderedItens.map((i, idx) => ({ id: i.id, ordem: idx }));
    try {
      await api.patch(`/admin/refeicoes/${refeicao.id}/itens/reordenar`, { ordem: payload });
      onChange();
    } catch (err) {
      toast.error(errorMessage(err));
      onChange();
    }
  }

  return (
    <Card className="p-5">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="grid grid-cols-2 gap-2">
              <Input value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              <Input value={form.horario_sugerido || ''} onChange={(e) => setForm({ ...form, horario_sugerido: e.target.value })} placeholder="07:00" />
            </div>
          ) : (
            <>
              <h3 className="text-xl font-black text-white">{refeicao.nome}</h3>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">
                {refeicao.horario_sugerido || 'Sem horário definido'}
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button size="sm" onClick={salvarMeta}>Salvar</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Editar</Button>
              <Button variant="secondary" size="sm" onClick={onDuplicate}>Duplicar</Button>
              <Button variant="danger" size="sm" onClick={onDelete}>Remover</Button>
            </>
          )}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-section-label border-b border-surface-border">
              <th className="text-left px-3 py-2 font-semibold w-8"></th>
              <th className="text-left px-3 py-2 font-semibold">Alimento</th>
              <th className="text-right px-3 py-2 font-semibold">Qtd (g)</th>
              <th className="text-right px-3 py-2 font-semibold">Kcal</th>
              <th className="text-right px-3 py-2 font-semibold">Prot</th>
              <th className="text-right px-3 py-2 font-semibold">Carb</th>
              <th className="text-right px-3 py-2 font-semibold">Gord</th>
              <th className="text-right px-3 py-2 font-semibold w-20">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orderedItens.length === 0 && (
              <tr><td colSpan={8} className="text-center text-zinc-500 py-8">Nenhum item nesta refeição.</td></tr>
            )}
            {orderedItens.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                refeicaoId={refeicao.id}
                onChange={onChange}
                onRemove={() => removerItem(item.id)}
                draggable
                onDragStart={() => onDragStart(item.id)}
                onDragOver={(e) => onDragOver(e, item.id)}
                onDragEnd={onDragEnd}
                isDragging={draggedId === item.id}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-elevated border-t-2 border-surface-border">
              <td colSpan={2} className="px-3 py-3 text-section-label">TOTAL</td>
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3 text-right text-xl font-black text-brand tabular-nums">{fmt(refeicao.total_kcal)}</td>
              <td className="px-3 py-3 text-right text-sky-400 tabular-nums">{fmt(refeicao.total_prot)}</td>
              <td className="px-3 py-3 text-right text-amber-400 tabular-nums">{fmt(refeicao.total_carb)}</td>
              <td className="px-3 py-3 text-right text-rose-400 tabular-nums">{fmt(refeicao.total_gord)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4">
        <Button onClick={() => setOpenAddItem(true)}>+ Adicionar alimento</Button>
      </div>

      <AdicionarItemModal
        open={openAddItem}
        onClose={() => setOpenAddItem(false)}
        refeicaoId={refeicao.id}
        proximoOrdem={orderedItens.length}
        onAdded={() => { setOpenAddItem(false); onChange(); }}
      />
    </Card>
  );
}

function ItemRow({ item, refeicaoId, onChange, onRemove, isDragging, ...dragProps }) {
  const toast = useToast();
  const [qtd, setQtd] = useState(item.quantidade_g);
  const [showSubst, setShowSubst] = useState(false);

  async function salvarQtd() {
    if (Number(qtd) === Number(item.quantidade_g)) return;
    try {
      await api.put(`/admin/refeicoes/${refeicaoId}/itens/${item.id}`, { quantidade_g: Number(qtd) });
      onChange();
    } catch (err) {
      toast.error(errorMessage(err));
      setQtd(item.quantidade_g);
    }
  }

  return (
    <>
      <tr
        className={clsx(
          'border-b border-surface-border text-zinc-300 cursor-move transition-opacity',
          isDragging && 'opacity-40'
        )}
        {...dragProps}
      >
        <td className="px-3 py-2 text-center text-zinc-700">⋮⋮</td>
        <td className="px-3 py-2">
          <div className="font-semibold text-white">{item.nome_alimento}</div>
          {item.substitutos?.length > 0 && (
            <div className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">
              {item.substitutos.length} substituto(s)
            </div>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <Input
            type="number" step="1"
            className="w-20 text-right tabular-nums py-1 text-xs ml-auto"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
            onBlur={salvarQtd}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          />
        </td>
        <td className="px-3 py-2 text-right font-bold text-brand tabular-nums">{fmt(item.kcal_calculado)}</td>
        <td className="px-3 py-2 text-right text-sky-400 tabular-nums">{fmt(item.prot_calculado)}</td>
        <td className="px-3 py-2 text-right text-amber-400 tabular-nums">{fmt(item.carb_calculado)}</td>
        <td className="px-3 py-2 text-right text-rose-400 tabular-nums">{fmt(item.gord_calculado)}</td>
        <td className="px-3 py-2 text-right">
          <div className="flex gap-1 justify-end">
            <button onClick={() => setShowSubst((s) => !s)} title="Substitutos"
              className="text-zinc-500 hover:text-brand text-xs px-1.5 py-0.5 border border-surface-border rounded">+</button>
            <button onClick={onRemove} title="Remover"
              className="text-zinc-500 hover:text-red-400 text-xs px-1.5 py-0.5 border border-surface-border rounded">×</button>
          </div>
        </td>
      </tr>
      {showSubst && (
        <tr className="bg-surface-input border-b border-surface-border">
          <td></td>
          <td colSpan={7} className="px-3 py-3">
            <SubstitutosPanel item={item} refeicaoId={refeicaoId} onChange={onChange} />
          </td>
        </tr>
      )}
    </>
  );
}

function SubstitutosPanel({ item, refeicaoId, onChange }) {
  const toast = useToast();
  const [openSearch, setOpenSearch] = useState(false);

  async function adicionar(alimento, quantidade_g) {
    try {
      await api.post(`/admin/refeicoes/${refeicaoId}/itens/${item.id}/substitutos`, {
        alimento_id: alimento.id,
        quantidade_g: Number(quantidade_g),
      });
      toast.success('Substituto adicionado.');
      setOpenSearch(false);
      onChange();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  async function remover(subId) {
    try {
      await api.delete(`/admin/refeicoes/${refeicaoId}/itens/${item.id}/substitutos/${subId}`);
      onChange();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  return (
    <div>
      <div className="text-section-label mb-2">Substitutos para {item.nome_alimento}</div>
      <div className="space-y-1.5">
        {(item.substitutos || []).map((s) => (
          <div key={s.id} className="flex items-center justify-between bg-surface-card border border-surface-border rounded px-3 py-1.5 text-xs">
            <div>
              <span className="text-white font-semibold">{s.nome_alimento}</span>
              <span className="text-zinc-500 ml-2 tabular-nums">{s.quantidade_g}g</span>
            </div>
            <button onClick={() => remover(s.id)} className="text-zinc-500 hover:text-red-400">×</button>
          </div>
        ))}
        {item.substitutos?.length === 0 && (
          <div className="text-xs text-zinc-600">Nenhum substituto cadastrado.</div>
        )}
      </div>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => setOpenSearch(true)}>
        + Adicionar substituto
      </Button>
      <BuscaAlimentoModal
        open={openSearch}
        onClose={() => setOpenSearch(false)}
        onSelect={adicionar}
      />
    </div>
  );
}

function AdicionarItemModal({ open, onClose, refeicaoId, proximoOrdem, onAdded }) {
  const toast = useToast();

  async function adicionar(alimento, quantidade_g, observacoes) {
    try {
      await api.post(`/admin/refeicoes/${refeicaoId}/itens`, {
        alimento_id: alimento.id,
        quantidade_g: Number(quantidade_g),
        ordem: proximoOrdem,
        observacoes: observacoes || undefined,
      });
      toast.success('Item adicionado.');
      onAdded();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  return (
    <BuscaAlimentoModal open={open} onClose={onClose} onSelect={adicionar} withObs />
  );
}

function BuscaAlimentoModal({ open, onClose, onSelect, withObs = false }) {
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [qtd, setQtd] = useState('');
  const [obs, setObs] = useState('');

  useEffect(() => {
    if (!open) return;
    setBusca(''); setData([]); setSelected(null); setQtd(''); setObs('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/admin/alimentos', { params: { busca: busca || undefined } });
        setData(res.data.data || []);
      } catch (err) { toast.error(errorMessage(err)); }
    }, 250);
    return () => clearTimeout(t);
  }, [open, busca, toast]);

  // Preview de macros (visual, não persistido — servidor é fonte da verdade)
  const preview = useMemo(() => {
    if (!selected || !qtd) return null;
    const f = Number(qtd) / Number(selected.quantidade_base);
    return {
      kcal: Number(selected.calorias) * f,
      prot: Number(selected.proteinas) * f,
      carb: Number(selected.carboidratos) * f,
      gord: Number(selected.gorduras) * f,
    };
  }, [selected, qtd]);

  function confirmar() {
    if (!selected) { toast.error('Selecione um alimento.'); return; }
    if (!qtd || Number(qtd) <= 0) { toast.error('Informe a quantidade.'); return; }
    onSelect(selected, qtd, obs);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buscar alimento"
      size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={confirmar} disabled={!selected || !qtd}>Adicionar</Button>
      </>}
    >
      <div className="space-y-3">
        <Input autoFocus placeholder="Buscar alimento na biblioteca…" value={busca} onChange={(e) => setBusca(e.target.value)} />

        <Card className="max-h-64 overflow-y-auto">
          {data.length === 0 && (
            <div className="text-center text-zinc-500 py-8 text-sm">Nenhum resultado.</div>
          )}
          {data.map((a) => (
            <button
              key={a.id}
              onClick={() => { setSelected(a); if (!qtd) setQtd(a.quantidade_base); }}
              className={clsx(
                'w-full text-left px-4 py-2.5 text-sm border-b border-surface-border transition-colors',
                selected?.id === a.id
                  ? 'bg-brand/10 border-l-2 border-l-brand'
                  : 'hover:bg-surface-elevated'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{a.nome}</div>
                  <div className="text-xs text-zinc-500">{a.categoria || '—'} · {a.quantidade_base}{a.unidade === 'gramas' ? 'g' : ` ${a.unidade}`}</div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-brand font-bold tabular-nums">{a.calorias} kcal</div>
                  <div className="text-zinc-500 tabular-nums">P {a.proteinas} · C {a.carboidratos} · G {a.gorduras}</div>
                </div>
              </div>
            </button>
          ))}
        </Card>

        {selected && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-surface-border">
            <Field label={`Quantidade (${selected.unidade})`}>
              <Input type="number" step="0.1" value={qtd} onChange={(e) => setQtd(e.target.value)} autoFocus />
            </Field>
            {withObs && (
              <Field label="Observações">
                <Input value={obs} onChange={(e) => setObs(e.target.value)} />
              </Field>
            )}
            {preview && (
              <div className="col-span-2 bg-surface-input border border-surface-border rounded-md p-3">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
                  Preview · {qtd}{selected.unidade === 'gramas' ? 'g' : ` ${selected.unidade}`} de {selected.nome}
                </div>
                <MacroBar kcal={preview.kcal} prot={preview.prot} carb={preview.carb} gord={preview.gord} compact />
                <div className="text-[10px] text-zinc-600 mt-2">
                  * Valores definitivos virão do servidor após salvar.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function NovaRefeicaoModal({ open, onClose, protocoloId, proximoNumero, onCreated }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ numero_refeicao: proximoNumero, nome: '', horario_sugerido: '' });

  useEffect(() => {
    if (open) setForm({ numero_refeicao: proximoNumero, nome: '', horario_sugerido: '' });
  }, [open, proximoNumero]);

  async function salvar() {
    if (!form.nome || !form.numero_refeicao) { toast.error('Número e nome são obrigatórios.'); return; }
    setSaving(true);
    try {
      await api.post(`/admin/protocolos/${protocoloId}/refeicoes`, {
        numero_refeicao: Number(form.numero_refeicao),
        nome: form.nome,
        horario_sugerido: form.horario_sugerido || undefined,
        ordem: form.numero_refeicao - 1,
      });
      toast.success('Refeição criada.');
      onCreated();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Nova refeição"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Criar'}</Button>
      </>}
    >
      <div className="grid grid-cols-3 gap-3">
        <Field label="Número *">
          <Input type="number" value={form.numero_refeicao} onChange={(e) => setForm({ ...form, numero_refeicao: e.target.value })} />
        </Field>
        <div className="col-span-2">
          <Field label="Nome *">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Café da manhã, almoço…" />
          </Field>
        </div>
        <div className="col-span-3">
          <Field label="Horário sugerido">
            <Input value={form.horario_sugerido} onChange={(e) => setForm({ ...form, horario_sugerido: e.target.value })} placeholder="07:00" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function DuplicarRefeicaoModal({ open, onClose, refeicao, proximoNumero, onDuplicated }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [destino, setDestino] = useState(proximoNumero);

  useEffect(() => {
    if (open) setDestino(proximoNumero);
  }, [open, proximoNumero]);

  async function duplicar() {
    if (!destino) { toast.error('Informe o número de destino.'); return; }
    setSaving(true);
    try {
      await api.post(`/admin/refeicoes/${refeicao.id}/duplicar`, { numero_refeicao_destino: Number(destino) });
      toast.success('Refeição duplicada.');
      onDuplicated();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Duplicar refeição"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={duplicar} disabled={saving}>{saving ? 'Duplicando…' : 'Duplicar'}</Button>
      </>}
    >
      <div className="space-y-3">
        <div className="text-sm text-zinc-400">
          Duplicar <span className="text-white font-semibold">{refeicao?.nome}</span> com todos os seus itens e substitutos.
        </div>
        <Field label="Número da refeição de destino *">
          <Input type="number" value={destino} onChange={(e) => setDestino(e.target.value)} autoFocus />
        </Field>
      </div>
    </Modal>
  );
}

// ─── Módulo Treino ───────────────────────────────────────────────────────────

function ModuloTreino({ protocoloId }) {
  const toast = useToast();
  const [treinos, setTreinos] = useState([]);
  const [treinoAtivoId, setTreinoAtivoId] = useState(null);
  const [openNovo, setOpenNovo] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/protocolos/${protocoloId}/treinos`);
      setTreinos(res.data);
      if (res.data.length && !treinoAtivoId) setTreinoAtivoId(res.data[0].id);
    } catch (err) { toast.error(errorMessage(err)); }
  }, [protocoloId, treinoAtivoId, toast]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [protocoloId]);

  async function removerTreino(treinoId) {
    if (!confirm('Remover este treino?')) return;
    try {
      await api.delete(`/admin/treinos/${treinoId}`);
      toast.success('Treino removido.');
      if (treinoAtivoId === treinoId) setTreinoAtivoId(null);
      load();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  const treinoAtivo = treinos.find((t) => t.id === treinoAtivoId);

  return (
    <div className="space-y-4">
      <header>
        <div className="text-section-label">Módulo</div>
        <h2 className="text-page-title mt-1">Treino</h2>
      </header>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {treinos.map((t) => (
          <button
            key={t.id}
            onClick={() => setTreinoAtivoId(t.id)}
            className={clsx(
              'shrink-0 px-3 py-2 rounded-md text-xs uppercase tracking-widest font-bold border transition-colors',
              treinoAtivoId === t.id
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-elevated text-zinc-400 border-surface-border hover:text-white'
            )}
          >
            {t.nome}
          </button>
        ))}
        <button
          onClick={() => setOpenNovo(true)}
          className="shrink-0 px-3 py-2 rounded-md text-xs uppercase tracking-widest font-bold text-brand border-2 border-dashed border-brand/40 hover:bg-brand/10"
        >
          + Novo
        </button>
      </div>

      {treinoAtivo ? (
        <TreinoEditor treino={treinoAtivo} onChange={load} onDelete={() => removerTreino(treinoAtivo.id)} />
      ) : (
        <Card className="p-10 text-center text-zinc-500 text-sm">
          Crie o primeiro treino para começar.
        </Card>
      )}

      <NovoTreinoModal
        open={openNovo}
        onClose={() => setOpenNovo(false)}
        protocoloId={protocoloId}
        proximoOrdem={treinos.length}
        onCreated={() => { setOpenNovo(false); load(); }}
      />
    </div>
  );
}

function TreinoEditor({ treino, onChange, onDelete }) {
  const toast = useToast();
  const [openAdd, setOpenAdd] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [ordered, setOrdered] = useState(treino.exercicios || []);

  useEffect(() => setOrdered(treino.exercicios || []), [treino]);

  // Agrupa exercícios por grupo_superset para visualização
  const grouped = useMemo(() => {
    const result = [];
    let lastGroup = null;
    let currentGroup = null;
    ordered.forEach((ex) => {
      if (ex.grupo_superset && ex.grupo_superset === lastGroup) {
        currentGroup.items.push(ex);
      } else {
        if (ex.grupo_superset) {
          currentGroup = { id: `g-${ex.id}`, group: ex.grupo_superset, items: [ex] };
          result.push(currentGroup);
        } else {
          result.push({ id: `s-${ex.id}`, items: [ex] });
          currentGroup = null;
        }
        lastGroup = ex.grupo_superset;
      }
    });
    return result;
  }, [ordered]);

  async function remover(itemId) {
    if (!confirm('Remover este item do treino?')) return;
    try {
      await api.delete(`/admin/treinos/${treino.id}/exercicios/${itemId}`);
      onChange();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  function onDragStart(id) { setDraggedId(id); }
  function onDragOver(e, overId) {
    e.preventDefault();
    if (!draggedId || draggedId === overId) return;
    const arr = [...ordered];
    const fromIdx = arr.findIndex((i) => i.id === draggedId);
    const toIdx = arr.findIndex((i) => i.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    setOrdered(arr);
  }
  async function onDragEnd() {
    if (!draggedId) return;
    setDraggedId(null);
    const payload = ordered.map((i, idx) => ({ id: i.id, ordem: idx }));
    try {
      await api.patch(`/admin/treinos/${treino.id}/exercicios/reordenar`, { ordem: payload });
      onChange();
    } catch (err) {
      toast.error(errorMessage(err));
      onChange();
    }
  }

  return (
    <Card className="p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-black text-white">{treino.nome}</h3>
        <Button variant="danger" size="sm" onClick={onDelete}>Remover treino</Button>
      </header>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-section-label border-b border-surface-border">
            <th className="text-left px-3 py-2 font-semibold w-8"></th>
            <th className="text-left px-3 py-2 font-semibold">Exercício</th>
            <th className="text-center px-3 py-2 font-semibold">Séries</th>
            <th className="text-center px-3 py-2 font-semibold">Reps.</th>
            <th className="text-center px-3 py-2 font-semibold">Descanso</th>
            <th className="text-center px-3 py-2 font-semibold">Grupo</th>
            <th className="text-left px-3 py-2 font-semibold">Observação</th>
            <th className="text-right px-3 py-2 font-semibold w-12"></th>
          </tr>
        </thead>
        <tbody>
          {ordered.length === 0 && (
            <tr><td colSpan={8} className="text-center text-zinc-500 py-8">Nenhum exercício adicionado.</td></tr>
          )}
          {grouped.map((g) => (
            <GroupRows
              key={g.id}
              group={g}
              treinoId={treino.id}
              onChange={onChange}
              onRemove={remover}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              draggedId={draggedId}
            />
          ))}
        </tbody>
      </table>

      <div className="mt-4">
        <Button onClick={() => setOpenAdd(true)}>+ Adicionar exercício</Button>
      </div>

      <AdicionarTreinoItemModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        treinoId={treino.id}
        proximoOrdem={ordered.length}
        onAdded={() => { setOpenAdd(false); onChange(); }}
      />
    </Card>
  );
}

function GroupRows({ group, treinoId, onChange, onRemove, onDragStart, onDragOver, onDragEnd, draggedId }) {
  const isSuper = group.group && group.items.length > 1;
  return (
    <>
      {group.items.map((ex, idx) => (
        <TreinoItemRow
          key={ex.id}
          item={ex}
          treinoId={treinoId}
          onChange={onChange}
          onRemove={() => onRemove(ex.id)}
          onDragStart={() => onDragStart(ex.id)}
          onDragOver={(e) => onDragOver(e, ex.id)}
          onDragEnd={onDragEnd}
          isDragging={draggedId === ex.id}
          superLabel={isSuper && idx === 0 ? group.group : null}
          inSuper={isSuper}
        />
      ))}
    </>
  );
}

function TreinoItemRow({ item, treinoId, onChange, onRemove, isDragging, superLabel, inSuper, ...dragProps }) {
  const toast = useToast();
  const [form, setForm] = useState({
    series: item.series ?? '',
    repeticoes: item.repeticoes ?? '',
    descanso_seg: item.descanso_seg ?? '',
    grupo_superset: item.grupo_superset ?? '',
    observacao: item.observacao ?? '',
  });

  useEffect(() => {
    setForm({
      series: item.series ?? '',
      repeticoes: item.repeticoes ?? '',
      descanso_seg: item.descanso_seg ?? '',
      grupo_superset: item.grupo_superset ?? '',
      observacao: item.observacao ?? '',
    });
  }, [item]);

  async function salvarCampo(campo, valor) {
    if (String(valor) === String(item[campo] ?? '')) return;
    try {
      const payload = { [campo]: valor === '' ? null : isNaN(Number(valor)) || campo === 'repeticoes' || campo === 'grupo_superset' || campo === 'observacao' ? valor : Number(valor) };
      await api.put(`/admin/treinos/${treinoId}/exercicios/${item.id}`, payload);
      onChange();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <tr
      className={clsx(
        'border-b border-surface-border text-zinc-300 cursor-move transition-opacity',
        isDragging && 'opacity-40',
        inSuper && 'bg-brand/5'
      )}
      {...dragProps}
    >
      <td className="px-3 py-2 text-center text-zinc-700">⋮⋮</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {superLabel && (
            <span className="text-[9px] uppercase tracking-widest font-black text-brand bg-brand/20 px-1.5 py-0.5 rounded border border-brand/40">
              SUPER {superLabel}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-widest text-zinc-600">{item.tipo}</span>
        </div>
        <div className="font-semibold text-white mt-0.5">{item.nome_exercicio}</div>
      </td>
      <td className="px-1 py-2 text-center">
        {item.tipo === 'exercicio' ? (
          <Input type="number" className="w-14 text-center text-xs py-1" value={form.series}
            onChange={(e) => setForm({ ...form, series: e.target.value })}
            onBlur={(e) => salvarCampo('series', e.target.value)} />
        ) : <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-1 py-2 text-center">
        {item.tipo === 'exercicio' ? (
          <Input className="w-16 text-center text-xs py-1" value={form.repeticoes}
            onChange={(e) => setForm({ ...form, repeticoes: e.target.value })}
            onBlur={(e) => salvarCampo('repeticoes', e.target.value)} />
        ) : <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-1 py-2 text-center">
        {item.tipo === 'exercicio' ? (
          <Input type="number" className="w-16 text-center text-xs py-1" value={form.descanso_seg}
            onChange={(e) => setForm({ ...form, descanso_seg: e.target.value })}
            onBlur={(e) => salvarCampo('descanso_seg', e.target.value)} />
        ) : <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-1 py-2 text-center">
        <Input className="w-12 text-center text-xs py-1 uppercase" value={form.grupo_superset}
          onChange={(e) => setForm({ ...form, grupo_superset: e.target.value })}
          onBlur={(e) => salvarCampo('grupo_superset', e.target.value)}
          placeholder="—" />
      </td>
      <td className="px-3 py-2">
        <Input className="w-full text-xs py-1" value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          onBlur={(e) => salvarCampo('observacao', e.target.value)} />
      </td>
      <td className="px-3 py-2 text-right">
        <button onClick={onRemove} className="text-zinc-500 hover:text-red-400 text-xs px-1.5 py-0.5 border border-surface-border rounded">×</button>
      </td>
    </tr>
  );
}

function AdicionarTreinoItemModal({ open, onClose, treinoId, proximoOrdem, onAdded }) {
  const toast = useToast();
  const [tipo, setTipo] = useState('exercicio');
  const [busca, setBusca] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [params, setParams] = useState({ series: 4, repeticoes: '8-12', descanso_seg: 60, grupo_superset: '', observacao: '' });

  useEffect(() => {
    if (!open) return;
    setBusca(''); setResults([]); setSelected(null); setTipo('exercicio');
    setParams({ series: 4, repeticoes: '8-12', descanso_seg: 60, grupo_superset: '', observacao: '' });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        const endpoint = tipo === 'exercicio' ? '/admin/exercicios' : '/admin/cardio';
        const param = tipo === 'exercicio' ? { busca: busca || undefined } : { tipo: busca || undefined };
        const res = await api.get(endpoint, { params: param });
        setResults(res.data.data || []);
      } catch (err) { toast.error(errorMessage(err)); }
    }, 250);
    return () => clearTimeout(t);
  }, [open, tipo, busca, toast]);

  function escolher(item) {
    setSelected(item);
    if (tipo === 'exercicio') {
      setParams((p) => ({
        ...p,
        series: item.series_recomendadas ?? p.series,
        repeticoes: item.repeticoes_recomendadas ?? p.repeticoes,
        descanso_seg: item.descanso_padrao_seg ?? p.descanso_seg,
      }));
    }
  }

  async function confirmar() {
    if (!selected) { toast.error('Selecione um item.'); return; }
    try {
      const payload = {
        tipo,
        ordem: proximoOrdem,
        grupo_superset: params.grupo_superset || undefined,
        observacao: params.observacao || undefined,
      };
      if (tipo === 'exercicio') {
        Object.assign(payload, {
          exercicio_id: selected.id,
          series: params.series ? Number(params.series) : undefined,
          repeticoes: params.repeticoes || undefined,
          descanso_seg: params.descanso_seg ? Number(params.descanso_seg) : undefined,
        });
      } else {
        payload.cardio_id = selected.id;
      }
      await api.post(`/admin/treinos/${treinoId}/exercicios`, payload);
      toast.success('Item adicionado.');
      onAdded();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Adicionar ao treino" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={confirmar} disabled={!selected}>Adicionar</Button>
      </>}
    >
      <div className="space-y-3">
        <div className="flex gap-1.5">
          {[{ v: 'exercicio', l: 'Exercício' }, { v: 'cardio', l: 'Cardio' }].map((t) => (
            <button
              key={t.v}
              onClick={() => { setTipo(t.v); setSelected(null); }}
              className={
                'px-3 py-1.5 rounded-md text-xs uppercase tracking-widest font-bold transition-colors ' +
                (tipo === t.v ? 'bg-brand text-white' : 'bg-surface-elevated text-zinc-400 border border-surface-border hover:text-white')
              }
            >
              {t.l}
            </button>
          ))}
        </div>

        <Input placeholder={tipo === 'exercicio' ? 'Buscar exercício…' : 'Buscar cardio (tipo)…'}
          value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />

        <Card className="max-h-56 overflow-y-auto">
          {results.length === 0 && <div className="text-center text-zinc-500 py-8 text-sm">Nenhum resultado.</div>}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => escolher(r)}
              className={clsx(
                'w-full text-left px-4 py-2.5 text-sm border-b border-surface-border transition-colors',
                selected?.id === r.id ? 'bg-brand/10 border-l-2 border-l-brand' : 'hover:bg-surface-elevated'
              )}
            >
              <div className="font-semibold text-white">{r.nome || r.tipo}</div>
              <div className="text-xs text-zinc-500">
                {tipo === 'exercicio'
                  ? `${r.grupo_muscular} · ${r.nivel || '—'}`
                  : `${r.intensidade || '—'} · ${r.duracao_min || '—'} min`}
              </div>
            </button>
          ))}
        </Card>

        {selected && tipo === 'exercicio' && (
          <div className="grid grid-cols-4 gap-3 pt-3 border-t border-surface-border">
            <Field label="Séries"><Input type="number" value={params.series} onChange={(e) => setParams({ ...params, series: e.target.value })} /></Field>
            <Field label="Reps."><Input value={params.repeticoes} onChange={(e) => setParams({ ...params, repeticoes: e.target.value })} /></Field>
            <Field label="Descanso (s)"><Input type="number" value={params.descanso_seg} onChange={(e) => setParams({ ...params, descanso_seg: e.target.value })} /></Field>
            <Field label="Grupo"><Input value={params.grupo_superset} onChange={(e) => setParams({ ...params, grupo_superset: e.target.value })} placeholder="A, B…" /></Field>
            <div className="col-span-4"><Field label="Observação"><Input value={params.observacao} onChange={(e) => setParams({ ...params, observacao: e.target.value })} /></Field></div>
          </div>
        )}

        {selected && tipo === 'cardio' && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-surface-border">
            <Field label="Grupo"><Input value={params.grupo_superset} onChange={(e) => setParams({ ...params, grupo_superset: e.target.value })} /></Field>
            <Field label="Observação"><Input value={params.observacao} onChange={(e) => setParams({ ...params, observacao: e.target.value })} /></Field>
          </div>
        )}
      </div>
    </Modal>
  );
}

function NovoTreinoModal({ open, onClose, protocoloId, proximoOrdem, onCreated }) {
  const toast = useToast();
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setNome(''); }, [open]);

  async function salvar() {
    if (!nome) { toast.error('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      await api.post(`/admin/protocolos/${protocoloId}/treinos`, { nome, ordem: proximoOrdem });
      toast.success('Treino criado.');
      onCreated();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Novo treino"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Criar'}</Button>
      </>}
    >
      <Field label="Nome do treino *">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Treino A, B, …" autoFocus />
      </Field>
    </Modal>
  );
}

// ─── Módulo Cardio (placeholder visual) ──────────────────────────────────────

function ModuloCardio() {
  return (
    <div className="space-y-4">
      <header>
        <div className="text-section-label">Módulo</div>
        <h2 className="text-page-title mt-1">Cardio</h2>
      </header>
      <Card className="p-8 text-center">
        <div className="text-zinc-400 text-sm">
          Sessões de cardio são adicionadas dentro do <span className="text-white font-semibold">Módulo Treino</span> escolhendo o tipo "Cardio" ao adicionar um item.
        </div>
        <div className="text-zinc-600 text-xs uppercase tracking-widest mt-3">
          A biblioteca de sessões está em <Link to="/admin/cardio" className="text-brand">Cardio →</Link>
        </div>
      </Card>
    </div>
  );
}

// ─── Módulo Suplementação ────────────────────────────────────────────────────

function ModuloSuplementacao({ protocoloId }) {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/protocolos/${protocoloId}/suplementacao`);
      setData(res.data);
    } catch (err) { toast.error(errorMessage(err)); }
  }, [protocoloId, toast]);

  useEffect(() => { load(); }, [load]);

  async function remover(id) {
    if (!confirm('Remover suplemento?')) return;
    try {
      await api.delete(`/admin/suplementacao/${id}`);
      load();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-section-label">Módulo</div>
          <h2 className="text-page-title mt-1">Suplementação</h2>
        </div>
        <Button onClick={() => setOpenAdd(true)}>+ Adicionar suplemento</Button>
      </header>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-section-label border-b border-surface-border">
              <th className="text-left px-5 py-3 font-semibold">Suplemento</th>
              <th className="text-left px-5 py-3 font-semibold">Dose</th>
              <th className="text-left px-5 py-3 font-semibold">Horário</th>
              <th className="text-left px-5 py-3 font-semibold">Observação</th>
              <th className="text-right px-5 py-3 font-semibold w-16"></th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={5} className="text-center text-zinc-500 py-8">Nenhum suplemento cadastrado.</td></tr>
            )}
            {data.map((s) => (
              <tr key={s.id} className="border-b border-surface-border text-zinc-300">
                <td className="px-5 py-2.5 font-semibold text-white">{s.nome_suplemento}</td>
                <td className="px-5 py-2.5">{s.dose}</td>
                <td className="px-5 py-2.5 text-zinc-400">{s.horario || '—'}</td>
                <td className="px-5 py-2.5 text-zinc-500">{s.observacao || '—'}</td>
                <td className="px-5 py-2.5 text-right">
                  <button onClick={() => remover(s.id)} className="text-zinc-500 hover:text-red-400 text-xs">Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <SuplementoModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        protocoloId={protocoloId}
        proximoOrdem={data.length}
        onCreated={() => { setOpenAdd(false); load(); }}
      />
    </div>
  );
}

function SuplementoModal({ open, onClose, protocoloId, proximoOrdem, onCreated }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome_suplemento: '', dose: '', horario: '', observacao: '' });

  useEffect(() => {
    if (open) setForm({ nome_suplemento: '', dose: '', horario: '', observacao: '' });
  }, [open]);

  async function salvar() {
    if (!form.nome_suplemento || !form.dose) { toast.error('Nome e dose são obrigatórios.'); return; }
    setSaving(true);
    try {
      await api.post(`/admin/protocolos/${protocoloId}/suplementacao`, { ...form, ordem: proximoOrdem });
      toast.success('Suplemento adicionado.');
      onCreated();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Adicionar suplemento"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Adicionar'}</Button>
      </>}
    >
      <div className="space-y-3">
        <Field label="Suplemento *"><Input autoFocus value={form.nome_suplemento} onChange={(e) => setForm({ ...form, nome_suplemento: e.target.value })} placeholder="Whey Protein, Creatina…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dose *"><Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="30g, 5g, 2 cápsulas…" /></Field>
          <Field label="Horário"><Input value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} placeholder="Pós-treino, 07:00…" /></Field>
        </div>
        <Field label="Observação">
          <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
            value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

// ─── Módulo Observações ──────────────────────────────────────────────────────

function ModuloObservacoes({ protocolo, onSaved }) {
  const toast = useToast();
  const [obs, setObs] = useState(protocolo.observacoes || '');
  const [saving, setSaving] = useState(false);

  async function salvar() {
    setSaving(true);
    try {
      await api.put(`/admin/protocolos/${protocolo.id}`, { observacoes: obs });
      toast.success('Observações atualizadas.');
      onSaved();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <header>
        <div className="text-section-label">Módulo</div>
        <h2 className="text-page-title mt-1">Observações</h2>
      </header>
      <Card className="p-5">
        <textarea
          rows={12}
          className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Notas gerais sobre o protocolo…"
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar observações'}</Button>
        </div>
      </Card>
    </div>
  );
}
