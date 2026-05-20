import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast, errorMessage } from '../../components/ui/Toast';
import PageLoader from '../../components/ui/PageLoader';

function primeiroNome(nome) {
  if (!nome) return 'Aluno';
  return nome.trim().split(/\s+/)[0];
}

export default function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [perfil, setPerfil] = useState(null);
  const [protocolo, setProtocolo] = useState(null);
  const [treinos, setTreinos] = useState([]);
  const [refeicoes, setRefeicoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const dataHoje = new Date().toISOString().split('T')[0];
  const chaveAgua = user?.id ? `agua_${user.id}_${dataHoje}` : null;

  const [aguaIngerida, setAguaIngerida] = useState(() => {
    if (typeof window === 'undefined' || !user?.id) return 0;
    return Number(localStorage.getItem(`agua_${user.id}_${dataHoje}`) || 0);
  });

  function salvarAgua(valor) {
    setAguaIngerida(valor);
    if (chaveAgua) localStorage.setItem(chaveAgua, String(valor));
    toast.success(`Água registrada: ${Number(valor).toFixed(1)} L`);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [perfilRes, protocolosRes] = await Promise.all([
          api.get('/aluno/perfil'),
          api.get('/aluno/protocolos'),
        ]);
        if (cancelled) return;
        setPerfil(perfilRes.data);

        const lista = protocolosRes.data || [];
        const ativo = lista.find((p) => p.ativo) || lista[0] || null;
        setProtocolo(ativo);

        if (ativo) {
          const [tr, rf] = await Promise.all([
            api.get(`/aluno/protocolos/${ativo.id}/treinos`).catch(() => ({ data: [] })),
            api.get(`/aluno/protocolos/${ativo.id}/refeicoes`).catch(() => ({ data: [] })),
          ]);
          if (cancelled) return;
          setTreinos(tr.data || []);
          setRefeicoes(rf.data || []);
        }
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const totalTreinos = treinos.length;
  const treinosFeitos = 0;

  const proximoTreino = useMemo(() => treinos[0] || null, [treinos]);

  const proximaRefeicao = useMemo(() => {
    if (!refeicoes.length) return null;
    const ordenadas = [...refeicoes].sort((a, b) => {
      const ha = a.horario_sugerido || '';
      const hb = b.horario_sugerido || '';
      if (ha && hb) return ha.localeCompare(hb);
      return (a.ordem ?? 0) - (b.ordem ?? 0);
    });
    return ordenadas[0];
  }, [refeicoes]);

  if (loading || !perfil) {
    return <PageLoader mensagem="Carregando..." />;
  }

  const META_AGUA = Number(protocolo?.meta_agua_litros) || 2.5;
  const pctAgua = META_AGUA > 0 ? Math.min(100, (aguaIngerida / META_AGUA) * 100) : 0;

  return (
    <div className="px-5 pt-8 pb-4">
        <p className="text-zinc-400 text-sm">Bem vindo(a),</p>
        <h1 className="text-3xl font-black text-white tracking-tight mb-6">
          {primeiroNome(perfil.nome)}
        </h1>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏋️</span>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Treinos da semana</p>
              <div className="mt-2 h-2 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-500"
                  style={{
                    width: totalTreinos > 0 ? `${(treinosFeitos / totalTreinos) * 100}%` : '0%',
                  }}
                />
              </div>
              <p className="text-zinc-500 text-xs mt-1">{treinosFeitos}/{totalTreinos}</p>
            </div>
          </div>
        </div>

        {proximoTreino && (
          <div className="bg-surface-card border border-brand/30 rounded-2xl p-5 mb-4">
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
              Próximo treino
            </p>
            <p className="text-brand text-2xl font-black mb-3">{proximoTreino.nome}</p>
            <button
              onClick={() => navigate(`/aluno/treino/${protocolo.id}/${proximoTreino.id}`)}
              className="bg-brand text-white text-xs font-black px-4 py-2 rounded-full
                uppercase tracking-wide hover:bg-brand-dark transition-colors"
            >
              Ir para o treino
            </button>
          </div>
        )}

        {proximaRefeicao && (
          <div className="bg-surface-card border border-brand/30 rounded-2xl p-5 mb-4">
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
              Próxima refeição
            </p>
            <p className="text-brand text-2xl font-black mb-3">{proximaRefeicao.nome}</p>
            <button
              onClick={() => navigate(`/aluno/dieta/${proximaRefeicao.id}`)}
              className="bg-brand text-white text-xs font-black px-4 py-2 rounded-full
                uppercase tracking-wide hover:bg-brand-dark transition-colors"
            >
              Ir para refeição
            </button>
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-2xl font-black">Água</h2>
            <div className="flex items-center gap-2 border border-brand rounded-full px-3 py-1">
              <span className="text-brand text-xs">🎯</span>
              <span className="text-white font-bold text-sm">{META_AGUA} L</span>
            </div>
          </div>
          <p className="text-zinc-500 text-xs mb-2">Ingerido</p>

          <div className="relative flex items-center gap-3">
            <span className="text-2xl">💧</span>
            <input
              type="range"
              min="0"
              max={META_AGUA}
              step="0.25"
              value={aguaIngerida}
              onChange={(e) => setAguaIngerida(Number(e.target.value))}
              className="flex-1 h-2 appearance-none rounded-full
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-brand
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-brand
                [&::-moz-range-thumb]:border-0
                [&::-moz-range-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, #f97316 ${pctAgua}%, #161616 ${pctAgua}%)`,
              }}
            />
            <button
              onClick={() => salvarAgua(aguaIngerida)}
              className="shrink-0 bg-brand text-white text-xs font-black px-3 py-2 rounded-full
                hover:bg-brand-dark transition-colors"
            >
              Salvar
            </button>
          </div>
          <p className="text-zinc-400 text-sm mt-2">{aguaIngerida.toFixed(1)} litros</p>
        </div>
    </div>
  );
}
