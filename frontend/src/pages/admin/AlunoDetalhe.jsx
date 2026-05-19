import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/StatusBadge';
import { Field } from './Alunos';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'medidas', label: 'Medidas' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'faturas', label: 'Faturas' },
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
  const navigate = useNavigate();
  const toast = useToast();
  const [aluno, setAluno] = useState(null);
  const [tab, setTab] = useState('perfil');
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/alunos/${id}`);
      setAluno(res.data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setNaoEncontrado(true);
      } else {
        toast.error(errorMessage(err));
      }
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

  if (loading) {
    return <PageLoader mensagem="Carregando perfil do aluno..." />;
  }

  if (naoEncontrado || !aluno) {
    return (
      <div className="p-4 md:p-8 max-w-7xl">
        <EmptyState
          icone="❌"
          titulo="Aluno não encontrado"
          acao={<Button onClick={() => navigate('/admin/alunos')}>Voltar</Button>}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 max-w-7xl">
      <div>
        <Link to="/admin/alunos" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-brand">
          ← Voltar
        </Link>
      </div>

      <header className="flex flex-col md:flex-row md:items-start gap-4 md:gap-5">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-brand flex items-center justify-center text-lg md:text-xl font-black text-white shrink-0">
            {iniciais(aluno.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-page-title truncate">{aluno.nome}</h1>
              <StatusBadge status={aluno.status} />
            </div>
            <div className="text-zinc-400 text-sm mt-0.5 truncate">{aluno.email}</div>
            <div className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
              Tolerância: <span className="text-zinc-300 tabular-nums normal-case tracking-normal">{aluno.dias_tolerancia ?? 7} dias</span>
              <span className="mx-2 text-zinc-700">·</span>
              Plano: <span className="text-zinc-300 tabular-nums normal-case tracking-normal">{aluno.periodicidade_dias ?? 30} dias</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={aluno.ativo ? 'danger' : 'primary'} onClick={alternarAtivo}>
            {aluno.ativo ? 'Desativar aluno' : 'Ativar aluno'}
          </Button>
        </div>
      </header>

      <nav className="border-b border-surface-border -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'px-4 md:px-5 py-3 text-xs uppercase tracking-widest font-bold transition-colors -mb-px whitespace-nowrap',
                tab === t.id
                  ? 'text-white border-b-2 border-brand'
                  : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {tab === 'perfil' && <TabPerfil aluno={aluno} onReload={load} />}
      {tab === 'medidas' && <TabMedidas alunoId={id} />}
      {tab === 'fotos' && <TabFotos alunoId={id} aluno={aluno} onReload={load} />}
      {tab === 'faturas' && <TabFaturas alunoId={id} alunoTolerancia={aluno.dias_tolerancia ?? 7} onReload={load} />}
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
  const [senhaModalOpen, setSenhaModalOpen] = useState(false);

  // Só sincroniza o form quando o aluno for recarregado fora do modo edição.
  // Impede que um reload externo (ex: toast disparando um re-fetch) apague o que
  // o usuário está digitando.
  useEffect(() => {
    if (!editing) setForm(aluno);
  }, [aluno, editing]);

  async function salvar() {
    setSaving(true);
    try {
      const allowed = ['nome', 'telefone', 'data_nascimento', 'sexo', 'objetivo', 'restricoes', 'lesoes', 'observacoes', 'dias_tolerancia', 'periodicidade_dias'];
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSenhaModalOpen(true)}
                className="text-xs uppercase tracking-widest font-bold text-zinc-400 hover:text-white"
              >
                Alterar senha
              </button>
              <button onClick={() => setEditing(true)} className="text-xs uppercase tracking-widest font-bold text-brand hover:text-brand-dark">
                Editar
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm(aluno); }}>Cancelar</Button>
              <Button size="sm" onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {editing ? (
            <>
              <Field label="Nome"><Input value={form.nome || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, nome: v })); }} /></Field>
              <Field label="Telefone"><Input value={form.telefone || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, telefone: v })); }} /></Field>
              <Field label="Nascimento"><Input type="date" value={(form.data_nascimento || '').slice(0, 10)} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, data_nascimento: v })); }} /></Field>
              <Field label="Sexo">
                <select
                  value={form.sexo || ''}
                  onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, sexo: v })); }}
                  className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </Field>
              <Field label="Objetivo"><Input value={form.objetivo || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, objetivo: v })); }} /></Field>
              <Field label="Tolerância (dias)">
                <Input type="number" min={0} value={form.dias_tolerancia ?? 7} onChange={(e) => { const v = Number(e.target.value); setForm((f) => ({ ...f, dias_tolerancia: v })); }} />
              </Field>
              <Field label="Periodicidade do plano (dias)">
                <Input type="number" min={1} value={form.periodicidade_dias ?? 30} onChange={(e) => { const v = Number(e.target.value); setForm((f) => ({ ...f, periodicidade_dias: v })); }} />
              </Field>
              <div className="col-span-2"><Field label="Restrições">
                <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
                  value={form.restricoes || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, restricoes: v })); }} /></Field></div>
              <div className="col-span-2"><Field label="Lesões">
                <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
                  value={form.lesoes || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, lesoes: v })); }} /></Field></div>
              <div className="col-span-2"><Field label="Observações">
                <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
                  value={form.observacoes || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, observacoes: v })); }} /></Field></div>
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

      <AlterarSenhaModal
        open={senhaModalOpen}
        onClose={() => setSenhaModalOpen(false)}
        alunoId={aluno.id}
        alunoNome={aluno.nome}
      />
    </div>
  );
}

function AlterarSenhaModal({ open, onClose, alunoId, alunoNome }) {
  const toast = useToast();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setSenha(''); setConfirmacao(''); }
  }, [open]);

  async function salvar() {
    if (senha.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (senha !== confirmacao) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/admin/alunos/${alunoId}/senha`, { senha });
      toast.success('Senha redefinida com sucesso.');
      onClose();
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
      title={`Alterar senha — ${alunoNome}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar nova senha'}</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="bg-yellow-950/40 border border-yellow-900 text-yellow-300 rounded-md px-3 py-2 text-xs">
          O aluno usará essa nova senha no próximo login. Sessões já abertas continuam ativas até o token expirar.
        </div>
        <Field label="Nova senha (mín. 8 caracteres)">
          <Input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Digite a nova senha"
            autoFocus
          />
        </Field>
        <Field label="Confirmar nova senha">
          <Input
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            placeholder="Digite novamente"
          />
        </Field>
      </div>
    </Modal>
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

function TabMedidas({ alunoId }) {
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

// ─── Fotos ──────────────────────────────────────────────────────────────────

const POSICOES = [
  { id: 'frente', label: 'Frente' },
  { id: 'costas', label: 'Costas' },
  { id: 'lado_esq', label: 'Lado esquerdo' },
  { id: 'lado_dir', label: 'Lado direito' },
];

function formatDataExtensa(data) {
  if (!data) return '—';
  try {
    return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return data; }
}

function FotoLightbox({ foto, onClose }) {
  useEffect(() => {
    if (!foto) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [foto, onClose]);

  if (!foto) return null;

  const posLabel = POSICOES.find((p) => p.id === foto.posicao)?.label || foto.posicao;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        title="Fechar"
        className="fixed top-4 right-4 z-[51] w-10 h-10 rounded-full bg-black/70 border border-zinc-700 text-white hover:bg-zinc-800 flex items-center justify-center text-lg"
      >
        ✕
      </button>
      <img
        src={foto.url}
        alt={posLabel}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] object-contain"
      />
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/70 border border-zinc-700 rounded-md px-3 py-1.5 text-xs uppercase tracking-widest text-white">
        {posLabel} · {formatDataExtensa(foto.data)}
      </div>
    </div>
  );
}

async function baixarFoto(foto) {
  const posLabel = (POSICOES.find((p) => p.id === foto.posicao)?.label || foto.posicao)
    .toLowerCase().replace(/\s+/g, '-');
  const filename = `foto-${posLabel}-${foto.data || 'sem-data'}.jpg`;
  try {
    const res = await fetch(foto.url, { mode: 'cors' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // fallback: abre em nova aba
    const a = document.createElement('a');
    a.href = foto.url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

function TabFotos({ alunoId, aluno, onReload }) {
  const toast = useToast();
  const [blocos, setBlocos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState({ aberto: false, fotoId: null });
  const [deletando, setDeletando] = useState(false);
  const [togglingLib, setTogglingLib] = useState(false);
  const [lightboxFoto, setLightboxFoto] = useState(null);

  async function toggleLiberacao() {
    setTogglingLib(true);
    try {
      const novo = !aluno?.envio_fotos_liberado;
      await api.patch(`/admin/alunos/${alunoId}/liberar-fotos`, { liberado: novo });
      toast.success(novo ? 'Envio liberado.' : 'Envio bloqueado.');
      onReload?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTogglingLib(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/alunos/${alunoId}/fotos`);
      setBlocos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [alunoId, toast]);

  useEffect(() => { load(); }, [load]);

  function pedirRemover(fotoId) {
    setConfirmDel({ aberto: true, fotoId });
  }

  async function confirmarRemover() {
    const fotoId = confirmDel.fotoId;
    if (!fotoId) return;
    setDeletando(true);
    try {
      await api.delete(`/admin/alunos/${alunoId}/fotos/${fotoId}`);
      toast.success('Foto removida.');
      setConfirmDel({ aberto: false, fotoId: null });
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeletando(false);
    }
  }

  if (loading) {
    return <PageLoader mensagem="Carregando fotos..." />;
  }

  const headerLib = (
    <div className="flex justify-end mb-4">
      <button
        onClick={toggleLiberacao}
        disabled={togglingLib}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50',
          aluno?.envio_fotos_liberado
            ? 'bg-green-950 text-green-400 border border-green-800'
            : 'bg-surface-elevated text-zinc-400 border border-surface-border'
        )}
      >
        {aluno?.envio_fotos_liberado ? '🔓 Envio liberado' : '🔒 Liberar envio'}
      </button>
    </div>
  );

  if (blocos.length === 0) {
    return (
      <div>
        {headerLib}
        <EmptyState
          icone="📷"
          titulo="Nenhuma foto enviada"
          descricao="O aluno ainda não enviou fotos de progresso."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {headerLib}
      {blocos.map((bloco) => (
        <Card key={bloco.data} className="p-5">
          <div className="text-section-label mb-4">{formatDataExtensa(bloco.data)}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {POSICOES.map((pos) => {
              const foto = bloco.fotos.find((f) => f.posicao === pos.id);
              return (
                <div key={pos.id} className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600">{pos.label}</div>
                  {foto ? (
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-black border border-surface-border group">
                      <button
                        type="button"
                        onClick={() => setLightboxFoto({ ...foto, data: bloco.data })}
                        className="absolute inset-0 w-full h-full"
                        title="Abrir em tela cheia"
                      >
                        <img src={foto.url} alt={pos.label} className="w-full h-full object-cover" loading="lazy" />
                      </button>
                      <button
                        onClick={() => setLightboxFoto({ ...foto, data: bloco.data })}
                        title="Tela cheia"
                        className="absolute top-1.5 left-1.5 w-8 h-8 rounded-md bg-black/70 border border-zinc-700 text-white hover:bg-zinc-800 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                      >
                        ⤢
                      </button>
                      <button
                        onClick={() => baixarFoto({ ...foto, data: bloco.data })}
                        title="Baixar foto"
                        className="absolute bottom-1.5 left-1.5 w-8 h-8 rounded-md bg-black/70 border border-zinc-700 text-white hover:bg-zinc-800 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                      >
                        ⬇
                      </button>
                      <button
                        onClick={() => pedirRemover(foto.id)}
                        title="Excluir foto"
                        className="absolute top-1.5 right-1.5 w-8 h-8 rounded-md bg-black/70 border border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        🗑
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-[3/4] w-full rounded-md border-2 border-dashed border-surface-border flex items-center justify-center text-zinc-700 text-[10px] uppercase tracking-widest">
                      Sem foto
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <ConfirmModal
        aberto={confirmDel.aberto}
        titulo="Excluir foto?"
        descricao="Esta ação não pode ser desfeita."
        textoBotao="Excluir foto"
        variante="danger"
        carregando={deletando}
        onConfirmar={confirmarRemover}
        onCancelar={() => setConfirmDel({ aberto: false, fotoId: null })}
      />

      <FotoLightbox foto={lightboxFoto} onClose={() => setLightboxFoto(null)} />
    </div>
  );
}

// ─── Faturas ────────────────────────────────────────────────────────────────

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

function TabFaturas({ alunoId, alunoTolerancia, onReload }) {
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
