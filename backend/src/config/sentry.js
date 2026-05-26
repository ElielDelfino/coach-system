// Sentry deve ser inicializado antes de qualquer outro módulo.
// Este arquivo é o primeiro require() do server.js.
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  // Captura 10% das transações em produção para performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  // Nunca enviar dados sensíveis de autenticação
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers?.authorization) {
      event.request.headers.authorization = '[Filtered]';
    }
    return event;
  },
});

module.exports = Sentry;
