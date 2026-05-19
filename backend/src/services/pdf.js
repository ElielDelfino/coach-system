const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TEMPLATE = fs.readFileSync(
  path.join(__dirname, '../templates/protocolo.html'),
  'utf-8'
);

function escapeHtml(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function num(v, decimals = 1, suffix = '') {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return String(d); }
}

function renderRefeicoes(refeicoes) {
  if (!refeicoes.length) {
    return '<div class="empty">Nenhuma refeição cadastrada para este protocolo.</div>';
  }

  let totalKcalProtocolo = 0;
  let totalCarbProtocolo = 0;
  let totalProtProtocolo = 0;
  let totalGordProtocolo = 0;

  const blocos = refeicoes.map((r) => {
    let totalKcal = 0, totalCarb = 0, totalProt = 0, totalGord = 0;

    const linhasItens = (r.itens || []).map((it) => {
      const kcal = Number(it.kcal_calculado || 0);
      const carb = Number(it.carb_calculado || 0);
      const prot = Number(it.prot_calculado || 0);
      const gord = Number(it.gord_calculado || 0);
      totalKcal += kcal; totalCarb += carb; totalProt += prot; totalGord += gord;

      let html = `
        <tr>
          <td>${escapeHtml(it.nome_alimento || '—')}</td>
          <td class="num">${num(it.quantidade_g, 0, ' g')}</td>
          <td class="num">${num(kcal, 0)}</td>
          <td class="num">${num(carb, 1)}</td>
          <td class="num">${num(prot, 1)}</td>
          <td class="num">${num(gord, 1)}</td>
        </tr>`;

      const substitutos = (it.substitutos || []).map((s) => `
        <tr class="subst">
          <td>${escapeHtml(s.nome_alimento || '—')}</td>
          <td class="num">${num(s.quantidade_g, 0, ' g')}</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num">—</td>
        </tr>`).join('');

      return html + substitutos;
    }).join('');

    totalKcalProtocolo += totalKcal;
    totalCarbProtocolo += totalCarb;
    totalProtProtocolo += totalProt;
    totalGordProtocolo += totalGord;

    return `
      <div class="subsection">
        <div class="subsection-title">
          <span>${escapeHtml(`${r.numero_refeicao}. ${r.nome}`)}</span>
          ${r.horario_sugerido ? `<span class="horario">${escapeHtml(r.horario_sugerido)}</span>` : ''}
        </div>
        <table class="macro">
          <thead>
            <tr>
              <th>Alimento</th>
              <th class="num">Quantidade</th>
              <th class="num">Kcal</th>
              <th class="num">Carb (g)</th>
              <th class="num">Prot (g)</th>
              <th class="num">Gord (g)</th>
            </tr>
          </thead>
          <tbody>
            ${linhasItens || '<tr><td colspan="6" class="empty">Sem itens cadastrados.</td></tr>'}
            <tr class="total">
              <td>Total da refeição</td>
              <td class="num">—</td>
              <td class="num">${num(totalKcal, 0)}</td>
              <td class="num">${num(totalCarb, 1)}</td>
              <td class="num">${num(totalProt, 1)}</td>
              <td class="num">${num(totalGord, 1)}</td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }).join('');

  const totalGeral = `
    <div class="subsection">
      <table class="macro">
        <tbody>
          <tr class="total-protocolo">
            <td>TOTAL DO PROTOCOLO</td>
            <td class="num">—</td>
            <td class="num">${num(totalKcalProtocolo, 0)}</td>
            <td class="num">${num(totalCarbProtocolo, 1)} g</td>
            <td class="num">${num(totalProtProtocolo, 1)} g</td>
            <td class="num">${num(totalGordProtocolo, 1)} g</td>
          </tr>
        </tbody>
      </table>
    </div>`;

  return blocos + totalGeral;
}

function renderTreinos(treinos) {
  if (!treinos.length) {
    return '<div class="empty">Nenhum treino cadastrado para este protocolo.</div>';
  }

  return treinos.map((t) => {
    const linhas = (t.exercicios || []).map((e) => {
      if (e.tipo === 'cardio') {
        return `
          <tr>
            <td><span class="badge-cardio">CARDIO</span>${escapeHtml(e.nome_exercicio || e.tipo_cardio || 'Cardio')}</td>
            <td class="num">${escapeHtml(e.duracao_min ? `${e.duracao_min} min` : '—')}</td>
            <td class="num">${escapeHtml(e.intensidade || '—')}</td>
            <td class="num">—</td>
            <td>${escapeHtml(e.observacao || '')}</td>
          </tr>`;
      }
      const badge = e.grupo_superset
        ? `<span class="badge-superset">${escapeHtml(e.grupo_superset)}</span>`
        : '';
      return `
        <tr>
          <td>${badge}${escapeHtml(e.nome_exercicio || '—')}</td>
          <td class="num">${num(e.series, 0)}</td>
          <td class="num">${escapeHtml(e.repeticoes || '—')}</td>
          <td class="num">${e.descanso_seg != null ? `${e.descanso_seg}s` : '—'}</td>
          <td>${escapeHtml(e.observacao || '')}</td>
        </tr>`;
    }).join('');

    return `
      <div class="subsection">
        <div class="subsection-title"><span>${escapeHtml(t.nome)}</span></div>
        <table class="macro treino">
          <thead>
            <tr>
              <th>Exercício</th>
              <th class="num">Séries</th>
              <th class="num">Repetições</th>
              <th class="num">Descanso</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            ${linhas || '<tr><td colspan="5" class="empty">Sem exercícios cadastrados.</td></tr>'}
          </tbody>
        </table>
      </div>`;
  }).join('');
}

function renderSuplementacao(lista) {
  if (!lista.length) {
    return '<div class="empty">Nenhuma suplementação cadastrada para este protocolo.</div>';
  }
  const linhas = lista.map((s) => `
    <tr>
      <td>${escapeHtml(s.nome_suplemento || '—')}</td>
      <td>${escapeHtml(s.dose || '—')}</td>
      <td>${escapeHtml(s.horario || '—')}</td>
      <td>${escapeHtml(s.observacao || '')}</td>
    </tr>`).join('');

  return `
    <table class="macro">
      <thead>
        <tr>
          <th>Suplemento</th>
          <th>Dose</th>
          <th>Horário</th>
          <th>Observação</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>`;
}

function montarConteudo({ protocolo, refeicoes, treinos, suplementacao }) {
  const partes = [];

  if (protocolo.modulo_alimentar) {
    partes.push(`
      <div class="section">
        <div class="section-title">Alimentação</div>
        ${renderRefeicoes(refeicoes || [])}
      </div>`);
  }

  if (protocolo.modulo_treino) {
    partes.push(`
      <div class="section section-page-break">
        <div class="section-title">Treinos</div>
        ${renderTreinos(treinos || [])}
      </div>`);
  }

  if (protocolo.modulo_suplementacao) {
    partes.push(`
      <div class="section section-page-break">
        <div class="section-title">Suplementação</div>
        ${renderSuplementacao(suplementacao || [])}
      </div>`);
  }

  if (protocolo.observacoes && protocolo.observacoes.trim()) {
    partes.push(`
      <div class="section">
        <div class="section-title">Observações</div>
        <div class="observacoes-box">${escapeHtml(protocolo.observacoes)}</div>
      </div>`);
  }

  if (!partes.length) {
    return '<div class="empty" style="margin-top:30px">Este protocolo ainda não tem módulos preenchidos.</div>';
  }

  return partes.join('');
}

function montarHtml(dados) {
  const { aluno, protocolo, medidaFisica } = dados;
  const fase = (protocolo.fase || '').replace('_', ' ').toUpperCase();

  return TEMPLATE
    .replace('{{TITULO}}', escapeHtml(`Protocolo — ${protocolo.nome}`))
    .replace(/\{\{ALUNO_NOME\}\}/g, escapeHtml(aluno.nome))
    .replace(/\{\{ALUNO_OBJETIVO\}\}/g, escapeHtml(aluno.objetivo || 'Objetivo não informado'))
    .replace(/\{\{DATA_GERACAO\}\}/g, escapeHtml(formatDate(new Date())))
    .replace(/\{\{PROTOCOLO_NOME\}\}/g, escapeHtml(protocolo.nome))
    .replace(/\{\{PROTOCOLO_FASE\}\}/g, escapeHtml(fase || '—'))
    .replace(/\{\{FISICO_PESO\}\}/g, num(medidaFisica?.peso_kg, 1, ' kg'))
    .replace(/\{\{FISICO_ALTURA\}\}/g, num(medidaFisica?.altura_cm, 0, ' cm'))
    .replace(/\{\{FISICO_BF\}\}/g, num(medidaFisica?.percentual_gordura, 1, '%'))
    .replace(/\{\{FISICO_MAGRO\}\}/g, num(medidaFisica?.peso_magro_kg, 1, ' kg'))
    .replace(/\{\{FISICO_GORDO\}\}/g, num(medidaFisica?.peso_gordo_kg, 1, ' kg'))
    .replace('{{CONTEUDO}}', montarConteudo(dados));
}

async function gerarPDFProtocolo(dados) {
  const html = montarHtml(dados);

  const launchOpts = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.evaluateHandle('document.fonts.ready');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

module.exports = { gerarPDFProtocolo };
