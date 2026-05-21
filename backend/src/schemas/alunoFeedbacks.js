const { z, nonEmptyStr } = require('./_common');

const escalaCinco = z.coerce.number().int().min(1).max(5).optional().nullable();
const medidaNum = z.coerce.number().positive().max(500).optional().nullable();

const criarFeedback = z.object({
  texto: nonEmptyStr.max(2000),
  peso_kg: medidaNum,
  percentual_gordura: medidaNum,
  cintura_cm: medidaNum,
  humor: escalaCinco,
  energia: escalaCinco,
  dificuldade: escalaCinco,
});

module.exports = { criarFeedback };
