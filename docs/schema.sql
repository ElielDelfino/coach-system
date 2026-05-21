-- ============================================================
-- Coach System — Schema oficial do banco de dados (PostgreSQL)
-- Gerado em: 2026-05-15
-- Padrões: UUID via gen_random_uuid(), snake_case, soft delete
-- ============================================================

-- Extensão obrigatória para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS — Autenticação e perfil base
-- ============================================================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    senha_hash    TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'aluno')),
    ativo         BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);

COMMENT ON TABLE  users             IS 'Usuários do sistema (admins e alunos). Senha nunca armazenada em texto puro.';
COMMENT ON COLUMN users.senha_hash  IS 'Hash bcryptjs com salt 12.';
COMMENT ON COLUMN users.role        IS 'admin: acesso total; aluno: acesso restrito ao próprio perfil.';

-- ============================================================
-- 2. ALUNOS — Dados físicos e perfil do aluno
-- ============================================================
CREATE TABLE alunos (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    nome                 TEXT NOT NULL,
    telefone             TEXT,
    data_nascimento      DATE,
    sexo                 TEXT CHECK (sexo IN ('M', 'F', 'outro')),
    objetivo             TEXT,
    restricoes           TEXT,
    lesoes               TEXT,
    observacoes          TEXT,
    ativo                BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alunos_user_id ON alunos (user_id);
CREATE INDEX idx_alunos_ativo   ON alunos (ativo);

COMMENT ON TABLE alunos IS 'Dados de perfil do aluno. Vinculado 1:1 a um user com role=aluno.';

-- ============================================================
-- 3. ALUNO_MEDIDAS — Histórico de medidas e composição corporal
-- ============================================================
CREATE TABLE aluno_medidas (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id              UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    data_medicao          DATE NOT NULL DEFAULT CURRENT_DATE,
    peso_kg               NUMERIC(5,2),
    altura_cm             NUMERIC(5,2),
    percentual_gordura    NUMERIC(5,2),
    peso_magro_kg         NUMERIC(5,2),
    peso_gordo_kg         NUMERIC(5,2),
    -- Circunferências em cm
    cintura_cm            NUMERIC(5,2),
    quadril_cm            NUMERIC(5,2),
    torax_cm              NUMERIC(5,2),
    braco_dir_cm          NUMERIC(5,2),
    braco_esq_cm          NUMERIC(5,2),
    antebraco_dir_cm      NUMERIC(5,2),
    antebraco_esq_cm      NUMERIC(5,2),
    coxa_dir_cm           NUMERIC(5,2),
    coxa_esq_cm           NUMERIC(5,2),
    panturrilha_dir_cm    NUMERIC(5,2),
    panturrilha_esq_cm    NUMERIC(5,2),
    observacoes           TEXT,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aluno_medidas_aluno_id     ON aluno_medidas (aluno_id);
CREATE INDEX idx_aluno_medidas_data         ON aluno_medidas (data_medicao DESC);

COMMENT ON TABLE aluno_medidas IS 'Série histórica de avaliações físicas por aluno.';

-- ============================================================
-- 4. ALUNO_FOTOS — Fotos de progresso
-- ============================================================
CREATE TABLE aluno_fotos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id    UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    posicao     TEXT CHECK (posicao IN ('frente', 'costas', 'lado_dir', 'lado_esq')),
    data_foto   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aluno_fotos_aluno_id ON aluno_fotos (aluno_id);

COMMENT ON TABLE aluno_fotos IS 'Fotos de evolução do aluno. URL aponta para storage externo.';

-- ============================================================
-- 5. PAGAMENTOS — Controle financeiro dos alunos
-- ============================================================
CREATE TABLE pagamentos (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id         UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    registrado_por   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    valor            NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    data_pagamento   DATE NOT NULL,
    metodo           TEXT NOT NULL CHECK (metodo IN (
                         'dinheiro', 'pix', 'cartao_credito',
                         'cartao_debito', 'transferencia'
                     )),
    vencimento       DATE NOT NULL,
    observacoes      TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagamentos_aluno_id       ON pagamentos (aluno_id);
CREATE INDEX idx_pagamentos_vencimento     ON pagamentos (vencimento DESC);
CREATE INDEX idx_pagamentos_registrado_por ON pagamentos (registrado_por);

COMMENT ON TABLE  pagamentos            IS 'Registro de pagamentos. vencimento é calculado pelo back-end no momento do cadastro.';
COMMENT ON COLUMN pagamentos.vencimento IS 'Data de vencimento definida pelo admin no ato do registro (ex: data_pagamento + 30 dias).';

-- ============================================================
-- 6. EXERCICIOS — Biblioteca de exercícios
-- ============================================================
CREATE TABLE exercicios (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                      TEXT NOT NULL,
    grupo_muscular            TEXT NOT NULL,
    equipamento               TEXT,
    nivel                     TEXT CHECK (nivel IN ('iniciante', 'intermediario', 'avancado')),
    video_url                 TEXT,
    thumbnail_url             TEXT,
    observacoes_tecnicas      TEXT,
    execucao_correta          TEXT,
    execucao_errada           TEXT,
    descanso_padrao_seg       INT CHECK (descanso_padrao_seg >= 0),
    series_recomendadas       INT CHECK (series_recomendadas > 0),
    repeticoes_recomendadas   TEXT,    -- ex: '8-12', 'até a falha'
    cadencia                  TEXT,    -- ex: '2-1-2' (excêntrico-pausa-concêntrico)
    exercicio_substituto_id   UUID REFERENCES exercicios(id) ON DELETE SET NULL,
    ativo                     BOOLEAN NOT NULL DEFAULT true,
    created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercicios_grupo_muscular ON exercicios (grupo_muscular);
CREATE INDEX idx_exercicios_nivel          ON exercicios (nivel);
CREATE INDEX idx_exercicios_ativo          ON exercicios (ativo);

COMMENT ON TABLE  exercicios                       IS 'Biblioteca global de exercícios de musculação.';
COMMENT ON COLUMN exercicios.cadencia              IS 'Formato: excêntrico-pausa-concêntrico. Ex: 2-1-2.';
COMMENT ON COLUMN exercicios.exercicio_substituto_id IS 'Referência a um exercício alternativo para o mesmo grupo muscular.';

-- ============================================================
-- 7. ALIMENTOS — Tabela nutricional (base de alimentos)
-- ============================================================
CREATE TABLE alimentos (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome             TEXT NOT NULL,
    categoria        TEXT,
    quantidade_base  NUMERIC(7,2) NOT NULL DEFAULT 100,
    unidade          TEXT NOT NULL CHECK (unidade IN (
                         'gramas', 'ml', 'unidade',
                         'colher_sopa', 'colher_cha', 'scoop'
                     )),
    calorias         NUMERIC(7,2) NOT NULL CHECK (calorias >= 0),
    proteinas        NUMERIC(7,2) NOT NULL CHECK (proteinas >= 0),
    carboidratos     NUMERIC(7,2) NOT NULL CHECK (carboidratos >= 0),
    gorduras         NUMERIC(7,2) NOT NULL CHECK (gorduras >= 0),
    fibra            NUMERIC(7,2) CHECK (fibra >= 0),
    sodio            NUMERIC(7,2) CHECK (sodio >= 0),
    foto_url         TEXT,
    ativo            BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alimentos_nome      ON alimentos (nome);
CREATE INDEX idx_alimentos_categoria ON alimentos (categoria);
CREATE INDEX idx_alimentos_ativo     ON alimentos (ativo);

COMMENT ON TABLE  alimentos              IS 'Biblioteca de alimentos com macros por quantidade_base + unidade.';
COMMENT ON COLUMN alimentos.calorias     IS 'Kcal referentes a quantidade_base na unidade definida.';

-- ============================================================
-- 8. CARDIO — Biblioteca de atividades cardiorrespiratórias
-- ============================================================
CREATE TABLE cardio (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo                      TEXT NOT NULL,   -- ex: 'corrida', 'bike', 'elíptico', 'remo'
    intensidade               TEXT CHECK (intensidade IN ('leve', 'moderada', 'intensa', 'maxima')),
    duracao_min               INT CHECK (duracao_min > 0),
    gasto_calorico_estimado   NUMERIC(7,2) CHECK (gasto_calorico_estimado >= 0),
    inclinacao                NUMERIC(4,1),    -- % para esteira / graus para bike
    velocidade                NUMERIC(5,2),    -- km/h
    observacoes               TEXT,
    ativo                     BOOLEAN NOT NULL DEFAULT true,
    created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cardio_tipo      ON cardio (tipo);
CREATE INDEX idx_cardio_ativo     ON cardio (ativo);

COMMENT ON TABLE cardio IS 'Biblioteca de sessões de cardio pré-configuradas para uso em protocolos.';

-- ============================================================
-- 9. PROTOCOLOS — Plano completo vinculado a um aluno
-- ============================================================
CREATE TABLE protocolos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    nome            TEXT NOT NULL,
    objetivo        TEXT,
    fase            TEXT CHECK (fase IN ('cutting', 'bulking', 'manutencao', 'recomposicao')),
    data_inicio     DATE,
    data_fim        DATE,
    -- Flags que indicam quais módulos estão ativos neste protocolo
    modulo_alimentar        BOOLEAN NOT NULL DEFAULT false,
    modulo_treino           BOOLEAN NOT NULL DEFAULT false,
    modulo_cardio           BOOLEAN NOT NULL DEFAULT false,
    modulo_suplementacao    BOOLEAN NOT NULL DEFAULT false,
    observacoes     TEXT,
    ativo           BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_protocolo_datas CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

CREATE INDEX idx_protocolos_aluno_id ON protocolos (aluno_id);
CREATE INDEX idx_protocolos_ativo    ON protocolos (ativo);

COMMENT ON TABLE protocolos IS 'Protocolo completo de um aluno. Pode conter módulos de alimentação, treino, cardio e suplementação.';

-- ============================================================
-- 10. REFEICOES — Refeições de um protocolo alimentar
-- ============================================================
CREATE TABLE refeicoes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo_id     UUID NOT NULL REFERENCES protocolos(id) ON DELETE CASCADE,
    numero_refeicao  INT NOT NULL CHECK (numero_refeicao > 0),
    nome             TEXT NOT NULL,   -- ex: 'Café da manhã', 'Pré-treino'
    ordem            INT NOT NULL DEFAULT 0,
    horario_sugerido TEXT,            -- ex: '07:00', '13:30'
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (protocolo_id, numero_refeicao)
);

CREATE INDEX idx_refeicoes_protocolo_id ON refeicoes (protocolo_id);

COMMENT ON TABLE refeicoes IS 'Refeições do protocolo alimentar. Ordenadas por campo "ordem".';

-- ============================================================
-- 11. REFEICAO_ITENS — Alimentos que compõem cada refeição
-- ============================================================
CREATE TABLE refeicao_itens (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refeicao_id      UUID NOT NULL REFERENCES refeicoes(id) ON DELETE CASCADE,
    alimento_id      UUID NOT NULL REFERENCES alimentos(id) ON DELETE RESTRICT,
    quantidade_g     NUMERIC(7,2) NOT NULL CHECK (quantidade_g > 0),
    -- Macros calculados pelo back-end no momento do cadastro
    kcal_calculado   NUMERIC(7,2),
    carb_calculado   NUMERIC(7,2),
    prot_calculado   NUMERIC(7,2),
    gord_calculado   NUMERIC(7,2),
    ordem            INT NOT NULL DEFAULT 0,
    observacoes      TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refeicao_itens_refeicao_id  ON refeicao_itens (refeicao_id);
CREATE INDEX idx_refeicao_itens_alimento_id  ON refeicao_itens (alimento_id);

COMMENT ON TABLE  refeicao_itens             IS 'Itens alimentares de cada refeição. Macros são recalculados e persistidos.';
COMMENT ON COLUMN refeicao_itens.quantidade_g IS 'Quantidade em gramas (ou ml) do alimento nesta refeição.';

-- ============================================================
-- 12. REFEICAO_ITEM_SUBSTITUTOS — Alternativas para um item
-- ============================================================
CREATE TABLE refeicao_item_substitutos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refeicao_item_id  UUID NOT NULL REFERENCES refeicao_itens(id) ON DELETE CASCADE,
    alimento_id       UUID NOT NULL REFERENCES alimentos(id) ON DELETE RESTRICT,
    quantidade_g      NUMERIC(7,2) NOT NULL CHECK (quantidade_g > 0),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (refeicao_item_id, alimento_id)
);

CREATE INDEX idx_substitutos_item_id ON refeicao_item_substitutos (refeicao_item_id);

COMMENT ON TABLE refeicao_item_substitutos IS 'Substituições permitidas para um item de refeição (ex: frango ↔ atum).';

-- ============================================================
-- 13. TREINOS — Treinos de um protocolo
-- ============================================================
CREATE TABLE treinos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo_id  UUID NOT NULL REFERENCES protocolos(id) ON DELETE CASCADE,
    nome          TEXT NOT NULL,   -- ex: 'Treino A', 'Treino B - Costas'
    ordem         INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_treinos_protocolo_id ON treinos (protocolo_id);

COMMENT ON TABLE treinos IS 'Divisão de treinos dentro de um protocolo. Ex: Treino A, B, C.';

-- ============================================================
-- 14. TREINO_EXERCICIOS — Exercícios e cardios de um treino
-- ============================================================
CREATE TABLE treino_exercicios (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treino_id        UUID NOT NULL REFERENCES treinos(id) ON DELETE CASCADE,
    tipo             TEXT NOT NULL CHECK (tipo IN ('exercicio', 'cardio')),
    exercicio_id     UUID REFERENCES exercicios(id) ON DELETE RESTRICT,
    cardio_id        UUID REFERENCES cardio(id) ON DELETE RESTRICT,
    series           INT CHECK (series > 0),
    repeticoes       TEXT,       -- ex: '10', '8-12', 'até a falha'
    descanso_seg     INT CHECK (descanso_seg >= 0),
    observacao       TEXT,
    ordem            INT NOT NULL DEFAULT 0,
    -- Identifica grupo de superset/bi-set. NULL = exercício isolado
    grupo_superset   TEXT,       -- ex: 'A', 'B'
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    -- Garante que apenas um dos dois FKs está preenchido de acordo com o tipo
    CONSTRAINT chk_treino_exercicio_tipo CHECK (
        (tipo = 'exercicio' AND exercicio_id IS NOT NULL AND cardio_id IS NULL) OR
        (tipo = 'cardio'    AND cardio_id IS NOT NULL    AND exercicio_id IS NULL)
    )
);

CREATE INDEX idx_treino_exercicios_treino_id    ON treino_exercicios (treino_id);
CREATE INDEX idx_treino_exercicios_exercicio_id ON treino_exercicios (exercicio_id);
CREATE INDEX idx_treino_exercicios_cardio_id    ON treino_exercicios (cardio_id);

COMMENT ON TABLE  treino_exercicios              IS 'Lista de exercícios/cardios de um treino com parâmetros de execução.';
COMMENT ON COLUMN treino_exercicios.grupo_superset IS 'Agrupa itens em superset ou bi-set. NULL = sem agrupamento.';

-- ============================================================
-- 15. SUPLEMENTACAO — Suplementos de um protocolo
-- ============================================================
CREATE TABLE suplementacao (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo_id    UUID NOT NULL REFERENCES protocolos(id) ON DELETE CASCADE,
    nome_suplemento TEXT NOT NULL,
    dose            TEXT NOT NULL,   -- ex: '30g', '2 cápsulas'
    horario         TEXT,            -- ex: 'Pré-treino', '07:00'
    observacao      TEXT,
    ordem           INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suplementacao_protocolo_id ON suplementacao (protocolo_id);

COMMENT ON TABLE suplementacao IS 'Prescrição de suplementos dentro de um protocolo.';

-- ============================================================
-- Trigger helper: atualiza updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica o trigger em todas as tabelas com updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users', 'alunos', 'exercicios', 'alimentos',
        'cardio', 'protocolos', 'refeicoes', 'treinos', 'suplementacao'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();',
            t, t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- MIGRAÇÕES — aplicar em banco já existente (idempotentes)
-- ============================================================

-- M001 — 2026-05-15: nome do usuário na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS nome TEXT;

-- M002 — 2026-05-15: snapshot de composição corporal atual em alunos
--   (histórico completo permanece em aluno_medidas)
ALTER TABLE alunos
  ADD COLUMN IF NOT EXISTS peso_atual_kg      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS altura_cm          NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS percentual_gordura NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS peso_magro_kg      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS peso_gordo_kg      NUMERIC(5,2);

-- M003: adicionar campos de fatura e tolerância
ALTER TABLE alunos
  ADD COLUMN IF NOT EXISTS dias_tolerancia    INT NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS periodicidade_dias INT NOT NULL DEFAULT 30;

-- M004: nova tabela de faturas
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
);

CREATE INDEX IF NOT EXISTS idx_faturas_aluno_id        ON faturas (aluno_id);
CREATE INDEX IF NOT EXISTS idx_faturas_status          ON faturas (status);
CREATE INDEX IF NOT EXISTS idx_faturas_data_vencimento ON faturas (data_vencimento DESC);

-- M005: adicionar campos de desconto na tabela faturas
ALTER TABLE faturas
  ADD COLUMN IF NOT EXISTS desconto_tipo  TEXT CHECK (desconto_tipo IN ('valor','percentual')),
  ADD COLUMN IF NOT EXISTS desconto_valor NUMERIC(10,2) CHECK (desconto_valor >= 0);

-- M006: rastreio de upload de fotos do aluno (S3)
ALTER TABLE aluno_fotos
  ADD COLUMN IF NOT EXISTS s3_key TEXT;

-- M007: keys do S3 em exercicios e alimentos
ALTER TABLE exercicios
  ADD COLUMN IF NOT EXISTS thumbnail_s3_key TEXT,
  ADD COLUMN IF NOT EXISTS video_s3_key     TEXT;
ALTER TABLE alimentos
  ADD COLUMN IF NOT EXISTS foto_s3_key TEXT;

-- M008: rastreio de quem enviou a foto (já aplicada em migrate.js)
ALTER TABLE aluno_fotos
  ADD COLUMN IF NOT EXISTS enviada_por UUID REFERENCES users(id);

-- M009: colunas faltantes em aluno_medidas (já aplicada em migrate.js)
ALTER TABLE aluno_medidas
  ADD COLUMN IF NOT EXISTS abdomen_cm          NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS antebraco_dir_cm    NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS antebraco_esq_cm    NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS panturrilha_dir_cm  NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS panturrilha_esq_cm  NUMERIC(5,1);

-- M010: suporte a vídeos do YouTube em exercicios
ALTER TABLE exercicios
  ADD COLUMN IF NOT EXISTS video_youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS video_tipo TEXT
    CHECK (video_tipo IN ('s3', 'youtube'));

-- M014: histórico de sessões de treino executadas pelo aluno
CREATE TABLE IF NOT EXISTS treino_sessoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id      UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  treino_id     UUID NOT NULL REFERENCES treinos(id) ON DELETE CASCADE,
  iniciado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
  concluido_em  TIMESTAMP,
  duracao_seg   INT,
  exercicios    JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacao    TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_treino_sessoes_aluno_data ON treino_sessoes (aluno_id, concluido_em DESC);
CREATE INDEX IF NOT EXISTS idx_treino_sessoes_treino    ON treino_sessoes (treino_id);
