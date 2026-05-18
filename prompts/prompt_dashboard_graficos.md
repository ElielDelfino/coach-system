Preciso adicionar gráficos de evolução corporal ao projeto Coach System.
Leia o CLAUDE.md e docs/ui-contract.md antes de começar.

Biblioteca de gráficos: recharts (já instalada no projeto).
NÃO instalar outras bibliotecas de gráfico.
NÃO reescrever páginas inteiras — fazer alterações cirúrgicas.

---

## PARTE 1 — Dashboard do Admin (Dashboard.jsx)

### Contexto
O Dashboard.jsx já existe com KPIs no topo e tabela de alunos.
Adicione uma seção de gráficos ABAIXO dos KPIs e ACIMA da tabela de alunos.

### 1.1 — Nova rota no backend

Adicione em routes/admin.js e adminController.js:

GET /api/admin/dashboard/evolucao
Auth: Bearer token | Role: admin

Lógica:
- Busca os últimos 30 dias de medições de TODOS os alunos
- Agrupa por data e calcula médias:
  - media_peso_kg
  - media_percentual_gordura
  - total_alunos_medidos (quantos alunos tinham medição naquela data)
- Ordenado por data ASC

Query SQL:
  SELECT
    DATE(data_medicao) as data,
    ROUND(AVG(peso_kg)::numeric, 1) as media_peso_kg,
    ROUND(AVG(percentual_gordura)::numeric, 1) as media_percentual_gordura,
    COUNT(DISTINCT aluno_id) as total_alunos_medidos
  FROM aluno_medidas
  WHERE data_medicao >= NOW() - INTERVAL '90 days'
  GROUP BY DATE(data_medicao)
  ORDER BY data ASC

Response 200:
  {
    "evolucao": [
      { "data": "2025-01-01", "media_peso_kg": 82.3, "media_percentual_gordura": 18.5, "total_alunos_medidos": 12 }
    ]
  }

GET /api/admin/dashboard/resumo
Auth: Bearer token | Role: admin

Response 200:
  {
    "total_alunos": 48,
    "ativos": 35,
    "inadimplentes": 7,
    "neutros": 6,
    "receita_mes": 4200.00,        ← soma de faturas pagas no mês atual
    "a_receber_mes": 1800.00,      ← soma de faturas pendentes com vencimento no mês atual
    "alunos_sem_medicao_30d": 15   ← alunos sem medição nos últimos 30 dias
  }

Atualize docs/api-contract.md com as duas rotas.

### 1.2 — Seção de gráficos no Dashboard.jsx

Adicione após os cards de KPI:

TÍTULO DA SEÇÃO:
  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
    Evolução média da base — últimos 90 dias
  </p>

GRÁFICO 1 — Peso médio da base (LineChart):
  - Eixo X: data (formato DD/MM)
  - Eixo Y: media_peso_kg
  - Linha: cor #f97316 (brand), strokeWidth 2
  - Dot: false (sem ponto em cada data)
  - Tooltip customizado com fundo bg-surface-card, borda border-surface-border
  - Grid: stroke="#1f1f1f" (surface-border)
  - Altura: 200px

GRÁFICO 2 — %BF médio da base (AreaChart):
  - Eixo X: data (formato DD/MM)
  - Eixo Y: media_percentual_gordura
  - Area: fill="#f97316" fillOpacity 0.1, stroke #f97316
  - Tooltip customizado igual ao gráfico 1
  - Grid: stroke="#1f1f1f"
  - Altura: 200px

Os dois gráficos lado a lado em grid de 2 colunas:
  <div className="grid grid-cols-2 gap-4 mb-6">

Se não tiver dados (evolucao.length === 0):
  Exibir placeholder: "Nenhuma medição registrada ainda."
  Estilo: text-zinc-600 text-sm text-center py-12 border border-dashed border-surface-border rounded-xl

CARD EXTRA — Alunos sem medição recente:
  Após os gráficos, card de alerta se alunos_sem_medicao_30d > 0:
  <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-xl p-4 flex items-center gap-3">
    <span className="text-yellow-400 text-lg">⚠️</span>
    <div>
      <p className="text-sm font-bold text-yellow-400">
        {alunos_sem_medicao_30d} alunos sem medição nos últimos 30 dias
      </p>
      <p className="text-xs text-zinc-500">
        Registre medições regularmente para acompanhar a evolução.
      </p>
    </div>
  </div>

---

## PARTE 2 — Dashboard do Aluno (Perfil.jsx + MeuProtocolo.jsx)

### Contexto
O Perfil.jsx já tem tab "Minhas Medidas" com tabela histórica.
Adicione gráficos no TOPO dessa tab, antes da tabela.

### 2.1 — Nova rota no backend

Adicione em routes/aluno.js e alunoController.js:

GET /api/aluno/evolucao
Auth: Bearer token | Role: aluno

Lógica:
- Busca TODAS as medições do aluno logado (req.user.id → aluno_id)
- Ordenado por data_medicao ASC

Query SQL:
  SELECT
    DATE(data_medicao) as data,
    peso_kg,
    percentual_gordura,
    peso_magro_kg,
    peso_gordo_kg,
    cintura_cm,
    quadril_cm,
    braco_dir_cm,
    braco_esq_cm,
    coxa_dir_cm,
    coxa_esq_cm
  FROM aluno_medidas
  WHERE aluno_id = (SELECT id FROM alunos WHERE user_id = $1)
  ORDER BY data_medicao ASC

