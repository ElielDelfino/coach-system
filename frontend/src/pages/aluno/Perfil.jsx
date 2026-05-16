import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/ui/Button';

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}
function formatCurrency(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Perfil() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [perfil, setPerfil] = useState(null);
  const [pagamentos, setPagamentos] = useState([]);
  const [protocolos, setProtocolos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, pg, pr] = await Promise.all([
          api.get('/aluno/perfil'),
          api.get('/aluno/pagamentos'),
          api.get('/aluno/protocolos'),
        ]);
        setPerfil(p.data);
        setPagamentos(pg.data);
        setProtocolos(pr.data);
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  if (loading || !perfil) {
    return <div className="p-8 text-section-label animate-pulse">Carregando…</div>;
  }

  const inadimplente = perfil.status === 'inadimplente';
  const protocoloAtivo = protocolos.find((p) => p.ativo);

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-white">COACH</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2" />
            <span className="text-2xl font-black tracking-tight text-white">SYS</span>
          </div>
        </div>
        <button onClick={logout} className="text-[11px] uppercase tracking-widest font-bold text-zinc-500 hover:text-brand">
          Sair
        </button>
      </header>

      {inadimplente && (
        <div className="bg-red-950 border border-red-900 text-red-300 rounded-lg px-5 py-3 text-sm">
          <span className="font-bold uppercase tracking-widest text-xs text-red-400">Atenção</span>
          <span className="ml-2">Seu plano está vencido desde <span className="font-bold tabular-nums">{formatDate(perfil.vencimento_plano)}</span>. Procure o seu coach.</span>
        </div>
      )}

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
          <Info label="Vencimento" value={formatDate(perfil.vencimento_plano)} />
          <Info label="Telefone" value={perfil.telefone} />
          <Info label="Nascimento" value={formatDate(perfil.data_nascimento)} />
          <Info label="Sexo" value={perfil.sexo === 'M' ? 'Masculino' : perfil.sexo === 'F' ? 'Feminino' : perfil.sexo || '—'} />
        </div>

        <div className="mt-5 space-y-3">
          {perfil.objetivo && <Info label="Objetivo" value={perfil.objetivo} block />}
          {perfil.restricoes && <Info label="Restrições" value={perfil.restricoes} block />}
          {perfil.lesoes && <Info label="Lesões" value={perfil.lesoes} block />}
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

      <section>
        <h2 className="text-section-label mb-2">Histórico de pagamentos</h2>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-section-label border-b border-surface-border">
                <th className="text-left px-5 py-3 font-semibold">Data</th>
                <th className="text-left px-5 py-3 font-semibold">Método</th>
                <th className="text-right px-5 py-3 font-semibold">Valor</th>
                <th className="text-left px-5 py-3 font-semibold">Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.length === 0 && (
                <tr><td colSpan={4} className="text-center text-zinc-500 py-8">Nenhum pagamento registrado.</td></tr>
              )}
              {pagamentos.map((p) => (
                <tr key={p.id} className="border-b border-surface-border text-zinc-300">
                  <td className="px-5 py-2.5 text-white tabular-nums">{formatDate(p.data_pagamento)}</td>
                  <td className="px-5 py-2.5 uppercase text-xs tracking-widest">{p.metodo}</td>
                  <td className="px-5 py-2.5 text-right font-bold text-brand tabular-nums">{formatCurrency(p.valor)}</td>
                  <td className="px-5 py-2.5 tabular-nums">{formatDate(p.vencimento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
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
