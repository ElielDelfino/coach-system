import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  DndContext, closestCenter, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
                      ? 'bg-brand text-white'
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

// ─── Módulo Alimentar ────────────────────────────────────────────────────────

function ModuloAlimentar({ protocoloId }) {
  const toast = useToast();
  const [refeicoes, setRefeicoes] = useState([]);
  const [refAtivaId, setRefAtivaId] = useState(null);
  const [openNova, setOpenNova] = useState(false);
  const [openDuplicar, setOpenDuplicar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resumoAberto, setResumoAberto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/protocolos/${protocoloId}/refeicoes`);
      setRefeicoes(res.data);
      setRefAtivaId((atual) => {
        if (atual && res.data.find((r) => r.id === atual)) return atual;
        return res.data[0]?.id || null;
      });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [protocoloId, toast]);

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

  const resumoContent = (
    <>
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
    </>
  );

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-full">
      <div className="flex-1 min-w-0 space-y-4">
        <header>
          <div className="text-section-label">Módulo</div>
          <h2 className="text-page-title mt-1">Alimentação</h2>
        </header>

        {/* Tabs de refeições */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          {loading && <div className="text-zinc-500 text-sm">Carregando…</div>}
          {refeicoes.map((r) => (
            <button
              key={r.id}
              onClick={() => setRefAtivaId(r.id)}
              className={clsx(
                'px-3 py-2 rounded-md text-xs uppercase tracking-widest font-bold transition-colors border whitespace-nowrap',
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
            className="px-3 py-2 rounded-md text-xs uppercase tracking-widest font-bold text-brand border-2 border-dashed border-brand/40 hover:bg-brand/10 whitespace-nowrap"
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

      {/* Desktop: coluna direita — resumo nutricional */}
      <aside className="hidden md:block w-72 shrink-0 space-y-4">
        <Card className="p-5 sticky top-0">
          {resumoContent}
        </Card>
      </aside>

      {/* Mobile: botão flutuante de resumo */}
      <button
        type="button"
        onClick={() => setResumoAberto(true)}
        className="md:hidden fixed bottom-4 right-4 z-20 bg-brand text-white rounded-full px-4 py-3 text-xs font-black shadow-lg uppercase tracking-widest"
      >
        Resumo · {fmt(totalProto.kcal)} kcal
      </button>

      {resumoAberto && (
        <div className="md:hidden fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/70" onClick={() => setResumoAberto(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-surface-card border-t border-surface-border rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-center pb-3">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-white font-black text-sm uppercase tracking-widest">Resumo nutricional</p>
              <button onClick={() => setResumoAberto(false)} className="text-zinc-500 hover:text-white text-lg">✕</button>
            </div>
            {resumoContent}
          </div>
        </div>
      )}

      <NovaRefeicaoModal
        open={openNova}
        onClose={() => setOpenNova(false)}
        protocoloId={protocoloId}
        proximoNumero={Math.max(0, ...refeicoes.map((r) => r.numero_refeicao)) + 1}
        onCreated={load}
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
  const [orderedItens, setOrderedItens] = useState(refeicao.itens || []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    const oldIndex = orderedItens.findIndex((i) => i.id === active.id);
    const newIndex = orderedItens.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const novos = arrayMove(orderedItens, oldIndex, newIndex);
    setOrderedItens(novos);
    try {
      await api.patch(`/admin/refeicoes/${refeicao.id}/itens/reordenar`, {
        ordem: novos.map((i, idx) => ({ id: i.id, ordem: idx })),
      });
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
              <Input value={form.nome || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, nome: v })); }} />
              <Input value={form.horario_sugerido || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, horario_sugerido: v })); }} placeholder="07:00" />
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedItens.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {/* Desktop: tabela */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-section-label border-b border-surface-border">
                  <th className="text-left px-2 py-2 font-semibold w-6"></th>
                  <th className="text-left px-3 py-2 font-semibold">Alimento</th>
                  <th className="text-right px-3 py-2 font-semibold">Qtd (g)</th>
                  <th className="text-right px-3 py-2 font-semibold">Kcal</th>
                  <th className="text-right px-3 py-2 font-semibold">Prot</th>
                  <th className="text-right px-3 py-2 font-semibold">Carb</th>
                  <th className="text-right px-3 py-2 font-semibold">Gord</th>
                  <th className="text-right px-3 py-2 font-semibold w-28">Ações</th>
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

          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            {orderedItens.length === 0 && (
              <div className="text-center text-zinc-500 py-8 text-sm border border-surface-border rounded-md">
                Nenhum item nesta refeição.
              </div>
            )}
            {orderedItens.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                refeicaoId={refeicao.id}
                onChange={onChange}
                onRemove={() => removerItem(item.id)}
              />
            ))}
            {orderedItens.length > 0 && (
              <div className="bg-surface-elevated border border-surface-border rounded-md p-3 mt-3">
                <div className="text-section-label mb-2">Total da refeição</div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-brand tabular-nums">{fmt(refeicao.total_kcal)}</span>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500">kcal</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs tabular-nums">
                  <div className="text-sky-400">P {fmt(refeicao.total_prot)}</div>
                  <div className="text-amber-400 text-center">C {fmt(refeicao.total_carb)}</div>
                  <div className="text-rose-400 text-right">G {fmt(refeicao.total_gord)}</div>
                </div>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-4">
        <Button onClick={() => setOpenAddItem(true)}>+ Adicionar alimento</Button>
      </div>

      <AdicionarItemModal
        open={openAddItem}
        onClose={() => setOpenAddItem(false)}
        refeicaoId={refeicao.id}
        proximoOrdem={orderedItens.length}
        onAdded={onChange}
      />
    </Card>
  );
}

function ItemRow({ item, refeicaoId, onChange, onRemove }) {
  const toast = useToast();
  const [qtd, setQtd] = useState(item.quantidade_g);
  const [showSubst, setShowSubst] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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

  const subCount = item.substitutos?.length || 0;

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        className="border-b border-surface-border text-zinc-300"
      >
        <td className="px-2 py-2 w-6">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 select-none text-base leading-none"
            title="Arrastar para reordenar"
          >
            ⠿
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="font-semibold text-white">{item.nome_alimento}</div>
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
            <button
              onClick={() => setShowSubst((s) => !s)}
              className={clsx(
                'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-colors',
                subCount > 0
                  ? 'text-brand border-brand/40 hover:bg-brand/10'
                  : 'text-zinc-600 border-zinc-700 hover:text-zinc-400'
              )}
              title="Substitutos"
            >
              {subCount > 0 ? `Sub (${subCount})` : 'Sub'}
            </button>
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

function ItemCard({ item, refeicaoId, onChange, onRemove }) {
  const toast = useToast();
  const [qtd, setQtd] = useState(item.quantidade_g);
  const [showSubst, setShowSubst] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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

  const subCount = item.substitutos?.length || 0;

  return (
    <div ref={setNodeRef} style={style} className="bg-surface-card border border-surface-border rounded-md p-3">
      <div className="flex items-center gap-2 mb-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 select-none text-lg leading-none shrink-0"
          title="Arrastar para reordenar"
        >
          ⠿
        </div>
        <div className="font-semibold text-white flex-1 min-w-0 truncate">{item.nome_alimento}</div>
        <button
          onClick={onRemove}
          title="Remover"
          className="text-zinc-500 hover:text-red-400 text-sm px-2 py-0.5 border border-surface-border rounded shrink-0"
        >
          ×
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number" step="1"
          className="w-24 text-right tabular-nums py-1 text-sm"
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
          onBlur={salvarQtd}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        />
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">g</span>
        <div className="ml-auto text-right">
          <div className="text-base font-black text-brand tabular-nums leading-none">
            {fmt(item.kcal_calculado)}
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1 font-normal">kcal</span>
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] tabular-nums">
        <span className="text-sky-400">P {fmt(item.prot_calculado)}</span>
        <span className="text-amber-400 text-center">C {fmt(item.carb_calculado)}</span>
        <span className="text-rose-400 text-right">G {fmt(item.gord_calculado)}</span>
      </div>
      <div className="mt-2 flex justify-end">
        <button
          onClick={() => setShowSubst((s) => !s)}
          className={clsx(
            'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-colors',
            subCount > 0
              ? 'text-brand border-brand/40 hover:bg-brand/10'
              : 'text-zinc-600 border-zinc-700 hover:text-zinc-400'
          )}
        >
          {subCount > 0 ? `Sub (${subCount})` : 'Sub'}
        </button>
      </div>
      {showSubst && (
        <div className="mt-3 bg-surface-input border border-surface-border rounded-md p-3">
          <SubstitutosPanel item={item} refeicaoId={refeicaoId} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

function SubstitutosPanel({ item, refeicaoId, onChange }) {
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [selected, setSelected] = useState(null);
  const [qtd, setQtd] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const qtdRef = useRef(null);

  useEffect(() => {
    if (selected || busca.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/admin/alimentos', { params: { busca, limit: 8 } });
        setResultados(res.data.data || []);
        setShowDrop(true);
      } catch (err) { toast.error(errorMessage(err)); }
    }, 300);
    return () => clearTimeout(t);
    // toast é estável após a correção do ToastProvider (useMemo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, selected]);

  function escolher(a) {
    setSelected(a);
    setBusca(a.nome);
    if (!qtd) setQtd(a.quantidade_base);
    setShowDrop(false);
    setResultados([]);
    setTimeout(() => qtdRef.current?.focus(), 50);
  }

  function limpar() {
    setSelected(null);
    setBusca('');
    setQtd('');
    setResultados([]);
    setShowDrop(false);
  }

  async function adicionar() {
    if (!selected) { toast.error('Selecione um alimento.'); return; }
    if (!qtd || Number(qtd) <= 0) { toast.error('Informe a quantidade.'); return; }
    try {
      await api.post(`/admin/refeicoes/${refeicaoId}/itens/${item.id}/substitutos`, {
        alimento_id: selected.id,
        quantidade_g: Number(qtd),
      });
      toast.success('Substituto adicionado.');
      limpar();
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
    <div className="space-y-2">
      <div className="text-section-label mb-2">Substituições para {item.nome_alimento}</div>

      {(item.substitutos || []).map((s) => (
        <div key={s.id} className="flex items-center gap-3 text-sm text-zinc-300">
          <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">OU</span>
          <span className="font-medium text-white">{s.nome_alimento}</span>
          <span className="text-zinc-400 tabular-nums">{s.quantidade_g}g</span>
          <button
            onClick={() => remover(s.id)}
            className="ml-auto text-zinc-600 hover:text-red-400 text-xs"
          >
            Remover
          </button>
        </div>
      ))}
      {item.substitutos?.length === 0 && (
        <div className="text-xs text-zinc-600">Nenhum substituto cadastrado.</div>
      )}

      <div className="flex items-center gap-2 pt-2 mt-1 border-t border-surface-border flex-wrap">
        <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold shrink-0">OU</span>
        <div className="relative flex-1 min-w-[180px]">
          <Input
            placeholder="Buscar alimento substituto…"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setSelected(null); }}
            onFocus={() => { if (resultados.length > 0) setShowDrop(true); }}
            className="py-1 text-xs w-full"
          />
          {showDrop && resultados.length > 0 && !selected && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-surface-card border border-surface-border rounded-md shadow-xl">
              {resultados.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); escolher(a); }}
                  className="w-full text-left px-3 py-2 text-xs border-b border-surface-border last:border-b-0 hover:bg-surface-elevated transition-colors"
                >
                  <div className="font-semibold text-white">{a.nome}</div>
                  <div className="text-[10px] text-zinc-500">
                    {a.categoria || '—'} · {a.calorias} kcal / {a.quantidade_base}{a.unidade === 'gramas' ? 'g' : ` ${a.unidade}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          ref={qtdRef}
          type="number"
          placeholder="g"
          min="1"
          className="w-20 shrink-0 text-xs py-1 text-right tabular-nums"
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={!selected || !qtd}
          className="shrink-0 text-brand text-xs font-bold uppercase tracking-widest hover:text-brand-dark disabled:text-zinc-700 disabled:cursor-not-allowed"
        >
          + Adicionar
        </button>
      </div>
    </div>
  );
}

