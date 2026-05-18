import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

const TABS = [
  { id: 'perfil',   label: 'Meu Perfil' },
  { id: 'medidas',  label: 'Minhas Medidas' },
  { id: 'fotos',    label: 'Minhas Fotos' },
  { id: 'faturas',  label: 'Faturas' },
];

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}
function formatCurrency(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatNum(v, suffix = '') {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${suffix}`;
}

export default function Perfil() {
  const { logout } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('perfil');

  const [perfil, setPerfil] = useState(null);
  const [protocolos, setProtocolos] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [medidas, setMedidas] = useState(null);
  const [fotos, setFotos] = useState(null);

  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingMedidas, setLoadingMedidas] = useState(false);
  const [loadingFotos, setLoadingFotos] = useState(false);

  const reloadFotos = () => {
    setLoadingFotos(true);
    api.get('/aluno/fotos')
      .then((r) => setFotos(r.data))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoadingFotos(false));
  };

  useEffect(() => {
    (async () => {
      try {
        const [p, fa, pr] = await Promise.all([
          api.get('/aluno/perfil'),
          api.get('/aluno/faturas'),
          api.get('/aluno/protocolos'),
        ]);
        setPerfil(p.data);
        setFaturas(fa.data);
        setProtocolos(pr.data);
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setLoadingBase(false);
      }
    })();
  }, [toast]);

  useEffect(() => {
    if (activeTab !== 'medidas' || medidas !== null) return;
    setLoadingMedidas(true);
    api.get('/aluno/medidas')
      .then((r) => setMedidas(r.data))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoadingMedidas(false));
  }, [activeTab, medidas, toast]);

  useEffect(() => {
    if (activeTab !== 'fotos' || fotos !== null) return;
    setLoadingFotos(true);
    api.get('/aluno/fotos')
      .then((r) => setFotos(r.data))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoadingFotos(false));
  }, [activeTab, fotos, toast]);

  if (loadingBase || !perfil) {
    return <div className="p-8 text-section-label animate-pulse">Carregando…</div>;
  }

  const inadimplente = perfil.status === 'inadimplente';
  const protocoloAtivo = protocolos.find((p) => p.ativo);
  const proximaPendente = faturas
    .filter((f) => f.status !== 'pago')
    .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))[0];

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div className="inline-flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-white">COACH</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2" />
          <span className="text-2xl font-black tracking-tight text-white">SYS</span>
        </div>
        <button onClick={logout} className="text-[11px] uppercase tracking-widest font-bold text-zinc-500 hover:text-brand">
          Sair
        </button>
      </header>

      {inadimplente && (
        <div className="bg-red-950 border border-red-900 text-red-300 rounded-lg px-5 py-3 text-sm">
          <span className="font-bold uppercase tracking-widest text-xs text-red-400">Atenção</span>
          <span className="ml-2">Você possui faturas vencidas. Procure o seu coach.</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b border-surface-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={
              'px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ' +
              (activeTab === t.id
                ? 'text-brand border-brand'
                : 'text-zinc-500 border-transparent hover:text-white')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' && (
        <TabPerfil
          perfil={perfil}
          protocoloAtivo={protocoloAtivo}
          proximaPendente={proximaPendente}
        />
      )}

      {activeTab === 'medidas' && (
        <TabMedidas medidas={medidas} loading={loadingMedidas} />
      )}

      {activeTab === 'fotos' && (
        <TabFotos fotos={fotos} loading={loadingFotos} onReload={reloadFotos} />
      )}

      {activeTab === 'faturas' && (
        <TabFaturas faturas={faturas} />
      )}
    </div>
  );
}

function TabPerfil({ perfil, protocoloAtivo, proximaPendente }) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-section-label">Aluno</div>
            <h1 className="text-page-title mt-1">{perfil.nome}</h1>
            <div className="text-zinc-400 text-sm mt-0.5">{perfil.email}</div>
          </div>
          <StatusBadge status={perfil.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-surface-border pt-5">
          <Info label="Próximo vencimento" value={formatDate(proximaPendente?.data_vencimento)} />
          <Info label="Telefone" value={perfil.telefone} />
          <Info label="Nascimento" value={formatDate(perfil.data_nascimento)} />
          <Info label="Sexo" value={perfil.sexo === 'M' ? 'Masculino' : perfil.sexo === 'F' ? 'Feminino' : perfil.sexo || '—'} />
        </div>

        <div className="mt-5 space-y-3">
          {perfil.objetivo   && <Info label="Objetivo"   value={perfil.objetivo}   block />}
          {perfil.restricoes && <Info label="Restrições" value={perfil.restricoes} block />}
          {perfil.lesoes     && <Info label="Lesões"     value={perfil.lesoes}     block />}
        </div>
      </Card>

      {protocoloAtivo && (
        <Card className="p-5 border-brand/40 bg-brand/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-section-label">Protocolo ativo</div>
              <h2 className="text-xl font-black text-white mt-1">{protocoloAtivo.nome}</h2>
              <div className="text-xs text-zinc-400 uppercase tracking-widest">{protocoloAtivo.fase}</div>
            </div>
            <Link to={`/aluno/protocolo/${protocoloAtivo.id}`}>
              <Button>Ver protocolo →</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

const COLUNAS_MEDIDAS = [
  { k: 'peso_kg', label: 'Peso', sufixo: ' kg' },
  { k: 'altura_cm', label: 'Altura', sufixo: ' cm' },
  { k: 'percentual_gordura', label: '%BF', sufixo: '%' },
  { k: 'peso_magro_kg', label: 'P.Magro', sufixo: ' kg' },
  { k: 'peso_gordo_kg', label: 'P.Gordo', sufixo: ' kg' },
  { k: 'cintura_cm', label: 'Cintura', sufixo: ' cm' },
  { k: 'quadril_cm', label: 'Quadril', sufixo: ' cm' },
  { k: 'abdomen_cm', label: 'Abdômen', sufixo: ' cm' },
  { k: 'braco_dir_cm', label: 'Braço D', sufixo: ' cm' },
  { k: 'braco_esq_cm', label: 'Braço E', sufixo: ' cm' },
  { k: 'antebraco_dir_cm', label: 'Antebraço D', sufixo: ' cm' },
  { k: 'antebraco_esq_cm', label: 'Antebraço E', sufixo: ' cm' },
  { k: 'coxa_dir_cm', label: 'Coxa D', sufixo: ' cm' },
  { k: 'coxa_esq_cm', label: 'Coxa E', sufixo: ' cm' },
  { k: 'panturrilha_dir_cm', label: 'Panturrilha D', sufixo: ' cm' },
  { k: 'panturrilha_esq_cm', label: 'Panturrilha E', sufixo: ' cm' },
];

function TabMedidas({ medidas, loading }) {
  if (loading || medidas === null) {
    return <div className="text-section-label animate-pulse py-8">Carregando medidas…</div>;
  }
  if (!medidas.length) {
    return (
      <Card className="p-10 text-center">
        <div className="text-section-label mb-1">Sem dados</div>
        <div className="text-zinc-400">Nenhuma medição registrada ainda.</div>
      </Card>
    );
  }

  const ordenadas = [...medidas].sort(
    (a, b) => new Date(b.data_medicao) - new Date(a.data_medicao)
  );
  const ultima = ordenadas[0];

  const serieGrafico = [...medidas]
    .filter((m) => m.peso_kg != null)
    .sort((a, b) => new Date(a.data_medicao) - new Date(b.data_medicao))
    .map((m) => ({
      data: new Date(m.data_medicao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      peso: Number(m.peso_kg),
    }));

  const metricasPreenchidas = COLUNAS_MEDIDAS.filter(
    (c) => ultima[c.k] != null && ultima[c.k] !== ''
  );

  return (
    <div className="space-y-6">
      <section>
        <div className="text-section-label mb-2">Última medição — {formatDate(ultima.data_medicao)}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {metricasPreenchidas.map((c, i) => (
            <MetricaCard
              key={c.k}
              label={c.label}
              value={formatNum(ultima[c.k], c.sufixo)}
              accent={i < 2}
            />
          ))}
        </div>
      </section>

      {serieGrafico.length >= 2 && (
        <section>
          <div className="text-section-label mb-2">Evolução do peso</div>
          <Card className="p-5">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serieGrafico} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
                  <XAxis dataKey="data" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip
                    contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: '#a1a1aa' }}
                    formatter={(v) => [`${v} kg`, 'Peso']}
                  />
                  <Line type="monotone" dataKey="peso" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3, fill: '#f97316' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      <section>
        <div className="text-section-label mb-2">Histórico</div>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-section-label border-b border-surface-border">
                <th className="text-left px-4 py-3 font-semibold">Data</th>
                {COLUNAS_MEDIDAS.map((c) => (
                  <th key={c.k} className="text-right px-3 py-3 font-semibold">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((m) => (
                <tr key={m.id} className="border-b border-surface-border text-zinc-300">
                  <td className="px-4 py-2.5 text-white tabular-nums">{formatDate(m.data_medicao)}</td>
                  {COLUNAS_MEDIDAS.map((c) => (
                    <td key={c.k} className="px-3 py-2.5 text-right tabular-nums">
                      {m[c.k] == null
                        ? <span className="text-zinc-600">—</span>
                        : formatNum(m[c.k], c.sufixo)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

const POSICOES = [
  { id: 'frente',    label: 'Frente' },
  { id: 'costas',    label: 'Costas' },
  { id: 'lado_esq',  label: 'Lado esquerdo' },
  { id: 'lado_dir',  label: 'Lado direito' },
];

function formatDataExtenso(data) {
  if (!data) return '—';
  try {
    return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return data; }
}

function TabFotos({ fotos, loading, onReload }) {
  const [openSend, setOpenSend] = useState(false);

  if (loading || fotos === null) {
    return <div className="text-section-label animate-pulse py-8">Carregando fotos…</div>;
  }

  const blocos = Array.isArray(fotos) ? fotos : [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setOpenSend(true)}>+ Enviar novas fotos</Button>
      </div>

      {blocos.length === 0 && (
        <Card className="p-10 text-center">
          <div className="text-section-label mb-1">Sem fotos</div>
          <div className="text-zinc-400">Você ainda não enviou fotos.</div>
        </Card>
      )}

      {blocos.map((bloco) => (
        <Card key={bloco.data} className="p-5">
          <div className="text-section-label mb-4">{formatDataExtenso(bloco.data)}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {POSICOES.map((pos) => {
              const foto = bloco.fotos.find((f) => f.posicao === pos.id);
              return (
                <div key={pos.id} className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600">{pos.label}</div>
                  {foto ? (
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-md bg-black border border-surface-border">
                      <img src={foto.url} alt={pos.label} className="w-full h-full object-cover" loading="lazy" />
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

      <EnviarFotosModal
        open={openSend}
        onClose={() => setOpenSend(false)}
        onSent={() => { setOpenSend(false); onReload(); }}
      />
    </div>
  );
}

function EnviarFotosModal({ open, onClose, onSent }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [urls, setUrls] = useState({ frente: '', costas: '', lado_esq: '', lado_dir: '' });

  function reset() {
    setUrls({ frente: '', costas: '', lado_esq: '', lado_dir: '' });
  }

  async function salvar() {
    const entries = Object.entries(urls).filter(([, v]) => v && v.trim());
    if (entries.length === 0) {
      toast.error('Informe pelo menos uma URL.');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(entries.map(([posicao, url]) =>
        api.post('/aluno/fotos', { url: url.trim(), posicao })
      ));
      toast.success('Fotos enviadas.');
      reset();
      onSent();
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
      title="Enviar novas fotos"
      size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Enviando…' : 'Enviar'}</Button>
      </>}
    >
      <div className="space-y-3">
        <div className="text-xs text-zinc-500">
          Cole a URL pública de cada foto. Não é obrigatório preencher todas — envie as que tiver hoje.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {POSICOES.map((pos) => (
            <div key={pos.id} className="space-y-1">
              <div className="text-section-label">{pos.label}</div>
              <Input
                value={urls[pos.id]}
                onChange={(e) => setUrls({ ...urls, [pos.id]: e.target.value })}
                placeholder="https://…"
              />
              {urls[pos.id] && (
                <img
                  src={urls[pos.id]}
                  alt="preview"
                  className="w-20 h-24 rounded-md object-cover mt-1 bg-black border border-surface-border"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function TabFaturas({ faturas }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-section-label border-b border-surface-border">
            <th className="text-left px-5 py-3 font-semibold">Vencimento</th>
            <th className="text-right px-5 py-3 font-semibold">Valor</th>
            <th className="text-left px-5 py-3 font-semibold">Status</th>
            <th className="text-left px-5 py-3 font-semibold">Pago em</th>
          </tr>
        </thead>
        <tbody>
          {faturas.length === 0 && (
            <tr><td colSpan={4} className="text-center text-zinc-500 py-8">Nenhuma fatura registrada.</td></tr>
          )}
          {faturas.map((f) => (
            <tr key={f.id} className="border-b border-surface-border text-zinc-300">
              <td className="px-5 py-2.5 text-white tabular-nums">{formatDate(f.data_vencimento)}</td>
              <td className="px-5 py-2.5 text-right font-bold text-brand tabular-nums">{formatCurrency(f.valor_final ?? f.valor)}</td>
              <td className="px-5 py-2.5 uppercase text-xs tracking-widest">{f.status}</td>
              <td className="px-5 py-2.5 tabular-nums">{formatDate(f.data_baixa)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function MetricaCard({ label, value, accent = false }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-section-label">{label}</div>
      <div className={'text-2xl font-black mt-1 ' + (accent ? 'text-brand' : 'text-white')}>
        {value}
      </div>
    </Card>
  );
}

function Info({ label, value, block }) {
  return (
    <div className={block ? 'col-span-full' : ''}>
      <div className="text-section-label">{label}</div>
      <div className="text-zinc-200 text-sm mt-0.5 whitespace-pre-wrap">{value || '—'}</div>
    </div>
  );
}
