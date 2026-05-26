Preciso implementar duas funcionalidades no projeto Coach System:
1. Área do aluno completa (medidas + fotos)
2. Geração de PDF do protocolo no backend e envio por email via Resend

Leia o CLAUDE.md, docs/ui-contract.md e docs/api-contract.md antes de começar.

---

## PARTE 1 — Área do aluno completa

### Contexto

O arquivo frontend/src/pages/aluno/Perfil.jsx já existe mas está incompleto.
Atualmente mostra apenas: dados pessoais, status do plano e histórico de faturas.

Precisamos adicionar duas seções: Medidas e Fotos.

### 1.1 — Adicionar tabs na Perfil.jsx

Transforme a página em tabs:

  [ Meu Perfil ] [ Minhas Medidas ] [ Minhas Fotos ] [ Faturas ]

### 1.2 — Tab Minhas Medidas

Consome: GET /api/aluno/medidas
Response: array ordenado por data_medicao DESC com todos os campos de aluno_medidas

Exibir:

Card de última medição em destaque no topo:
  - peso_kg, altura_cm, percentual_gordura, peso_magro_kg, peso_gordo_kg
  - data_medicao formatada
  - Estilo: cards lado a lado com valor grande em text-brand

Tabela histórica abaixo com todas as medições:
  Colunas: Data | Peso | Altura | %BF | Peso magro | Peso gordo | Cintura | Quadril
  Ordenada por data DESC
  Se não tiver medições: mensagem "Nenhuma medição registrada ainda."

Gráfico simples de evolução de peso ao longo do tempo:
  Use recharts (já disponível no projeto)
  LineChart com eixo X = data_medicao, eixo Y = peso_kg
  Cor da linha: #f97316 (brand)
  Fundo do chart: transparente
  Grid: border-surface-border
  Se menos de 2 medições: não exibir o gráfico

### 1.3 — Tab Minhas Fotos

Consome: GET /api/aluno/fotos
Response: array com url, posicao, data_foto

Exibir grid 2x2 por posição:
  [ Frente ]    [ Costas   ]
  [ Lado Dir ]  [ Lado Esq ]

Cada célula:
  - Se tem foto: exibe a imagem (img com object-cover) + data formatada
  - Se não tem foto: placeholder com ícone de câmera e texto "Sem foto"
  - Estilo do placeholder: border-2 border-dashed border-surface-border text-zinc-600

Se o aluno tiver múltiplas fotos por posição, mostrar a mais recente em destaque
e as anteriores em miniatura abaixo.

---

## PARTE 2 — PDF do protocolo + envio por email

### 2.1 — Dependências do backend

  cd backend
  npm install puppeteer @resend/node

Puppeteer gera o PDF renderizando HTML. É mais confiável que pdfkit para layouts complexos.

Adicione ao .env.example:
  RESEND_API_KEY=         # chave da API do Resend (resend.com)
  EMAIL_FROM=noreply@seudominio.com  # email remetente verificado no Resend

### 2.2 — Estrutura de arquivos novos no backend

  backend/src/
    services/
      pdf.js      ← gera o PDF em buffer usando Puppeteer
      email.js    ← envia email com PDF anexado usando Resend
    templates/
      protocolo.html  ← template HTML do PDF

### 2.3 — Template HTML do protocolo (backend/src/templates/protocolo.html)

Layout profissional com as seguintes seções:

CABEÇALHO:
  - Nome do aluno + objetivo
  - Nome do protocolo + fase (cutting/bulking/manutenção/recomposição)
  - Data de geração
  - Dados físicos: Peso atual | Altura | %BF | Peso magro | Peso gordo

SEÇÃO ALIMENTAÇÃO (se modulo_alimentar = true):
  Para cada refeição:
    - Número e nome da refeição + horário sugerido
    - Tabela: Alimento | Quantidade | Kcal | Carb | Prot | Gord
    - Para cada item: se tiver substitutos, listar abaixo com "OU"
    - Rodapé: TOTAL da refeição
  Rodapé geral: TOTAL DO PROTOCOLO (soma de todas as refeições)

SEÇÃO TREINO (se modulo_treino = true):
  Para cada treino (A, B, C...):
    - Nome do treino
    - Tabela: Exercício | Séries | Repetições | Descanso | Observação
    - Itens de superset agrupados visualmente com label (A1, A2...)
    - Itens de cardio com: Tipo | Duração | Intensidade

SEÇÃO SUPLEMENTAÇÃO (se modulo_suplementacao = true):
  Tabela: Suplemento | Dose | Horário | Observação

SEÇÃO OBSERVAÇÕES (se tiver observacoes preenchido):
  Texto livre formatado

