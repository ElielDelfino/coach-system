import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import api from '../../services/api';
import { useToast, errorMessage } from '../ui/Toast';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { Field } from '../../pages/admin/Alunos';
import PageLoader from '../ui/PageLoader';
import EmptyState from '../ui/EmptyState';
import ConfirmModal from '../ui/ConfirmModal';
import { formatDate } from './shared';

const MEDIDA_GRUPOS = [
  {
    titulo: 'Composição corporal',
    metricas: [
      { k: 'peso_kg',            label: 'Peso',       sufixo: ' kg' },
      { k: 'altura_cm',          label: 'Altura',     sufixo: ' cm' },
      { k: 'percentual_gordura', label: '%BF',        sufixo: '%' },
      { k: 'peso_magro_kg',      label: 'Peso magro', sufixo: ' kg' },
      { k: 'peso_gordo_kg',      label: 'Peso gordo', sufixo: ' kg' },
    ],
  },
  {
    titulo: 'Tronco',
    metricas: [
      { k: 'cintura_cm', label: 'Cintura', sufixo: ' cm' },
      { k: 'quadril_cm', label: 'Quadril', sufixo: ' cm' },
      { k: 'abdomen_cm', label: 'Abdômen', sufixo: ' cm' },
      { k: 'torax_cm',   label: 'Tórax',   sufixo: ' cm' },
    ],
  },
  {
    titulo: 'Membros superiores',
    metricas: [
      { k: 'braco_dir_cm',     label: 'Braço D',     sufixo: ' cm' },
      { k: 'braco_esq_cm',     label: 'Braço E',     sufixo: ' cm' },
      { k: 'antebraco_dir_cm', label: 'Antebraço D', sufixo: ' cm' },
      { k: 'antebraco_esq_cm', label: 'Antebraço E', sufixo: ' cm' },
    ],
  },
  {
    titulo: 'Membros inferiores',
    metricas: [
      { k: 'coxa_dir_cm',        label: 'Coxa D',        sufixo: ' cm' },
      { k: 'coxa_esq_cm',        label: 'Coxa E',        sufixo: ' cm' },
      { k: 'panturrilha_dir_cm', label: 'Panturrilha D', sufixo: ' cm' },
      { k: 'panturrilha_esq_cm', label: 'Panturrilha E', sufixo: ' cm' },
    ],
  },
];

