import clsx from 'clsx';

// Mostra valores nominais (kcal, prot, carb, gord) com barras de proporção visual.
// Os valores são puramente exibidos — o servidor já fez todos os cálculos.
const MACROS = [
  { key: 'prot', label: 'Prot', color: 'bg-sky-500' },
  { key: 'carb', label: 'Carb', color: 'bg-amber-500' },
  { key: 'gord', label: 'Gord', color: 'bg-rose-500' },
];

export default function MacroBar({ kcal, prot, carb, gord, compact = false }) {
  const totalG = Math.max(Number(prot || 0) + Number(carb || 0) + Number(gord || 0), 1);
  const dist = {
    prot: (Number(prot || 0) / totalG) * 100,
    carb: (Number(carb || 0) / totalG) * 100,
    gord: (Number(gord || 0) / totalG) * 100,
  };

  return (
    <div className={clsx('w-full', compact ? 'space-y-1' : 'space-y-2')}>
      <div className="flex items-baseline justify-between">
        <div className="text-section-label">Kcal</div>
        <div className={clsx('font-black tabular-nums', compact ? 'text-base' : 'text-xl', 'text-brand')}>
          {fmt(kcal)}
        </div>
      </div>

      <div className="flex h-1.5 w-full overflow-hidden rounded bg-surface-input">
        {MACROS.map((m) => (
          <div
            key={m.key}
            className={m.color}
            style={{ width: `${dist[m.key]}%` }}
            title={`${m.label}: ${fmt({ prot, carb, gord }[m.key])}g`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        {MACROS.map((m) => (
          <div key={m.key} className="flex items-center gap-1.5">
            <span className={clsx('w-1.5 h-1.5 rounded-full', m.color)} />
            <span className="text-zinc-500">{m.label}</span>
            <span className="text-white font-semibold ml-auto tabular-nums">
              {fmt({ prot, carb, gord }[m.key])}g
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(v) {
  if (v == null || isNaN(Number(v))) return '0';
  const n = Number(v);
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
}
