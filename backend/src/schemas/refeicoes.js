const { z, nonEmptyStr, optionalStr, positiveInt, nonNegativeInt, positiveNumber } = require('./_common');

const horarioStr = z.string().trim().max(20).optional().nullable();

const createRefeicao = z.object({
  numero_refeicao: positiveInt,
  nome: nonEmptyStr,
  ordem: nonNegativeInt.optional(),
  horario_sugerido: horarioStr,
});

const updateRefeicao = z.object({
  nome: nonEmptyStr.optional(),
  ordem: nonNegativeInt.optional(),
  horario_sugerido: horarioStr,
});

const duplicarRefeicao = z.object({
  numero_refeicao_destino: positiveInt,
});

const createRefeicaoItem = z.object({
  alimento_id: z.string().uuid(),
  quantidade_g: positiveNumber,
  ordem: nonNegativeInt.optional(),
  observacoes: optionalStr,
});

const updateRefeicaoItem = z.object({
  quantidade_g: positiveNumber.optional(),
  ordem: nonNegativeInt.optional(),
  observacoes: optionalStr,
});

const reordenarItens = z.object({
  ordem: z.array(z.object({
    id: z.string().uuid(),
    ordem: nonNegativeInt,
  })).min(1, 'ordem deve ser um array não vazio'),
});

const createSubstituto = z.object({
  alimento_id: z.string().uuid(),
  quantidade_g: positiveNumber,
});

module.exports = {
  createRefeicao, updateRefeicao, duplicarRefeicao,
  createRefeicaoItem, updateRefeicaoItem, reordenarItens,
  createSubstituto,
};
