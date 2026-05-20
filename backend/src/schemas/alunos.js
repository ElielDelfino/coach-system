const { z, nonEmptyStr, optionalStr, nullableIsoDate, nonNegativeInt } = require('./_common');

const sexo = z.enum(['M', 'F', 'outro']).nullable().optional();

const createAluno = z.object({
  nome: nonEmptyStr,
  email: z.string().trim().toLowerCase().email('e-mail inválido'),
  senha: z.string().min(8, 'senha deve ter no mínimo 8 caracteres'),
  telefone: optionalStr,
  data_nascimento: nullableIsoDate,
  sexo,
  objetivo: optionalStr,
  restricoes: optionalStr,
  lesoes: optionalStr,
  dias_tolerancia: nonNegativeInt.optional(),
  periodicidade_dias: nonNegativeInt.optional(),
});

const updateAluno = z.object({
  nome: nonEmptyStr.optional(),
  telefone: optionalStr,
  data_nascimento: nullableIsoDate,
  sexo,
  objetivo: optionalStr,
  restricoes: optionalStr,
  lesoes: optionalStr,
  observacoes: optionalStr,
  dias_tolerancia: nonNegativeInt.optional(),
  periodicidade_dias: nonNegativeInt.optional(),
});

const redefinirSenha = z.object({
  senha: z.string().min(8, 'senha deve ter no mínimo 8 caracteres'),
});

module.exports = { createAluno, updateAluno, redefinirSenha };
