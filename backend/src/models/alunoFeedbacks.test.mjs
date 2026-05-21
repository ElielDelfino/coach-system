import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pool = require('../config/db');
const model = require('./alunoFeedbacks');

describe('models/alunoFeedbacks', () => {
  let spy;
  beforeEach(() => { spy = vi.spyOn(pool, 'query'); });
  afterEach(() => { spy.mockRestore(); });

  describe('upsertFeedback', () => {
    it('insere ou atualiza e retorna a linha completa', async () => {
      spy.mockResolvedValueOnce({
        rows: [{
          id: 'fb1',
          aluno_id: 'a1',
          semana_inicio: '2026-05-18',
          texto: 'Semana boa',
          peso_kg: 78.5,
          humor: 4,
          lido_pelo_coach: false,
        }],
      });
      const out = await model.upsertFeedback('a1', '2026-05-18', {
        texto: 'Semana boa', peso_kg: 78.5, humor: 4,
      });
      expect(out.id).toBe('fb1');
      const [sql, params] = spy.mock.calls[0];
      expect(sql).toContain('INSERT INTO aluno_feedbacks');
      expect(sql).toContain('ON CONFLICT (aluno_id, semana_inicio)');
      expect(sql).toContain('DO UPDATE');
      expect(sql).toContain('lido_pelo_coach    = false');
      expect(params[0]).toBe('a1');
      expect(params[1]).toBe('2026-05-18');
      expect(params[2]).toBe('Semana boa');
      expect(params[3]).toBe(78.5);
      expect(params[6]).toBe(4);
    });

    it('preenche nulls para campos opcionais ausentes', async () => {
      spy.mockResolvedValueOnce({ rows: [{ id: 'fb2' }] });
      await model.upsertFeedback('a1', '2026-05-18', { texto: 'Curto' });
      const [, params] = spy.mock.calls[0];
      expect(params[3]).toBeNull();
      expect(params[4]).toBeNull();
      expect(params[5]).toBeNull();
      expect(params[6]).toBeNull();
    });
  });

  describe('listarFeedbacksAluno', () => {
    it('ordena por semana_inicio DESC com LIMIT', async () => {
      spy.mockResolvedValueOnce({ rows: [{ id: 'fb1' }, { id: 'fb2' }] });
      const out = await model.listarFeedbacksAluno('a1', 5);
      expect(out.length).toBe(2);
      const [sql, params] = spy.mock.calls[0];
      expect(sql).toContain('ORDER BY semana_inicio DESC');
      expect(sql).toContain('LIMIT $2');
      expect(params).toEqual(['a1', 5]);
    });
  });

  describe('marcarFeedbackLido', () => {
    it('seta lido_pelo_coach true e retorna a linha', async () => {
      spy.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'fb1', lido_pelo_coach: true, lido_em: '2026-05-21T10:00:00Z' }],
      });
      const out = await model.marcarFeedbackLido('fb1');
      expect(out.lido_pelo_coach).toBe(true);
      const [sql] = spy.mock.calls[0];
      expect(sql).toContain('SET lido_pelo_coach = true');
    });

    it('retorna null quando feedback não existe', async () => {
      spy.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const out = await model.marcarFeedbackLido('inexistente');
      expect(out).toBeNull();
    });
  });

  describe('contarFeedbacksNaoLidos', () => {
    it('agrupa por aluno_id', async () => {
      spy.mockResolvedValueOnce({
        rows: [{ aluno_id: 'a1', total: 2 }, { aluno_id: 'a2', total: 5 }],
      });
      const out = await model.contarFeedbacksNaoLidos();
      expect(out).toEqual([{ aluno_id: 'a1', total: 2 }, { aluno_id: 'a2', total: 5 }]);
      const [sql] = spy.mock.calls[0];
      expect(sql).toContain('GROUP BY aluno_id');
      expect(sql).toContain('WHERE lido_pelo_coach = false');
    });
  });
});
