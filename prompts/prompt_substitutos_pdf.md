Preciso corrigir dois problemas no projeto Coach System.
Leia o CLAUDE.md antes de começar.
NÃO reescrever arquivos inteiros — alterações cirúrgicas.

---

## PROBLEMA 1 — Substitutos alimentares: layout quebrado e seleção não funciona

### Contexto
No ProtocoloBuilder.jsx, o painel de substitutos tem:
- Campo de gramas enorme (ocupa espaço demais)
- Campo de busca do alimento pequeno (não cabe o texto)
- Não consegue selecionar o alimento substituto do dropdown

### Correção do layout

Localize o painel de substitutos no ProtocoloBuilder.jsx.
O layout do formulário de adicionar substituto deve ser:

  <div className="flex items-center gap-2 mt-2 flex-wrap">

    {/* Label OU */}
    <span className="text-zinc-500 text-xs font-bold shrink-0">OU</span>

    {/* Campo de busca — deve ser o maior, ocupar o espaço disponível */}
    <div className="relative flex-1 min-w-[180px]">
      <input
        type="text"
        placeholder="Buscar alimento substituto..."
        value={buscaSub}
        onChange={(e) => setBuscaSub(e.target.value)}
        className="w-full bg-surface-input border border-surface-border text-white
          placeholder:text-zinc-600 rounded px-3 py-2 text-sm
          focus:border-brand focus:outline-none"
      />

      {/* Dropdown de resultados — posicionado absolutamente */}
      {resultadosBusca.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1
          bg-surface-card border border-surface-border rounded-lg shadow-xl
          max-h-48 overflow-y-auto">
          {resultadosBusca.map((alimento) => (
            <button
              key={alimento.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // CRÍTICO: evita que o input perca o foco antes do click registrar
                selecionarSubstituto(alimento);
              }}
              className="w-full text-left px-3 py-2.5 text-sm text-zinc-300
                hover:bg-surface-elevated hover:text-white transition-colors
                border-b border-surface-border last:border-0"
            >
              <span className="font-medium">{alimento.nome}</span>
              <span className="text-zinc-600 text-xs ml-2">{alimento.categoria}</span>
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Campo de gramas — tamanho fixo pequeno */}
    <input
      type="number"
      placeholder="g"
      value={qtdSub}
      onChange={(e) => setQtdSub(e.target.value)}
      min="1"
      className="w-20 shrink-0 bg-surface-input border border-surface-border text-white
        placeholder:text-zinc-600 rounded px-3 py-2 text-sm text-center
        focus:border-brand focus:outline-none"
    />

    {/* Botão adicionar */}
    <button
      type="button"
      onClick={() => adicionarSubstituto(item.id)}
      disabled={!alimentoSubSelecionado || !qtdSub}
      className="shrink-0 text-xs font-bold text-brand border border-brand/40
        px-3 py-2 rounded hover:bg-brand/10 disabled:opacity-40
        disabled:cursor-not-allowed transition-colors"
    >
      + Adicionar
    </button>

  </div>

### Correção do bug de seleção (crítico)

O problema de não conseguir selecionar o alimento é causado pelo evento onBlur
do input disparar antes do onClick do item do dropdown, fazendo o dropdown
fechar antes do clique registrar.

Solução: usar onMouseDown com e.preventDefault() no item do dropdown
(já incluído no código acima).

Além disso, verifique a função selecionarSubstituto — ela deve:
1. Setar o nome do alimento no input de busca
2. Salvar o objeto do alimento em estado (alimentoSubSelecionado)
3. Limpar os resultados do dropdown
4. Focar no campo de gramas automaticamente

  function selecionarSubstituto(alimento) {
    setAlimentoSubSelecionado(alimento);
    setBuscaSub(alimento.nome);
    setResultadosBusca([]);
    // Focar no input de gramas
    setTimeout(() => qtdSubRef.current?.focus(), 50);
  }

Adicione ref no input de gramas:
  const qtdSubRef = useRef(null);
  // No input de gramas: ref={qtdSubRef}

### Debounce na busca

Garanta que a busca tem debounce de 300ms para não disparar request a cada tecla:

  useEffect(() => {
    if (buscaSub.length < 2) {
      setResultadosBusca([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/admin/alimentos?busca=${encodeURIComponent(buscaSub)}&limit=8`);
        setResultadosBusca(res.data.data || []);
      } catch {
        setResultadosBusca([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaSub]);

---

## PROBLEMA 2 — PDF corrompido / ilegível ao baixar

### Diagnóstico provável

O PDF está sendo enviado como stream mas o browser não está recebendo
corretamente como arquivo binário, resultando em arquivo corrompido.

### Correção no backend — controllers que geram PDF

Localize as rotas GET /api/admin/protocolos/:id/pdf e GET /api/aluno/protocolos/:id/pdf.

O controller deve enviar o buffer corretamente:

  async function baixarPDF(req, res) {
    try {
      // 1. Buscar dados do protocolo
      const protocolo = await buscarProtocoloCompleto(req.params.id);
      if (!protocolo) return res.status(404).json({ message: 'Protocolo não encontrado.' });

      // 2. Verificar permissão (se rota do aluno)
      // if (req.user.role === 'aluno' && protocolo.aluno.user_id !== req.user.id) {
      //   return res.status(403).json({ message: 'Acesso negado.' });
      // }

      // 3. Gerar PDF
      const pdfBuffer = await gerarPDFProtocolo({ protocolo, aluno: protocolo.aluno });

      // 4. Nome do arquivo seguro (sem caracteres especiais)
      const nomeArquivo = protocolo.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // remove acentos
        .replace(/[^a-zA-Z0-9\s-]/g, '')  // remove especiais
        .replace(/\s+/g, '-')             // espaços viram hífens
        .toLowerCase()
        .substring(0, 50);

      // 5. Enviar como arquivo binário
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="protocolo-${nomeArquivo}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      // IMPORTANTE: usar res.end() com o buffer, não res.send()
      // res.send() pode corromper buffers binários em alguns casos
      res.end(pdfBuffer, 'binary');

    } catch (err) {
      console.error('[pdf/baixar]', err.message);
      res.status(500).json({ message: 'Erro ao gerar o PDF. Tente novamente.' });
    }
  }

### Correção no serviço de PDF (backend/src/services/pdf.js)

Se usar Puppeteer, verifique se está retornando o buffer corretamente:

  async function gerarPDFProtocolo(dados) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',  // importante no Docker
          '--disable-gpu',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      });

      const page = await browser.newPage();
      const html = gerarHTMLProtocolo(dados);  // função que monta o HTML

      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      // Aguardar fontes e estilos carregarem
      await page.evaluateHandle('document.fonts.ready');

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: false,  // sem background para PDF mais limpo
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        displayHeaderFooter: false,
      });

      // pdf já é um Buffer — retornar diretamente
      return Buffer.from(pdf);

    } finally {
      if (browser) await browser.close();
    }
  }

### HTML do protocolo — versão limpa apenas texto

Como não precisa de imagens, o HTML deve ser simples e garantidamente legível:

  function gerarHTMLProtocolo({ protocolo, aluno }) {
    const refeicoes = protocolo.refeicoes || [];
    const treinos   = protocolo.treinos || [];
    const suplems   = protocolo.suplementacao || [];

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Protocolo ${protocolo.nome}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; line-height: 1.5; }

          h1 { font-size: 20px; font-weight: 900; margin-bottom: 4px; }
          h2 { font-size: 15px; font-weight: 700; margin: 20px 0 8px; border-bottom: 2px solid #f97316; padding-bottom: 4px; color: #f97316; }
          h3 { font-size: 13px; font-weight: 700; margin: 14px 0 6px; }

          .header { margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
          .header-sub { color: #555; font-size: 11px; margin-top: 2px; }

          .dados-fisicos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
          .dado { background: #f5f5f5; border-radius: 6px; padding: 8px; text-align: center; }
          .dado-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
          .dado-valor { font-size: 16px; font-weight: 700; color: #111; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { background: #111; color: #fff; text-align: left; padding: 6px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
          tr:nth-child(even) td { background: #fafafa; }

          .total-row td { font-weight: 700; background: #f0f0f0; border-top: 2px solid #ddd; }
          .total-protocolo { background: #fff8f3; border: 1px solid #f97316; border-radius: 6px; padding: 10px; margin: 12px 0; }
          .total-protocolo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 6px; }
          .total-item { text-align: center; }
          .total-label { font-size: 10px; color: #888; text-transform: uppercase; }
          .total-valor { font-size: 15px; font-weight: 700; color: #f97316; }

          .substituto { font-size: 10px; color: #888; padding: 2px 8px; }
          .substituto::before { content: "↳ OU: "; color: #f97316; font-weight: 700; }

          .superset-label { display: inline-block; background: #f97316; color: #fff;
            font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px; margin-right: 4px; }

          .page-break { page-break-before: always; }
          .section { margin-bottom: 24px; }

          .supl-item { padding: 6px 0; border-bottom: 1px solid #eee; display: flex; gap: 16px; }
          .supl-nome { font-weight: 700; flex: 1; }
          .supl-info { color: #555; font-size: 11px; }
        </style>
      </head>
      <body>

        <!-- CABEÇALHO -->
        <div class="header">
          <h1>${protocolo.nome}</h1>
          <p class="header-sub">
            Aluno: <strong>${aluno.nome}</strong> &nbsp;|&nbsp;
            Objetivo: ${protocolo.objetivo || '—'} &nbsp;|&nbsp;
            Fase: ${protocolo.fase || '—'} &nbsp;|&nbsp;
            Gerado em: ${new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <!-- DADOS FÍSICOS -->
        ${aluno.ultima_medicao ? `
        <div class="section">
          <h2>Dados Físicos</h2>
          <div class="dados-fisicos">
            <div class="dado">
              <div class="dado-label">Peso</div>
              <div class="dado-valor">${aluno.ultima_medicao.peso_kg ?? '—'} kg</div>
            </div>
            <div class="dado">
              <div class="dado-label">Altura</div>
              <div class="dado-valor">${aluno.altura_cm ?? '—'} cm</div>
            </div>
            <div class="dado">
              <div class="dado-label">% Gordura</div>
              <div class="dado-valor">${aluno.ultima_medicao.percentual_gordura ?? '—'}%</div>
            </div>
            <div class="dado">
              <div class="dado-label">Peso Magro</div>
              <div class="dado-valor">${aluno.ultima_medicao.peso_magro_kg ?? '—'} kg</div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- ALIMENTAÇÃO -->
        ${refeicoes.length > 0 ? `
        <div class="section">
          <h2>Plano Alimentar</h2>
          ${refeicoes.map(ref => `
            <h3>${ref.numero_refeicao}. ${ref.nome}${ref.horario_sugerido ? ` — ${ref.horario_sugerido}` : ''}</h3>
            <table>
              <thead>
                <tr>
                  <th>Alimento</th>
                  <th style="width:70px">Qtd (g)</th>
                  <th style="width:55px">Kcal</th>
                  <th style="width:55px">Carb</th>
                  <th style="width:55px">Prot</th>
                  <th style="width:55px">Gord</th>
                </tr>
              </thead>
              <tbody>
                ${(ref.itens || []).map(item => `
                  <tr>
                    <td>${item.nome_alimento}</td>
                    <td>${item.quantidade_g}g</td>
                    <td>${Number(item.kcal_calculado).toFixed(1)}</td>
                    <td>${Number(item.carb_calculado).toFixed(1)}g</td>
                    <td>${Number(item.prot_calculado).toFixed(1)}g</td>
                    <td>${Number(item.gord_calculado).toFixed(1)}g</td>
                  </tr>
                  ${(item.substitutos || []).map(sub => `
                    <tr>
                      <td colspan="6" class="substituto">
                        ${sub.nome_alimento} — ${sub.quantidade_g}g
                      </td>
                    </tr>
                  `).join('')}
                `).join('')}
                <tr class="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td>—</td>
                  <td><strong>${Number(ref.total_kcal || 0).toFixed(1)}</strong></td>
                  <td><strong>${Number(ref.total_carb || 0).toFixed(1)}g</strong></td>
                  <td><strong>${Number(ref.total_prot || 0).toFixed(1)}g</strong></td>
                  <td><strong>${Number(ref.total_gord || 0).toFixed(1)}g</strong></td>
                </tr>
              </tbody>
            </table>
          `).join('')}

          <!-- Total geral do protocolo -->
          <div class="total-protocolo">
            <strong>TOTAL DIÁRIO DO PROTOCOLO</strong>
            <div class="total-protocolo-grid">
              <div class="total-item">
                <div class="total-label">Calorias</div>
                <div class="total-valor">${refeicoes.reduce((s, r) => s + Number(r.total_kcal || 0), 0).toFixed(1)} kcal</div>
              </div>
              <div class="total-item">
                <div class="total-label">Carboidratos</div>
                <div class="total-valor">${refeicoes.reduce((s, r) => s + Number(r.total_carb || 0), 0).toFixed(1)}g</div>
              </div>
              <div class="total-item">
                <div class="total-label">Proteínas</div>
                <div class="total-valor">${refeicoes.reduce((s, r) => s + Number(r.total_prot || 0), 0).toFixed(1)}g</div>
              </div>
              <div class="total-item">
                <div class="total-label">Gorduras</div>
                <div class="total-valor">${refeicoes.reduce((s, r) => s + Number(r.total_gord || 0), 0).toFixed(1)}g</div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- TREINO -->
        ${treinos.length > 0 ? `
        <div class="section page-break">
          <h2>Treino</h2>
          ${treinos.map(treino => `
            <h3>${treino.nome}</h3>
            <table>
              <thead>
                <tr>
                  <th>Exercício</th>
                  <th style="width:55px">Séries</th>
                  <th style="width:65px">Reps</th>
                  <th style="width:65px">Descanso</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                ${(treino.exercicios || []).map(ex => `
                  <tr>
                    <td>
                      ${ex.grupo_superset ? `<span class="superset-label">${ex.grupo_superset}</span>` : ''}
                      ${ex.nome_exercicio}
                      ${ex.tipo === 'cardio' ? ' <em style="color:#888;font-size:10px">(cardio)</em>' : ''}
                    </td>
                    <td>${ex.series ?? '—'}</td>
                    <td>${ex.repeticoes ?? '—'}</td>
                    <td>${ex.descanso_seg ? ex.descanso_seg + 's' : '—'}</td>
                    <td style="color:#555">${ex.observacao || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `).join('')}
        </div>
        ` : ''}

        <!-- SUPLEMENTAÇÃO -->
        ${suplems.length > 0 ? `
        <div class="section">
          <h2>Suplementação</h2>
          ${suplems.map(s => `
            <div class="supl-item">
              <span class="supl-nome">${s.nome_suplemento}</span>
              <span class="supl-info">${s.dose || '—'}</span>
              <span class="supl-info">${s.horario || '—'}</span>
              ${s.observacao ? `<span class="supl-info">${s.observacao}</span>` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- OBSERVAÇÕES -->
        ${protocolo.observacoes ? `
        <div class="section">
          <h2>Observações Gerais</h2>
          <p style="white-space: pre-wrap; color: #333; line-height: 1.6">${protocolo.observacoes}</p>
        </div>
        ` : ''}

      </body>
      </html>
    `;
  }

  module.exports = { gerarPDFProtocolo, gerarHTMLProtocolo };

### Correção no frontend — download do PDF

No AlunoDetalhe.jsx e MeuProtocolo.jsx, o download deve usar responseType: 'blob':

  async function baixarPDF(protocoloId, nomeProtocolo) {
    try {
      setBaixandoPDF(true);
      const res = await api.get(
        `/admin/protocolos/${protocoloId}/pdf`,
        { responseType: 'blob' }  // CRÍTICO: sem isso o arquivo fica corrompido
      );

      // Criar URL temporária e disparar download
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `protocolo-${nomeProtocolo || protocoloId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF baixado com sucesso!');
    } catch (err) {
      toast.error('Erro ao baixar o PDF. Tente novamente.');
      console.error('[baixarPDF]', err);
    } finally {
      setBaixandoPDF(false);
    }
  }

---

## AO FINALIZAR

1. Confirme que o campo de busca de substituto ocupa o espaço maior
2. Confirme que o campo de gramas tem largura fixa de 80px (w-20)
3. Confirme que clicar no item do dropdown funciona (onMouseDown + preventDefault)
4. Confirme que o debounce de 300ms está funcionando na busca
5. Confirme que o PDF gerado abre corretamente no computador
6. Confirme que o download usa responseType: 'blob' no frontend
7. Confirme que res.end(buffer, 'binary') é usado no backend
8. Execute o rebuild:
   docker build --no-cache -f docker/backend.Dockerfile -t coach-backend:latest .
   docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
   docker service update --force --image coach-backend:latest coach_backend
   docker service update --force --image coach-frontend:latest coach_frontend
