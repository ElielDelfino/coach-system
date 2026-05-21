import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast, errorMessage } from '../ui/Toast';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { Field } from '../../pages/admin/Alunos';

export default function ModuloSuplementacao({ protocoloId }) {
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