function AdicionarItemModal({ open, onClose, refeicaoId, proximoOrdem, onAdded }) {
  const toast = useToast();
  const ordemRef = useRef(proximoOrdem);
  useEffect(() => { ordemRef.current = proximoOrdem; }, [proximoOrdem]);

  async function adicionar(alimento, quantidade_g, observacoes) {
    try {
      await api.post(`/admin/refeicoes/${refeicaoId}/itens`, {
        alimento_id: alimento.id,
        quantidade_g: Number(quantidade_g),
        ordem: ordemRef.current,
        observacoes: observacoes || undefined,
      });
      ordemRef.current += 1;
      toast.success('Item adicionado.');
      onAdded();
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  }

  return (
    <BuscaAlimentoModal open={open} onClose={onClose} onSelect={adicionar} withObs keepOpen />
  );
}

function BuscaAlimentoModal({ open, onClose, onSelect, withObs = false, keepOpen = false }) {
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [qtd, setQtd] = useState('');
  const [obs, setObs] = useState('');

  function resetForm() {
    setBusca(''); setSelected(null); setQtd(''); setObs('');
  }

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
    // toast é estável após a correção do ToastProvider (useMemo) — não precisa ser dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busca]);

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

  async function confirmar() {
    if (!selected) { toast.error('Selecione um alimento.'); return; }
    if (!qtd || Number(qtd) <= 0) { toast.error('Informe a quantidade.'); return; }
    const result = await onSelect(selected, qtd, obs);
    if (keepOpen && result !== false) resetForm();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buscar alimento"
      size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>{keepOpen ? 'Fechar' : 'Cancelar'}</Button>
        <Button onClick={confirmar} disabled={!selected || !qtd}>
          {keepOpen ? 'Adicionar e continuar' : 'Adicionar'}
        </Button>
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
  const numeroAtualRef = useRef(proximoNumero);

  useEffect(() => { numeroAtualRef.current = proximoNumero; }, [proximoNumero]);

  useEffect(() => {
    if (open) {
      numeroAtualRef.current = proximoNumero;
      setForm({ numero_refeicao: proximoNumero, nome: '', horario_sugerido: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      const proximo = Number(form.numero_refeicao) + 1;
      numeroAtualRef.current = proximo;
      setForm({ numero_refeicao: proximo, nome: '', horario_sugerido: '' });
      onCreated();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Nova refeição"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Criar e continuar'}</Button>
      </>}
    >
      <div className="grid grid-cols-3 gap-3">
        <Field label="Número *">
          <Input type="number" value={form.numero_refeicao} onChange={(e) => setForm((f) => ({ ...f, numero_refeicao: e.target.value }))} />
        </Field>
        <div className="col-span-2">
          <Field label="Nome *">
            <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Café da manhã, almoço…" />
          </Field>
        </div>
        <div className="col-span-3">
          <Field label="Horário sugerido">
            <Input value={form.horario_sugerido} onChange={(e) => setForm((f) => ({ ...f, horario_sugerido: e.target.value }))} placeholder="07:00" />
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
  const [openDuplicar, setOpenDuplicar] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/protocolos/${protocoloId}/treinos`);
      setTreinos(res.data);
      setTreinoAtivoId((atual) => {
        if (atual && res.data.find((t) => t.id === atual)) return atual;
        return res.data[0]?.id || null;
      });
    } catch (err) { toast.error(errorMessage(err)); }
  }, [protocoloId, toast]);

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
        <p className="text-xs text-zinc-600 mt-1">
          Para adicionar cardio, escolha o tipo "Cardio" ao adicionar um exercício.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        {treinos.map((t) => (
          <button
            key={t.id}
            onClick={() => setTreinoAtivoId(t.id)}
            className={clsx(
              'px-3 py-2 rounded-md text-xs uppercase tracking-widest font-bold border transition-colors whitespace-nowrap',
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
          className="px-3 py-2 rounded-md text-xs uppercase tracking-widest font-bold text-brand border-2 border-dashed border-brand/40 hover:bg-brand/10 whitespace-nowrap"
        >
          + Novo
        </button>
      </div>

      {treinoAtivo ? (
        <TreinoEditor
          treino={treinoAtivo}
          onChange={load}
          onDuplicate={() => setOpenDuplicar(treinoAtivo)}
          onDelete={() => removerTreino(treinoAtivo.id)}
        />
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
        onCreated={load}
      />

      <DuplicarTreinoModal
        open={!!openDuplicar}
        onClose={() => setOpenDuplicar(null)}
        treino={openDuplicar}
        onDuplicated={(novo) => {
          setOpenDuplicar(null);
          load();
          if (novo?.id) setTreinoAtivoId(novo.id);
        }}
      />
    </div>
  );
}

function TreinoEditor({ treino, onChange, onDuplicate, onDelete }) {
  const toast = useToast();
  const [openAdd, setOpenAdd] = useState(false);
  const [ordered, setOrdered] = useState(treino.exercicios || []);
  const [editing, setEditing] = useState(false);
  const [nomeEdit, setNomeEdit] = useState(treino.nome || '');
  const [savingNome, setSavingNome] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setOrdered(treino.exercicios || []);
    setNomeEdit(treino.nome || '');
    setEditing(false);
  }, [treino]);

  async function salvarNome() {
    if (!nomeEdit.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }
    setSavingNome(true);
    try {
      await api.put(`/admin/treinos/${treino.id}`, { nome: nomeEdit.trim() });
      toast.success('Treino atualizado.');
      setEditing(false);
      onChange();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSavingNome(false); }
  }

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

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    const activeItem = ordered.find((i) => i.id === active.id);
    const overItem = ordered.find((i) => i.id === over.id);
    if (!activeItem || !overItem) return;

    // Bloco a mover: se item pertence a um superset, move todo o grupo junto.
    const activeGroup = activeItem.grupo_superset || null;
    const movingIds = activeGroup
      ? ordered.filter((i) => i.grupo_superset === activeGroup).map((i) => i.id)
      : [activeItem.id];

    // Não permite drop dentro do próprio grupo
    if (movingIds.includes(over.id)) return;

    const moving = ordered.filter((i) => movingIds.includes(i.id));
    const rest = ordered.filter((i) => !movingIds.includes(i.id));

    // Posição alvo: índice do overItem em `rest`. Se o ativo estava antes do alvo,
    // o splice já ocupa o lugar correto; caso contrário, inserir antes.
    let insertAt = rest.findIndex((i) => i.id === over.id);
    if (insertAt === -1) insertAt = rest.length;
    const activeIdx = ordered.findIndex((i) => i.id === active.id);
    const overIdx = ordered.findIndex((i) => i.id === over.id);
    if (activeIdx < overIdx) insertAt += 1;

    const novos = [...rest.slice(0, insertAt), ...moving, ...rest.slice(insertAt)];
    setOrdered(novos);

    try {
      await api.patch(`/admin/treinos/${treino.id}/exercicios/reordenar`, {
        ordem: novos.map((i, idx) => ({ id: i.id, ordem: idx })),
      });
      onChange();
    } catch (err) {
      toast.error(errorMessage(err));
      onChange();
    }
  }

  return (
    <Card className="p-5">
      <header className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={nomeEdit}
              onChange={(e) => setNomeEdit(e.target.value)}
              placeholder="Nome do treino"
            />
          ) : (
            <h3 className="text-xl font-black text-white truncate">{treino.nome}</h3>
          )}
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setNomeEdit(treino.nome || ''); }}>Cancelar</Button>
              <Button size="sm" onClick={salvarNome} disabled={savingNome}>{savingNome ? 'Salvando…' : 'Salvar'}</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Editar</Button>
              <Button variant="secondary" size="sm" onClick={onDuplicate}>Duplicar</Button>
              <Button variant="danger" size="sm" onClick={onDelete}>Remover treino</Button>
            </>
          )}
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {/* Desktop: tabela */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-section-label border-b border-surface-border">
                  <th className="text-left px-2 py-2 font-semibold w-8"></th>
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
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            {ordered.length === 0 && (
              <div className="text-center text-zinc-500 py-8 text-sm border border-surface-border rounded-md">
                Nenhum exercício adicionado.
              </div>
            )}
            {grouped.map((g) => {
              const isSuper = g.group && g.items.length > 1;
              return g.items.map((ex, idx) => (
                <TreinoItemCard
                  key={ex.id}
                  item={ex}
                  treinoId={treino.id}
                  onChange={onChange}
                  onRemove={() => remover(ex.id)}
                  superLabel={isSuper && idx === 0 ? g.group : null}
                  inSuper={isSuper}
                />
              ));
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-4">
        <Button onClick={() => setOpenAdd(true)}>+ Adicionar exercício</Button>
      </div>

      <AdicionarTreinoItemModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        treinoId={treino.id}
        proximoOrdem={ordered.length}
        onAdded={onChange}
      />
    </Card>
  );
}

function GroupRows({ group, treinoId, onChange, onRemove }) {
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
          superLabel={isSuper && idx === 0 ? group.group : null}
          inSuper={isSuper}
        />
      ))}
    </>
  );
}

function TreinoItemRow({ item, treinoId, onChange, onRemove, superLabel, inSuper }) {
  const toast = useToast();
  const [form, setForm] = useState({
    series: item.series ?? '',
    repeticoes: item.repeticoes ?? '',
    descanso_seg: item.descanso_seg ?? '',
    grupo_superset: item.grupo_superset ?? '',
    observacao: item.observacao ?? '',
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
      ref={setNodeRef}
      style={style}
      className={clsx(
        'border-b border-surface-border text-zinc-300',
        inSuper && 'bg-surface-elevated'
      )}
    >
      <td
        {...attributes}
        {...listeners}
        className="px-2 py-2 w-8 cursor-grab active:cursor-grabbing select-none text-zinc-600 hover:text-zinc-400 text-base leading-none align-middle"
        title={inSuper ? 'Arrastar superset' : 'Arrastar para reordenar'}
      >
        ⠿
      </td>
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
            onChange={(e) => setForm((f) => ({ ...f, series: e.target.value }))}
            onBlur={(e) => salvarCampo('series', e.target.value)} />
        ) : <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-1 py-2 text-center">
        {item.tipo === 'exercicio' ? (
          <Input className="w-16 text-center text-xs py-1" value={form.repeticoes}
            onChange={(e) => setForm((f) => ({ ...f, repeticoes: e.target.value }))}
            onBlur={(e) => salvarCampo('repeticoes', e.target.value)} />
        ) : <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-1 py-2 text-center">
        {item.tipo === 'exercicio' ? (
          <Input type="number" className="w-16 text-center text-xs py-1" value={form.descanso_seg}
            onChange={(e) => setForm((f) => ({ ...f, descanso_seg: e.target.value }))}
            onBlur={(e) => salvarCampo('descanso_seg', e.target.value)} />
        ) : <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-1 py-2 text-center">
        <Input className="w-12 text-center text-xs py-1 uppercase" value={form.grupo_superset}
          onChange={(e) => setForm((f) => ({ ...f, grupo_superset: e.target.value }))}
          onBlur={(e) => salvarCampo('grupo_superset', e.target.value)}
          placeholder="—" />
      </td>
      <td className="px-3 py-2">
        <Input className="w-full text-xs py-1" value={form.observacao}
          onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
          onBlur={(e) => salvarCampo('observacao', e.target.value)} />
      </td>
      <td className="px-3 py-2 text-right">
        <button onClick={onRemove} className="text-zinc-500 hover:text-red-400 text-xs px-1.5 py-0.5 border border-surface-border rounded">×</button>
      </td>
    </tr>
  );
}

function TreinoItemCard({ item, treinoId, onChange, onRemove, superLabel, inSuper }) {
  const toast = useToast();
  const [form, setForm] = useState({
    series: item.series ?? '',
    repeticoes: item.repeticoes ?? '',
    descanso_seg: item.descanso_seg ?? '',
    grupo_superset: item.grupo_superset ?? '',
    observacao: item.observacao ?? '',
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'border border-surface-border rounded-md p-3',
        inSuper ? 'bg-surface-elevated' : 'bg-surface-card'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 select-none text-lg leading-none shrink-0"
          title={inSuper ? 'Arrastar superset' : 'Arrastar para reordenar'}
        >
          ⠿
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {superLabel && (
              <span className="text-[9px] uppercase tracking-widest font-black text-brand bg-brand/20 px-1.5 py-0.5 rounded border border-brand/40">
                SUPER {superLabel}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-widest text-zinc-600">{item.tipo}</span>
          </div>
          <div className="font-semibold text-white mt-0.5 truncate">{item.nome_exercicio}</div>
        </div>
        <button
          onClick={onRemove}
          title="Remover"
          className="text-zinc-500 hover:text-red-400 text-sm px-2 py-0.5 border border-surface-border rounded shrink-0"
        >
          ×
        </button>
      </div>
      {item.tipo === 'exercicio' && (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Séries">
            <Input type="number" className="text-center text-xs py-1" value={form.series}
              onChange={(e) => setForm((f) => ({ ...f, series: e.target.value }))}
              onBlur={(e) => salvarCampo('series', e.target.value)} />
          </Field>
          <Field label="Reps">
            <Input className="text-center text-xs py-1" value={form.repeticoes}
              onChange={(e) => setForm((f) => ({ ...f, repeticoes: e.target.value }))}
              onBlur={(e) => salvarCampo('repeticoes', e.target.value)} />
          </Field>
          <Field label="Descanso (s)">
            <Input type="number" className="text-center text-xs py-1" value={form.descanso_seg}
              onChange={(e) => setForm((f) => ({ ...f, descanso_seg: e.target.value }))}
              onBlur={(e) => salvarCampo('descanso_seg', e.target.value)} />
          </Field>
        </div>
      )}
      <div className="grid grid-cols-[5rem_1fr] gap-2 mt-2">
        <Field label="Grupo">
          <Input className="text-center text-xs py-1 uppercase" value={form.grupo_superset}
            onChange={(e) => setForm((f) => ({ ...f, grupo_superset: e.target.value }))}
            onBlur={(e) => salvarCampo('grupo_superset', e.target.value)}
            placeholder="—" />
        </Field>
        <Field label="Observação">
          <Input className="text-xs py-1" value={form.observacao}
            onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
            onBlur={(e) => salvarCampo('observacao', e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function AdicionarTreinoItemModal({ open, onClose, treinoId, proximoOrdem, onAdded }) {
  const toast = useToast();
  const [tipo, setTipo] = useState('exercicio');
  const [busca, setBusca] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [params, setParams] = useState({ series: 4, repeticoes: '8-12', descanso_seg: 60, grupo_superset: '', observacao: '' });
  const ordemRef = useRef(proximoOrdem);
  useEffect(() => { ordemRef.current = proximoOrdem; }, [proximoOrdem]);

  useEffect(() => {
    if (!open) return;
    ordemRef.current = proximoOrdem;
    setBusca(''); setResults([]); setSelected(null); setTipo('exercicio');
    setParams({ series: 4, repeticoes: '8-12', descanso_seg: 60, grupo_superset: '', observacao: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        ordem: ordemRef.current,
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
      ordemRef.current += 1;
      toast.success('Item adicionado.');
      setBusca(''); setResults([]); setSelected(null);
      setParams({ series: 4, repeticoes: '8-12', descanso_seg: 60, grupo_superset: '', observacao: '' });
      onAdded();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Adicionar ao treino" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
        <Button onClick={confirmar} disabled={!selected}>Adicionar e continuar</Button>
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
  const ordemRef = useRef(proximoOrdem);
  useEffect(() => { ordemRef.current = proximoOrdem; }, [proximoOrdem]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setNome(''); ordemRef.current = proximoOrdem; } }, [open]);

  async function salvar() {
    if (!nome) { toast.error('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      await api.post(`/admin/protocolos/${protocoloId}/treinos`, { nome, ordem: ordemRef.current });
      toast.success('Treino criado.');
      ordemRef.current += 1;
      setNome('');
      onCreated();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Novo treino"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Criar e continuar'}</Button>
      </>}
    >
      <Field label="Nome do treino *">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Treino A, B, …" autoFocus />
      </Field>
    </Modal>
  );
}

function DuplicarTreinoModal({ open, onClose, treino, onDuplicated }) {
  const toast = useToast();
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && treino) setNome(`${treino.nome} (cópia)`);
  }, [open, treino]);

  async function duplicar() {
    if (!nome.trim()) { toast.error('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      const res = await api.post(`/admin/treinos/${treino.id}/duplicar`, { nome: nome.trim() });
      toast.success('Treino duplicado.');
      onDuplicated(res.data);
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Duplicar treino"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={duplicar} disabled={saving}>{saving ? 'Duplicando…' : 'Duplicar'}</Button>
      </>}
    >
      <div className="space-y-3">
        <p className="text-sm text-zinc-400">
          Duplicar <span className="text-white font-semibold">{treino?.nome}</span> com todos os seus exercícios.
        </p>
        <Field label="Nome do novo treino *">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </Field>
      </div>
    </Modal>
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
        <Field label="Suplemento *"><Input autoFocus value={form.nome_suplemento} onChange={(e) => setForm((f) => ({ ...f, nome_suplemento: e.target.value }))} placeholder="Whey Protein, Creatina…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dose *"><Input value={form.dose} onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))} placeholder="30g, 5g, 2 cápsulas…" /></Field>
          <Field label="Horário"><Input value={form.horario} onChange={(e) => setForm((f) => ({ ...f, horario: e.target.value }))} placeholder="Pós-treino, 07:00…" /></Field>
        </div>
        <Field label="Observação">
          <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
            value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} />
        </Field>
      </div>
    </Modal>
  );
}

// ─── Módulo Observações ──────────────────────────────────────────────────────

function HidratacaoCard({ protocolo, onSaved }) {
  const toast = useToast();
  const [metaAgua, setMetaAgua] = useState(
    protocolo.meta_agua_litros != null ? Number(protocolo.meta_agua_litros) : 2.5
  );
  const [saving, setSaving] = useState(false);

  async function salvarMetaAgua() {
    setSaving(true);
    try {
      await api.put(`/admin/protocolos/${protocolo.id}`, { meta_agua_litros: metaAgua });
      toast.success('Meta de água atualizada.');
      onSaved();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <div className="mt-4 border-t border-surface-border pt-4 px-5 pb-5">
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Hidratação</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0.5"
          max="10"
          step="0.5"
          value={metaAgua}
          onChange={(e) => setMetaAgua(Number(e.target.value))}
          className="w-20 bg-surface-input border border-surface-border text-white
            rounded px-2 py-1.5 text-sm text-center focus:border-brand focus:outline-none"
        />
        <span className="text-zinc-400 text-sm">litros / dia</span>
      </div>
      <button
        onClick={salvarMetaAgua}
        disabled={saving}
        className="mt-2 text-xs text-brand border border-brand/40 px-3 py-1 rounded
          hover:bg-brand/10 font-bold disabled:opacity-50"
      >
        {saving ? 'Salvando…' : 'Salvar meta'}
      </button>
    </div>
  );
}

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
