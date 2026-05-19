import { useEffect, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ImageUpload from '../../components/ImageUpload';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import AlunoLayout from './AlunoLayout';

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
  const [evolucao, setEvolucao] = useState(null);
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
    Promise.all([
      api.get('/aluno/medidas'),
      api.get('/aluno/evolucao'),
    ])
      .then(([rm, re]) => {
        setMedidas(rm.data);
        setEvolucao(re.data?.evolucao || []);
      })
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
    return (
      <AlunoLayout paginaAtiva="perfil">
        <PageLoader mensagem="Carregando seu perfil..." />
      </AlunoLayout>
    );
  }

  const inadimplente = perfil.status === 'inadimplente';
  const protocoloAtivo = protocolos.find((p) => p.ativo);
  const proximaPendente = faturas
    .filter((f) => f.status !== 'pago')
    .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))[0];

  return (
    <AlunoLayout paginaAtiva="perfil">
      <div className="px-4 pt-6 pb-4 space-y-5">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white tracking-tight">Perfil</h1>
          <button
            onClick={logout}
            className="text-[11px] uppercase tracking-widest font-bold text-zinc-500 hover:text-brand"
          >
            Sair
          </button>
        </header>

        {inadimplente && (
          <div className="bg-red-950 border border-red-900 text-red-300 rounded-lg px-5 py-3 text-sm">
            <span className="font-bold uppercase tracking-widest text-xs text-red-400">Atenção</span>
            <span className="ml-2">Você possui faturas vencidas. Procure o seu coach.</span>
          </div>
        )}

        <div className="overflow-x-auto scrollbar-none border-b border-surface-border -mx-4 px-4">
          <div className="flex min-w-max gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={
                  'px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ' +
                  (activeTab === t.id
                    ? 'text-brand border-brand'
                    : 'text-zinc-500 border-transparent hover:text-white')
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'perfil' && (
          <TabPerfil
            perfil={perfil}
            protocoloAtivo={protocoloAtivo}
            proximaPendente={proximaPendente}
            onAbrirFotos={() => { setActiveTab('fotos'); }}
          />
        )}

        {activeTab === 'medidas' && (
          <TabMedidas medidas={medidas} evolucao={evolucao} loading={loadingMedidas} />
        )}

        {activeTab === 'fotos' && (
          <TabFotos fotos={fotos} loading={loadingFotos} onReload={reloadFotos} perfil={perfil} />
        )}

        {activeTab === 'faturas' && (
          <TabFaturas faturas={faturas} />
        )}
      </div>
    </AlunoLayout>
  );
}

function TabPerfil({ perfil, protocoloAtivo, proximaPendente, onAbrirFotos }) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-section-label">Aluno</div>
            <h2 className="text-xl font-black text-white tracking-tight mt-1 truncate">{perfil.nome}</h2>
            <div className="text-zinc-400 text-sm mt-0.5 truncate">{perfil.email}</div>
          </div>
          <StatusBadge status={perfil.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5 border-t border-surface-border pt-5">
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
          <div className="text-section-label">Protocolo ativo</div>
          <h2 className="text-xl font-black text-white mt-1">{protocoloAtivo.nome}</h2>
          <div className="text-xs text-zinc-400 uppercase tracking-widest">{protocoloAtivo.fase}</div>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-black text-white mb-1">Fotos de atualização</h2>
        <p className="text-zinc-500 text-sm mb-4">
          Tire as fotos sempre com o mesmo ângulo e a mesma luz.
        </p>
        {perfil.envio_fotos_liberado ? (
          <button
            onClick={onAbrirFotos}
            className="w-full flex items-center justify-center gap-4 bg-brand text-white
              font-black text-base py-4 px-6 rounded-2xl hover:bg-brand-dark transition-colors"
          >
            <span className="text-2xl">⬆</span>
            Enviar fotos
          </button>
        ) : (
          <div className="w-full bg-surface-elevated border border-surface-border
            rounded-2xl py-4 px-6 text-center">
            <p className="text-zinc-500 text-sm">Envio de fotos não liberado pelo professor.</p>
          </div>
        )}
      </div>
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

function formatDataBR(d) {
  if (!d) return '';
  const [y, m, dd] = String(d).split('-');
  return `${dd}/${m}`;
}

function CustomTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((entry) => (
        entry.value == null ? null : (
          <p key={entry.name} style={{ color: entry.color }} className="font-bold">
            {entry.name}: {Number(entry.value).toFixed(1)}{suffix}
          </p>
        )
      ))}
    </div>
  );
}

