const { z } = require('./_common');

const login = z.object({
  email: z.string().trim().toLowerCase().email('e-mail inválido'),
  senha: z.string().min(1, 'senha é obrigatória'),
});

module.exports = { login };
