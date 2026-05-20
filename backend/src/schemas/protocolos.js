const { z, nonEmptyStr, optionalStr, nullableIsoDate } = require('./_common');

const FASES = ['cutting', 'bulking', 'manutencao', 'recomposicao'];

const baseFields = {
  objetivo: optionalStr,
  fase: z.enum(FASES).nullable().optional(),
  data_inicio: nullableIsoDate,
  data_fim: nullableIsoDate,
  modulo_alimentar: z.boolean().optional(),
  modulo_treino: z.boolean().optional(),
  modulo_cardio: z.boolean().optional(),
  modulo_suplementacao: z.boolean().optional(),
  observacoes: optionalStr,
};

const refineRangeData = (obj, ctx) => {
  if (obj.data_inicio && obj.data_fim && new Date(obj.data_fim) < new Date(obj.data_inicio)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['data_fim'],
      message: 'data_fim não pode ser anterior a data_inicio',
    });
  }
};

const createProtocolo = z.object({
  nome: nonEmptyStr,
  ...baseFields,
}).superRefine(refineRangeData);

const updateProtocolo = z.object({
  nome: nonEmptyStr.optional(),
  ...baseFields,
}).superRefine(refineRangeData);

module.exports = { createProtocolo, updateProtocolo };