function formatMedida(v, sufixo = '') {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${sufixo}`;
}

const MEDIDA_FIELD_LABELS = {
  peso_kg: 'Peso (kg)',
  altura_cm: 'Altura (cm)',
  percentual_gordura: '% Gordura',
  peso_magro_kg: 'Peso magro (kg)',
  peso_gordo_kg: 'Peso gordo (kg)',
  cintura_cm: 'Cintura (cm)',
  quadril_cm: 'Quadril (cm)',
  torax_cm: 'Tórax (cm)',
  abdomen_cm: 'Abdômen (cm)',
  braco_dir_cm: 'Braço D (cm)',
  braco_esq_cm: 'Braço E (cm)',
  antebraco_dir_cm: 'Antebraço D (cm)',
  antebraco_esq_cm: 'Antebraço E (cm)',
  coxa_dir_cm: 'Coxa D (cm)',
  coxa_esq_cm: 'Coxa E (cm)',
  panturrilha_dir_cm: 'Panturrilha D (cm)',
  panturrilha_esq_cm: 'Panturrilha E (cm)',
};

export default function TabMedidas({ alunoId }) {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [expandidaId, setExpandidaId] = useState(null);
  const [confirmDel, setConfirmDel] = useState({ aberto: false, medicao: null });
  const [deletando, setDeletando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/alunos/${alunoId}/medidas`);
      setData(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [alunoId, toast]);

  useEffect(() => { load(); }, [load]);

  function pedirRemover(m) {
    setConfirmDel({ aberto: true, medicao: m });
  }

  async function confirmarRemover() {
    const m = confirmDel.medicao;
    if (!m) return;
    setDeletando(true);
    try {
      await api.delete(`/admin/alunos/${alunoId}/medidas/${m.id}`);
      toast.success('Medição removida.');
      setConfirmDel({ aberto: false, medicao: null });
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeletando(false);
    }
  }

  if (loading) {
    return <PageLoader mensagem="Carregando medidas..." />;
  }

  const ordenadas = [...data].sort(
    (a, b) => new Date(b.data_medicao) - new Date(a.data_medicao)
  );
  const ultima = ordenadas[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setOpenCreate(true)}>+ Nova medição</Button>
      </div>

      {!ultima && (
        <EmptyState
          icone="📏"
          titulo="Nenhuma medição registrada"
          descricao="Registre a primeira medição do aluno."
        />
      )}

      {ultima && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="text-section-label">Última medição</div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest tabular-nums">
              {formatDate(ultima.data_medicao)}
            </div>
          </div>
          <UltimaMedicaoCard medida={ultima} />
        </section>
      )}

      {ordenadas.length > 0 && (
        <section className="space-y-3">
          <div className="text-section-label">Histórico</div>

          {/* Desktop: tabela */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-section-label border-b border-surface-border">
                    <th className="text-left px-4 py-3 font-semibold">Data</th>
                    <th className="text-right px-3 py-3 font-semibold">Peso</th>
                    <th className="text-right px-3 py-3 font-semibold">%BF</th>
                    <th className="text-right px-3 py-3 font-semibold">P.Magro</th>
                    <th className="text-right px-3 py-3 font-semibold">Cintura</th>
                    <th className="text-right px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenadas.map((m) => {
                    const expandida = expandidaId === m.id;
                    return (
                      <FragmentLinha
                        key={m.id}
                        medida={m}
                        expandida={expandida}
                        onToggle={() => setExpandidaId(expandida ? null : m.id)}
                        onEdit={() => setEditTarget(m)}
                        onDelete={() => pedirRemover(m)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {ordenadas.map((m) => {
              const expandida = expandidaId === m.id;
              return (
                <div key={m.id} className="bg-surface-card border border-surface-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Data</p>
                      <p className="text-white font-bold tabular-nums">{formatDate(m.data_medicao)}</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => setEditTarget(m)}
                        className="text-xs uppercase tracking-widest font-bold text-zinc-400 hover:text-white"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => pedirRemover(m)}
                        className="text-xs uppercase tracking-widest font-bold text-red-400 hover:text-red-300"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <MetricaMini label="Peso" value={formatMedida(m.peso_kg, ' kg') ?? '—'} />
                    <MetricaMini label="%BF" value={formatMedida(m.percentual_gordura, '%') ?? '—'} />
                  </div>
                  <button
                    onClick={() => setExpandidaId(expandida ? null : m.id)}
                    className="w-full text-xs uppercase tracking-widest font-bold text-brand border border-brand/40 rounded-md py-2 hover:bg-brand/10"
                  >
                    {expandida ? 'Ocultar detalhes' : 'Ver detalhes'}
                  </button>
                  {expandida && (
                    <div className="mt-3">
                      <UltimaMedicaoCard medida={m} compact />
                      {m.observacoes && (
                        <div className="mt-3 text-xs text-zinc-400 border-l-2 border-surface-border pl-3 whitespace-pre-wrap">
                          {m.observacoes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <MedidaModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        alunoId={alunoId}
        onCreated={() => { setOpenCreate(false); load(); }}
      />

      <MedidaModal
        open={!!editTarget}
        seed={editTarget}
        onClose={() => setEditTarget(null)}
        alunoId={alunoId}
        onCreated={() => { setEditTarget(null); load(); }}
      />

      <ConfirmModal
        aberto={confirmDel.aberto}
        titulo="Excluir medição?"
        descricao={confirmDel.medicao ? `Medição de ${formatDate(confirmDel.medicao.data_medicao)}. Esta ação não pode ser desfeita.` : 'Esta ação não pode ser desfeita.'}
        textoBotao="Excluir medição"
        variante="danger"
        carregando={deletando}
        onConfirmar={confirmarRemover}
        onCancelar={() => setConfirmDel({ aberto: false, medicao: null })}
      />
    </div>
  );
}

function FragmentLinha({ medida: m, expandida, onToggle, onEdit, onDelete }) {
  return (
    <>
      <tr className="border-b border-surface-border text-zinc-300 hover:bg-surface-elevated transition-colors">
        <td className="px-4 py-2.5">
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 text-white hover:text-brand text-left"
          >
            <span className={clsx('text-zinc-600 text-xs transition-transform', expandida && 'rotate-90')}>▶</span>
            <span className="tabular-nums">{formatDate(m.data_medicao)}</span>
          </button>
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">{formatMedida(m.peso_kg, ' kg') ?? <span className="text-zinc-600">—</span>}</td>
        <td className="px-3 py-2.5 text-right tabular-nums">{formatMedida(m.percentual_gordura, '%') ?? <span className="text-zinc-600">—</span>}</td>
        <td className="px-3 py-2.5 text-right tabular-nums">{formatMedida(m.peso_magro_kg, ' kg') ?? <span className="text-zinc-600">—</span>}</td>
        <td className="px-3 py-2.5 text-right tabular-nums">{formatMedida(m.cintura_cm, ' cm') ?? <span className="text-zinc-600">—</span>}</td>
        <td className="px-4 py-2.5 text-right space-x-3 whitespace-nowrap">
          <button
            onClick={onEdit}
            className="text-xs uppercase tracking-widest font-bold text-zinc-400 hover:text-white"
          >
            Editar
          </button>
          <button
            onClick={onDelete}
            className="text-xs uppercase tracking-widest font-bold text-red-400 hover:text-red-300"
          >
            Excluir
          </button>
        </td>
      </tr>
      {expandida && (
        <tr className="border-b border-surface-border bg-surface-elevated/40">
          <td colSpan={6} className="px-4 py-4">
            <UltimaMedicaoCard medida={m} compact />
            {m.observacoes && (
              <div className="mt-3 text-xs text-zinc-400 border-l-2 border-surface-border pl-3 whitespace-pre-wrap">
                {m.observacoes}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function UltimaMedicaoCard({ medida, compact = false }) {
  const grupos = MEDIDA_GRUPOS
    .map((g) => ({
      ...g,
      preenchidas: g.metricas.filter((m) => formatMedida(medida[m.k], m.sufixo) != null),
    }))
    .filter((g) => g.preenchidas.length > 0);

  if (grupos.length === 0) {
    return (
      <Card className="p-5 text-zinc-500 text-sm text-center">
        Esta medição não possui valores preenchidos.
      </Card>
    );
  }

  return (
    <Card className={clsx(compact ? 'p-4' : 'p-5', 'space-y-4')}>
      {grupos.map((g, idx) => (
        <div key={g.titulo} className={clsx(idx > 0 && 'pt-4 border-t border-surface-border')}>
          <div className="text-section-label mb-2.5">{g.titulo}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {g.preenchidas.map((mt) => (
              <MetricaMini key={mt.k} label={mt.label} value={formatMedida(medida[mt.k], mt.sufixo)} />
            ))}
          </div>
        </div>
      ))}
      {!compact && medida.observacoes && (
        <div className="pt-4 border-t border-surface-border">
          <div className="text-section-label mb-2">Observações</div>
          <div className="text-sm text-zinc-300 whitespace-pre-wrap">{medida.observacoes}</div>
        </div>
      )}
    </Card>
  );
}

function MetricaMini({ label, value }) {
  return (
    <div className="bg-surface-input border border-surface-border rounded-md px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="text-base font-bold tabular-nums text-white mt-0.5">{value}</div>
    </div>
  );
}

function MedidaModal({ open, onClose, alunoId, onCreated, seed = null }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ data_medicao: new Date().toISOString().slice(0, 10) });
  const isEdit = !!seed;

  const fields = Object.keys(MEDIDA_FIELD_LABELS);

  useEffect(() => {
    if (!open) return;
    if (seed) {
      const init = { data_medicao: seed.data_medicao ? String(seed.data_medicao).slice(0, 10) : '', observacoes: seed.observacoes || '' };
      for (const f of fields) init[f] = seed[f] ?? '';
      setForm(init);
    } else {
      const init = { data_medicao: new Date().toISOString().slice(0, 10), observacoes: '' };
      for (const f of fields) init[f] = '';
      setForm(init);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed?.id]);

  async function salvar() {
    if (!form.data_medicao) { toast.error('Data é obrigatória.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '' || payload[k] == null) {
          if (isEdit) payload[k] = null;
          else delete payload[k];
        }
      });
      if (isEdit) {
        await api.put(`/admin/alunos/${alunoId}/medidas/${seed.id}`, payload);
        toast.success('Medição atualizada.');
      } else {
        await api.post(`/admin/alunos/${alunoId}/medidas`, payload);
        toast.success('Medição registrada.');
      }
      onCreated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar medição' : 'Nova medição'}
      size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>
          {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Registrar'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <Field label="Data *">
          <Input
            type="date"
            value={form.data_medicao || ''}
            onChange={(e) => setForm((f) => ({ ...f, data_medicao: e.target.value }))}
            className="max-w-xs"
          />
        </Field>

        <div>
          <div className="text-section-label mb-2">Composição corporal</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {['peso_kg','altura_cm','percentual_gordura','peso_magro_kg','peso_gordo_kg'].map((f) => (
              <MedidaField key={f} name={f} label={MEDIDA_FIELD_LABELS[f]} form={form} setForm={setForm} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-section-label mb-2">Tronco</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['cintura_cm','quadril_cm','abdomen_cm','torax_cm'].map((f) => (
              <MedidaField key={f} name={f} label={MEDIDA_FIELD_LABELS[f]} form={form} setForm={setForm} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-section-label mb-2">Membros superiores</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['braco_dir_cm','braco_esq_cm','antebraco_dir_cm','antebraco_esq_cm'].map((f) => (
              <MedidaField key={f} name={f} label={MEDIDA_FIELD_LABELS[f]} form={form} setForm={setForm} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-section-label mb-2">Membros inferiores</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['coxa_dir_cm','coxa_esq_cm','panturrilha_dir_cm','panturrilha_esq_cm'].map((f) => (
              <MedidaField key={f} name={f} label={MEDIDA_FIELD_LABELS[f]} form={form} setForm={setForm} />
            ))}
          </div>
        </div>

        <Field label="Observações">
          <textarea
            rows={2}
            className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
            value={form.observacoes || ''}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
          />
        </Field>
      </div>
    </Modal>
  );
}

function MedidaField({ name, label, form, setForm }) {
  return (
    <Field label={label}>
      <Input
        type="number"
        step="0.1"
        value={form[name] ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
      />
    </Field>
  );
}
