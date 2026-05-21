const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../config/s3');
const logger = require('../config/logger');

async function deletarArquivo(key) {
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    }));
  } catch (err) {
    logger.error({ err, key }, 'storage: failed to delete S3 file');
  }
}

function urlPublica(key) {
  if (!key) return null;
  return `${process.env.S3_PUBLIC_URL}/${key}`;
}

// Extrai o video_id de um URL do YouTube (watch, youtu.be, embed, shorts).
function extrairVideoIdYoutube(url) {
  if (!url) return null;
  const regexes = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const regex of regexes) {
    const match = url.match(regex);
    if (match) return match[1];
  }
  return null;
}

function urlEmbedYoutube(videoId) {
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

module.exports = { deletarArquivo, urlPublica, extrairVideoIdYoutube, urlEmbedYoutube };
