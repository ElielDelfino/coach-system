import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import api from '../../services/api';
import { useToast, errorMessage } from '../ui/Toast';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { Field } from '../../pages/admin/Alunos';
import EmptyState from '../ui/EmptyState';
import ConfirmModal from '../ui/ConfirmModal';
import { formatDate, formatCurrency } from './shared';

const METODOS = [
  { v: 'pix', l: 'Pix' },
  { v: 'dinheiro', l: 'Dinheiro' },
  { v: 'cartao_credito', l: 'Crédito' },
  { v: 'cartao_debito', l: 'Débito' },
  { v: 'transferencia', l: 'Transferência' },
];

const FATURA_STATUS_STYLES = {
  pendente: 'bg-yellow-950 text-yellow-400 border-yellow-900',
  pago: 'bg-green-950 text-green-400 border-green-900',
  vencido: 'bg-red-950 text-red-400 border-red-900',
};

const FATURA_STATUS_LABELS = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
};

function FaturaStatusBadge({ status }) {
  const key = FATURA_STATUS_STYLES[status] ? status : 'pendente';
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border',
      FATURA_STATUS_STYLES[key]
    )}>
      {FATURA_STATUS_LABELS[key]}
    </span>
  );
}

export default function TabFaturas({ alunoId, alunoTolerancia, onReload }) {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [baixaTarget, setBaixaTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDel, setConfirmDel] = useState({ aberto: false, fatura: null });
  const [deletando, setDeletando] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/alunos/${alunoId}/faturas`);
      setData(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, [alunoId, toast]);

  useEffect(() => { load(); }, [load]);

  function pedirRemover(fatura) {
    setConfirmDel({ aberto: true, fatura });
  }

  async function confirmarRemover() {
    const fatura = confirmDel.fatura;
    if (!fatura) return;
    setDeletando(true);
    try {
      await api.delete(`/admin/faturas/${fatura.id}`);
      toast.success('Fatura removida.');
      setConfirmDel({ aberto: false, fatura: null });
      load();
      onReload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeletando(false);
    }
  }

  const emAberto = data.filter((f) => f.status !== 'pago');
  const totalEmAberto = emAberto.reduce((s, f) => s + Number(f.valor_final ?? f.valor ?? 0), 0);
  const pendentes = data.filter((f) => f.status === 'pendente');
  const proxima = pendentes.map((f) => f.data_vencimento).sort().find(Boolean);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-section-label mb-2">Total em aberto</div>
          <div className="text-3xl font-black text-brand tabular-nums">{formatCurrency(totalEmAberto)}</div>
          <div className="text-xs text-zinc-500 mt-1">{emAberto.length} fatura(s)</div>
        </Card>
        <Card className="p-5">
          <div className="text-section-label mb-2">Próximo vencimento</div>
          <div className="text-3xl font-black text-white tabular-nums">{formatDate(proxima)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-section-label mb-2">Tolerância</div>
          <div className="text-3xl font-black text-white tabular-nums">{alunoTolerancia} dias</div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setOpenCreate(true)}>+ Lançar fatura</Button>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icone="💰"
          titulo="Nenhuma fatura lançada"
          descricao="Lance a primeira fatura para este aluno."
        />
      ) : (
      <>
        {/* Desktop: tabela */}
        <Card className="hidden md:block overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-section-label border-b border-surface-border">
                  <th className="text-left px-5 py-3 font-semibold">Vencimento</th>
                  <th className="text-right px-5 py-3 font-semibold">Valor</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-left px-5 py-3 font-semibold">Data baixa</th>
                  <th className="text-left px-5 py-3 font-semibold">Método</th>
                  <th className="text-right px-5 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((f) => (
                  <tr key={f.id} className="border-b border-surface-border text-zinc-300">
                    <td className="px-5 py-2.5 text-white tabular-nums">{formatDate(f.data_vencimento)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {f.desconto_tipo ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="line-through text-zinc-500 text-xs">{formatCurrency(f.valor)}</span>
                          <span className="font-bold text-brand">{formatCurrency(f.valor_final)}</span>
                          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
                            {f.desconto_tipo === 'valor' ? `-${formatCurrency(f.desconto_valor)}` : `-${f.desconto_valor}%`}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-brand">{formatCurrency(f.valor_final ?? f.valor)}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5"><FaturaStatusBadge status={f.status} /></td>
                    <td className="px-5 py-2.5 tabular-nums">{formatDate(f.data_baixa)}</td>
                    <td className="px-5 py-2.5 uppercase text-xs tracking-widest">{f.metodo_baixa || '—'}</td>
                    <td className="px-5 py-2.5 text-right space-x-2">
                      <button
                        onClick={() => setEditTarget(f)}
                        className="text-xs uppercase tracking-widest font-bold text-zinc-400 hover:text-zinc-200"
                      >
                        Editar
                      </button>
                      {(f.status === 'pendente' || f.status === 'vencido') && (
                        <button
                          onClick={() => setBaixaTarget(f)}
                          className="text-xs uppercase tracking-widest font-bold text-green-400 hover:text-green-300"
                        >
                          Dar baixa
                        </button>
                      )}
                      <button
                        onClick={() => pedirRemover(f)}
                        className="text-xs uppercase tracking-widest font-bold text-red-400 hover:text-red-300"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {data.map((f) => (
            <div key={f.id} className="bg-surface-card border border-surface-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Vencimento</p>
                  <p className="text-white font-bold tabular-nums">{formatDate(f.data_vencimento)}</p>
                </div>
                <FaturaStatusBadge status={f.status} />
              </div>
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Valor</p>
                {f.desconto_tipo ? (
                  <div className="flex items-baseline gap-2">
                    <span className="line-through text-zinc-500 text-xs">{formatCurrency(f.valor)}</span>
                    <span className="font-black text-brand text-lg tabular-nums">{formatCurrency(f.valor_final)}</span>
                  </div>
                ) : (
                  <span className="font-black text-brand text-lg tabular-nums">{formatCurrency(f.valor_final ?? f.valor)}</span>
                )}
              </div>
              {f.data_baixa && (
                <div className="text-xs text-zinc-500 mb-3">
                  Baixa em <span className="text-zinc-300 tabular-nums">{formatDate(f.data_baixa)}</span>
                  {f.metodo_baixa && <span className="text-zinc-300 uppercase tracking-widest ml-2">· {f.metodo_baixa}</span>}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setEditTarget(f)}
                  className="flex-1 min-w-[80px] text-xs uppercase tracking-widest font-bold text-zinc-300 border border-surface-border rounded-md py-2 hover:bg-surface-elevated"
                >
                  Editar
                </button>
                {(f.status === 'pendente' || f.status === 'vencido') && (
                  <button
                    onClick={() => setBaixaTarget(f)}
                    className="flex-1 min-w-[80px] text-xs uppercase tracking-widest font-bold text-green-300 border border-green-900 bg-green-950/40 rounded-md py-2 hover:bg-green-950"
                  >
                    Dar baixa
                  </button>
                )}
                <button
                  onClick={() => pedirRemover(f)}
                  className="flex-1 min-w-[80px] text-xs uppercase tracking-widest font-bold text-red-300 border border-red-900 bg-red-950/40 rounded-md py-2 hover:bg-red-950"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
      )}

      <FaturaModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        alunoId={alunoId}
        onCreated={() => { setOpenCreate(false); load(); onReload(); }}
      />

      <EditarFaturaModal
        fatura={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); load(); onReload(); }}
      />

      <BaixaModal
        fatura={baixaTarget}
        onClose={() => setBaixaTarget(null)}
        onConfirmed={() => { setBaixaTarget(null); load(); onReload(); }}
      />

      <ConfirmModal
        aberto={confirmDel.aberto}
        titulo="Excluir fatura?"
        descricao="Esta ação não pode ser desfeita."
        textoBotao="Excluir fatura"
        variante="danger"
        carregando={deletando}
        onConfirmar={confirmarRemover}
        onCancelar={() => setConfirmDel({ aberto: false, fatura: null })}
      />
    </div>
  );
}

function calcPreviewFinal(valor, desconto_tipo, desconto_valor) {
  const v = Number(valor) || 0;
  const dv = Number(desconto_valor) || 0;
  if (!desconto_tipo || !dv) return v;
  if (desconto_tipo === 'valor') return Math.max(0, v - dv);
  if (desconto_tipo === 'percentual') return Math.max(0, v * (1 - dv / 100));
  return v;
}

function DescontoSection({ form, setForm }) {
  const preview = useMemo(
    () => calcPreviewFinal(form.valor, form.desconto_tipo, form.desconto_valor),
    [form.valor, form.desconto_tipo, form.desconto_valor]
  );

  return (
    <div className="border-t border-surface-border pt-3 space-y-2">
      <div className="text-section-label">Desconto (opcional)</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo de desconto">
          <select
            value={form.desconto_tipo}
            onChange={(e) => setForm((f) => ({ ...f, desconto_tipo: e.target.value, desconto_valor: '' }))}
            className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm"
          >
            <option value="">Nenhum</option>
            <option value="valor">Valor fixo (R$)</option>
            <option value="percentual">Percentual (%)</option>
          </select>
        </Field>
        {form.desconto_tipo && (
          <Field label={form.desconto_tipo === 'valor' ? 'Desconto (R$)' : 'Desconto (%)'}>
            <Input
              type="number" step="0.01" min="0"
              value={form.desconto_valor}
              onChange={(e) => setForm((f) => ({ ...f, desconto_valor: e.target.value }))}
            />
          </Field>
        )}
      </div>
      {form.desconto_tipo && form.desconto_valor && (
        <div className="text-xs text-zinc-500">
          Valor final: <span className="text-brand font-bold">{formatCurrency(preview)}</span>
          <span className="text-zinc-600 ml-1">(calculado pelo servidor)</span>
        </div>
      )}
    </div>
  );
}

function FaturaModal({ open, onClose, alunoId, onCreated }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const trinta = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const emptyForm = { valor: '', data_vencimento: trinta, observacoes: '', desconto_tipo: '', desconto_valor: '' };
  const [form, setForm] = useState(emptyForm);

  async function salvar() {
    if (!form.valor || !form.data_vencimento) {
      toast.error('Valor e data de vencimento são obrigatórios.'); return;
    }
    if (Number(form.valor) <= 0) {
      toast.error('Valor deve ser positivo.'); return;
    }
    setSaving(true);
    try {
      await api.post(`/admin/alunos/${alunoId}/faturas`, {
        valor: Number(form.valor),
        data_vencimento: form.data_vencimento,
        observacoes: form.observacoes || undefined,
        desconto_tipo: form.desconto_tipo || undefined,
        desconto_valor: form.desconto_tipo && form.desconto_valor !== '' ? Number(form.desconto_valor) : undefined,
      });
      toast.success('Fatura lançada.');
      setForm(emptyForm);
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
      title="Lançar fatura"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Lançar'}</Button>
      </>}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$) *">
            <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} />
          </Field>
          <Field label="Vencimento *">
            <Input type="date" value={form.data_vencimento} onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))} />
          </Field>
        </div>
        <Field label="Observações">
          <Input value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
        </Field>
        <DescontoSection form={form} setForm={setForm} />
      </div>
    </Modal>
  );
}

function EditarFaturaModal({ fatura, onClose, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ valor: '', data_vencimento: '', observacoes: '', desconto_tipo: '', desconto_valor: '' });

  useEffect(() => {
    if (fatura) {
      setForm({
        valor: fatura.valor ?? '',
        data_vencimento: (fatura.data_vencimento || '').slice(0, 10),
        observacoes: fatura.observacoes || '',
        desconto_tipo: fatura.desconto_tipo || '',
        desconto_valor: fatura.desconto_valor ?? '',
      });
    }
  }, [fatura]);

  async function salvar() {
    if (!form.valor || !form.data_vencimento) {
      toast.error('Valor e data de vencimento são obrigatórios.'); return;
    }
    if (Number(form.valor) <= 0) {
      toast.error('Valor deve ser positivo.'); return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/faturas/${fatura.id}`, {
        valor: Number(form.valor),
        data_vencimento: form.data_vencimento,
        observacoes: form.observacoes || null,
        desconto_tipo: form.desconto_tipo || null,
        desconto_valor: form.desconto_tipo && form.desconto_valor !== '' ? Number(form.desconto_valor) : null,
      });
      toast.success('Fatura atualizada.');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!fatura}
      onClose={onClose}
      title="Editar fatura"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </>}
    >
      {fatura && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$) *">
              <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} />
            </Field>
            <Field label="Vencimento *">
              <Input type="date" value={form.data_vencimento} onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))} />
            </Field>
          </div>
          <Field label="Observações">
            <textarea rows={2}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            />
          </Field>
          <DescontoSection form={form} setForm={setForm} />
        </div>
      )}
    </Modal>
  );
}

