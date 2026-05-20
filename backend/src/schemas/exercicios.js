const { z, nonEmptyStr, optionalStr, nonNegativeInt } = require('./_common');

const NIVEIS = ['iniciante', 'intermediario', 'avancado'];

const baseFields = {
  equipamento: optionalStr,
  nivel: z.enum(NIVEIS).optional(),
  video_url: optionalStr,
  video_youtube_url: optionalStr,
  thumbnail_url: optionalStr,
  observacoes_tecnicas: optionalStr,
  execucao_correta: optionalStr,
  execucao_errada: optionalStr,
  descanso_padrao_seg: nonNegativeInt.nullable().optional(),
  series_recomendadas: nonNegativeInt.nullable().optional(),
  repeticoes_recomendadas: optionalStr,
  cadencia: optionalStr,
  exercicio_substituto_id: z.string().uuid().nullable().optional(),
};

const createExercicio = z.object({
  nome: nonEmptyStr,
  grupo_muscular: nonEmptyStr,
  ...baseFields,
});

const updateExercicio = z.object({
  nome: nonEmptyStr.optional(),
  grupo_muscular: nonEmptyStr.optional(),
  ...baseFields,
});

module.exports = { createExercicio, updateExercicio };