Response 200:
  {
    "evolucao": [
      {
        "data": "2025-01-01",
        "peso_kg": 85.0,
        "percentual_gordura": 22.0,
        "peso_magro_kg": 66.3,
        "peso_gordo_kg": 18.7,
        "cintura_cm": 88.0,
        "quadril_cm": 102.0,
        "braco_dir_cm": 34.0,
        "braco_esq_cm": 33.5,
        "coxa_dir_cm": 58.0,
        "coxa_esq_cm": 57.5
      }
    ]
  }

Atualize docs/ui-contract.md com essa rota.

### 2.2 — Gráficos na tab Minhas Medidas (Perfil.jsx)

No topo da tab, antes da tabela histórica, adicione:

SELETOR DE MÉTRICA:
  Botões para escolher qual métrica visualizar:
  [ Peso ] [ %BF ] [ Medidas ]

  Estilo dos botões:
  - Ativo:   bg-brand text-white font-bold text-xs px-3 py-1 rounded
  - Inativo: bg-surface-elevated text-zinc-400 text-xs px-3 py-1 rounded hover:text-white

GRÁFICO PRINCIPAL (muda conforme seletor):

  Se "Peso" selecionado — ComposedChart:
    - Linha peso_kg: cor #f97316, strokeWidth 2
    - Linha peso_magro_kg: cor #22c55e (verde), strokeWidth 1.5, strokeDasharray "4 4"
    - Linha peso_gordo_kg: cor #f87171 (vermelho), strokeWidth 1.5, strokeDasharray "4 4"
    - Legenda: [ — Peso total ] [ -- Peso magro ] [ -- Peso gordo ]
    - Altura: 280px

  Se "%BF" selecionado — AreaChart:
    - Area percentual_gordura: fill="#f97316" fillOpacity 0.15, stroke #f97316
    - Referência: linha pontilhada no valor inicial (ponto de partida)
    - Tooltip mostra: data + %BF + variação desde o início (ex: "-2.3%")
    - Altura: 280px

  Se "Medidas" selecionado — LineChart com múltiplas linhas:
    - cintura_cm:    cor #f97316
    - quadril_cm:    cor #a78bfa (roxo)
    - braco_dir_cm:  cor #22c55e (verde)
    - coxa_dir_cm:   cor #60a5fa (azul)
    - Legenda com as cores correspondentes
    - Altura: 280px

TOOLTIP CUSTOMIZADO para todos os gráficos:
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs">
        <p className="text-zinc-400 mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }} className="font-bold">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

CARD DE PROGRESSO (abaixo do gráfico, antes da tabela):
  Se tiver pelo menos 2 medições, exibir comparativo primeira vs última:

  <div className="grid grid-cols-4 gap-3 my-4">
    {/* Peso */}
    <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Peso</p>
      <p className="text-xl font-black text-white">{ultima.peso_kg}kg</p>
      <p className={`text-xs font-bold ${diff < 0 ? 'text-green-400' : 'text-red-400'}`}>
        {diff > 0 ? '+' : ''}{diff}kg desde o início
      </p>
    </div>
    {/* repetir para %BF, Peso magro, Cintura */}
  </div>

  Cores do diff:
  - Peso: negativo = verde (emagreceu), positivo = vermelho (engordou)
  - %BF: negativo = verde, positivo = vermelho
  - Peso magro: positivo = verde (ganhou massa), negativo = vermelho
  - Cintura: negativo = verde, positivo = vermelho

Se não tiver medições (evolucao.length === 0):
  Placeholder: "Nenhuma medição registrada ainda. Peça ao seu professor para registrar."
  Estilo: text-zinc-600 text-sm text-center py-16 border border-dashed border-surface-border rounded-xl

Se tiver apenas 1 medição:
  Mostrar só os cards com os valores atuais, sem gráfico e sem comparativo.
  Mensagem: "Registre mais medições para ver sua evolução."

---

## REGRAS GERAIS

1. Usar APENAS recharts — sem outras libs de gráfico
2. Todos os gráficos com fundo transparente (sem fill branco)
3. ResponsiveContainer width="100%" em todos os gráficos
4. Datas formatadas como DD/MM no eixo X
5. Valores numéricos com 1 casa decimal
6. Loading state enquanto busca dados: spinner ou skeleton
7. Não reescrever arquivos inteiros — alterações cirúrgicas

---

## AO FINALIZAR

1. Confirme que GET /api/admin/dashboard/evolucao retorna dados agrupados por data
2. Confirme que GET /api/admin/dashboard/resumo retorna receita_mes e a_receber_mes
3. Confirme que GET /api/aluno/evolucao retorna todas as medições do aluno
4. Confirme que os 3 seletores (Peso / %BF / Medidas) funcionam na tab do aluno
5. Confirme que o card de progresso mostra diff primeira vs última medição com cores corretas
6. Confirme que os gráficos têm fundo transparente e seguem o design system
7. Atualize docs/api-contract.md e docs/ui-contract.md com as novas rotas
8. Execute o rebuild:
   docker build --no-cache -f docker/backend.Dockerfile -t coach-backend:latest .
   docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
   docker service update --force --image coach-backend:latest coach_backend
   docker service update --force --image coach-frontend:latest coach_frontend
