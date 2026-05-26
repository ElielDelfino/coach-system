// Validação de env vars no boot. Se algum obrigatório faltar, o server NÃO sobe.
// Centraliza o contrato de ambiente em um lugar — toda nova var crítica entra aqui.

const { cleanEnv, str, port, url } = require('envalid');

const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    default: 'development',
  }),
  PORT: port({ default: 3000 }),

  // Banco e cache — críticos
  DATABASE_URL: url(),
  REDIS_URL: url(),

  // JWT — críticos
  JWT_SECRET: str(),
  JWT_REFRESH_SECRET: str(),

  // S3 — críticos (uploads, fotos, mídias)
  AWS_REGION: str(),
  AWS_ACCESS_KEY_ID: str(),
  AWS_SECRET_ACCESS_KEY: str(),
  AWS_S3_BUCKET: str(),
  S3_PUBLIC_URL: str({ default: '' }),

  // CORS — opcional, default dev
  FRONTEND_URL: url({ default: 'http://localhost:5173' }),

  // Email (Resend) — opcional, mas alguns fluxos quebram silenciosamente sem ele
  RESEND_API_KEY: str({ default: '' }),
  EMAIL_FROM: str({ default: '' }),

  // Monitoramento de erros (Sentry) — opcional; sem DSN o Sentry fica desabilitado
  SENTRY_DSN: str({ default: '' }),

  // Admin inicial — criado no primeiro boot se não existir nenhum admin
  ADMIN_EMAIL: str({ default: '' }),
  ADMIN_PASSWORD: str({ default: '' }),

  // Puppeteer — setado pelo Dockerfile em prod; opcional em dev
  PUPPETEER_EXECUTABLE_PATH: str({ default: '' }),
});

module.exports = env;
