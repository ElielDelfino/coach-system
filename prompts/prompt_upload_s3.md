Preciso implementar upload real de fotos no projeto Coach System usando AWS S3.
Leia o CLAUDE.md antes de começar.

---

## DEPENDÊNCIAS

cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer multer-s3

cd frontend
npm install (sem dependências novas — usar input file nativo)

---

## VARIÁVEIS DE AMBIENTE

Adicione ao .env e .env.example:

  AWS_ACCESS_KEY_ID=
  AWS_SECRET_ACCESS_KEY=
  AWS_REGION=us-east-1
  AWS_S3_BUCKET=coach-system-uploads

  # URL pública do bucket (sem trailing slash)
  # Ex: https://coach-system-uploads.s3.us-east-1.amazonaws.com
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
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    }));
  }

  function urlPublica(key) {
    return `${process.env.S3_PUBLIC_URL}/${key}`;
  }

  module.exports = { deletarArquivo, urlPublica };

### backend/src/middlewares/upload.js

  const multer = require('multer');
  const multerS3 = require('multer-s3');
  const { v4: uuidv4 } = require('uuid');
  const s3 = require('../config/s3');
  const path = require('path');

  const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
  const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10MB

  function criarUpload(pasta) {
    return multer({
      storage: multerS3({
        s3,
        bucket: process.env.AWS_S3_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${pasta}/${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: TAMANHO_MAXIMO },
      fileFilter: (req, file, cb) => {
        if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.'));
        }
      },
    });
  }

  // Instâncias por pasta
  const uploadFotoAluno    = criarUpload('alunos/fotos').single('foto');
  const uploadThumbExerc   = criarUpload('exercicios/thumbs').single('thumbnail');
  const uploadVideoExerc   = criarUpload('exercicios/videos').single('video');
  const uploadFotoAlimento = criarUpload('alimentos/fotos').single('foto');

  // Wrapper para tratar erro do multer como JSON
  function wrapUpload(uploadFn) {
    return (req, res, next) => {
      uploadFn(req, res, (err) => {
        if (err) {
          return res.status(400).json({ message: err.message });
        }
        next();
      });
    };
  }

  module.exports = {
    uploadFotoAluno:    wrapUpload(uploadFotoAluno),
    uploadThumbExerc:   wrapUpload(uploadThumbExerc),
    uploadVideoExerc:   wrapUpload(uploadVideoExerc),
    uploadFotoAlimento: wrapUpload(uploadFotoAlimento),
  };

---

## ROTAS DE UPLOAD

### 1. Fotos de progresso do aluno

Rota existente que salvava URL manual — substituir por upload real:

  POST /api/admin/alunos/:id/fotos
  Content-Type: multipart/form-data
  Fields: foto (file), posicao (text: frente|costas|lado_dir|lado_esq), data_foto (date)

  Middleware: uploadFotoAluno (antes do controller)

  Controller:
  1. req.file.location = URL pública no S3
  2. req.file.key = chave do arquivo no S3 (para deletar depois)
  3. Salvar na tabela aluno_fotos: url = req.file.location, s3_key = req.file.key
  4. Retornar: { id, url, posicao, data_foto, created_at }

  Adicione coluna s3_key na tabela aluno_fotos:
  -- M006: adicionar s3_key em aluno_fotos
  ALTER TABLE aluno_fotos ADD COLUMN IF NOT EXISTS s3_key TEXT;

  DELETE /api/admin/alunos/fotos/:fotoId
  1. Buscar a foto pelo id
  2. Chamar deletarArquivo(foto.s3_key)
  3. Deletar o registro do banco
  4. Retornar 200: { message: "Foto removida." }

### 2. Thumbnail de exercício

  PUT /api/admin/exercicios/:id/thumbnail
  Content-Type: multipart/form-data
  Fields: thumbnail (file)

  Middleware: uploadThumbExerc

  Controller:
  1. Buscar exercício atual para pegar s3_key anterior
  2. Se tiver s3_key anterior, chamar deletarArquivo(s3_key_anterior)
  3. Atualizar exercicio: thumbnail_url = req.file.location, thumbnail_s3_key = req.file.key
  4. Retornar: { id, thumbnail_url }

  Adicione coluna thumbnail_s3_key:
  -- M007: adicionar s3_keys em exercicios e alimentos
  ALTER TABLE exercicios ADD COLUMN IF NOT EXISTS thumbnail_s3_key TEXT;
  ALTER TABLE exercicios ADD COLUMN IF NOT EXISTS video_s3_key TEXT;
  ALTER TABLE alimentos  ADD COLUMN IF NOT EXISTS foto_s3_key TEXT;

### 3. Vídeo demonstrativo de exercício

  PUT /api/admin/exercicios/:id/video
  Content-Type: multipart/form-data
  Fields: video (file)

  Middleware: uploadVideoExerc
  Tipos permitidos para vídeo: video/mp4, video/webm (ajustar no middleware)
  Tamanho máximo para vídeo: 100MB

  Controller: mesmo padrão do thumbnail

### 4. Foto de alimento

  PUT /api/admin/alimentos/:id/foto
  Content-Type: multipart/form-data
  Fields: foto (file)

  Middleware: uploadFotoAlimento

  Controller: mesmo padrão do thumbnail

---

## FRONTEND — COMPONENTE DE UPLOAD

Crie frontend/src/components/ImageUpload.jsx:

  function ImageUpload({ label, onUpload, preview, accept = 'image/*', maxMB = 10 }) {
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading]   = useState(false);
    const inputRef = useRef(null);

    async function handleFile(file) {
      if (!file) return;
      if (file.size > maxMB * 1024 * 1024) {
        toast.error(`Arquivo muito grande. Máximo ${maxMB}MB.`);
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
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
          dragging
            ? 'border-brand bg-brand/5'
            : 'border-surface-border hover:border-zinc-600'
        )}
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
            <p className="text-zinc-700 text-xs mt-0.5">JPEG, PNG ou WebP — máx. {maxMB}MB</p>
          </div>
        )}
      </div>
    );
  }

  export default ImageUpload;

