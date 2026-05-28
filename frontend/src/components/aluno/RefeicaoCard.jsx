import { motion } from 'framer-motion';

function MacroBar({ label, valor, color }) {
  const pct = Math.min(100, (valor / 100) * 100);
  return (
    <div className="flex-1 min-w-0">
      <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <p className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">
        <span className="text-zinc-400 font-bold">{Number(valor || 0).toFixed(0)}g</span> {label}
      </p>
    </div>
  );
}

export default function RefeicaoCard({ refeicao, feito, disabled, onToggleCheckin, onAbrir }) {
  function handleToggle(e) {
    e.stopPropagation();
    if (disabled) return;
    if (navigator.vibrate) navigator.vibrate(feito ? 30 : [50, 30, 50]);
    onToggleCheckin?.();
  }

  return (
    <motion.button
      type="button"
      onClick={onAbrir}
      whileTap={{ scale: 0.985 }}
      className={`w-full text-left bg-surface-elevated border rounded-2xl px-4 py-3 transition-all
        ${feito
          ? 'border-brand/30 opacity-75'
          : 'border-surface-border hover:border-brand/30'}`}
    >
      <div className="flex items-center gap-3">
        <span
          role="button"
          tabIndex={0}
          onClick={handleToggle}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggle(e)}
          className={`relative w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0
            transition-all cursor-pointer
            ${feito
              ? 'bg-brand border-brand'
              : 'border-surface-border hover:border-brand/60'}`}
          aria-label={feito ? 'Desmarcar refeição' : 'Marcar como feita'}
        >
          {feito && (
            <motion.svg
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="5 12 10 17 19 7" />
            </motion.svg>
          )}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className={`font-bold text-sm truncate ${feito ? 'text-zinc-400 line-through decoration-1' : 'text-white'}`}>
              {refeicao.nome}
            </p>
            <p className="text-zinc-500 text-xs tabular-nums shrink-0">
              {Number(refeicao.total_kcal || 0).toFixed(0)} kcal
            </p>
          </div>
          {refeicao.horario_sugerido && (
            <p className="text-zinc-600 text-[11px] mt-0.5">{refeicao.horario_sugerido}</p>
          )}
        </div>
      </div>

      <div className="flex items-end gap-2 mt-2.5 pl-12">
        <MacroBar label="P" valor={refeicao.total_prot} color="bg-accent/70" />
        <MacroBar label="C" valor={refeicao.total_carb} color="bg-yellow-500/70" />
        <MacroBar label="G" valor={refeicao.total_gord} color="bg-red-500/70" />
      </div>
    </motion.button>
  );
}
