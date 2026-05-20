const { z, nonEmptyStr, optionalStr, nonNegativeInt, positiveInt } = require('./_common');

const createTreino = z.object({
  nome: nonEmptyStr,
  ordem: nonNegativeInt.optional(),
});

const updateTreino = z.object({
  nome: nonEmptyStr.optional(),
  ordem: nonNegativeInt.optional(),
});

const duplicarTreino = z.object({
  nome: nonEmptyStr.optional(),
  ordem: nonNegativeInt.optional(),
}).optional().default({});

const createTreinoExercicio = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('exercicio'),
    exercicio_id: z.string().uuid(),
    series: positiveInt.optional(),
    repeticoes: optionalStr,
    descanso_seg: nonNegativeInt.nullable().optional(),
    observacao: optionalStr,
    ordem: nonNegativeInt.optional(),
    grupo_superset: optionalStr,
  }),
  z.object({
    tipo: z.literal('cardio'),
    cardio_id: z.string().uuid(),
    observacao: optionalStr,
    ordem: nonNegativeInt.optional(),
    grupo_superset: optionalStr,
  }),
]);

const updateTreinoExercicio = z.object({
  series: positiveInt.optional(),
  repeticoes: optionalStr,
  descanso_seg: nonNegativeInt.nullable().optional(),
  observacao: optionalStr,
  ordem: nonNegativeInt.optional(),
  grupo_superset: optionalStr,
});

const reordenarTreinoExercicios = z.object({
  ordem: z.array(z.object({
    id: z.string().uuid(),
    ordem: nonNegativeInt,
  })).min(1, 'ordem deve ser um array não vazio'),
});

module.exports = {
  createTreino, updateTreino, duplicarTreino,
  createTreinoExercicio, updateTreinoExercicio, reordenarTreinoExercicios,
};
