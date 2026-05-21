// Em CJS + vitest, a interceptação de vi.mock para require() é problemática.
// Solução: usar vi.spyOn no objeto pool real. Como Node cacheia o módulo via
// require, a instância de pool no teste e em alunos.js é a mesma — o spy
// substitui o método em ambos os contextos.
const pool = require('../config/db');
const { findById, update } = require('./alunos');

describe('findById', () => {
  let querySpy;

  beforeEach(() => {
    querySpy = vi.spyOn(pool, 'query');
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  it('retorna o aluno quando encontrado', async () => {
    const aluno = { id: 'uuid-1', nome: 'João', email: 'joao@test.com' };
    querySpy.mockResolvedValueOnce({ rows: [aluno] });

    const result = await findById('uuid-1');

    expect(result).toEqual(aluno);
    expect(querySpy).toHaveBeenCalledOnce();
    expect(querySpy.mock.calls[0][1]).toEqual(['uuid-1']);
  });

  it('retorna null quando aluno não existe', async () => {
    querySpy.mockResolvedValueOnce({ rows: [] });
    expect(await findById('uuid-inexistente')).toBeNull();
  });

  it('propaga erro do banco', async () => {
    querySpy.mockRejectedValueOnce(new Error('db error'));
    await expect(findById('uuid-1')).rejects.toThrow('db error');
  });
});

describe('update', () => {
  let querySpy;

  beforeEach(() => {
    querySpy = vi.spyOn(pool, 'query');
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  it('não executa query quando nenhum campo permitido é passado', async () => {
    await update('uuid-1', { campo_invalido: 'x' });
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('executa UPDATE com os campos permitidos', async () => {
    querySpy.mockResolvedValueOnce({ rowCount: 1 });
    const rowCount = await update('uuid-1', { nome: 'Maria', objetivo: 'emagrecimento' });

    expect(rowCount).toBe(1);
    expect(querySpy).toHaveBeenCalledOnce();
    const [sql, params] = querySpy.mock.calls[0];
    expect(sql).toContain('UPDATE alunos SET');
    expect(sql).toContain('nome = $2');
    expect(params[0]).toBe('uuid-1');
    expect(params).toContain('Maria');
    expect(params).toContain('emagrecimento');
  });

  it('ignora campos não permitidos e atualiza só os válidos', async () => {
    querySpy.mockResolvedValueOnce({ rowCount: 1 });
    await update('uuid-1', { nome: 'Ana', password: 'hack' });

    const [, params] = querySpy.mock.calls[0];
    expect(params).not.toContain('hack');
    expect(params).toContain('Ana');
  });
});
