// Barrel re-export — agrega todas as funções de todos os módulos de domínio.
//
// Padrão para evitar regressões:
// - Cada arquivo aqui dentro representa UM domínio (uma ou duas tabelas relacionadas).
// - Helpers cross-domínio (cálculo de macros, status SQL, decoração de exercício,
//   formatação de fatura) vivem em `_shared.js`. NÃO duplique helpers entre arquivos.
// - Toda função puramente SQL (sem regra de negócio) fica no model. Validação,
//   códigos HTTP e mensagens vivem no controller.
// - Para queries cross-tabela (ex.: PDF de protocolo precisa de refeições + treinos + medidas),
//   o controller chama várias funções model — não criamos um "model misturado".
// - Os controllers importam `require('../../models')` (este arquivo). Mantém o ponto
//   único de acesso e facilita refatorar futuras divisões sem mexer em controller.

module.exports = {
  ...require('./alunos'),
  ...require('./medidas'),
  ...require('./fotos'),
  ...require('./pagamentos'),
  ...require('./faturas'),
  ...require('./exercicios'),
  ...require('./alimentos'),
  ...require('./cardio'),
  ...require('./protocolos'),
  ...require('./refeicoes'),
  ...require('./refeicao_itens'),
  ...require('./substitutos'),
  ...require('./treinos'),
  ...require('./treino_exercicios'),
  ...require('./suplementacao'),
};
