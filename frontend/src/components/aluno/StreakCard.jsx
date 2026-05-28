import { motion } from 'framer-motion';

function plural(n, sing, plur) {
  return n === 1 ? sing : plur;
}

export default function StreakCard({ streak }) {
  const atual = streak?.atual ?? 0;
  const recorde = streak?.recorde ?? 0;
  const ativo = atual > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl px-4 py-3 border
        ${ativo
          ? 'bg-gradient-to-br from-brand/20 via-brand-dark/15 to-surface-card border-brand/35 shadow-glow-magenta-sm'
          : 'bg-surface-elevated border-white/10'}`}
    >
      {ativo && (
        <motion.div
          aria-hidden
          initial={{ scale: 0.8, opacity: 0.4 }}
          animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-4 -top-4 text-7xl select-none"
        >
          🔥
        </motion.div>
      )}
      <div className="relative">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-zinc-500">
          {ativo ? 'Em sequência' : 'Sem sequência ativa'}
        </p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className={`text-3xl font-mono font-bold tabular-nums ${ativo ? 'text-brand text-glow-magenta' : 'text-zinc-400'}`}>
            {atual}
          </span>
          <span className={`text-xs font-bold ${ativo ? 'text-brand-light' : 'text-zinc-500'}`}>
            {plural(atual, 'dia', 'dias')}
          </span>
        </div>
        {recorde > 0 && (
          <p className="text-[11px] text-zinc-500 mt-1">
            Seu recorde: <span className="text-zinc-300 font-bold tabular-nums">{recorde}</span>
          </p>
        )}
        {!ativo && (
          <p className="text-[11px] text-zinc-500 mt-1">
            Conclua 1 treino ou marque 1 refeição pra começar.
          </p>
        )}
      </div>
    </motion.div>
  );
}
