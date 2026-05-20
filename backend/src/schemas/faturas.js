const { z, isoDate, optionalStr, positiveNumber, nonNegativeNumber } = require('./_common');

const METODOS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia'];
const TIPOS_DESCONTO = ['valor', 'percentual'];

const createFatura = z.object({
  valor: positiveNumber,
  data_vencimento: isoDate,
  observacoes: optionalStr,
  desconto_tipo: z.enum(TIPOS_DESCONTO).nullable().optional(),
  desconto_valor: nonNegativeNumber.nullable().optional(),
});

const updateFatura = z.object({
  valor: positiveNumber.optional(),
  data_vencimento: isoDate.optional(),
  observacoes: optionalStr,
  desconto_tipo: z.enum(TIPOS_DESCONTO).nullable().optional(),
  desconto_valor: nonNegativeNumber.nullable().optional(),
});

const darBaixaFatura = z.object({
  data_baixa: isoDate,
  metodo_baixa: z.enum(METODOS),
  observacoes: optionalStr,
});

module.exports = { createFatura, updateFatura, darBaixaFatura };
