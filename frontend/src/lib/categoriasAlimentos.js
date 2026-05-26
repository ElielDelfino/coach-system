export const CATEGORIAS_ALIMENTOS = [
  'Proteína animal',
  'Proteína vegetal',
  'Laticínio',
  'Carboidrato',
  'Fruta',
  'Vegetal',
  'Gordura boa',
  'Suplemento',
];

const COLORS = {
  'Proteína animal':  { badge: 'bg-red-950 text-red-400 border-red-900',           dot: 'bg-red-500' },
  'Proteína vegetal': { badge: 'bg-emerald-950 text-emerald-400 border-emerald-900', dot: 'bg-emerald-500' },
  'Laticínio':        { badge: 'bg-sky-950 text-sky-400 border-sky-900',           dot: 'bg-sky-500' },
  'Carboidrato':      { badge: 'bg-amber-950 text-amber-400 border-amber-900',     dot: 'bg-amber-500' },
  'Fruta':            { badge: 'bg-pink-950 text-pink-400 border-pink-900',        dot: 'bg-pink-500' },
  'Vegetal':          { badge: 'bg-lime-950 text-lime-400 border-lime-900',        dot: 'bg-lime-500' },
  'Gordura boa':      { badge: 'bg-yellow-950 text-yellow-400 border-yellow-900',  dot: 'bg-yellow-500' },
  'Suplemento':       { badge: 'bg-violet-950 text-violet-400 border-violet-900',  dot: 'bg-violet-500' },
};

const FALLBACK = { badge: 'bg-zinc-900 text-zinc-500 border-zinc-800', dot: 'bg-zinc-600' };

export function categoriaColors(categoria) {
  return COLORS[categoria] || FALLBACK;
}
