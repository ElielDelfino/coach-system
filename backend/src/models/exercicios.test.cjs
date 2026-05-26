const pool = require('../config/db');
const { findExercicios, createExercicio } = require('./exercicios');

// decorarExercicio adiciona video_embed_url; mockamos storage para isolar do S3
vi.mock('../services/storage', () => ({
  extrairVideoIdYoutube: vi.fn(() => null),
  urlEmbedYoutube: vi.fn(() => null),
  deleteS3Object: vi.fn(),
  uploadStream: vi.fn(),
}));

describe('findExercicios', () => {
  let querySpy;

  beforeEach(() => { querySpy = vi.spyOn(pool, 'query'); });
  afterEach(() => { querySpy.mockRestore(); });

  it('retorna { data, total, limit, offset } com paginação', async () => {
    const rows = [{ id: 'e1', nome: 'Supino reto', ativo: true, video_youtube_url: null }];
    querySpy
      .mockResolvedValueOnce({ rows })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    const result = await findExercicios({ ativo: true, limit: 10, offset: 0 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
    expect(querySpy).toHaveBeenCalledTimes(2);
  });

  it('aplica filtro de grupo_muscular', async () => {
    querySpy
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    await findExercicios({ grupo_muscular: 'peito', ativo: true });

    const [, params] = querySpy.mock.calls[0];
    expect(params).toContain('%peito%');
  });

  it('aplica filtro de nivel', async () => {
    querySpy
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    await findExercicios({ nivel: 'iniciante', ativo: true });

    const [, params] = querySpy.mock.calls[0];
    expect(params).toContain('iniciante');
  });

  it('aplica filtro de busca por nome', async () => {
    querySpy
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    await findExercicios({ busca: 'agachamento', ativo: true });

    const [, params] = querySpy.mock.calls[0];
    expect(params).toContain('%agachamento%');
  });

  it('decora exercícios com video_embed_url', async () => {
    const rows = [{ id: 'e1', nome: 'Agachamento', video_youtube_url: null }];
    querySpy
      .mockResolvedValueOnce({ rows })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    const result = await findExercicios({ ativo: true });

    expect(result.data[0]).toHaveProperty('video_embed_url');
  });
});

describe('createExercicio', () => {
  let querySpy;

  beforeEach(() => { querySpy = vi.spyOn(pool, 'query'); });
  afterEach(() => { querySpy.mockRestore(); });

  it('insere o exercício e retorna { id, nome, created_at }', async () => {
    const row = { id: 'e1', nome: 'Leg press', created_at: new Date() };
    querySpy.mockResolvedValueOnce({ rows: [row] });

    const result = await createExercicio({ nome: 'Leg press', grupo_muscular: 'quadriceps' });

    expect(result.id).toBe('e1');
    expect(result.nome).toBe('Leg press');
    const [sql, params] = querySpy.mock.calls[0];
    expect(sql).toContain('INSERT INTO exercicios');
    expect(params[0]).toBe('Leg press');
    expect(params[1]).toBe('quadriceps');
  });

  it('usa null para campos opcionais não fornecidos', async () => {
    querySpy.mockResolvedValueOnce({ rows: [{ id: 'e2', nome: 'Rosca', created_at: new Date() }] });

    await createExercicio({ nome: 'Rosca', grupo_muscular: 'biceps' });

    const [, params] = querySpy.mock.calls[0];
    // equipamento (params[2]) deve ser null quando não fornecido
    expect(params[2]).toBeNull();
  });

  it('propaga erro do banco', async () => {
    querySpy.mockRejectedValueOnce(new Error('db error'));
    await expect(createExercicio({ nome: 'X', grupo_muscular: 'Y' })).rejects.toThrow('db error');
  });
});
