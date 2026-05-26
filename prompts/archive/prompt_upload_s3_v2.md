Preciso implementar upload real de fotos e vídeos no projeto Coach System usando AWS S3.
Leia o CLAUDE.md antes de começar.

---

## PROBLEMA DO .env NO DOCKER SWARM

O Docker Swarm não lê o .env automaticamente. As variáveis precisam estar
declaradas no docker-compose.yml na seção environment do serviço backend.

Verifique se o docker-compose.yml já tem todas as variáveis abaixo no serviço backend.
Se não tiver, adicione:

  backend:
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@cache:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      RESEND_API_KEY: ${RESEND_API_KEY}
      EMAIL_FROM: ${EMAIL_FROM}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      AWS_REGION: ${AWS_REGION}
      AWS_S3_BUCKET: ${AWS_S3_BUCKET}
      S3_PUBLIC_URL: ${S3_PUBLIC_URL}

Sem essas entradas no docker-compose.yml, o container não recebe as variáveis
mesmo que estejam no .env — por isso o Resend retorna "API key inválida".

---

## DEPENDÊNCIAS

  cd backend
  npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer multer-s3

---

## VARIÁVEIS DE AMBIENTE

Adicione ao .env e .env.example:

  AWS_ACCESS_KEY_ID=      # Access Key do usuário IAM
  AWS_SECRET_ACCESS_KEY=  # Secret Key do usuário IAM
  AWS_REGION=us-east-1
  AWS_S3_BUCKET=coach-system-uploas   # nome exato do bucket criado

  # URL pública do bucket (sem trailing slash)
  # Formato: https://NOME-DO-BUCKET.s3.REGIAO.amazonaws.com
  # Exemplo: https://coach-system-uploas.s3.us-east-1.amazonaws.com
  S3_PUBLIC_URL=

---

## ESTRUTURA DE ARQUIVOS NOVOS NO BACKEND

backend/src/
  config/
    s3.js           ← cliente S3 configurado
  middlewares/
    upload.js       ← multer + multer-s3 para upload direto ao S3
  services/
    storage.js      ← funções de upload e delete de arquivos

---

## IMPLEMENTAÇÃO DO BACKEND

### backend/src/config/s3.js

  const { S3Client } = require('@aws-sdk/client-s3');

  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  module.exports = s3;

### backend/src/services/storage.js

  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const s3 = require('../config/s3');

  async function deletarArquivo(key) {
    if (!key) return;
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
      }));
    } catch (err) {
      console.error('[storage] Erro ao deletar arquivo S3:', err.message);
    }
  }

  function urlPublica(key) {
    return `${process.env.S3_PUBLIC_URL}/${key}`;
  }

  module.exports = { deletarArquivo, urlPublica };

### backend/src/middlewares/upload.js

  const multer = require('multer');
  const multerS3 = require('multer-s3');
  const { v4: uuidv4 } = require('uuid');
  const path = require('path');
  const s3 = require('../config/s3');

  // Limites de tamanho por tipo
  const LIMITE_IMAGEM = 15 * 1024 * 1024;   // 15MB — fotos de progresso, thumbs, alimentos
  const LIMITE_VIDEO  = 500 * 1024 * 1024;  // 500MB — vídeos de exercícios do professor

  const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const TIPOS_VIDEO  = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

  function criarUpload({ pasta, tipos, limite }) {
    return multer({
      storage: multerS3({
        s3,
        bucket: process.env.AWS_S3_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase() || '.bin';
          cb(null, `${pasta}/${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: limite },
      fileFilter: (req, file, cb) => {
        if (tipos.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Tipo de arquivo não permitido. Permitidos: ${tipos.join(', ')}`));
        }
      },
    });
  }

  function wrapUpload(uploadFn) {
    return (req, res, next) => {
      uploadFn(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Arquivo muito grande. Verifique o limite permitido.' });
        }
        if (err) {
          return res.status(400).json({ message: err.message });
        }
        next();
      });
    };
  }

  const uploadFotoAluno    = criarUpload({ pasta: 'alunos/fotos',       tipos: TIPOS_IMAGEM, limite: LIMITE_IMAGEM }).single('foto');
  const uploadThumbExerc   = criarUpload({ pasta: 'exercicios/thumbs',  tipos: TIPOS_IMAGEM, limite: LIMITE_IMAGEM }).single('thumbnail');
  const uploadVideoExerc   = criarUpload({ pasta: 'exercicios/videos',  tipos: TIPOS_VIDEO,  limite: LIMITE_VIDEO  }).single('video');
  const uploadFotoAlimento = criarUpload({ pasta: 'alimentos/fotos',    tipos: TIPOS_IMAGEM, limite: LIMITE_IMAGEM }).single('foto');

  module.exports = {
    uploadFotoAluno:    wrapUpload(uploadFotoAluno),
    uploadThumbExerc:   wrapUpload(uploadThumbExerc),
    uploadVideoExerc:   wrapUpload(uploadVideoExerc),
    uploadFotoAlimento: wrapUpload(uploadFotoAlimento),
  };

