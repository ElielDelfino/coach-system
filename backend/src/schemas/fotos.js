const { z } = require('./_common');

const liberarFotos = z.object({
  liberado: z.boolean(),
});

module.exports = { liberarFotos };
