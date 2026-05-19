const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS existe
    `);

    if (!rows[0].existe) {
      const sql = fs.readFileSync(
        path.join(__dirname, '../../docs/schema.sql'),
        'utf-8'
      );
      await client.query(sql);
      console.log('[migrate] Schema aplicado com sucesso.');
    } else {
      // Migrações idempotentes — aplica sempre
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nome TEXT`);
      await client.query(`
        ALTER TABLE alunos
          ADD COLUMN IF NOT EXISTS peso_atual_kg      NUMERIC(5,2),
          ADD COLUMN IF NOT EXISTS altura_cm          NUMERIC(5,2),
          ADD COLUMN IF NOT EXISTS percentual_gordura NUMERIC(5,2),
          ADD COLUMN IF NOT EXISTS peso_magro_kg      NUMERIC(5,2),
          ADD COLUMN IF NOT EXISTS peso_gordo_kg      NUMERIC(5,2)
      `);

      // M003: campos de fatura e tolerância em alunos
      await client.query(`
        ALTER TABLE alunos
          ADD COLUMN IF NOT EXISTS dias_tolerancia    INT NOT NULL DEFAULT 7,
          ADD COLUMN IF NOT EXISTS periodicidade_dias INT NOT NULL DEFAULT 30
      `);

      // M004: tabela de faturas
      await client.query(`
        CREATE TABLE IF NOT EXISTS faturas (
          id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          aluno_id         UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
          valor            NUMERIC(10,2) NOT NULL CHECK (valor > 0),
          data_vencimento  DATE NOT NULL,
          data_baixa       DATE,
          metodo_baixa     TEXT CHECK (metodo_baixa IN ('dinheiro','pix','cartao_credito','cartao_debito','transferencia')),
          status           TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido')),
          observacoes      TEXT,
          registrado_por   UUID NOT NULL REFERENCES users(id),
          created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_faturas_aluno_id        ON faturas (aluno_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_faturas_status          ON faturas (status)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_faturas_data_vencimento ON faturas (data_vencimento DESC)`);

      // M005: campos de desconto em faturas
      await client.query(`
        ALTER TABLE faturas
          ADD COLUMN IF NOT EXISTS desconto_tipo  TEXT CHECK (desconto_tipo IN ('valor','percentual')),
          ADD COLUMN IF NOT EXISTS desconto_valor NUMERIC(10,2) CHECK (desconto_valor >= 0)
      `);

      // M008: rastreio de quem enviou a foto
      await client.query(`
        ALTER TABLE aluno_fotos
          ADD COLUMN IF NOT EXISTS enviada_por UUID REFERENCES users(id)
      `);

      // M009: colunas faltantes em aluno_medidas
      await client.query(`
        ALTER TABLE aluno_medidas
          ADD COLUMN IF NOT EXISTS abdomen_cm          NUMERIC(5,1),
          ADD COLUMN IF NOT EXISTS antebraco_dir_cm    NUMERIC(5,1),
          ADD COLUMN IF NOT EXISTS antebraco_esq_cm    NUMERIC(5,1),
          ADD COLUMN IF NOT EXISTS panturrilha_dir_cm  NUMERIC(5,1),
          ADD COLUMN IF NOT EXISTS panturrilha_esq_cm  NUMERIC(5,1)
      `);

      // M006: s3_key em aluno_fotos (enviada_por já criada em M008)
      await client.query(`
        ALTER TABLE aluno_fotos
          ADD COLUMN IF NOT EXISTS s3_key TEXT
      `);

      // M007: s3_keys em exercicios e alimentos
      await client.query(`
        ALTER TABLE exercicios
          ADD COLUMN IF NOT EXISTS thumbnail_s3_key TEXT,
          ADD COLUMN IF NOT EXISTS video_s3_key     TEXT
      `);
      await client.query(`
        ALTER TABLE alimentos
          ADD COLUMN IF NOT EXISTS foto_s3_key TEXT
      `);

      // M010: suporte a YouTube em exercicios
      await client.query(`
        ALTER TABLE exercicios
          ADD COLUMN IF NOT EXISTS video_youtube_url TEXT
      `);
      await client.query(`
        ALTER TABLE exercicios
          ADD COLUMN IF NOT EXISTS video_tipo TEXT
            CHECK (video_tipo IN ('s3', 'youtube'))
      `);

      console.log('[migrate] Migrações incrementais aplicadas.');
    }

    // Trigger de updated_at para faturas (idempotente)
    await client.query(`
      CREATE OR REPLACE TRIGGER trg_faturas_updated_at
      BEFORE UPDATE ON faturas
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()
    `);

    // Atualiza status de faturas vencidas a cada boot
    await client.query(`
      UPDATE faturas
      SET status = 'vencido'
      WHERE status = 'pendente'
      AND data_vencimento < CURRENT_DATE
    `);
  } finally {
    client.release();
  }
}

module.exports = migrate;
