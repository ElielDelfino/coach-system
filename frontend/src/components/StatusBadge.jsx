import clsx from 'clsx';

const STYLES = {
  neutro: 'bg-zinc-800/60 text-zinc-400 border-zinc-700',
  em_dia: 'bg-ok/15 text-ok border-ok/35',
  inadimplente: 'bg-danger/15 text-danger border-danger/40',
  inativo: 'bg-zinc-700/40 text-zinc-500 border-zinc-600',
  // legado
  ativo: 'bg-ok/15 text-ok border-ok/35',
};

const LABELS = {
  neutro: 'Sem fatura',
  em_dia: 'Em dia',
  inadimplente: 'Inadimplente',
  inativo: 'Inativo',
  ativo: 'Ativo',
};

export default function StatusBadge({ status, className = '' }) {
  const key = STYLES[status] ? status : 'inativo';
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-display font-semibold uppercase tracking-widest border',
        STYLES[key],
        className
      )}
    >
      {LABELS[key]}
    </span>
  );
}
