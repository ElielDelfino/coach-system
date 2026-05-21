import { useMemo, useState } from 'react';

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function intensidade(dia) {
  const score = (dia.treinos_concluidos || 0) * 3 + (dia.refeicoes_feitas || 0);
  if (score === 0) return 0;
  if (score <= 2) return 1;
  if (score <= 4) return 2;
  if (score <= 7) return 3;
  return 4;
}

const COR_INTENSIDADE = [
  'bg-zinc-900 border border-zinc-800',
  'bg-brand/15 border border-brand/10',
  'bg-brand/35 border border-brand/20',
  'bg-brand/65 border border-brand/30',
  'bg-brand border border-brand',
];

export default function Heatmap({ atividade = [] }) {
  const [hover, setHover] = useState(null);

  const { grid, mesLabels } = useMemo(() => {
    if (!atividade.length) return { grid: [], mesLabels: [] };
    const inicio = new Date(atividade[0].data + 'T00:00:00');
    const offsetDiaSemana = inicio.getDay();

    const total = atividade.length + offsetDiaSemana;
    const semanas = Math.ceil(total / 7);
    const matriz = Array.from({ length: 7 }, () => new Array(semanas).fill(null));

    atividade.forEach((dia, idx) => {
      const pos = idx + offsetDiaSemana;
      const semana = Math.floor(pos / 7);
      const linha = pos % 7;
      matriz[linha][semana] = dia;
    });

    const labels = [];
    let mesAnterior = -1;
    for (let s = 0; s < semanas; s++) {
      for (let l = 0; l < 7; l++) {
        const dia = matriz[l][s];
        if (dia) {
          const m = new Date(dia.data + 'T00:00:00').getMonth();
          if (m !== mesAnterior) {
            labels.push({ semana: s, label: MESES[m] });
            mesAnterior = m;
          }
          break;
        }
      }
    }

    return { grid: matriz, mesLabels: labels };
  }, [atividade]);

  if (!atividade.length) {
    return (
      <div className="text-zinc-500 text-sm text-center py-8">
        Sem atividade registrada ainda.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex gap-1.5 mb-1.5 pl-5 text-[10px] text-zinc-600 uppercase tracking-wider relative h-3">
        {mesLabels.map((m) => (
          <span key={`${m.label}-${m.semana}`} className="absolute" style={{ left: `${m.semana * 14 + 20}px` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <div className="flex flex-col gap-[3px] text-[9px] text-zinc-600 pt-[2px] pr-1">
          {DIAS.map((d, i) => (
            <span key={i} className="h-[10px] leading-[10px] tabular-nums">
              {i % 2 === 1 ? d : ''}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px] overflow-x-auto pb-1 -mx-1 px-1">
          {grid[0]?.map((_, semanaIdx) => (
            <div key={semanaIdx} className="flex flex-col gap-[3px]">
              {grid.map((linha, diaIdx) => {
                const dia = linha[semanaIdx];
                if (!dia) {
                  return <div key={diaIdx} className="w-[10px] h-[10px] rounded-sm bg-transparent" />;
                }
                const nivel = intensidade(dia);
                return (
                  <button
                    key={diaIdx}
                    type="button"
                    onMouseEnter={() => setHover(dia)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setHover(dia)}
                    className={`w-[10px] h-[10px] rounded-sm transition-colors ${COR_INTENSIDADE[nivel]}`}
                    aria-label={`${dia.data}: ${dia.treinos_concluidos} treino(s), ${dia.refeicoes_feitas} refeição(ões)`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-between mt-3 text-[10px] text-zinc-500">
        <span>Menos</span>
        <div className="flex gap-1">
          {COR_INTENSIDADE.map((cor, i) => (
            <div key={i} className={`w-[10px] h-[10px] rounded-sm ${cor}`} />
          ))}
        </div>
        <span>Mais</span>
      </div>

      {/* Tooltip de hover/tap */}
      {hover && (
        <div className="mt-3 px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs">
          <p className="text-white font-bold tabular-nums">
            {new Date(hover.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </p>
          <p className="text-zinc-400 mt-0.5">
            {hover.treinos_concluidos} treino{hover.treinos_concluidos === 1 ? '' : 's'} ·{' '}
            {hover.refeicoes_feitas} refeição{hover.refeicoes_feitas === 1 ? '' : 'ões'}
          </p>
        </div>
      )}
    </div>
  );
}