ESTILO do template:
  - Fonte: Arial, sans-serif
  - Cor primária: #f97316 (laranja)
  - Fundo: branco (PDF precisa de fundo branco)
  - Cabeçalho de tabelas: fundo #1a1a1a, texto branco
  - Linhas alternadas: #f9f9f9 e branco
  - Bordas: #e5e5e5
  - Page break entre seções principais

### 2.4 — Serviço de PDF (backend/src/services/pdf.js)

  const puppeteer = require('puppeteer');
  const fs = require('fs');
  const path = require('path');

  async function gerarPDFProtocolo(dados) {
    // dados = { aluno, protocolo, refeicoes, treinos, suplementacao }

    const template = fs.readFileSync(
      path.join(__dirname, '../templates/protocolo.html'), 'utf-8'
    );

    // Interpola os dados no template
    const html = interpolarTemplate(template, dados);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']  // necessário no Docker
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });

    await browser.close();
    return pdf; // Buffer
  }

  module.exports = { gerarPDFProtocolo };

### 2.5 — Serviço de email (backend/src/services/email.js)

  const { Resend } = require('@resend/node');
  const resend = new Resend(process.env.RESEND_API_KEY);

  async function enviarProtocoloPorEmail({ emailDestinatario, nomeAluno, nomeProtocolo, pdfBuffer }) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: emailDestinatario,
      subject: `Seu protocolo: ${nomeProtocolo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Olá, ${nomeAluno}!</h2>
          <p>Seu protocolo <strong>${nomeProtocolo}</strong> foi atualizado.</p>
          <p>Em anexo você encontra o PDF completo com sua alimentação, treino e suplementação.</p>
          <p style="color: #666; font-size: 12px;">
            Em caso de dúvidas, entre em contato com seu professor.
          </p>
        </div>
      `,
      attachments: [{
        filename: `protocolo-${nomeProtocolo.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        content: pdfBuffer.toString('base64'),
        type: 'application/pdf'
      }]
    });
  }

  module.exports = { enviarProtocoloPorEmail };

### 2.6 — Nova rota no backend

Adicione em src/routes/admin.js e src/controllers/adminController.js:

  POST /api/admin/protocolos/:id/enviar-pdf
  Auth: Bearer token
  Role: admin

  Lógica no controller:
  1. Busca o protocolo com todos os dados (refeicoes + itens + substitutos + treinos + suplementacao)
  2. Busca os dados físicos do aluno (última medição)
  3. Chama gerarPDFProtocolo(dados)
  4. Chama enviarProtocoloPorEmail({ email do aluno, nome, protocolo, pdfBuffer })
  5. Retorna 200: { message: "Protocolo enviado para email@aluno.com" }

  Erros:
  - 404 se protocolo não encontrado
  - 500 com message descritivo se falha no Puppeteer ou Resend

Adicione ao docs/api-contract.md:
  POST /api/admin/protocolos/:id/enviar-pdf
  Auth: Bearer token | Role: admin
  Body: nenhum
  Response 200: { message: "Protocolo enviado para {email}" }
  Erros: 404, 500

### 2.7 — Botão no frontend

No AlunoDetalhe.jsx, na tab Protocolos, adicione botão em cada protocolo:

  <Button
    onClick={() => enviarPDF(protocolo.id)}
    disabled={enviando}
    variant="ghost"
    className="text-brand border border-brand/40 hover:bg-brand/10"
  >
    {enviando ? 'Enviando...' : '📧 Enviar PDF'}
  </Button>

Ao clicar:
  - Seta enviando=true (desabilita botão)
  - Chama api.post('/admin/protocolos/' + id + '/enviar-pdf')
  - Sucesso: toast.success("PDF enviado para o email do aluno!")
  - Erro: toast.error(errorMessage(err))
  - Finally: enviando=false

### 2.8 — Puppeteer no Docker

O Puppeteer precisa do Chromium. Atualize o docker/backend.Dockerfile:

No estágio final (FROM node:20-alpine), adicione antes do USER appuser:

  RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

  ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
      PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

---

## AO FINALIZAR

1. Confirme que a tab Medidas exibe o gráfico de evolução de peso (recharts)
2. Confirme que a tab Fotos exibe o grid 2x2 por posição
3. Confirme que o PDF é gerado com todas as seções (alimentação, treino, suplementação, observações, dados físicos)
4. Confirme que o email chega com o PDF anexado
5. Confirme que o Puppeteer funciona dentro do container Alpine com o Chromium instalado
6. Execute o rebuild:
   docker build --no-cache -f docker/backend.Dockerfile -t coach-backend:latest .
   docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
   docker service update --force --image coach-backend:latest coach_backend
   docker service update --force --image coach-frontend:latest coach_frontend
