import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pool = require('../config/db');
const model = require('./treinoSessoes');

describe('models/treinoSessoes', () => {
  let spy;

  beforeEach(() => {
    spy = vi.spyOn(pool, 'query');
  });

  afterEach(() => {
    spy.mockRestore();
  });

  describe('iniciarSessao', () => {
    it('insere e retorna id + iniciado_em', async () => {
      spy.mockResolvedValueOnce({
        rows: [{ id: 'sess-uuid', iniciado_em: '2026-05-20T10:00:00Z' }],
      });
      const out = await model.iniciarSessao('aluno-uuid', 'treino-uuid');
      expect(out).toEqual({ id: 'sess-uuid', iniciado_em: '2026-05-20T10:00:00Z' });
      expect(spy).toHaveBeenCalledTimes(1);
      const [, params] = spy.mock.calls[0];
      expect(params).toEqual(['aluno-uuid', 'treino-uuid']);
    });
  });

  describe('concluirSessao', () => {
    it('retorna sessão atualizada quando aluno_id confere', async () => {
      spy.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'sess-uuid', treino_id: 'treino-uuid', duracao_seg: 1800 }],
      });
      const out = await model.concluirSessao('sess-uuid', 'aluno-uuid', {
        duracao_seg: 1800,
        exercicios: [{ id: 'ex1', peso: 50 }],
        observacao: 'tudo certo',
      });
      expect(out.id).toBe('sess-uuid');
      expect(out.duracao_seg).toBe(1800);

      const [sql, params] = spy.mock.calls[0];
      expect(sql).toContain('UPDATE treino_sessoes');
      expect(sql).toContain('WHERE id = $1 AND aluno_id = $2');
      expect(params[0]).toBe('sess-uuid');
      expect(params[1]).toBe('aluno-uuid');
      expect(params[2]).toBe(1800);
      expect(typeof params[3]).toBe('string');
    });

    it('retorna null quando aluno_id não confere (rowCount=0)', async () => {
      spy.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const out = await model.concluirSessao('sess-uuid', 'aluno-errado', {
        duracao_seg: 0,
        exercicios: [],
        observacao: null,
      });
      expect(out).toBeNull();
    });
  });

  describe('ultimaSessaoConcluida', () => {
    it('retorna null quando aluno não tem sessões', async () => {
      spy.mockResolvedValueOnce({ rows: [] });
      const out = await model.ultimaSessaoConcluida('aluno-uuid');
      expect(out).toBeNull();
    });

    it('retorna a sessão mais recente concluída', async () => {
      spy.mockResolvedValueOnce({
        rows: [{ id: 's1', treino_id: 't1', concluido_em: '2026-05-19T12:00:00Z' }],
      });
      const out = await model.ultimaSessaoConcluida('aluno-uuid');
      expect(out.treino_id).toBe('t1');
      const [sql] = spy.mock.calls[0];
      expect(sql).toContain('ORDER BY concluido_em DESC');
      expect(sql).toContain('LIMIT 1');
    });
  });

  describe('sessoesNaSemana', () => {
    it('retorna 0 quando não há linhas', async () => {
      spy.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      const out = await model.sessoesNaSemana('aluno-uuid');
      expect(out).toBe(0);
    });

    it('retorna count quando há sessões', async () => {
      spy.mockResolvedValueOnce({ rows: [{ total: 3 }] });
      const out = await model.sessoesNaSemana('aluno-uuid');
      expect(out).toBe(3);
    });
  });
});
