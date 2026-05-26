export const GRUPOS_MUSCULARES = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Abdômen',
  'Quadríceps',
  'Posterior de coxa',
  'Glúteos',
  'Panturrilha',
  'Cardio',
  'Corpo inteiro',
];

const COLORS = {
  'Peito':              { badge: 'bg-red-950 text-red-400 border-red-900',             dot: 'bg-red-500' },
  'Costas':             { badge: 'bg-blue-950 text-blue-400 border-blue-900',          dot: 'bg-blue-500' },
  'Ombros':             { badge: 'bg-amber-950 text-amber-400 border-amber-900',       dot: 'bg-amber-500' },
  'Bíceps':             { badge: 'bg-purple-950 text-purple-400 border-purple-900',    dot: 'bg-purple-500' },
  'Tríceps':            { badge: 'bg-fuchsia-950 text-fuchsia-400 border-fuchsia-900', dot: 'bg-fuchsia-500' },
  'Antebraço':          { badge: 'bg-pink-950 text-pink-400 border-pink-900',          dot: 'bg-pink-500' },
  'Abdômen':            { badge: 'bg-yellow-950 text-yellow-400 border-yellow-900',    dot: 'bg-yellow-500' },
  'Quadríceps':         { badge: 'bg-emerald-950 text-emerald-400 border-emerald-900', dot: 'bg-emerald-500' },
  'Posterior de coxa':  { badge: 'bg-teal-950 text-teal-400 border-teal-900',          dot: 'bg-teal-500' },
  'Glúteos':            { badge: 'bg-rose-950 text-rose-400 border-rose-900',          dot: 'bg-rose-500' },
  'Panturrilha':        { badge: 'bg-lime-950 text-lime-400 border-lime-900',          dot: 'bg-lime-500' },
  'Cardio':             { badge: 'bg-orange-950 text-orange-400 border-orange-900',    dot: 'bg-orange-500' },
  'Corpo inteiro':      { badge: 'bg-cyan-950 text-cyan-400 border-cyan-900',          dot: 'bg-cyan-500' },
};

const FALLBACK = { badge: 'bg-zinc-900 text-zinc-500 border-zinc-800', dot: 'bg-zinc-600' };

export function grupoColors(grupo) {
  return COLORS[grupo] || FALLBACK;
}
