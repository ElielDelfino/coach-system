import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { formatDate } from './shared';

const FASES = [
  { v: 'cutting', l: 'Cutting' },
  { v: 'bulking', l: 'Bulking' },
  { v: 'manutencao', l: 'Manutenção' },
  { v: 'recomposicao', l: 'Recomposição' },
];

export default function TabProtocolos({ alunoId }) {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/alunos/${alunoId}/protocolos`);
      setData(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, [alunoId, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpenCreate(true)}>+ Novo protocolo</Button>
      </div>
      {data.length === 0 ? (
        <EmptyState
          icone="📋"
          titulo="Nenhum protocolo criado"
          descricao="Crie o primeiro protocolo para este aluno."
        />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((p) => (
          <ProtocoloCard key={p.id} protocolo={p} alunoId={alunoId} onChange={load} />
        ))}
      </div>
      )}

      <ProtocoloModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        alunoId={alunoId}
        onCreated={() => { setOpenCreate(false); load(); }}
      />
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="text-[10px] uppercase tracking-widest font-bold text-brand bg-brand/10 border border-brand/30 px-2 py-0.5 rounded">
      {children}
    </span>
  );
}

function ProtocoloStatusBadge({ ativo, finalizado }) {
  if (ativo) {
    return (
      <span className="text-[10px] uppercase tracking-widest text-green-400 bg-green-950 border border-green-900 px-1.5 py-0.5 rounded">Ativo</span>
    );
  }
  if (finalizado) {
    return (
      <span className="text-[10px] uppercase tracking-widest text-yellow-400 bg-yellow-950 border border-yellow-900 px-1.5 py-0.5 rounded">Finalizado</span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">Inativo</span>
  );
}

function ProtocoloCard({ protocolo: p, alunoId, onChange }) {
  const toast = useToast();
  const [enviando, setEnviando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deletando, setDeletando] = useState(false);

  async function enviarPDF() {
    setEnviando(true);
    try {
      const res = await api.post(`/admin/protocolos/${p.id}/enviar-pdf`);
      toast.success(res.data?.message || 'PDF enviado para o email do aluno!');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  async function baixarPDF() {
    setBaixando(true);
    try {
      const res = await api.get(`/admin/protocolos/${p.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `protocolo-${p.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBaixando(false);
    }
  }

  async function excluir() {
    setDeletando(true);
    try {
      await api.delete(`/admin/protocolos/${p.id}`);
      toast.success('Protocolo removido.');
      setConfirmDel(false);
      onChange?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeletando(false);
    }
  }

  return (
    <Card className="p-5 hover:bg-surface-elevated transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-black text-white truncate">{p.nome}</h3>
            <ProtocoloStatusBadge ativo={p.ativo} finalizado={p.finalizado} />
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{p.fase || '—'}</div>
        </div>
        <Link
          to={`/admin/alunos/${alunoId}/protocolos/${p.id}`}
          className="text-xs uppercase tracking-widest font-bold text-brand hover:text-brand-dark shrink-0"
        >
          Abrir →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-zinc-400">
        <div>Início: <span className="text-white tabular-nums">{formatDate(p.data_inicio)}</span></div>
        <div>Fim: <span className="text-white tabular-nums">{formatDate(p.data_fim)}</span></div>
      </div>

      <div className="flex gap-1.5 mt-4 flex-wrap">
        {p.modulo_alimentar && <Pill>Alimentar</Pill>}
        {p.modulo_treino && <Pill>Treino</Pill>}
        {p.modulo_cardio && <Pill>Cardio</Pill>}
        {p.modulo_suplementacao && <Pill>Suplem.</Pill>}
      </div>

      <div className="mt-4 pt-4 border-t border-surface-border flex justify-end gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpenEdit(true)}
          className="text-zinc-300 border border-surface-border hover:text-white text-xs"
        >
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmDel(true)}
          className="text-red-400 border border-red-900 hover:bg-red-950/40 hover:text-red-300 text-xs"
        >
          Excluir
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={baixarPDF}
          disabled={baixando}
          className="text-zinc-400 border border-zinc-700 hover:text-white text-xs"
        >
          {baixando ? 'Gerando…' : '⬇ Baixar PDF'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={enviarPDF}
          disabled={enviando}
          className="text-brand border border-brand/40 hover:bg-brand/10 hover:text-brand"
        >
          {enviando ? 'Enviando…' : 'Enviar PDF'}
        </Button>
      </div>

      <EditarProtocoloModal
        open={openEdit}
        protocolo={p}
        onClose={() => setOpenEdit(false)}
        onSaved={() => { setOpenEdit(false); onChange?.(); }}
      />

      <ConfirmModal
        aberto={confirmDel}
        titulo="Excluir protocolo?"
        descricao={`Remover o protocolo "${p.nome}" e todos os seus dados (refeições, treinos, suplementação). Esta ação não pode ser desfeita.`}
        textoBotao="Excluir protocolo"
        variante="danger"
        carregando={deletando}
        onConfirmar={excluir}
        onCancelar={() => setConfirmDel(false)}
      />
    </Card>
  );
}

function EditarProtocoloModal({ open, protocolo, onClose, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '', objetivo: '', fase: 'cutting',
    data_inicio: '', data_fim: '', status: 'ativo',
  });

  useEffect(() => {
    if (!open || !protocolo) return;
    const statusInicial = protocolo.ativo
      ? 'ativo'
      : protocolo.finalizado ? 'finalizado' : 'inativo';
    setForm({
      nome: protocolo.nome || '',
      objetivo: protocolo.objetivo || '',
      fase: protocolo.fase || 'cutting',
      data_inicio: (protocolo.data_inicio || '').slice(0, 10),
      data_fim: (protocolo.data_fim || '').slice(0, 10),
      status: statusInicial,
    });
  }, [open, protocolo]);

  async function salvar() {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        objetivo: form.objetivo || null,
        fase: form.fase || null,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
      };
      if (form.status === 'ativo') {
        payload.ativo = true;
        payload.finalizado = false;
      } else if (form.status === 'finalizado') {
        payload.ativo = false;
        payload.finalizado = true;
      } else {
        payload.ativo = false;
        payload.finalizado = false;
      }
      await api.put(`/admin/protocolos/${protocolo.id}`, payload);
      toast.success('Protocolo atualizado.');
      onSaved();
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
      title="Editar protocolo"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </>}
    >
      <div className="space-y-3">
        <Field label="Nome *">
          <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Objetivo">
            <Input value={form.objetivo} onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))} />
          </Field>
          <Field label="Fase">
            <select
              value={form.fase}
              onChange={(e) => setForm((f) => ({ ...f, fase: e.target.value }))}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm"
            >
              {FASES.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
            </select>
          </Field>
          <Field label="Início">
            <Input type="date" value={form.data_inicio}
              onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))} />
          </Field>
          <Field label="Fim">
            <Input type="date" value={form.data_fim}
              onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))} />
          </Field>
        </div>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm"
          >
            <option value="ativo">Ativo</option>
            <option value="finalizado">Finalizado</option>
            <option value="inativo">Inativo</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}

function ProtocoloModal({ open, onClose, alunoId, onCreated }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '', objetivo: '', fase: 'cutting',
    data_inicio: '', data_fim: '',
    modulo_alimentar: true, modulo_treino: true, modulo_cardio: false, modulo_suplementacao: false,
    observacoes: '',
  });

  async function salvar() {
    if (!form.nome) { toast.error('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      await api.post(`/admin/alunos/${alunoId}/protocolos`, payload);
      toast.success('Protocolo criado.');
      onCreated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function toggleMod(k) {
    setForm((f) => ({ ...f, [k]: !f[k] }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo protocolo"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Criar'}</Button>
      </>}
    >
      <div className="space-y-3">
        <Field label="Nome *"><Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Objetivo"><Input value={form.objetivo} onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))} /></Field>
          <Field label="Fase">
            <select value={form.fase} onChange={(e) => setForm((f) => ({ ...f, fase: e.target.value }))}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm">
              {FASES.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
            </select>
          </Field>
          <Field label="Início"><Input type="date" value={form.data_inicio} onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))} /></Field>
          <Field label="Fim"><Input type="date" value={form.data_fim} onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))} /></Field>
        </div>
        <div>
          <div className="text-section-label mb-2">Módulos ativos</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: 'modulo_alimentar', l: 'Alimentar' },
              { k: 'modulo_treino', l: 'Treino' },
              { k: 'modulo_cardio', l: 'Cardio' },
              { k: 'modulo_suplementacao', l: 'Suplementação' },
            ].map((m) => (
              <button
                key={m.k}
                type="button"
                onClick={() => toggleMod(m.k)}
                className={clsx(
                  'px-3 py-2 text-xs uppercase tracking-widest font-bold rounded border transition-colors',
                  form[m.k]
                    ? 'bg-brand/10 border-brand text-brand'
                    : 'bg-surface-input border-surface-border text-zinc-500 hover:text-zinc-300'
                )}
              >
                {m.l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
