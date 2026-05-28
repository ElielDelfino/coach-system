import { motion } from 'framer-motion';

const FATORES = [
  { id: 'treinos',   label: 'Treinos',   peso: 45, cor: 'bg-brand',      cor_text: 'text-brand',      icone: '🏋' },
  { id: 'refeicoes', label: 'Refeições', peso: 30, cor: 'bg-accent',   cor_text: 'text-accent',   icone: '🍽' },
  { id: 'medidas',   label: 'Medidas',   peso: 12.5, cor: 'bg-green-500',cor_text: 'text-green-400',  icone: '📏' },
  { id: 'fotos',     label: 'Fotos',     peso: 12.5, cor: 'bg-purple-500',cor_text: 'text-purple-400',icone: '📷' },
];

function pctFator(progresso, fatorId) {
  if (!progresso) return 0;
  switch (fatorId) {
    case 'treinos':   return progresso.treinos?.percentual || 0;
    case 'refeicoes': return progresso.refeicoes?.percentual || 0;
    case 'medidas':   return progresso.medidas?.ok ? 100 : 0;
    case 'fotos':     return progresso.fotos?.ok ? 100 : 0;
    default: return 0;
  }
}

export default function ScoreLegenda({ progresso }) {
  const score = progresso?.score_geral ?? 0;

  return (
    <div className="bg-surface-elevated border border-surface-border rounded-2xl px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500">Score da semana</p>
        <span className="text-2xl font-black text-white tabular-nums">{score}<span className="text-sm text-zinc-500">/100</span></span>
      </div>

      {/* Barra empilhada — cada fator preenche sua fatia */}
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-zinc-900 mb-3">
        {FATORES.map((f) => {
          const pct = pctFator(progresso, f.id);
          const largura = f.peso * (pct / 100);
          return (
            <motion.div
              key={f.id}
              className={`${f.cor}`}
              initial={{ width: 0 }}
              animate={{ width: `${largura}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{ minWidth: largura > 0 ? '3px' : 0 }}
            />
          );
        })}
      </div>

      <div className="space-y-2">
        {FATORES.map((f) => {
          const pct = pctFator(progresso, f.id);
          const contribuicao = (f.peso * pct) / 100;
          return (
            <div key={f.id} className="flex items-center gap-3 text-xs">
              <span className={`w-2 h-2 rounded-full ${f.cor} shrink-0`} />
              <span className="text-zinc-300 flex-1 min-w-0 truncate">
                <span className="mr-1.5">{f.icone}</span>
                {f.label}
              </span>
              <span className="text-zinc-500 tabular-nums">{pct}%</span>
              <span className="text-zinc-600 tabular-nums w-16 text-right">
                vale {f.peso}<span className="text-zinc-700">pts</span>
              </span>
              <span className={`tabular-nums font-bold w-12 text-right ${f.cor_text}`}>
                +{contribuicao.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-zinc-600 mt-3 leading-relaxed">
        Score = soma das contribuições. Cada fator vale até seu peso máximo.
        Treinos pesam mais por serem o motor da rotina.
      </p>
    </div>
  );
}
