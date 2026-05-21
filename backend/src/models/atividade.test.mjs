import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pool = require('../config/db');
const model = require('./atividade');

function diaUTC(offsetDias = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDias);
  return d;
}

describe('models/atividade', () => {
  let spy;
  beforeEach(() => { spy = vi.spyOn(pool, 'query'); });
  afterEach(() => { spy.mockRestore(); });

  describe('calcularStreak', () => {
    it('retorna 0/0 quando aluno não tem atividade', async () => {
      spy.mockResolvedValueOnce({ rows: [] });
      const out = await model.calcularStreak('a1');
      expect(out).toEqual({ atual: 0, recorde: 0, ultimo_dia: null });
    });

    it('streak atual considera hoje', async () => {
      spy.mockResolvedValueOnce({
        rows: [
          { dia: diaUTC(0) },
          { dia: diaUTC(-1) },
          { dia: diaUTC(-2) },
        ],
      });
      const out = await model.calcularStreak('a1');
      expect(out.atual).toBe(3);
      expect(out.recorde).toBeGreaterThanOrEqual(3);
    });

    it('streak atual considera ontem (tolerância)', async () => {
      spy.mockResolvedValueOnce({
        rows: [
          { dia: diaUTC(-1) },
          { dia: diaUTC(-2) },
        ],
      });
      const out = await model.calcularStreak('a1');
      expect(out.atual).toBe(2);
    });

    it('streak zera quando último dia é mais antigo que ontem', async () => {
      spy.mockResolvedValueOnce({
        rows: [
          { dia: diaUTC(-5) },
          { dia: diaUTC(-6) },
        ],
      });
      const out = await model.calcularStreak('a1');
      expect(out.atual).toBe(0);
      expect(out.recorde).toBe(2);
    });

    it('recorde é a maior sequência histórica', async () => {
      spy.mockResolvedValueOnce({
        rows: [
          { dia: diaUTC(0) },
          { dia: diaUTC(-1) },
          { dia: diaUTC(-3) },
          { dia: diaUTC(-4) },
          { dia: diaUTC(-5) },
          { dia: diaUTC(-6) },
        ],
      });
      const out = await model.calcularStreak('a1');
      expect(out.atual).toBe(2);
      expect(out.recorde).toBe(4);
    });
  });

  describe('atividadeDiaria', () => {
    it('mapeia rows do banco para shape correto', async () => {
      spy.mockResolvedValueOnce({
        rows: [
          { data: '2026-05-19', treinos_concluidos: 1, refeicoes_feitas: 3 },
          { data: '2026-05-20', treinos_concluidos: 0, refeicoes_feitas: 5 },
        ],
      });
      const out = await model.atividadeDiaria('a1', 7);
      expect(out).toEqual([
        { data: '2026-05-19', treinos_concluidos: 1, refeicoes_feitas: 3 },
        { data: '2026-05-20', treinos_concluidos: 0, refeicoes_feitas: 5 },
      ]);
      const [, params] = spy.mock.calls[0];
      expect(params).toEqual(['a1', 7]);
    });
  });
});
