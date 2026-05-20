const { z, isoDate, optionalStr, nonNegativeNumber } = require('./_common');

const numField = nonNegativeNumber.nullable().optional();

const medidaBase = {
  peso_kg: numField,
  altura_cm: numField,
  percentual_gordura: numField,
  peso_magro_kg: numField,
  peso_gordo_kg: numField,
  cintura_cm: numField,
  quadril_cm: numField,
  torax_cm: numField,
  braco_dir_cm: numField,
  braco_esq_cm: numField,
  antebraco_dir_cm: numField,
  antebraco_esq_cm: numField,
  coxa_dir_cm: numField,
  coxa_esq_cm: numField,
  panturrilha_dir_cm: numField,
  panturrilha_esq_cm: numField,
  observacoes: optionalStr,
};

const createMedida = z.object({
  data_medicao: isoDate,
  ...medidaBase,
});

const updateMedida = z.object({
  data_medicao: isoDate.optional(),
  ...medidaBase,
});

module.exports = { createMedida, updateMedida };
