import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../services/api';
import { CATEGORIAS_ALIMENTOS, categoriaColors } from '../../lib/categoriasAlimentos';
import { useToast, errorMessage } from '../ui/Toast';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import MacroBar from '../MacroBar';
import { Field } from '../../pages/admin/Alunos';
import { fmt } from './shared';

export default function ModuloAlimentar({ protocoloId }) {
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
  const [categoria, setCategoria] = useState('');
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [qtd, setQtd] = useState('');
  const [obs, setObs] = useState('');

  function resetForm() {
    setBusca(''); setSelected(null); setQtd(''); setObs('');
  }

  useEffect(() => {
    if (!open) return;
    setBusca(''); setCategoria(''); setData([]); setSelected(null); setQtd(''); setObs('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/admin/alimentos', {
          params: {
            busca: busca || undefined,
            categoria: categoria || undefined,
          },
        });
        setData(res.data.data || []);
      } catch (err) { toast.error(errorMessage(err)); }
    }, 250);
    return () => clearTimeout(t);
    // toast é estável após a correção do ToastProvider (useMemo) — não precisa ser dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busca, categoria]);

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
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            autoFocus
            placeholder="Buscar alimento na biblioteca…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1"
          />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="sm:w-56 bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS_ALIMENTOS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <Card className="max-h-80 overflow-y-auto">
          {data.length === 0 && (
            <div className="text-center text-zinc-500 py-8 text-sm">Nenhum resultado.</div>
          )}
          {data.map((a) => {
            const c = categoriaColors(a.categoria);
            return (
              <button
                key={a.id}
                onClick={() => { setSelected(a); if (!qtd) setQtd(a.quantidade_base); }}
                className={clsx(
                  'w-full text-left px-3 py-2.5 text-sm border-b border-surface-border transition-colors flex items-center gap-3',
                  selected?.id === a.id
                    ? 'bg-brand/10 border-l-2 border-l-brand'
                    : 'hover:bg-surface-elevated'
                )}
              >
                {a.foto_url ? (
                  <img
                    src={a.foto_url}
                    alt={a.nome}
                    className="w-12 h-12 rounded-lg object-cover bg-surface-elevated shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className={clsx(
                    'w-12 h-12 rounded-lg bg-surface-elevated border border-surface-border shrink-0 flex items-center justify-center',
                  )}>
                    <span className={clsx('w-2.5 h-2.5 rounded-full', c.dot)} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{a.nome}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {a.categoria ? (
                      <span className={clsx('text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border', c.badge)}>
                        {a.categoria}
                      </span>
                    ) : null}
                    <span className="text-[10px] text-zinc-500 tabular-nums">
                      {a.quantidade_base}{a.unidade === 'gramas' ? 'g' : ` ${a.unidade}`}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs shrink-0">
                  <div className="text-brand font-bold tabular-nums">{a.calorias} kcal</div>
                  <div className="text-zinc-500 tabular-nums">P {a.proteinas} · C {a.carboidratos} · G {a.gorduras}</div>
                </div>
              </button>
            );
          })}
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
