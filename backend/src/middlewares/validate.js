const { ZodError } = require('zod');

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

module.exports = { validate };
