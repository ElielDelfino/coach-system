export const MODULOS = [
  { id: 'alimentar', label: 'Alimentar', flag: 'modulo_alimentar' },
  { id: 'treino', label: 'Treino', flag: 'modulo_treino' },
  { id: 'suplementacao', label: 'Suplementação', flag: 'modulo_suplementacao' },
  { id: 'observacoes', label: 'Observações', flag: null },
];

export function fmt(v, d = 1) {
  if (v == null || isNaN(Number(v))) return '0';
  const n = Number(v);
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(d);
}
