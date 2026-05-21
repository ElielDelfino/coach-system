import { motion } from 'framer-motion';

function Ring({ percent, color, icon, label, value, size = 76, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent || 0));
  const offset = c * (1 - p / 100);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
            fill="none"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ strokeDasharray: c }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-2xl">
          {icon}
        </div>
      </div>
      <div className="text-center leading-tight">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
        <p className="text-xs font-black text-white tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export default function ProgressoRingsDia({ refeicoes, treinoConcluido, agua, metaAgua }) {
  const pctRefeicoes = refeicoes.total > 0
    ? Math.round((refeicoes.feitas / refeicoes.total) * 100)
    : 0;
  const pctAgua = metaAgua > 0
    ? Math.min(100, Math.round((agua / metaAgua) * 100))
    : 0;
  const pctTreino = treinoConcluido ? 100 : 0;

  return (
    <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950
      border border-surface-border rounded-2xl px-4 py-4 mb-4
      flex items-center justify-around gap-2">
      <Ring
        percent={pctRefeicoes}
        color="#f97316"
        icon="🍽"
        label="Refeições"
        value={`${refeicoes.feitas}/${refeicoes.total}`}
      />
      <Ring
        percent={pctAgua}
        color="#60a5fa"
        icon="💧"
        label="Água"
        value={`${Number(agua || 0).toFixed(1)}/${Number(metaAgua || 0).toFixed(1)}L`}
      />
      <Ring
        percent={pctTreino}
        color="#22c55e"
        icon="🏋"
        label="Treino"
        value={treinoConcluido ? 'Feito' : 'Pendente'}
      />
    </div>
  );
}