---

## ATUALIZAR PÁGINAS EXISTENTES

### AlunoDetalhe.jsx — tab Fotos

Substituir input de URL por componente ImageUpload:

  // Upload de foto do aluno
  async function handleUploadFoto(file, posicao) {
    const formData = new FormData();
    formData.append('foto', file);
    formData.append('posicao', posicao);
    formData.append('data_foto', new Date().toISOString().split('T')[0]);

    await api.post(`/admin/alunos/${alunoId}/fotos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    await carregarFotos();
    toast.success('Foto enviada!');
  }

  // Remover foto
  async function handleRemoverFoto(fotoId) {
    await api.delete(`/admin/alunos/fotos/${fotoId}`);
    await carregarFotos();
    toast.success('Foto removida.');
  }

  // Para cada posição no grid 2x2
  <ImageUpload
    label="Foto frente"
    preview={fotos.find(f => f.posicao === 'frente')?.url}
    onUpload={(file) => handleUploadFoto(file, 'frente')}
  />

### Exercicios.jsx — modal de edição

Adicionar campos de upload:

  // Thumbnail
  <ImageUpload
    label="Thumbnail do exercício"
    preview={exercicio.thumbnail_url}
    onUpload={async (file) => {
      const formData = new FormData();
      formData.append('thumbnail', file);
      const res = await api.put(`/admin/exercicios/${exercicio.id}/thumbnail`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExercicio(prev => ({ ...prev, thumbnail_url: res.data.thumbnail_url }));
    }}
  />

  // Vídeo (aceita mp4 e webm)
  <ImageUpload
    label="Vídeo demonstrativo"
    accept="video/mp4,video/webm"
    maxMB={100}
    preview={null}
    onUpload={async (file) => {
      const formData = new FormData();
      formData.append('video', file);
      await api.put(`/admin/exercicios/${exercicio.id}/video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Vídeo enviado!');
    }}
  />

### Alimentos.jsx — modal de edição

  <ImageUpload
    label="Foto do alimento"
    preview={alimento.foto_url}
    onUpload={async (file) => {
      const formData = new FormData();
      formData.append('foto', file);
      const res = await api.put(`/admin/alimentos/${alimento.id}/foto`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAlimento(prev => ({ ...prev, foto_url: res.data.foto_url }));
    }}
  />

---

## CONFIGURAÇÃO DO BUCKET S3

Antes de testar, configure o bucket no AWS Console:

1. Criar bucket com nome coach-system-uploads na região us-east-1
2. Desabilitar "Block all public access"
3. Adicionar bucket policy para leitura pública:
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": "*",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::coach-system-uploads/*"
     }]
   }
4. Criar usuário IAM com política AmazonS3FullAccess
5. Gerar Access Key e Secret Key para esse usuário
6. Preencher no .env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_PUBLIC_URL

---

## AO FINALIZAR

1. Confirme que upload de foto de aluno salva no S3 e retorna URL pública
2. Confirme que delete de foto remove do S3 E do banco
3. Confirme que thumbnail e vídeo de exercício funcionam
4. Confirme que foto de alimento funciona
5. Confirme que arquivo > 10MB é rejeitado com mensagem clara
6. Confirme que tipo inválido é rejeitado com mensagem clara
7. Confirme que M006 e M007 estão nas migrações do migrate.js
8. Execute o rebuild:
   docker build --no-cache -f docker/backend.Dockerfile -t coach-backend:latest .
   docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
   docker service update --force --image coach-backend:latest coach_backend
   docker service update --force --image coach-frontend:latest coach_frontend