---

## SUPORTE A URL DO YOUTUBE NOS EXERCÍCIOS

Os exercícios podem ter vídeo de duas formas:
1. Upload direto ao S3 (arquivo mp4/webm)
2. URL do YouTube (o professor cola o link)

### Backend — tabela exercicios

Adicione ao migrate.js:
  -- M010: suporte a YouTube em exercicios
  ALTER TABLE exercicios ADD COLUMN IF NOT EXISTS video_youtube_url TEXT;
  ALTER TABLE exercicios ADD COLUMN IF NOT EXISTS video_tipo TEXT
    CHECK (video_tipo IN ('s3', 'youtube'))
    DEFAULT 'youtube';

Ao salvar vídeo:
- Se vier de upload S3: video_url = URL do S3, video_tipo = 's3', video_youtube_url = null
- Se vier de URL YouTube: video_youtube_url = URL normalizada, video_tipo = 'youtube', video_url = null

Função para normalizar URL do YouTube e extrair o embed:

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

  // URL de embed gerada na hora de retornar ao frontend:
  // https://www.youtube.com/embed/{videoId}

Na rota PUT /api/admin/exercicios/:id, aceitar body:
  {
    video_youtube_url?: string,   // URL do YouTube colada pelo professor
    ... outros campos
  }

Se video_youtube_url enviada:
  - Extrair o videoId
  - Se inválido: retornar 400 { message: "URL do YouTube inválida." }
  - Se válido: salvar video_youtube_url e video_tipo = 'youtube'

Response de GET exercicio — adicionar campo calculado:
  {
    ...campos existentes,
    video_tipo: 's3' | 'youtube' | null,
    video_url: string | null,          // URL S3 se tipo=s3
    video_youtube_url: string | null,  // URL original se tipo=youtube
    video_embed_url: string | null,    // https://www.youtube.com/embed/{id}
  }

### Frontend — Exercicios.jsx

No modal de edição de exercício, substituir campo de URL de vídeo por:

