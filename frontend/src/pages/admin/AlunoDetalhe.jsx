import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/StatusBadge';
import { Field } from './Alunos';

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'medidas', label: 'Medidas' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'protocolos', label: 'Protocolos' },
];

function iniciais(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}
function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}
function formatCurrency(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AlunoDetalhe() {
  const { id } = useParams();
  const toast = useToast();
  const [aluno, setAluno] = useState(null);
  const [tab, setTab] = useState('perfil');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/alunos/${id}`);
      setAluno(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  async function alternarAtivo() {
    try {
      const action = aluno.ativo ? 'desativar' : 'ativar';
      await api.patch(`/admin/alunos/${id}/${action}`);
      toast.success(`Aluno ${action === 'ativar' ? 'ativado' : 'desativado'}.`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (loading || !aluno) {
    return <div className="p-8 text-section-label animate-pulse">Carregando…</div>;
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <Link to="/admin/alunos" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-brand">
          ← Voltar
        </Link>
      </div>

      <header className="flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center text-xl font-black text-white">
          {iniciais(aluno.nome)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-page-title">{aluno.nome}</h1>
            <StatusBadge status={aluno.status} />
          </div>
          <div className="text-zinc-400 text-sm mt-0.5">{aluno.email}</div>
          <div className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
            Vencimento: <span className="text-zinc-300 tabular-nums normal-case tracking-normal">{formatDate(aluno.vencimento_plano)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={aluno.ativo ? 'danger' : 'primary'} onClick={alternarAtivo}>
            {aluno.ativo ? 'Desativar aluno' : 'Ativar aluno'}
          </Button>
        </div>
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

      {tab === 'perfil' && <TabPerfil aluno={aluno} onReload={load} />}
      {tab === 'medidas' && <TabMedidas alunoId={id} />}
      {tab === 'fotos' && <TabFotos alunoId={id} />}
      {tab === 'pagamentos' && <TabPagamentos alunoId={id} onReload={load} />}
      {tab === 'protocolos' && <TabProtocolos alunoId={id} />}
    </div>
  );
}

// ─── Perfil ─────────────────────────────────────────────────────────────────

function TabPerfil({ aluno, onReload }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(aluno);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(aluno), [aluno]);

  async function salvar() {
    setSaving(true);
    try {
      const allowed = ['nome', 'telefone', 'data_nascimento', 'sexo', 'objetivo', 'restricoes', 'lesoes', 'observacoes'];
      const payload = {};
      allowed.forEach((k) => { if (form[k] !== undefined) payload[k] = form[k]; });
      await api.put(`/admin/alunos/${aluno.id}`, payload);
      toast.success('Aluno atualizado.');
      setEditing(false);
      onReload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2 p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-section-label">Dados pessoais</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-xs uppercase tracking-widest font-bold text-brand hover:text-brand-dark">
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm(aluno); }}>Cancelar</Button>
              <Button size="sm" onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <Field label="Nome"><Input value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
              <Field label="Telefone"><Input value={form.telefone || ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></Field>
              <Field label="Nascimento"><Input type="date" value={(form.data_nascimento || '').slice(0, 10)} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} /></Field>
              <Field label="Sexo">
                <select
                  value={form.sexo || ''}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                  className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </Field>
              <Field label="Objetivo"><Input value={form.objetivo || ''} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></Field>
              <div className="col-span-2"><Field label="Restrições">
                <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
                  value={form.restricoes || ''} onChange={(e) => setForm({ ...form, restricoes: e.target.value })} /></Field></div>
              <div className="col-span-2"><Field label="Lesões">
                <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
                  value={form.lesoes || ''} onChange={(e) => setForm({ ...form, lesoes: e.target.value })} /></Field></div>
              <div className="col-span-2"><Field label="Observações">
                <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
                  value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Field></div>
            </>
          ) : (
            <>
              <Info label="Telefone" value={aluno.telefone} />
              <Info label="Nascimento" value={formatDate(aluno.data_nascimento)} />
              <Info label="Sexo" value={aluno.sexo} />
              <Info label="Objetivo" value={aluno.objetivo} />
              <Info label="Restrições" value={aluno.restricoes} span={2} />
              <Info label="Lesões" value={aluno.lesoes} span={2} />
              <Info label="Observações" value={aluno.observacoes} span={2} />
            </>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-section-label mb-4">Última medição</h2>
        {aluno.ultima_medicao ? (
          <div className="space-y-3">
            <Metric label="Peso" value={`${aluno.ultima_medicao.peso_kg ?? '—'} kg`} />
            <Metric label="% Gordura" value={`${aluno.ultima_medicao.percentual_gordura ?? '—'}%`} />
            <Metric label="Massa magra" value={`${aluno.ultima_medicao.peso_magro_kg ?? '—'} kg`} />
            <Metric label="Massa gorda" value={`${aluno.ultima_medicao.peso_gordo_kg ?? '—'} kg`} />
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest pt-2 border-t border-surface-border">
              {formatDate(aluno.ultima_medicao.data_medicao)}
            </div>
          </div>
        ) : (
          <div className="text-zinc-500 text-sm">Sem medições registradas.</div>
        )}
      </Card>
    </div>
  );
}

function Info({ label, value, span = 1 }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <div className="text-section-label">{label}</div>
      <div className="text-zinc-200 mt-0.5 text-sm whitespace-pre-wrap">{value || '—'}</div>
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="text-section-label">{label}</div>
      <div className="text-xl font-black tabular-nums text-white">{value}</div>
    </div>
  );
}

// ─── Medidas ────────────────────────────────────────────────────────────────

function TabMedidas({ alunoId }) {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpenCreate(true)}>+ Nova medição</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-section-label border-b border-surface-border">
              <th className="text-left px-4 py-3 font-semibold">Data</th>
              <th className="text-right px-4 py-3 font-semibold">Peso</th>
              <th className="text-right px-4 py-3 font-semibold">% Gord.</th>
              <th className="text-right px-4 py-3 font-semibold">Magra</th>
              <th className="text-right px-4 py-3 font-semibold">Gorda</th>
              <th className="text-right px-4 py-3 font-semibold">Cintura</th>
              <th className="text-right px-4 py-3 font-semibold">Quadril</th>
              <th className="text-right px-4 py-3 font-semibold">Tórax</th>
            </tr>
          </thead>
          <tbody>
            {loading && (<tr><td colSpan={8} className="text-center text-zinc-500 py-8">Carregando…</td></tr>)}
            {!loading && data.length === 0 && (
              <tr><td colSpan={8} className="text-center text-zinc-500 py-8">Nenhuma medição registrada.</td></tr>
            )}
            {data.map((m) => (
              <tr key={m.id} className="border-b border-surface-border text-zinc-300">
                <td className="px-4 py-2.5 text-white">{formatDate(m.data_medicao)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.peso_kg ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.percentual_gordura ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.peso_magro_kg ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.peso_gordo_kg ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.cintura_cm ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.quadril_cm ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.torax_cm ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <MedidaModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        alunoId={alunoId}
        onCreated={() => { setOpenCreate(false); load(); }}
      />
    </div>
  );
}

function MedidaModal({ open, onClose, alunoId, onCreated }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ data_medicao: new Date().toISOString().slice(0, 10) });

  const fields = [
    'peso_kg', 'altura_cm', 'percentual_gordura', 'peso_magro_kg', 'peso_gordo_kg',
    'cintura_cm', 'quadril_cm', 'torax_cm',
    'braco_dir_cm', 'braco_esq_cm', 'antebraco_dir_cm', 'antebraco_esq_cm',
    'coxa_dir_cm', 'coxa_esq_cm', 'panturrilha_dir_cm', 'panturrilha_esq_cm',
  ];

  async function salvar() {
    if (!form.data_medicao) { toast.error('Data é obrigatória.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => { if (payload[k] === '' || payload[k] == null) delete payload[k]; });
      await api.post(`/admin/alunos/${alunoId}/medidas`, payload);
      toast.success('Medição registrada.');
      setForm({ data_medicao: new Date().toISOString().slice(0, 10) });
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
      title="Nova medição"
      size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Registrar'}</Button>
      </>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Data *">
          <Input type="date" value={form.data_medicao || ''} onChange={(e) => setForm({ ...form, data_medicao: e.target.value })} />
        </Field>
        {fields.map((f) => (
          <Field key={f} label={f.replace(/_/g, ' ').replace(/\bkg\b|\bcm\b/g, (s) => s.toUpperCase())}>
            <Input
              type="number" step="0.1"
              value={form[f] ?? ''}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <Field label="Observações">
        <textarea
          rows={2}
          className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
          value={form.observacoes || ''}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
        />
      </Field>
    </Modal>
  );
}

// ─── Fotos ──────────────────────────────────────────────────────────────────

const POSICOES = [
  { id: 'frente', label: 'Frente' },
  { id: 'costas', label: 'Costas' },
  { id: 'lado_dir', label: 'Lado direito' },
  { id: 'lado_esq', label: 'Lado esquerdo' },
];

function TabFotos({ alunoId }) {
  const toast = useToast();
  const [fotos, setFotos] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/alunos/${alunoId}/fotos`);
      setFotos(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, [alunoId, toast]);

  useEffect(() => { load(); }, [load]);

  async function remover(fotoId) {
    if (!confirm('Remover esta foto?')) return;
    try {
      await api.delete(`/admin/alunos/${alunoId}/fotos/${fotoId}`);
      toast.success('Foto removida.');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpenAdd(true)}>+ Adicionar foto</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {POSICOES.map((pos) => {
          const foto = fotos.find((f) => f.posicao === pos.id);
          return (
            <Card key={pos.id} className="aspect-[3/4] overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-surface-border flex items-center justify-between">
                <div className="text-section-label">{pos.label}</div>
                {foto && (
                  <button onClick={() => remover(foto.id)} className="text-zinc-600 hover:text-red-400 text-xs">
                    Remover
                  </button>
                )}
              </div>
              <div className="flex-1 bg-surface-input flex items-center justify-center">
                {foto ? (
                  <img src={foto.url} alt={pos.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-zinc-700 text-xs uppercase tracking-widest">Sem foto</div>
                )}
              </div>
              {foto && (
                <div className="px-3 py-1.5 text-[10px] text-zinc-500 tabular-nums uppercase tracking-widest">
                  {formatDate(foto.data_foto)}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <FotoModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        alunoId={alunoId}
        onCreated={() => { setOpenAdd(false); load(); }}
      />
    </div>
  );
}

function FotoModal({ open, onClose, alunoId, onCreated }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ url: '', posicao: 'frente', data_foto: new Date().toISOString().slice(0, 10) });

  async function salvar() {
    if (!form.url) { toast.error('URL é obrigatória.'); return; }
    setSaving(true);
    try {
      await api.post(`/admin/alunos/${alunoId}/fotos`, form);
      toast.success('Foto adicionada.');
      setForm({ url: '', posicao: 'frente', data_foto: new Date().toISOString().slice(0, 10) });
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
      title="Adicionar foto"
      size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Adicionar'}</Button>
      </>}
    >
      <div className="space-y-3">
        <Field label="URL da imagem *">
          <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Posição">
            <select
              value={form.posicao}
              onChange={(e) => setForm({ ...form, posicao: e.target.value })}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm"
            >
              {POSICOES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Data">
            <Input type="date" value={form.data_foto} onChange={(e) => setForm({ ...form, data_foto: e.target.value })} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// ─── Pagamentos ─────────────────────────────────────────────────────────────

const METODOS = [
  { v: 'pix', l: 'Pix' },
  { v: 'dinheiro', l: 'Dinheiro' },
  { v: 'cartao_credito', l: 'Crédito' },
  { v: 'cartao_debito', l: 'Débito' },
  { v: 'transferencia', l: 'Transferência' },
];

function TabPagamentos({ alunoId, onReload }) {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/alunos/${alunoId}/pagamentos`);
      setData(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, [alunoId, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpenCreate(true)}>+ Registrar pagamento</Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-section-label border-b border-surface-border">
              <th className="text-left px-5 py-3 font-semibold">Data</th>
              <th className="text-left px-5 py-3 font-semibold">Método</th>
              <th className="text-right px-5 py-3 font-semibold">Valor</th>
              <th className="text-left px-5 py-3 font-semibold">Vencimento</th>
              <th className="text-left px-5 py-3 font-semibold">Observações</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={5} className="text-center text-zinc-500 py-8">Nenhum pagamento registrado.</td></tr>
            )}
            {data.map((p) => (
              <tr key={p.id} className="border-b border-surface-border text-zinc-300">
                <td className="px-5 py-2.5 text-white tabular-nums">{formatDate(p.data_pagamento)}</td>
                <td className="px-5 py-2.5 uppercase text-xs tracking-widest">{p.metodo}</td>
                <td className="px-5 py-2.5 text-right tabular-nums font-bold text-brand">{formatCurrency(p.valor)}</td>
                <td className="px-5 py-2.5 tabular-nums">{formatDate(p.vencimento)}</td>
                <td className="px-5 py-2.5 text-zinc-500">{p.observacoes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <PagamentoModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        alunoId={alunoId}
        onCreated={() => { setOpenCreate(false); load(); onReload(); }}
      />
    </div>
  );
}

function PagamentoModal({ open, onClose, alunoId, onCreated }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);
  const trinta = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ valor: '', data_pagamento: hoje, metodo: 'pix', vencimento: trinta, observacoes: '' });

  async function salvar() {
    if (!form.valor || !form.data_pagamento || !form.metodo || !form.vencimento) {
      toast.error('Valor, data, método e vencimento são obrigatórios.');
      return;
    }
    if (Number(form.valor) <= 0) {
      toast.error('Valor deve ser positivo.'); return;
    }
    setSaving(true);
    try {
      await api.post(`/admin/alunos/${alunoId}/pagamentos`, {
        ...form,
        valor: Number(form.valor),
      });
      toast.success('Pagamento registrado.');
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
      title="Registrar pagamento"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Registrar'}</Button>
      </>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$) *">
          <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
        </Field>
        <Field label="Método *">
          <select
            value={form.metodo}
            onChange={(e) => setForm({ ...form, metodo: e.target.value })}
            className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm"
          >
            {METODOS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </Field>
        <Field label="Data pagamento *">
          <Input type="date" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} />
        </Field>
        <Field label="Vencimento *">
          <Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
        </Field>
        <div className="col-span-2">
          <Field label="Observações">
            <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// ─── Protocolos ─────────────────────────────────────────────────────────────

const FASES = [
  { v: 'cutting', l: 'Cutting' },
  { v: 'bulking', l: 'Bulking' },
  { v: 'manutencao', l: 'Manutenção' },
  { v: 'recomposicao', l: 'Recomposição' },
];

function TabProtocolos({ alunoId }) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.length === 0 && (
          <Card className="md:col-span-2 p-10 text-center text-zinc-500 text-sm">
            Nenhum protocolo cadastrado.
          </Card>
        )}
        {data.map((p) => (
          <Card key={p.id} className="p-5 hover:bg-surface-elevated transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-white truncate">{p.nome}</h3>
                  {p.ativo ? (
                    <span className="text-[10px] uppercase tracking-widest text-green-400 bg-green-950 border border-green-900 px-1.5 py-0.5 rounded">Ativo</span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">Inativo</span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{p.fase || '—'}</div>
              </div>
              <Link
                to={`/admin/alunos/${alunoId}/protocolos/${p.id}`}
                className="text-xs uppercase tracking-widest font-bold text-brand hover:text-brand-dark shrink-0"
              >
                Editar →
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
          </Card>
        ))}
      </div>

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
        <Field label="Nome *"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Objetivo"><Input value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></Field>
          <Field label="Fase">
            <select value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm">
              {FASES.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
            </select>
          </Field>
          <Field label="Início"><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></Field>
          <Field label="Fim"><Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></Field>
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
