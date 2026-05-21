import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../services/api';
import { useToast, errorMessage } from '../ui/Toast';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { Field } from '../../pages/admin/Alunos';

export default function ModuloTreino({ protocoloId }) {
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
