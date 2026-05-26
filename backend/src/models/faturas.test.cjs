const pool = require('../config/db');
const { createFatura, findFaturasByAluno, darBaixaFatura, deleteFatura } = require('./faturas');

// findFaturaById é chamado internamente por darBaixaFatura e deleteFatura.
// Precisamos de dois retornos consecutivos em cada cenário:
//  1. a query do findFaturaById (SELECT f.id, ...)
//  2. a query de mutação (UPDATE / DELETE)

describe('createFatura', () => {
  let querySpy;

  beforeEach(() => { querySpy = vi.spyOn(pool, 'query'); });
  afterEach(() => { querySpy.mockRestore(); });

  it('insere e retorna a fatura com valor_final calculado', async () => {
    const row = {
      id: 'fatura-uuid', valor: '150.00', data_vencimento: '2026-06-01',
      status: 'pendente', observacoes: null,
      desconto_tipo: null, desconto_valor: null, created_at: new Date(),
    };
    querySpy.mockResolvedValueOnce({ rows: [row] });

    const result = await createFatura('aluno-uuid', {
      valor: 150, data_vencimento: '2026-06-01',
    }, 'admin-uuid');

    expect(result.id).toBe('fatura-uuid');
    expect(result.valor_final).toBe(150);
    expect(querySpy).toHaveBeenCalledOnce();
    const [sql, params] = querySpy.mock.calls[0];
    expect(sql).toContain('INSERT INTO faturas');
    expect(params[0]).toBe('aluno-uuid');
    expect(params[4]).toBe('admin-uuid');
  });

  it('aplica desconto percentual no valor_final', async () => {
    const row = {
      id: 'fatura-uuid', valor: '200.00', data_vencimento: '2026-06-01',
      status: 'pendente', observacoes: null,
      desconto_tipo: 'percentual', desconto_valor: '10', created_at: new Date(),
    };
    querySpy.mockResolvedValueOnce({ rows: [row] });

    const result = await createFatura('aluno-uuid', {
      valor: 200, data_vencimento: '2026-06-01',
      desconto_tipo: 'percentual', desconto_valor: 10,
    }, 'admin-uuid');

    expect(result.valor_final).toBeCloseTo(180);
  });
});

describe('findFaturasByAluno', () => {
  let querySpy;

  beforeEach(() => { querySpy = vi.spyOn(pool, 'query'); });
  afterEach(() => { querySpy.mockRestore(); });

  it('retorna lista mapeada com valor_final', async () => {
    const rows = [
      { id: 'f1', valor: '100.00', status: 'pendente', data_vencimento: '2099-01-01',
        desconto_tipo: null, desconto_valor: null },
    ];
    querySpy.mockResolvedValueOnce({ rows });

    const result = await findFaturasByAluno('aluno-uuid');

    expect(result).toHaveLength(1);
    expect(result[0].valor_final).toBe(100);
    expect(querySpy.mock.calls[0][1]).toEqual(['aluno-uuid']);
  });

  it('retorna array vazio quando aluno não tem faturas', async () => {
    querySpy.mockResolvedValueOnce({ rows: [] });
    expect(await findFaturasByAluno('aluno-uuid')).toEqual([]);
  });
});

describe('darBaixaFatura', () => {
  let querySpy;

  beforeEach(() => { querySpy = vi.spyOn(pool, 'query'); });
  afterEach(() => { querySpy.mockRestore(); });

  it('retorna { notFound: true } quando fatura não existe', async () => {
    querySpy.mockResolvedValueOnce({ rows: [] });
    const result = await darBaixaFatura('id-inexistente', { data_baixa: '2026-05-26', metodo_baixa: 'pix' });
    expect(result).toEqual({ notFound: true });
  });

  it('retorna { jaPago: true } quando fatura já está paga', async () => {
    querySpy.mockResolvedValueOnce({ rows: [{ id: 'f1', status: 'pago', user_id: 'u1', aluno_id: 'a1' }] });
    const result = await darBaixaFatura('f1', { data_baixa: '2026-05-26', metodo_baixa: 'pix' });
    expect(result).toEqual({ jaPago: true });
  });

  it('executa UPDATE e retorna fatura com status pago', async () => {
    const faturaExistente = {
      id: 'f1', status: 'pendente', user_id: 'u1', aluno_id: 'a1',
      valor: '120.00', desconto_tipo: null, desconto_valor: null,
    };
    const faturaAtualizada = {
      id: 'f1', valor: '120.00', data_vencimento: '2026-05-01', data_baixa: '2026-05-26',
      metodo_baixa: 'pix', status: 'pago', observacoes: null,
      desconto_tipo: null, desconto_valor: null,
    };
    querySpy
      .mockResolvedValueOnce({ rows: [faturaExistente] })
      .mockResolvedValueOnce({ rows: [faturaAtualizada] });

    const result = await darBaixaFatura('f1', { data_baixa: '2026-05-26', metodo_baixa: 'pix' });

    expect(result.fatura.status).toBe('pago');
    expect(result.fatura.valor_final).toBe(120);
    expect(result.user_id).toBe('u1');
  });
});

describe('deleteFatura', () => {
  let querySpy;

  beforeEach(() => { querySpy = vi.spyOn(pool, 'query'); });
  afterEach(() => { querySpy.mockRestore(); });

  it('retorna { notFound: true } quando fatura não existe', async () => {
    querySpy.mockResolvedValueOnce({ rows: [] });
    const result = await deleteFatura('id-inexistente');
    expect(result).toEqual({ notFound: true });
  });

  it('executa DELETE e retorna { ok: true, user_id }', async () => {
    querySpy
      .mockResolvedValueOnce({ rows: [{ id: 'f1', status: 'pendente', user_id: 'u1', aluno_id: 'a1' }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const result = await deleteFatura('f1');

    expect(result).toEqual({ ok: true, user_id: 'u1' });
    expect(querySpy).toHaveBeenCalledTimes(2);
    const [sql] = querySpy.mock.calls[1];
    expect(sql).toContain('DELETE FROM faturas');
  });
});