SEÇÃO VÍDEO (duas opções com toggle):

  const [tipoVideo, setTipoVideo] = useState(exercicio.video_tipo || 'youtube');

  {/* Toggle */}
  <div className="flex gap-2 mb-3">
    <button
      onClick={() => setTipoVideo('youtube')}
      className={clsx('text-xs px-3 py-1 rounded font-bold',
        tipoVideo === 'youtube' ? 'bg-brand text-white' : 'bg-surface-elevated text-zinc-400'
      )}
    >
      YouTube
    </button>
    <button
      onClick={() => setTipoVideo('s3')}
      className={clsx('text-xs px-3 py-1 rounded font-bold',
        tipoVideo === 's3' ? 'bg-brand text-white' : 'bg-surface-elevated text-zinc-400'
      )}
    >
      Upload de arquivo
    </button>
  </div>

  {/* Se YouTube */}
  {tipoVideo === 'youtube' && (
    <div>
      <Input
        placeholder="https://www.youtube.com/watch?v=..."
        value={videoYoutubeUrl}
        onChange={(e) => setVideoYoutubeUrl(e.target.value)}
        className="bg-surface-input border-surface-border text-white"
      />
      {/* Preview do embed se URL válida */}
      {videoEmbedUrl && (
        <iframe
          src={videoEmbedUrl}
          className="w-full h-48 rounded-lg mt-2"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          allowFullScreen
        />
      )}
    </div>
  )}

  {/* Se Upload S3 */}
  {tipoVideo === 's3' && (
    <ImageUpload
      label="Vídeo demonstrativo (MP4, WebM — máx. 500MB)"
      accept="video/mp4,video/webm,video/quicktime"
      maxMB={500}
      onUpload={async (file) => {
        const formData = new FormData();
        formData.append('video', file);
        await api.put(`/admin/exercicios/${exercicio.id}/video`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Vídeo enviado!');
      }}
    />
  )}

Na exibição do exercício (modal de detalhe ou card):
  {exercicio.video_tipo === 'youtube' && exercicio.video_embed_url && (
    <iframe
      src={exercicio.video_embed_url}
      className="w-full h-56 rounded-lg"
      allowFullScreen
    />
  )}
  {exercicio.video_tipo === 's3' && exercicio.video_url && (
    <video src={exercicio.video_url} controls className="w-full rounded-lg" />
  )}

---

## ROTAS DE UPLOAD DE FOTOS

### Fotos de progresso do aluno (POST /api/aluno/fotos)

Content-Type: multipart/form-data
Fields: foto (file), posicao (frente|costas|lado_dir|lado_esq)
Middleware: uploadFotoAluno
Lógica:
  - Salvar no S3, s3_key = req.file.key, url = req.file.location
  - data_foto = data atual do servidor
  - enviada_por = req.user.id
  - Salvar em aluno_fotos

### Thumbnail de exercício (PUT /api/admin/exercicios/:id/thumbnail)

Content-Type: multipart/form-data
Fields: thumbnail (file)
Middleware: uploadThumbExerc
Lógica:
  - Se tiver thumbnail_s3_key anterior, chamar deletarArquivo(key)
  - Atualizar exercicio: thumbnail_url, thumbnail_s3_key

### Vídeo de exercício via S3 (PUT /api/admin/exercicios/:id/video)

Content-Type: multipart/form-data
Fields: video (file)
Middleware: uploadVideoExerc
Lógica:
  - Se tiver video_s3_key anterior, chamar deletarArquivo(key)
  - Atualizar exercicio: video_url, video_s3_key, video_tipo = 's3', video_youtube_url = null

### Foto de alimento (PUT /api/admin/alimentos/:id/foto)

Content-Type: multipart/form-data
Fields: foto (file)
Middleware: uploadFotoAlimento
Lógica:
  - Se tiver foto_s3_key anterior, chamar deletarArquivo(key)
  - Atualizar alimento: foto_url, foto_s3_key

---

## MIGRAÇÕES

Adicionar ao migrate.js:

  -- M006: s3_key em aluno_fotos
  ALTER TABLE aluno_fotos ADD COLUMN IF NOT EXISTS s3_key TEXT;
  ALTER TABLE aluno_fotos ADD COLUMN IF NOT EXISTS enviada_por UUID REFERENCES users(id);

  -- M007: s3_keys em exercicios e alimentos
  ALTER TABLE exercicios ADD COLUMN IF NOT EXISTS thumbnail_s3_key TEXT;
  ALTER TABLE exercicios ADD COLUMN IF NOT EXISTS video_s3_key TEXT;
  ALTER TABLE alimentos  ADD COLUMN IF NOT EXISTS foto_s3_key TEXT;

  -- M010: suporte a YouTube em exercicios
  ALTER TABLE exercicios ADD COLUMN IF NOT EXISTS video_youtube_url TEXT;
  ALTER TABLE exercicios ADD COLUMN IF NOT EXISTS video_tipo TEXT
    CHECK (video_tipo IN ('s3', 'youtube'));

---

## COMPONENTE ImageUpload (frontend/src/components/ImageUpload.jsx)

Criar se não existir:

  import { useState, useRef } from 'react';

  function ImageUpload({ label, onUpload, preview, accept = 'image/*', maxMB = 15 }) {
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading]   = useState(false);
    const inputRef = useRef(null);

    async function handleFile(file) {
      if (!file) return;
      if (file.size > maxMB * 1024 * 1024) {
        alert(`Arquivo muito grande. Máximo ${maxMB}MB.`);
        return;
      }
      setLoading(true);
      try {
        await onUpload(file);
      } finally {
        setLoading(false);
      }
    }

    return (
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${dragging ? 'border-brand bg-brand/5' : 'border-surface-border hover:border-zinc-600'}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {loading ? (
          <p className="text-zinc-400 text-sm">Enviando...</p>
        ) : preview ? (
          <img src={preview} alt="preview" className="w-full max-h-48 object-cover rounded-lg" />
        ) : (
          <div>
            <p className="text-zinc-400 text-sm font-medium">{label}</p>
            <p className="text-zinc-600 text-xs mt-1">Arraste ou clique para selecionar</p>
            <p className="text-zinc-700 text-xs mt-0.5">Máx. {maxMB}MB</p>
          </div>
        )}
      </div>
    );
  }

  export default ImageUpload;

---

## AO FINALIZAR

1. Confirme que todas as variáveis AWS estão no docker-compose.yml em environment
2. Confirme que upload de foto de aluno salva no S3 e retorna URL pública
3. Confirme que vídeo do YouTube gera embed_url corretamente
4. Confirme que upload de vídeo S3 aceita até 500MB
5. Confirme que imagens aceitam até 15MB
6. Confirme que tipo inválido retorna mensagem clara
7. Confirme que M006, M007 e M010 estão no migrate.js
8. Execute o rebuild:
   docker build --no-cache -f docker/backend.Dockerfile -t coach-backend:latest .
   docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
   docker service update --force --image coach-backend:latest coach_backend
   docker service update --force --image coach-frontend:latest coach_frontend
