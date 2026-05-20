const { z, nonEmptyStr, optionalStr, nonNegativeNumber } = require('./_common');

const INTENSIDADES = ['leve', 'moderada', 'intensa', 'maxima'];

const numFieldOptional = nonNegativeNumber.nullable().optional();

const baseFields = {
  intensidade: z.enum(INTENSIDADES).optional(),
  duracao_min: numFieldOptional,
  gasto_calorico_estimado: numFieldOptional,
  inclinacao: numFieldOptional,
  velocidade: numFieldOptional,
  observacoes: optionalStr,
};

const createCardio = z.object({
  tipo: nonEmptyStr,
  ...baseFields,
});

const updateCardio = z.object({
  tipo: nonEmptyStr.optional(),
  ...baseFields,
});

module.exports = { createCardio, updateCardio };
