const { z, optionalStr, nonNegativeInt } = require('./_common');

const concluirSessao = z.object({
  duracao_seg: nonNegativeInt,
  exercicios: z.array(z.unknown()).default([]),
  observacao: optionalStr,
});

module.exports = { concluirSessao };
