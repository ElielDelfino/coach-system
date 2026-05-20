const { z } = require('zod');

const trimmed = z.string().trim();
const nonEmptyStr = trimmed.min(1);
const optionalStr = trimmed.max(2000).optional().nullable();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar no formato YYYY-MM-DD');

const nullableIsoDate = isoDate.nullable().optional();

const positiveInt = z.coerce.number().int().positive();
const nonNegativeInt = z.coerce.number().int().nonnegative();
const positiveNumber = z.coerce.number().positive();
const nonNegativeNumber = z.coerce.number().nonnegative();

module.exports = {
  z,
  trimmed,
  nonEmptyStr,
  optionalStr,
  isoDate,
  nullableIsoDate,
  positiveInt,
  nonNegativeInt,
  positiveNumber,
  nonNegativeNumber,
};
