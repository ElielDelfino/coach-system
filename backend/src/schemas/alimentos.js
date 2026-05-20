const { z, nonEmptyStr, optionalStr, nonNegativeNumber, positiveNumber } = require('./_common');

const UNIDADES = ['gramas', 'ml', 'unidade', 'colher_sopa', 'colher_cha', 'scoop'];

const numFieldRequired = nonNegativeNumber;
const numFieldOptional = nonNegativeNumber.nullable().optional();

const createAlimento = z.object({
  nome: nonEmptyStr,
  categoria: optionalStr,
  quantidade_base: positiveNumber.optional(),
  unidade: z.enum(UNIDADES),
  calorias: numFieldRequired,
  proteinas: numFieldRequired,
  carboidratos: numFieldRequired,
  gorduras: numFieldRequired,
  fibra: numFieldOptional,
  sodio: numFieldOptional,
  foto_url: optionalStr,
});

const updateAlimento = z.object({
  nome: nonEmptyStr.optional(),
  categoria: optionalStr,
  quantidade_base: positiveNumber.optional(),
  unidade: z.enum(UNIDADES).optional(),
  calorias: numFieldOptional,
  proteinas: numFieldOptional,
  carboidratos: numFieldOptional,
  gorduras: numFieldOptional,
  fibra: numFieldOptional,
  sodio: numFieldOptional,
  foto_url: optionalStr,
});

module.exports = { createAlimento, updateAlimento };
