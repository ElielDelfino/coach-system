import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonTabela } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const LIMIT = 20;

const FILTROS = [
  { v: 'todos',        l: 'Todos' },
  { v: 'em_dia',       l: 'Em dia' },
  { v: 'inadimplente', l: 'Inadimplentes' },
  { v: 'neutro',       l: 'Sem fatura' },
  { v: 'inativo',      l: 'Inativos' },
];

function iniciais(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}

export default function Alunos() {
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

  const ativoParam = filtroStatus === 'inativo' ? false : true;

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/admin/alunos', {
        params: { ativo: ativoParam, busca: busca || undefined, page, limit: LIMIT },
      });
      setData(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, filtroStatus]);

  // debounce simples para busca
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const filtered = useMemo(() => {
    if (filtroStatus === 'todos' || filtroStatus === 'inativo') return data;
    return data.filter((a) => a.status === filtroStatus);
  }, [data, filtroStatus]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 max-w-7xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-section-label">Cadastro</div>
          <h1 className="text-page-title mt-1">Alunos</h1>
        </div>
        <Button onClick={() => setOpenCreate(true)}>+ Novo aluno</Button>
      </header>

      <Card className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome ou e-mail…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 md:overflow-visible md:mx-0 md:px-0">
          {FILTROS.map((opt) => (
            <button
              key={opt.v}
              onClick={() => { setFiltroStatus(opt.v); setPage(1); }}
              className={
                'px-3 py-1.5 rounded-md text-xs uppercase tracking-widest font-bold transition-colors whitespace-nowrap shrink-0 ' +
                (filtroStatus === opt.v
                  ? 'bg-brand text-white'
                  : 'bg-surface-elevated text-zinc-400 hover:text-white border border-surface-border')
              }
            >
              {opt.l}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <Card className="overflow-hidden">
          <SkeletonTabela linhas={8} colunas={6} />
        </Card>
      ) : filtered.length === 0 ? (
        busca ? (
          <EmptyState
            icone="🔍"
            titulo="Nenhum aluno encontrado"
            descricao={`Nenhum resultado para "${busca}".`}
            acao={
              <button
                onClick={() => setBusca('')}
                className="text-xs text-brand border border-brand/40 px-3 py-1 rounded hover:bg-brand/10 font-bold"
              >
                Limpar busca
              </button>
            }
          />
        ) : (
          <EmptyState
            icone="👥"
            titulo="Nenhum aluno cadastrado"
            descricao="Clique em '+ Novo aluno' para começar."
          />
        )
      ) : (
      <>
        {/* Desktop: tabela */}
        <Card className="hidden md:block overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-section-label border-b border-surface-border">
                  <th className="text-left px-5 py-3 font-semibold">Aluno</th>
                  <th className="text-left px-5 py-3 font-semibold">E-mail</th>
                  <th className="text-left px-5 py-3 font-semibold">Telefone</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-left px-5 py-3 font-semibold">Tolerância</th>
                  <th className="text-right px-5 py-3 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-surface-border text-zinc-300 hover:bg-surface-elevated transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-xs font-black text-white">
                          {iniciais(a.nome)}
                        </div>
                        <span className="font-semibold text-white">{a.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{a.email}</td>
                    <td className="px-5 py-3 text-zinc-500 tabular-nums">{a.telefone || '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3 text-zinc-400 tabular-nums">{a.dias_tolerancia ?? 7} dias</td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/admin/alunos/${a.id}`} className="text-xs uppercase tracking-widest font-bold text-brand hover:text-brand-dark">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {filtered.map((a) => (
            <Link
              key={a.id}
              to={`/admin/alunos/${a.id}`}
              className="block bg-surface-card border border-surface-border rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-xs font-black text-white shrink-0">
                    {iniciais(a.nome)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{a.nome}</p>
                    <p className="text-zinc-500 text-xs truncate">{a.email}</p>
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-zinc-600 uppercase tracking-widest">Telefone</p>
                  <p className="text-zinc-300 tabular-nums">{a.telefone || '—'}</p>
                </div>
                <div>
                  <p className="text-zinc-600 uppercase tracking-widest">Tolerância</p>
                  <p className="text-zinc-300 tabular-nums">{a.dias_tolerancia ?? 7} dias</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className="text-zinc-500 uppercase tracking-widest">
          {total} {total === 1 ? 'registro' : 'registros'} · Página {page} de {totalPages}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      </div>

      <CreateAlunoModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => { setOpenCreate(false); load(); }}
      />
    </div>
  );
}

function CreateAlunoModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', telefone: '',
    data_nascimento: '', sexo: '', objetivo: '', restricoes: '', lesoes: '',
    dias_tolerancia: 7, periodicidade_dias: 30,
  });

  const set = useCallback((k, v) => setForm((f) => ({ ...f, [k]: v })), []);

  async function submit(e) {
    e.preventDefault();
    if (!form.nome || !form.email || !form.senha) {
      toast.error('Nome, e-mail e senha são obrigatórios.');
      return;
    }
    if (form.senha.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => payload[k] === '' && delete payload[k]);
      await api.post('/admin/alunos', payload);
      toast.success('Aluno cadastrado com sucesso.');
      setForm({ nome: '', email: '', senha: '', telefone: '', data_nascimento: '', sexo: '', objetivo: '', restricoes: '', lesoes: '', dias_tolerancia: 7, periodicidade_dias: 30 });
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
      title="Novo aluno"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Salvando…' : 'Cadastrar'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome completo *">
          <Input value={form.nome} onChange={(e) => set('nome', e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="E-mail *">
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Senha * (mín. 8)">
            <Input type="password" value={form.senha} onChange={(e) => set('senha', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Telefone">
            <Input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
          </Field>
          <Field label="Nascimento">
            <Input type="date" value={form.data_nascimento} onChange={(e) => set('data_nascimento', e.target.value)} />
          </Field>
          <Field label="Sexo">
            <select
              value={form.sexo}
              onChange={(e) => set('sexo', e.target.value)}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="outro">Outro</option>
            </select>
          </Field>
        </div>
        <Field label="Objetivo">
          <Input value={form.objetivo} onChange={(e) => set('objetivo', e.target.value)} placeholder="Ex: hipertrofia, emagrecimento…" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Dias de tolerância para inadimplência">
            <Input
              type="number"
              min={0}
              value={form.dias_tolerancia}
              onChange={(e) => set('dias_tolerancia', Number(e.target.value))}
            />
          </Field>
          <Field label="Periodicidade do plano (dias)">
            <Input
              type="number"
              min={1}
              value={form.periodicidade_dias}
              onChange={(e) => set('periodicidade_dias', Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Restrições">
          <textarea
            value={form.restricoes}
            onChange={(e) => set('restricoes', e.target.value)}
            rows={2}
            className="w-full bg-surface-input border border-surface-border text-white placeholder:text-zinc-600 rounded-md px-3 py-2 text-base md:text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
          />
        </Field>
        <Field label="Lesões">
          <textarea
            value={form.lesoes}
            onChange={(e) => set('lesoes', e.target.value)}
            rows={2}
            className="w-full bg-surface-input border border-surface-border text-white placeholder:text-zinc-600 rounded-md px-3 py-2 text-base md:text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
          />
        </Field>
      </form>
    </Modal>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-section-label block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
