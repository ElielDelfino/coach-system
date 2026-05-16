import clsx from 'clsx';

const STYLES = {
  ativo: 'bg-green-950 text-green-400 border-green-900',
  inadimplente: 'bg-red-950 text-red-400 border-red-900',
  inativo: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

const LABELS = {
  ativo: 'Ativo',
  inadimplente: 'Inadimplente',
  inativo: 'Inativo',
};

export default function StatusBadge({ status, className = '' }) {
  const key = STYLES[status] ? status : 'inativo';
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border',
        STYLES[key],
        className
      )}
    >
      {LABELS[key]}
    </span>
  );
}
