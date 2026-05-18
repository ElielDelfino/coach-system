const { Resend } = require('resend');

let resendClient = null;
function getClient() {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY não configurada. Configure no .env para enviar emails.');
  resendClient = new Resend(key);
  return resendClient;
}

function slug(nome) {
  return String(nome || 'protocolo')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function enviarProtocoloPorEmail({ emailDestinatario, nomeAluno, nomeProtocolo, pdfBuffer }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurada. Configure no .env para enviar emails.');
  }
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error('EMAIL_FROM não configurado. Configure no .env para enviar emails.');
  }
  if (!emailDestinatario) throw new Error('Email do destinatário ausente.');

  const filename = `protocolo-${slug(nomeProtocolo)}.pdf`;

  const result = await getClient().emails.send({
    from,
    to: emailDestinatario,
    subject: `Seu protocolo: ${nomeProtocolo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 24px;">
        <div style="height: 4px; background: #f97316; margin-bottom: 18px;"></div>
        <h2 style="color: #f97316; margin: 0 0 12px 0;">Olá, ${nomeAluno}!</h2>
        <p style="color: #e4e4e7;">Seu protocolo <strong>${nomeProtocolo}</strong> foi atualizado.</p>
        <p style="color: #e4e4e7;">Em anexo você encontra o PDF completo com sua alimentação, treino e suplementação.</p>
        <p style="color: #71717a; font-size: 12px; margin-top: 24px;">
          Em caso de dúvidas, entre em contato com seu professor.
        </p>
      </div>
    `,
    attachments: [{
      filename,
      content: pdfBuffer.toString('base64'),
    }],
  });

  if (result?.error) {
    const err = new Error(result.error.message || 'Falha ao enviar email via Resend.');
    err.cause = result.error;
    throw err;
  }
  return result;
}

module.exports = { enviarProtocoloPorEmail };
