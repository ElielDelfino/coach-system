import { describe, it, expect, vi } from 'vitest';

// Mock storage before importing _shared to avoid S3 initialization
vi.mock('../services/storage', () => ({
  extrairVideoIdYoutube: vi.fn((url) => {
    if (!url) return null;
    const m = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }),
  urlEmbedYoutube: vi.fn((id) => (id ? `https://www.youtube.com/embed/${id}` : null)),
}));

const {
  calcMacros,
  calcValorFinal,
  recalcFaturaStatus,
  toIsoDate,
  agruparFotosPorData,
  decorarExercicio,
} = await import('./_shared.js');

// ─── calcMacros ───────────────────────────────────────────────────────────────

describe('calcMacros', () => {
  const alimento = {
    quantidade_base: 100,
    calorias: 200,
    carboidratos: 30,
    proteinas: 25,
    gorduras: 5,
  };

  it('calcula macros proporcionalmente à quantidade', () => {
    const r = calcMacros(alimento, 50);
    expect(r.kcal_calculado).toBe(100);
    expect(r.carb_calculado).toBe(15);
    expect(r.prot_calculado).toBe(12.5);
    expect(r.gord_calculado).toBe(2.5);
  });

  it('retorna os valores base quando quantidade === quantidade_base', () => {
    const r = calcMacros(alimento, 100);
    expect(r.kcal_calculado).toBe(200);
    expect(r.prot_calculado).toBe(25);
  });

  it('arredonda para 1 casa decimal', () => {
    const a = { quantidade_base: 3, calorias: 10, carboidratos: 1, proteinas: 1, gorduras: 1 };
    const r = calcMacros(a, 1);
    expect(r.kcal_calculado).toBe(3.3);
  });
});

// ─── calcValorFinal ───────────────────────────────────────────────────────────

describe('calcValorFinal', () => {
  it('retorna o valor bruto quando não há desconto', () => {
    expect(calcValorFinal({ valor: 100 })).toBe(100);
  });

  it('aplica desconto em valor fixo', () => {
    expect(calcValorFinal({ valor: 200, desconto_tipo: 'valor', desconto_valor: 50 })).toBe(150);
  });

  it('aplica desconto percentual', () => {
    expect(calcValorFinal({ valor: 200, desconto_tipo: 'percentual', desconto_valor: 10 })).toBe(180);
  });

  it('nunca retorna valor negativo com desconto em valor', () => {
    expect(calcValorFinal({ valor: 50, desconto_tipo: 'valor', desconto_valor: 100 })).toBe(0);
  });

  it('nunca retorna valor negativo com desconto percentual > 100', () => {
    expect(calcValorFinal({ valor: 50, desconto_tipo: 'percentual', desconto_valor: 150 })).toBe(0);
  });

  it('ignora desconto quando desconto_valor é null', () => {
    expect(calcValorFinal({ valor: 100, desconto_tipo: 'valor', desconto_valor: null })).toBe(100);
  });
});

// ─── recalcFaturaStatus ───────────────────────────────────────────────────────

describe('recalcFaturaStatus', () => {
  it('mantém status pago sem verificar data', () => {
    const f = { valor: 100, status: 'pago', data_vencimento: '2000-01-01' };
    expect(recalcFaturaStatus(f).status).toBe('pago');
  });

  it('marca como vencido quando data_vencimento é passada', () => {
    const f = { valor: 100, status: 'pendente', data_vencimento: '2000-01-01' };
    expect(recalcFaturaStatus(f).status).toBe('vencido');
  });

  it('mantém pendente quando data_vencimento é futura', () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    const f = { valor: 100, status: 'pendente', data_vencimento: futuro.toISOString().slice(0, 10) };
    expect(recalcFaturaStatus(f).status).toBe('pendente');
  });

  it('inclui valor_final calculado no resultado', () => {
    const f = { valor: 200, status: 'pago', data_vencimento: '2025-01-01', desconto_tipo: 'percentual', desconto_valor: 50 };
    expect(recalcFaturaStatus(f).valor_final).toBe(100);
  });
});

// ─── toIsoDate ────────────────────────────────────────────────────────────────

describe('toIsoDate', () => {
  it('retorna null para valor falsy', () => {
    expect(toIsoDate(null)).toBeNull();
    expect(toIsoDate('')).toBeNull();
  });

  it('fatia string ISO para YYYY-MM-DD', () => {
    expect(toIsoDate('2025-05-20T15:30:00.000Z')).toBe('2025-05-20');
  });

  it('aceita string apenas com data', () => {
    expect(toIsoDate('2025-05-20')).toBe('2025-05-20');
  });

  it('converte objeto Date para YYYY-MM-DD', () => {
    expect(toIsoDate(new Date('2025-05-20T00:00:00Z'))).toBe('2025-05-20');
  });
});

// ─── agruparFotosPorData ──────────────────────────────────────────────────────

describe('agruparFotosPorData', () => {
  it('agrupa fotos pela data_foto', () => {
    const rows = [
      { id: '1', url: 'a.jpg', posicao: 'frente', data_foto: '2025-05-01' },
      { id: '2', url: 'b.jpg', posicao: 'costas', data_foto: '2025-05-01' },
      { id: '3', url: 'c.jpg', posicao: 'frente', data_foto: '2025-04-01' },
    ];
    const grupos = agruparFotosPorData(rows);
    expect(grupos).toHaveLength(2);
    expect(grupos[0].data).toBe('2025-05-01');
    expect(grupos[0].fotos).toHaveLength(2);
    expect(grupos[1].data).toBe('2025-04-01');
  });

  it('ordena da data mais recente para a mais antiga', () => {
    const rows = [
      { id: '1', url: 'a.jpg', posicao: 'frente', data_foto: '2024-01-01' },
      { id: '2', url: 'b.jpg', posicao: 'frente', data_foto: '2025-01-01' },
    ];
    const grupos = agruparFotosPorData(rows);
    expect(grupos[0].data).toBe('2025-01-01');
    expect(grupos[1].data).toBe('2024-01-01');
  });

  it('retorna array vazio para input vazio', () => {
    expect(agruparFotosPorData([])).toEqual([]);
  });
});

// ─── decorarExercicio ─────────────────────────────────────────────────────────

describe('decorarExercicio', () => {
  it('retorna null/undefined intacto', () => {
    expect(decorarExercicio(null)).toBeNull();
    expect(decorarExercicio(undefined)).toBeUndefined();
  });

  it('adiciona video_embed_url quando video_youtube_url é reconhecido', () => {
    const row = { id: '1', video_youtube_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' };
    const result = decorarExercicio(row);
    expect(result.video_embed_url).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('seta video_embed_url null quando url é null', () => {
    const row = { id: '1', video_youtube_url: null };
    expect(decorarExercicio(row).video_embed_url).toBeNull();
  });
});