function BaixaModal({ fatura, onClose, onConfirmed }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ data_baixa: hoje, metodo_baixa: 'pix', observacoes: '' });

  useEffect(() => {
    if (fatura) setForm({ data_baixa: hoje, metodo_baixa: 'pix', observacoes: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fatura]);

  async function salvar() {
    if (!form.data_baixa || !form.metodo_baixa) {
      toast.error('Data e método são obrigatórios.'); return;
    }
    setSaving(true);
    try {
      await api.patch(`/admin/faturas/${fatura.id}/baixa`, {
        data_baixa: form.data_baixa,
        metodo_baixa: form.metodo_baixa,
        observacoes: form.observacoes || undefined,
      });
      toast.success('Baixa registrada.');
      onConfirmed();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!fatura}
      onClose={onClose}
      title="Dar baixa na fatura"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Confirmar baixa'}</Button>
      </>}
    >
      {fatura && (
        <div className="space-y-3">
          <div className="text-xs text-zinc-500 uppercase tracking-widest">
            Fatura de{' '}
            {fatura.desconto_tipo ? (
              <>
                <span className="line-through text-zinc-600">{formatCurrency(fatura.valor)}</span>
                {' '}<span className="text-brand font-bold">{formatCurrency(fatura.valor_final)}</span>
              </>
            ) : (
              <span className="text-brand font-bold">{formatCurrency(fatura.valor_final ?? fatura.valor)}</span>
            )}
            {' '}com vencimento em <span className="text-white">{formatDate(fatura.data_vencimento)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data da baixa *">
              <Input type="date" value={form.data_baixa} onChange={(e) => setForm((f) => ({ ...f, data_baixa: e.target.value }))} />
            </Field>
            <Field label="Método *">
              <select
                value={form.metodo_baixa}
                onChange={(e) => setForm((f) => ({ ...f, metodo_baixa: e.target.value }))}
                className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm"
              >
                {METODOS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Observações">
            <Input value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
          </Field>
        </div>
      )}
    </Modal>
  );
}
