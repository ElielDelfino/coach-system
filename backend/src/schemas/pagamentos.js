const { z, isoDate, optionalStr, positiveNumber } = require('./_common');

const METODOS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia'];

const createPagamento = z.object({
  valor: positiveNumber,
  data_pagamento: isoDate,
  metodo: z.enum(METODOS),
  vencimento: isoDate,
  observacoes: optionalStr,
});

module.exports = { createPagamento, METODOS };
