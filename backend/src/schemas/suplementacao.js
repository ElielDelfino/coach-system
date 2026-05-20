const { z, nonEmptyStr, optionalStr, nonNegativeInt } = require('./_common');

const createSuplemento = z.object({
  nome_suplemento: nonEmptyStr,
  dose: nonEmptyStr,
  horario: optionalStr,
  observacao: optionalStr,
  ordem: nonNegativeInt.optional(),
});

const updateSuplemento = z.object({
  nome_suplemento: nonEmptyStr.optional(),
  dose: nonEmptyStr.optional(),
  horario: optionalStr,
  observacao: optionalStr,
  ordem: nonNegativeInt.optional(),
});

module.exports = { createSuplemento, updateSuplemento };
