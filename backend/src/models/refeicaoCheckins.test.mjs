import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pool = require('../config/db');
const model = require('./refeicaoCheckins');

describe('models/refeicaoCheckins', () => {
  let spy;

  beforeEach(() => {
    spy = vi.spyOn(pool, 'query');
  });

  afterEach(() => {
    spy.mockRestore();
  });

  describe('registrarCheckinRefeicao', () => {
    it('insere e retorna a linha quando não há duplicata', async () => {
      spy.mockResolvedValueOnce({
        rows: [{ id: 'c1', aluno_id: 'a1', refeicao_id: 'r1', data: '2026-05-21', created_at: 'now' }],
      });
      const r = await model.registrarCheckinRefeicao('a1', 'r1', '2026-05-21');
      expect(r.id).toBe('c1');
      expect(spy).toHaveBeenCalledTimes(1);
      const [sql] = spy.mock.calls[0];
      expect(sql).toContain('INSERT INTO refeicao_checkins');
      expect(sql).toContain('ON CONFLICT');
    });

    it('busca linha existente quando ON CONFLICT DO NOTHING não retorna', async () => {
      spy
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 'existente', aluno_id: 'a1', refeicao_id: 'r1', data: '2026-05-21', created_at: 'now' }],
        });
      const r = await model.registrarCheckinRefeicao('a1', 'r1', '2026-05-21');
      expect(r.id).toBe('existente');
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('removerCheckinRefeicao', () => {
    it('retorna true quando deleta', async () => {
      spy.mockResolvedValueOnce({ rowCount: 1 });
      const ok = await model.removerCheckinRefeicao('a1', 'r1', '2026-05-21');
      expect(ok).toBe(true);
    });

    it('retorna false quando nada deleta', async () => {
      spy.mockResolvedValueOnce({ rowCount: 0 });
      const ok = await model.removerCheckinRefeicao('a1', 'r1', '2026-05-21');
      expect(ok).toBe(false);
    });
  });

  describe('listarCheckinsDia', () => {
    it('retorna apenas os refeicao_ids', async () => {
      spy.mockResolvedValueOnce({
        rows: [{ refeicao_id: 'r1' }, { refeicao_id: 'r2' }],
      });
      const ids = await model.listarCheckinsDia('a1', '2026-05-21');
      expect(ids).toEqual(['r1', 'r2']);
    });

    it('retorna array vazio quando não há check-ins', async () => {
      spy.mockResolvedValueOnce({ rows: [] });
      const ids = await model.listarCheckinsDia('a1', '2026-05-21');
      expect(ids).toEqual([]);
    });
  });

  describe('checkinsNaSemana', () => {
    it('retorna count', async () => {
      spy.mockResolvedValueOnce({ rows: [{ total: 8 }] });
      const total = await model.checkinsNaSemana('a1');
      expect(total).toBe(8);
    });
  });
});
