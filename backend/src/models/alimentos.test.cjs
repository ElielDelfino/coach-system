const pool = require('../config/db');
const { findAlimentos, createAlimento, updateAlimento } = require('./alimentos');

describe('findAlimentos', () => {
  let querySpy;

  beforeEach(() => { querySpy = vi.spyOn(pool, 'query'); });
  afterEach(() => { querySpy.mockRestore(); });

  it('retorna { data, total, limit, offset } com paginação', async () => {
    const rows = [{ id: 'a1', nome: 'Arroz', ativo: true }];
    // findAlimentos usa Promise.all — duas queries em paralelo
    querySpy
      .mockResolvedValueOnce({ rows })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    const result = await findAlimentos({ ativo: true, limit: 10, offset: 0 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
    expect(querySpy).toHaveBeenCalledTimes(2);
  });

  it('aplica filtro de busca na query SQL', async () => {
    querySpy
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    await findAlimentos({ busca: 'frango', ativo: true });

    const [sql, params] = querySpy.mock.calls[0];
    expect(sql).toContain('ILIKE');
    expect(params).toContain('%frango%');
  });

  it('aplica filtro de categoria', async () => {
    querySpy
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    await findAlimentos({ categoria: 'proteinas', ativo: true });

    const [, params] = querySpy.mock.calls[0];
    expect(params).toContain('%proteinas%');
  });
});

describe('createAlimento', () => {
  let querySpy;

  beforeEach(() => { querySpy = vi.spyOn(pool, 'query'); });
  afterEach(() => { querySpy.mockRestore(); });

  it('insere o alimento e retorna { id, nome, created_at }', async () => {
    const row = { id: 'a1', nome: 'Frango grelhado', created_at: new Date() };
    querySpy.mockResolvedValueOnce({ rows: [row] });

    const result = await createAlimento({
      nome: 'Frango grelhado', unidade: 'g',
      quantidade_base: 100, calorias: 165,
      proteinas: 31, carboidratos: 0, gorduras: 3.6,
    });

    expect(result.id).toBe('a1');
    expect(result.nome).toBe('Frango grelhado');
    const [sql, params] = querySpy.mock.calls[0];
    expect(sql).toContain('INSERT INTO alimentos');
    expect(params[0]).toBe('Frango grelhado');
  });

  it('usa quantidade_base 100 por padrão', async () => {
    querySpy.mockResolvedValueOnce({ rows: [{ id: 'a2', nome: 'Ovo', created_at: new Date() }] });

    await createAlimento({ nome: 'Ovo', unidade: 'un', calorias: 70, proteinas: 6, carboidratos: 0, gorduras: 5 });

    const [, params] = querySpy.mock.calls[0];
    expect(params[2]).toBe(100); // quantidade_base default
  });
});

describe('updateAlimento', () => {
  let querySpy;

  beforeEach(() => { querySpy = vi.spyOn(pool, 'query'); });
  afterEach(() => { querySpy.mockRestore(); });

  it('não executa query quando nenhum campo permitido é passado', async () => {
    const result = await updateAlimento('a1', { campo_proibido: 'x' });
    expect(result).toBe(0);
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('executa UPDATE com os campos permitidos', async () => {
    querySpy.mockResolvedValueOnce({ rowCount: 1 });

    const result = await updateAlimento('a1', { nome: 'Arroz integral', calorias: 130 });

    expect(result).toBe(1);
    const [sql, params] = querySpy.mock.calls[0];
    expect(sql).toContain('UPDATE alimentos SET');
    expect(params[0]).toBe('a1');
    expect(params).toContain('Arroz integral');
    expect(params).toContain(130);
  });

  it('ignora campos não permitidos', async () => {
    querySpy.mockResolvedValueOnce({ rowCount: 1 });

    await updateAlimento('a1', { nome: 'Aveia', ativo: true, senha: 'hack' });

    const [, params] = querySpy.mock.calls[0];
    expect(params).not.toContain('hack');
    expect(params).toContain('Aveia');
  });
});