function BFTooltip({ active, payload, label, inicial }) {
  if (!active || !payload?.length) return null;
  const valor = payload[0]?.value;
  const diff = valor != null && inicial != null ? valor - inicial : null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p style={{ color: '#f97316' }} className="font-bold">
        %BF: {valor == null ? '—' : `${Number(valor).toFixed(1)}%`}
      </p>
      {diff != null && (
        <p className={`text-xs font-bold ${diff < 0 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
          {diff > 0 ? '+' : ''}{diff.toFixed(1)}% desde o início
        </p>
      )}
    </div>
  );
}

function diffNum(ultima, primeira, key) {
  const a = ultima?.[key];
  const b = primeira?.[key];
  if (a == null || b == null) return null;
  return Math.round((Number(a) - Number(b)) * 10) / 10;
}

function corDiff(diff, melhorQuandoMenor = true) {
  if (diff == null || diff === 0) return 'text-zinc-400';
  if (melhorQuandoMenor) return diff < 0 ? 'text-green-400' : 'text-red-400';
  return diff > 0 ? 'text-green-400' : 'text-red-400';
}

function TabMedidas({ medidas, evolucao, loading }) {
  const [metrica, setMetrica] = useState('peso');

  if (loading || medidas === null) {
    return <PageLoader mensagem="Carregando medidas..." />;
  }
  if (!medidas.length) {
    return (
      <EmptyState
        icone="📏"
        titulo="Nenhuma medição ainda"
        descricao="Seu professor ainda não registrou suas medidas."
      />
    );
  }

  const ordenadas = [...medidas].sort(
    (a, b) => new Date(b.data_medicao) - new Date(a.data_medicao)
  );
  const ultima = ordenadas[0];

  const evol = Array.isArray(evolucao) ? evolucao : [];
  const serie = evol.map((p) => ({ ...p, data_br: formatDataBR(p.data) }));
  const primeiraEv = serie[0] || null;
  const ultimaEv = serie[serie.length - 1] || null;

  const metricasPreenchidas = COLUNAS_MEDIDAS.filter(
    (c) => ultima[c.k] != null && ultima[c.k] !== ''
  );

  if (serie.length < 2) {
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
          <p className="text-xs text-zinc-500 mt-3">
            Registre mais medições para ver sua evolução.
          </p>
        </section>

        <section>
          <div className="text-section-label mb-2">Histórico</div>
          <HistoricoTabela ordenadas={ordenadas} />
        </section>
      </div>
    );
  }

  const inicialBF = primeiraEv?.percentual_gordura ?? null;
  const diffPeso     = diffNum(ultimaEv, primeiraEv, 'peso_kg');
  const diffBF       = diffNum(ultimaEv, primeiraEv, 'percentual_gordura');
  const diffMagro    = diffNum(ultimaEv, primeiraEv, 'peso_magro_kg');
  const diffCintura  = diffNum(ultimaEv, primeiraEv, 'cintura_cm');

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="text-section-label">Evolução</div>
          <div className="flex gap-1">
            {[
              { id: 'peso',    label: 'Peso' },
              { id: 'bf',      label: '%BF' },
              { id: 'medidas', label: 'Medidas' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMetrica(opt.id)}
                className={
                  'text-xs px-3 py-1 rounded font-bold transition-colors ' +
                  (metrica === opt.id
                    ? 'bg-brand text-white'
                    : 'bg-surface-elevated text-zinc-400 hover:text-white')
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Card className="p-5">
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              {metrica === 'peso' ? (
                <ComposedChart data={serie} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
                  <XAxis dataKey="data_br" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip content={<CustomTooltip suffix=" kg" />} cursor={{ stroke: '#404040', strokeWidth: 1 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                  <Line type="monotone" dataKey="peso_kg"       name="Peso total" stroke="#f97316" strokeWidth={2}   dot={false} />
                  <Line type="monotone" dataKey="peso_magro_kg" name="Peso magro" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="peso_gordo_kg" name="Peso gordo" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </ComposedChart>
              ) : metrica === 'bf' ? (
                <AreaChart data={serie} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
                  <XAxis dataKey="data_br" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip content={<BFTooltip inicial={inicialBF} />} cursor={{ stroke: '#404040', strokeWidth: 1 }} />
                  {inicialBF != null && (
                    <ReferenceLine y={inicialBF} stroke="#52525b" strokeDasharray="4 4" label={{ value: 'Inicial', fill: '#71717a', fontSize: 10, position: 'right' }} />
                  )}
                  <Area type="monotone" dataKey="percentual_gordura" name="%BF" stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              ) : (
                <LineChart data={serie} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
                  <XAxis dataKey="data_br" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#404040" domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip content={<CustomTooltip suffix=" cm" />} cursor={{ stroke: '#404040', strokeWidth: 1 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                  <Line type="monotone" dataKey="cintura_cm"   name="Cintura" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="quadril_cm"   name="Quadril" stroke="#a78bfa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="braco_dir_cm" name="Braço D" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="coxa_dir_cm"  name="Coxa D"  stroke="#60a5fa" strokeWidth={2} dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ProgressoCard label="Peso"       valor={ultimaEv.peso_kg}            sufixo="kg" diff={diffPeso}    melhorQuandoMenor />
          <ProgressoCard label="%BF"        valor={ultimaEv.percentual_gordura} sufixo="%"  diff={diffBF}      melhorQuandoMenor />
          <ProgressoCard label="Peso magro" valor={ultimaEv.peso_magro_kg}      sufixo="kg" diff={diffMagro}   melhorQuandoMenor={false} />
          <ProgressoCard label="Cintura"    valor={ultimaEv.cintura_cm}         sufixo="cm" diff={diffCintura} melhorQuandoMenor />
        </div>
      </section>

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

function TabFotos({ fotos, loading, onReload, perfil }) {
  const [openSend, setOpenSend] = useState(false);

  if (loading || fotos === null) {
    return <PageLoader mensagem="Carregando fotos..." />;
  }

  const blocos = Array.isArray(fotos) ? fotos : [];
  const liberado = !!perfil?.envio_fotos_liberado;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {liberado ? (
          <Button onClick={() => setOpenSend(true)}>+ Enviar novas fotos</Button>
        ) : (
          <span className="text-xs text-zinc-500 italic">
            🔒 Envio bloqueado pelo professor
          </span>
        )}
      </div>

      {blocos.length === 0 && (
        <EmptyState
          icone="📷"
          titulo="Nenhuma foto enviada"
          descricao={liberado
            ? 'Envie suas fotos de progresso para acompanhar sua evolução.'
            : 'Aguarde o professor liberar o envio de fotos.'}
          acao={liberado ? <Button onClick={() => setOpenSend(true)}>Enviar fotos</Button> : null}
        />
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
  const [previews, setPreviews] = useState({});
  const [arquivos, setArquivos] = useState({});
  const [enviando, setEnviando] = useState(false);

  function reset() {
    setPreviews({});
    setArquivos({});
  }

  function fechar() {
    reset();
    onClose();
  }

  function selecionarFoto(posicao, file) {
    setPreviews((p) => ({ ...p, [posicao]: URL.createObjectURL(file) }));
    setArquivos((a) => ({ ...a, [posicao]: file }));
  }

  async function confirmarEnvioFotos() {
    if (Object.keys(arquivos).length === 0) return;
    setEnviando(true);
    try {
      await Promise.all(
        Object.entries(arquivos).map(([posicao, file]) => {
          const formData = new FormData();
          formData.append('foto', file);
          formData.append('posicao', posicao);
          return api.post('/aluno/fotos', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        })
      );
      toast.success('Fotos enviadas com sucesso!');
      reset();
      onClose();
      onSent?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  const total = Object.keys(arquivos).length;

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Enviar fotos de hoje"
      size="lg"
      footer={<>
        <Button variant="ghost" onClick={fechar}>Cancelar</Button>
        <Button onClick={confirmarEnvioFotos} disabled={total === 0 || enviando}>
          {enviando
            ? 'Enviando…'
            : `Confirmar envio (${total} foto${total !== 1 ? 's' : ''})`}
        </Button>
      </>}
    >
      <div className="space-y-3">
        <div className="text-xs text-zinc-500">
          Selecione as fotos antes de confirmar. Não é obrigatório enviar todas — envie as que tiver hoje.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {POSICOES.map((pos) => (
            <div key={pos.id} className="space-y-1">
              <div className="text-section-label">{pos.label}</div>
              <ImageUpload
                label={`Selecione a foto: ${pos.label}`}
                accept="image/jpeg,image/png,image/webp"
                maxMB={15}
                preview={previews[pos.id]}
                onUpload={(file) => selecionarFoto(pos.id, file)}
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function TabFaturas({ faturas }) {
  if (faturas.length === 0) {
    return (
      <EmptyState
        icone="✅"
        titulo="Nenhuma fatura em aberto"
        descricao="Você está em dia!"
      />
    );
  }

  return (
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
                <th className="text-left px-5 py-3 font-semibold">Pago em</th>
              </tr>
            </thead>
            <tbody>
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
        </div>
      </Card>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {faturas.map((f) => (
          <div key={f.id} className="bg-surface-card border border-surface-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Vencimento</p>
                <p className="text-white font-bold tabular-nums">{formatDate(f.data_vencimento)}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 bg-surface-elevated border border-surface-border rounded px-2 py-1">{f.status}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Valor</p>
              <p className="font-black text-brand text-lg tabular-nums">{formatCurrency(f.valor_final ?? f.valor)}</p>
            </div>
            {f.data_baixa && (
              <div className="mt-2 text-xs text-zinc-500">
                Pago em <span className="text-zinc-300 tabular-nums">{formatDate(f.data_baixa)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
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

function ProgressoCard({ label, valor, sufixo, diff, melhorQuandoMenor = true }) {
  const dispValor = valor == null
    ? '—'
    : `${Number(valor).toFixed(1)}${sufixo}`;
  const corClasse = corDiff(diff, melhorQuandoMenor);
  const sinal = diff != null && diff > 0 ? '+' : '';
  return (
    <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-black text-white">{dispValor}</p>
      {diff != null && (
        <p className={`text-xs font-bold ${corClasse}`}>
          {sinal}{diff.toFixed(1)}{sufixo} desde o início
        </p>
      )}
    </div>
  );
}

function HistoricoTabela({ ordenadas }) {
  return (
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
              <td className="px-4 py-2.5 text-white tabular-nums">
                {new Date(m.data_medicao).toLocaleDateString('pt-BR')}
              </td>
              {COLUNAS_MEDIDAS.map((c) => (
                <td key={c.k} className="px-3 py-2.5 text-right tabular-nums">
                  {m[c.k] == null
                    ? <span className="text-zinc-600">—</span>
                    : `${Number(m[c.k]).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${c.sufixo}`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
