const { ZodError } = require('zod');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUIDParams(req, res, next) {
  for (const [key, val] of Object.entries(req.params)) {
    if (val && !UUID_RE.test(val)) {
      return res.status(400).json({ message: `Parâmetro inválido: ${key}.` });
    }
  }
  next();
}

function formatErrors(zodError) {
  return zodError.issues.map(issue => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

function summarize(errors) {
  return errors.map(e => `${e.path}: ${e.message}`).join('; ');
}

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = formatErrors(err);
        return res.status(400).json({
          message: summarize(errors),
          errors,
        });
      }
      next(err);
    }
  };
}

module.exports = { validate, validateUUIDParams };
