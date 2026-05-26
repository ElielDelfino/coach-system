const pool = require('./db');
const { BOOT_LOCK_KEY } = require('./migrate');
const logger = require('./logger');

// Biblioteca base de alimentos da cultura fitness.
// Macros por quantidade_base na unidade especificada.
// Fontes cruzadas: TACO 4ª ed. (Unicamp) e rótulos médios de mercado.
const ALIMENTOS_BASE = [
  // ===== PROTEÍNA ANIMAL (por 100g) =====
  { nome: 'Peito de frango grelhado',     categoria: 'Proteína animal', qb: 100, un: 'gramas', kcal: 165, p: 31,   c: 0,    g: 3.6 },
  { nome: 'Sobrecoxa de frango sem pele', categoria: 'Proteína animal', qb: 100, un: 'gramas', kcal: 177, p: 26,   c: 0,    g: 7.4 },
  { nome: 'Patinho moído cozido',         categoria: 'Proteína animal', qb: 100, un: 'gramas', kcal: 219, p: 28,   c: 0,    g: 11  },
  { nome: 'Coxão duro grelhado',          categoria: 'Proteína animal', qb: 100, un: 'gramas', kcal: 200, p: 30,   c: 0,    g: 8   },
  { nome: 'Alcatra grelhada',             categoria: 'Proteína animal', qb: 100, un: 'gramas', kcal: 215, p: 31,   c: 0,    g: 9   },
  { nome: 'Filé mignon grelhado',         categoria: 'Proteína animal', qb: 100, un: 'gramas', kcal: 220, p: 32,   c: 0,    g: 9   },
  { nome: 'Tilápia grelhada',             categoria: 'Proteína animal', qb: 100, un: 'gramas', kcal: 128, p: 26,   c: 0,    g: 2.7 },
  { nome: 'Salmão grelhado',              categoria: 'Proteína animal', qb: 100, un: 'gramas', kcal: 208, p: 22,   c: 0,    g: 13  },
  { nome: 'Atum em água (lata)',          categoria: 'Proteína animal', qb: 100, un: 'gramas', kcal: 116, p: 26,   c: 0,    g: 1   },
  { nome: 'Sardinha em água',             categoria: 'Proteína animal', qb: 100, un: 'gramas', kcal: 130, p: 22,   c: 0,    g: 4   },
  { nome: 'Camarão cozido',               categoria: 'Proteína animal', qb: 100, un: 'gramas', kcal: 99,  p: 24,   c: 0.2,  g: 0.3 },
  { nome: 'Ovo inteiro',                  categoria: 'Proteína animal', qb: 1,   un: 'unidade', kcal: 70, p: 6,    c: 0.4,  g: 5   },
  { nome: 'Clara de ovo',                 categoria: 'Proteína animal', qb: 1,   un: 'unidade', kcal: 17, p: 3.6,  c: 0.2,  g: 0.06 },

  // ===== LATICÍNIOS =====
  { nome: 'Queijo cottage',               categoria: 'Laticínio', qb: 100, un: 'gramas', kcal: 98,  p: 11,  c: 3.4, g: 4.3 },
  { nome: 'Iogurte natural desnatado',    categoria: 'Laticínio', qb: 100, un: 'gramas', kcal: 56,  p: 5.8, c: 8,   g: 0.2 },
  { nome: 'Iogurte grego natural',        categoria: 'Laticínio', qb: 100, un: 'gramas', kcal: 97,  p: 9,   c: 4,   g: 5   },
  { nome: 'Leite desnatado',              categoria: 'Laticínio', qb: 100, un: 'ml',     kcal: 35,  p: 3.4, c: 5,   g: 0.1 },
  { nome: 'Leite integral',               categoria: 'Laticínio', qb: 100, un: 'ml',     kcal: 61,  p: 3.2, c: 4.8, g: 3.3 },
  { nome: 'Queijo minas frescal',         categoria: 'Laticínio', qb: 100, un: 'gramas', kcal: 264, p: 17,  c: 3,   g: 20  },
  { nome: 'Ricota',                       categoria: 'Laticínio', qb: 100, un: 'gramas', kcal: 174, p: 11,  c: 3,   g: 13  },

  // ===== CARBOIDRATOS =====
  { nome: 'Arroz branco cozido',          categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 128, p: 2.5, c: 28,  g: 0.2 },
  { nome: 'Arroz integral cozido',        categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 124, p: 2.6, c: 26,  g: 1   },
  { nome: 'Batata doce cozida',           categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 86,  p: 1.6, c: 20,  g: 0.1 },
  { nome: 'Batata inglesa cozida',        categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 87,  p: 1.9, c: 20,  g: 0.1 },
  { nome: 'Mandioca cozida',              categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 125, p: 0.6, c: 30,  g: 0.3 },
  { nome: 'Inhame cozido',                categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 97,  p: 2.1, c: 23,  g: 0.2 },
  { nome: 'Mandioquinha cozida',          categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 80,  p: 1.5, c: 18,  g: 0.2 },
  { nome: 'Aveia em flocos',              categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 389, p: 17,  c: 66,  g: 7   },
  { nome: 'Pão integral',                 categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 253, p: 9,   c: 43,  g: 4   },
  { nome: 'Pão francês',                  categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 300, p: 8,   c: 58,  g: 3   },
  { nome: 'Macarrão integral cozido',     categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 124, p: 5,   c: 25,  g: 0.7 },
  { nome: 'Tapioca',                      categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 240, p: 0.4, c: 60,  g: 0.1 },
  { nome: 'Cuscuz de milho cozido',       categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 113, p: 2.5, c: 23,  g: 0.7 },
  { nome: 'Quinoa cozida',                categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 120, p: 4.4, c: 21,  g: 1.9 },
  { nome: 'Granola sem açúcar',           categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 471, p: 10,  c: 64,  g: 18  },
  { nome: 'Mel',                          categoria: 'Carboidrato', qb: 100, un: 'gramas', kcal: 304, p: 0.3, c: 82,  g: 0   },

  // ===== FRUTAS =====
  { nome: 'Banana prata',                 categoria: 'Fruta', qb: 100, un: 'gramas', kcal: 89, p: 1.1, c: 23, g: 0.3 },
  { nome: 'Maçã',                         categoria: 'Fruta', qb: 100, un: 'gramas', kcal: 56, p: 0.3, c: 15, g: 0.2 },
  { nome: 'Mamão papaya',                 categoria: 'Fruta', qb: 100, un: 'gramas', kcal: 40, p: 0.5, c: 10, g: 0.1 },
  { nome: 'Morango',                      categoria: 'Fruta', qb: 100, un: 'gramas', kcal: 30, p: 0.9, c: 7,  g: 0.3 },
  { nome: 'Abacaxi',                      categoria: 'Fruta', qb: 100, un: 'gramas', kcal: 48, p: 0.9, c: 13, g: 0.1 },
  { nome: 'Manga',                        categoria: 'Fruta', qb: 100, un: 'gramas', kcal: 64, p: 0.4, c: 17, g: 0.2 },
  { nome: 'Melancia',                     categoria: 'Fruta', qb: 100, un: 'gramas', kcal: 33, p: 0.9, c: 8,  g: 0.2 },
  { nome: 'Uva',                          categoria: 'Fruta', qb: 100, un: 'gramas', kcal: 53, p: 0.7, c: 14, g: 0.2 },
  { nome: 'Pera',                         categoria: 'Fruta', qb: 100, un: 'gramas', kcal: 53, p: 0.7, c: 14, g: 0.3 },
  { nome: 'Laranja',                      categoria: 'Fruta', qb: 100, un: 'gramas', kcal: 37, p: 1,   c: 9,  g: 0.1 },
  { nome: 'Kiwi',                         categoria: 'Fruta', qb: 100, un: 'gramas', kcal: 61, p: 1.1, c: 15, g: 0.5 },

  // ===== GORDURAS BOAS =====
  { nome: 'Abacate',                      categoria: 'Gordura boa', qb: 100, un: 'gramas', kcal: 160, p: 2,   c: 9,   g: 15  },
  { nome: 'Azeite de oliva extra virgem', categoria: 'Gordura boa', qb: 100, un: 'ml',     kcal: 884, p: 0,   c: 0,   g: 100 },
  { nome: 'Óleo de coco',                 categoria: 'Gordura boa', qb: 100, un: 'ml',     kcal: 884, p: 0,   c: 0,   g: 100 },
  { nome: 'Manteiga ghee',                categoria: 'Gordura boa', qb: 100, un: 'gramas', kcal: 900, p: 0,   c: 0,   g: 100 },
  { nome: 'Pasta de amendoim integral',   categoria: 'Gordura boa', qb: 100, un: 'gramas', kcal: 582, p: 26,  c: 21,  g: 49  },
  { nome: 'Castanha do Pará',             categoria: 'Gordura boa', qb: 100, un: 'gramas', kcal: 656, p: 14,  c: 12,  g: 66  },
  { nome: 'Castanha de caju',             categoria: 'Gordura boa', qb: 100, un: 'gramas', kcal: 553, p: 18,  c: 30,  g: 44  },
  { nome: 'Amêndoa',                      categoria: 'Gordura boa', qb: 100, un: 'gramas', kcal: 581, p: 21,  c: 22,  g: 50  },
  { nome: 'Nozes',                        categoria: 'Gordura boa', qb: 100, un: 'gramas', kcal: 654, p: 15,  c: 14,  g: 65  },
  { nome: 'Coco ralado seco',             categoria: 'Gordura boa', qb: 100, un: 'gramas', kcal: 660, p: 7,   c: 24,  g: 60  },
  { nome: 'Linhaça (semente)',            categoria: 'Gordura boa', qb: 100, un: 'gramas', kcal: 534, p: 18,  c: 29,  g: 42  },
  { nome: 'Chia (semente)',               categoria: 'Gordura boa', qb: 100, un: 'gramas', kcal: 486, p: 17,  c: 42,  g: 31  },

  // ===== VEGETAIS / LEGUMES =====
  { nome: 'Brócolis cozido',              categoria: 'Vegetal', qb: 100, un: 'gramas', kcal: 25, p: 2.1, c: 4,   g: 0.3 },
  { nome: 'Couve refogada',               categoria: 'Vegetal', qb: 100, un: 'gramas', kcal: 90, p: 3,   c: 4,   g: 7   },
  { nome: 'Espinafre cozido',             categoria: 'Vegetal', qb: 100, un: 'gramas', kcal: 23, p: 2.9, c: 3.6, g: 0.4 },
  { nome: 'Alface',                       categoria: 'Vegetal', qb: 100, un: 'gramas', kcal: 11, p: 1.4, c: 1.7, g: 0.2 },
  { nome: 'Tomate',                       categoria: 'Vegetal', qb: 100, un: 'gramas', kcal: 15, p: 1.1, c: 3.1, g: 0.2 },
  { nome: 'Pepino',                       categoria: 'Vegetal', qb: 100, un: 'gramas', kcal: 10, p: 0.9, c: 2,   g: 0.1 },
  { nome: 'Cenoura crua',                 categoria: 'Vegetal', qb: 100, un: 'gramas', kcal: 34, p: 1.3, c: 7.7, g: 0.2 },
  { nome: 'Abobrinha cozida',             categoria: 'Vegetal', qb: 100, un: 'gramas', kcal: 15, p: 1,   c: 2.9, g: 0.4 },
  { nome: 'Vagem cozida',                 categoria: 'Vegetal', qb: 100, un: 'gramas', kcal: 23, p: 1.6, c: 4.8, g: 0.2 },
  { nome: 'Beterraba cozida',             categoria: 'Vegetal', qb: 100, un: 'gramas', kcal: 32, p: 1.3, c: 7,   g: 0.1 },

  // ===== LEGUMINOSAS / PROTEÍNA VEGETAL =====
  { nome: 'Feijão preto cozido',          categoria: 'Proteína vegetal', qb: 100, un: 'gramas', kcal: 77,  p: 4.5, c: 14,   g: 0.5 },
  { nome: 'Feijão carioca cozido',        categoria: 'Proteína vegetal', qb: 100, un: 'gramas', kcal: 76,  p: 4.8, c: 13.6, g: 0.5 },
  { nome: 'Lentilha cozida',              categoria: 'Proteína vegetal', qb: 100, un: 'gramas', kcal: 93,  p: 6.3, c: 16.3, g: 0.5 },
  { nome: 'Grão de bico cozido',          categoria: 'Proteína vegetal', qb: 100, un: 'gramas', kcal: 121, p: 7.1, c: 21,   g: 2   },
  { nome: 'Tofu firme',                   categoria: 'Proteína vegetal', qb: 100, un: 'gramas', kcal: 144, p: 17,  c: 2.8,  g: 8.7 },
  { nome: 'Edamame cozido',               categoria: 'Proteína vegetal', qb: 100, un: 'gramas', kcal: 122, p: 11,  c: 10,   g: 5   },

  // ===== SUPLEMENTOS (por scoop padrão) =====
  { nome: 'Whey protein concentrado',     categoria: 'Suplemento', qb: 1, un: 'scoop', kcal: 120, p: 24, c: 3,    g: 1.5 },
  { nome: 'Whey protein isolado',         categoria: 'Suplemento', qb: 1, un: 'scoop', kcal: 110, p: 27, c: 1,    g: 0.5 },
  { nome: 'Albumina',                     categoria: 'Suplemento', qb: 1, un: 'scoop', kcal: 56,  p: 12, c: 1,    g: 0.2 },
  { nome: 'Caseína',                      categoria: 'Suplemento', qb: 1, un: 'scoop', kcal: 120, p: 24, c: 3,    g: 1   },
  { nome: 'Creatina monohidratada',       categoria: 'Suplemento', qb: 1, un: 'scoop', kcal: 0,   p: 0,  c: 0,    g: 0   },
  { nome: 'Maltodextrina',                categoria: 'Suplemento', qb: 1, un: 'scoop', kcal: 114, p: 0,  c: 28.5, g: 0   },
  { nome: 'Dextrose',                     categoria: 'Suplemento', qb: 1, un: 'scoop', kcal: 116, p: 0,  c: 29,   g: 0   },
  { nome: 'BCAA em pó',                   categoria: 'Suplemento', qb: 1, un: 'scoop', kcal: 20,  p: 5,  c: 0,    g: 0   },
  { nome: 'Hipercalórico',                categoria: 'Suplemento', qb: 1, un: 'scoop', kcal: 195, p: 12, c: 35,   g: 1   },
];

async function seedAlimentos() {
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [BOOT_LOCK_KEY]);
    locked = true;

    const { rows } = await client.query(`SELECT COUNT(*)::int AS total FROM alimentos`);
    if (rows[0].total > 0) {
      logger.info({ existentes: rows[0].total }, 'seedAlimentos: tabela já populada, pulando');
      return;
    }

    await client.query('BEGIN');
    for (const a of ALIMENTOS_BASE) {
      await client.query(
        `INSERT INTO alimentos
           (nome, categoria, quantidade_base, unidade, calorias, proteinas, carboidratos, gorduras)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [a.nome, a.categoria, a.qb, a.un, a.kcal, a.p, a.c, a.g]
      );
    }
    await client.query('COMMIT');
    logger.info({ inseridos: ALIMENTOS_BASE.length }, 'seedAlimentos: biblioteca base inserida');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    logger.error({ err }, 'seedAlimentos: falha ao inserir biblioteca base');
    throw err;
  } finally {
    if (locked) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [BOOT_LOCK_KEY]);
      } catch (err) {
        logger.error({ err }, 'seedAlimentos: falha ao liberar advisory lock');
      }
    }
    client.release();
  }
}

module.exports = seedAlimentos;
