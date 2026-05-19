import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Field } from './Alunos';
import { SkeletonTabela } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const INTENSIDADES = [
  { v: '', l: 'Todas' },
  { v: 'leve', l: 'Leve' },
  { v: 'moderada', l: 'Moderada' },
  { v: 'intensa', l: 'Intensa' },
  { v: 'maxima', l: 'Máxima' },
];

export default function Cardio() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState('');
  const [intensidade, setIntensidade] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/cardio', {
        params: { tipo: tipo || undefined, intensidade: intensidade || undefined },
      });
      setData(res.data.data || []);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tipo, intensidade, toast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function desativar(c) {
    try {
      await api.patch(`/admin/cardio/${c.id}/desativar`);
      load();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 max-w-7xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-section-label">Biblioteca</div>
          <h1 className="text-page-title mt-1">Cardio</h1>
        </div>
        <Button onClick={() => setOpenCreate(true)}>+ Adicionar cardio</Button>
      </header>

      <Card className="p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1"><Input placeholder="Filtrar por tipo (corrida, bike…)" value={tipo} onChange={(e) => setTipo(e.target.value)} /></div>
        <select value={intensidade} onChange={(e) => setIntensidade(e.target.value)}
          className="bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm md:w-48">
          {INTENSIDADES.map((i) => <option key={i.v} value={i.v}>{i.l}</option>)}
        </select>
      </Card>

      {loading ? (
        <Card className="overflow-hidden">
          <SkeletonTabela linhas={5} colunas={4} />
        </Card>
      ) : data.length === 0 ? (
        <EmptyState
          icone="🏃"
          titulo="Nenhum cardio cadastrado"
          descricao="Cadastre tipos de cardio para usar nos protocolos."
        />
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {data.map((c) => (
          <Card key={c.id} className="p-5 cursor-pointer hover:bg-surface-elevated transition-colors" onClick={() => setEditing(c.id)}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-white capitalize">{c.tipo}</h3>
              <span className={
                'text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ' +
                (c.ativo
                  ? 'bg-green-950 border-green-900 text-green-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500')
              }>{c.ativo ? 'Ativo' : 'Inativo'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
              <Metric label="Intensidade" value={c.intensidade || '—'} />
              <Metric label="Duração" value={c.duracao_min ? `${c.duracao_min} min` : '—'} />
              <Metric label="Velocidade" value={c.velocidade ? `${c.velocidade} km/h` : '—'} />
              <Metric label="Inclinação" value={c.inclinacao ?? '—'} />
            </div>
            <div className="mt-3 pt-3 border-t border-surface-border flex items-baseline justify-between">
              <span className="text-section-label">Gasto estimado</span>
              <span className="text-xl font-black text-brand tabular-nums">{c.gasto_calorico_estimado ?? '—'} kcal</span>
            </div>
            {c.ativo && (
              <button onClick={(e) => { e.stopPropagation(); desativar(c); }}
                className="mt-3 text-[10px] uppercase tracking-widest text-zinc-500 hover:text-red-400">
                Desativar
              </button>
            )}
          </Card>
        ))}
      </div>
      )}

      <CardioModal
        open={openCreate || !!editing}
        onClose={() => { setOpenCreate(false); setEditing(null); }}
        cId={editing}
        onSaved={() => { setOpenCreate(false); setEditing(null); load(); }}
      />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-600">{label}</div>
      <div className="text-zinc-200 text-sm capitalize">{value}</div>
    </div>
  );
}

function CardioModal({ open, onClose, cId, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const isEdit = !!cId;

  useEffect(() => {
    if (!open) return;
    if (!cId) setForm({ tipo: '', intensidade: 'moderada', duracao_min: '', gasto_calorico_estimado: '', inclinacao: '', velocidade: '', observacoes: '' });
    else {
      (async () => {
        try { const res = await api.get(`/admin/cardio/${cId}`); setForm(res.data); }
        catch (err) { toast.error(errorMessage(err)); }
      })();
    }
  }, [open, cId, toast]);

  async function salvar() {
    if (!form.tipo) { toast.error('Tipo é obrigatório.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id; delete payload.ativo; delete payload.created_at; delete payload.updated_at;
      ['duracao_min','gasto_calorico_estimado','inclinacao','velocidade'].forEach((k) => {
        if (payload[k] !== '' && payload[k] != null) payload[k] = Number(payload[k]);
      });
      Object.keys(payload).forEach((k) => { if (payload[k] === '' || payload[k] == null) delete payload[k]; });

      if (isEdit) {
        await api.put(`/admin/cardio/${cId}`, payload);
        toast.success('Cardio atualizado.');
      } else {
        await api.post('/admin/cardio', payload);
        toast.success('Cardio cadastrado.');
      }
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? 'Editar cardio' : 'Novo cardio'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Cadastrar'}</Button>
      </>}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Tipo *"><Input value={form.tipo || ''} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="corrida, bike…" /></Field>
          <Field label="Intensidade">
            <select value={form.intensidade || 'moderada'} onChange={(e) => setForm({ ...form, intensidade: e.target.value })}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm">
              <option value="leve">Leve</option>
              <option value="moderada">Moderada</option>
              <option value="intensa">Intensa</option>
              <option value="maxima">Máxima</option>
            </select>
          </Field>
          <Field label="Duração (min)"><Input type="number" value={form.duracao_min ?? ''} onChange={(e) => setForm({ ...form, duracao_min: e.target.value })} /></Field>
          <Field label="Gasto (kcal)"><Input type="number" step="0.1" value={form.gasto_calorico_estimado ?? ''} onChange={(e) => setForm({ ...form, gasto_calorico_estimado: e.target.value })} /></Field>
          <Field label="Inclinação"><Input type="number" step="0.1" value={form.inclinacao ?? ''} onChange={(e) => setForm({ ...form, inclinacao: e.target.value })} /></Field>
          <Field label="Velocidade (km/h)"><Input type="number" step="0.1" value={form.velocidade ?? ''} onChange={(e) => setForm({ ...form, velocidade: e.target.value })} /></Field>
        </div>
        <Field label="Observações">
          <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm resize-none"
            value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
