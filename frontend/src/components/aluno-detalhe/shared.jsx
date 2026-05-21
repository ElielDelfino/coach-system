export function iniciais(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}

export function formatCurrency(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Info({ label, value, span = 1 }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <div className="text-section-label">{label}</div>
      <div className="text-zinc-200 mt-0.5 text-sm whitespace-pre-wrap">{value || '—'}</div>
    </div>
  );
}

export function Metric({ label, value }) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="text-section-label">{label}</div>
      <div className="text-xl font-black tabular-nums text-white">{value}</div>
    </div>
  );
}
