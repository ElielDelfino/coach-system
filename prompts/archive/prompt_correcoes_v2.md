Preciso corrigir 5 problemas no projeto Coach System.
Leia o CLAUDE.md antes de começar. Execute um problema por vez na ordem abaixo.

---

## PROBLEMA 1 — Fotos: fluxo invertido (aluno envia, admin recebe)

### Contexto atual (errado)
O admin fazia upload de fotos do aluno. Isso está invertido.

### Fluxo correto
1. Aluno faz upload das fotos na sua área (Perfil.jsx)
2. Admin visualiza e gerencia as fotos na AlunoDetalhe.jsx
3. Aluno pode excluir foto SOMENTE antes de o admin visualizar (ou nunca — ver regra abaixo)
4. Admin pode excluir qualquer foto a qualquer momento

### Regra de exclusão
- Admin: pode excluir qualquer foto
- Aluno: NÃO pode excluir foto após envio (somente o admin pode)

### Backend — alterações

Adicione campo `enviada_por` na tabela aluno_fotos:
  -- M008
  ALTER TABLE aluno_fotos ADD COLUMN IF NOT EXISTS enviada_por UUID REFERENCES users(id);

Rotas existentes a MANTER (admin visualiza e deleta):
  GET    /api/admin/alunos/:id/fotos  ← sem alteração
  DELETE /api/admin/alunos/fotos/:fotoId ← sem alteração

Rotas NOVAS para o aluno:
  GET /api/aluno/fotos
  Response: fotos agrupadas por data (ver estrutura abaixo)

  POST /api/aluno/fotos
  Content-Type: multipart/form-data
  Fields: foto (file), posicao (frente|costas|lado_dir|lado_esq)
  Lógica:
  - Salvar no S3 em alunos/fotos/ (usar o mesmo upload.js que já existe)
  - data_foto = data atual (servidor)
  - enviada_por = req.user.id
  - Retornar: { id, url, posicao, data_foto, created_at }

  REMOVER rota DELETE /api/aluno/fotos/:id (aluno não pode excluir)

Response de GET /api/aluno/fotos — agrupado por data:
  [
    {
      "data": "2025-05-10",
      "fotos": [
        { "id": "uuid", "url": "...", "posicao": "frente" },
        { "id": "uuid", "url": "...", "posicao": "costas" },
        { "id": "uuid", "url": "...", "posicao": "lado_dir" },
        { "id": "uuid", "url": "...", "posicao": "lado_esq" }
      ]
    }
  ]

Mesma estrutura para GET /api/admin/alunos/:id/fotos — agrupar por data no controller.

### Frontend — Perfil.jsx (área do aluno)

Tab "Minhas Fotos":

BLOCOS POR DATA (ordenados do mais recente para o mais antigo):
  Para cada bloco:
  - Título: data formatada (ex: "10 de maio de 2025")
  - Grid 2x2 com as 4 posições: Frente | Costas | Lado Esq | Lado Dir
  - Se posição não tiver foto no bloco: célula vazia com placeholder

BOTÃO "Enviar novas fotos":
  Abre modal com 4 campos ImageUpload (um por posição)
  Não é obrigatório enviar todas as 4 — pode enviar só algumas
  Ao confirmar: faz POST para cada foto selecionada (Promise.all)
  Após envio: recarrega a lista de blocos

SEM botão de excluir para o aluno.

### Frontend — AlunoDetalhe.jsx (área do admin)

Tab "Fotos":

MESMA estrutura de blocos por data
Cada foto tem botão "🗑" para excluir (DELETE /api/admin/alunos/fotos/:fotoId)
Confirmação antes de excluir: "Tem certeza que deseja excluir esta foto?"

---

## PROBLEMA 2 — Medidas: campos faltando na tabela e na última medição

### Contexto
O formulário de nova medição tem 16 campos mas a tabela e o card de última medição
mostram apenas 7. Além disso, o card de última medição não está sendo preenchido
com os dados da medição mais recente.

### Verificar primeiro
Rode no banco para ver as colunas reais de aluno_medidas:
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'aluno_medidas' ORDER BY ordinal_position;

### Campos que devem aparecer na tabela (todos os 16)
Se as colunas existirem no banco, exibir todas:
  data_medicao, peso_kg, altura_cm, percentual_gordura,
  peso_magro_kg, peso_gordo_kg,
  cintura_cm, quadril_cm, abdomen_cm,
  braco_dir_cm, braco_esq_cm,
  antebraco_dir_cm, antebraco_esq_cm,
  coxa_dir_cm, coxa_esq_cm,
  panturrilha_dir_cm, panturrilha_esq_cm

Se alguma coluna não existir no banco, adicionar via migration:
  -- M009: colunas faltantes em aluno_medidas
  ALTER TABLE aluno_medidas
    ADD COLUMN IF NOT EXISTS abdomen_cm          NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS antebraco_dir_cm    NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS antebraco_esq_cm    NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS panturrilha_dir_cm  NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS panturrilha_esq_cm  NUMERIC(5,1);

### Corrigir GET /api/admin/alunos/:id/medidas e GET /api/aluno/medidas

A query deve retornar TODOS os campos de aluno_medidas, não apenas 7.
Verificar o model e corrigir o SELECT para usar SELECT * ou listar todos os campos.

### Corrigir card de última medição

Em GET /api/admin/alunos/:id, o campo ultima_medicao deve vir da medição
mais recente (MAX data_medicao). Verificar a query e corrigir:

  LEFT JOIN LATERAL (
    SELECT *
    FROM aluno_medidas
    WHERE aluno_id = a.id
    ORDER BY data_medicao DESC
    LIMIT 1
  ) m ON true

Retornar todos os campos de m no JSON, não apenas 7.

### Corrigir tabela de medidas no frontend (admin e aluno)

AlunoDetalhe.jsx e Perfil.jsx — tab Medidas:

A tabela deve ter scroll horizontal (overflow-x-auto) para caber todas as colunas.
Colunas da tabela (com labels amigáveis):

  Data | Peso | Altura | %BF | P.Magro | P.Gordo |
  Cintura | Quadril | Abdômen |
  Braço D | Braço E | Antebraço D | Antebraço E |
  Coxa D | Coxa E | Panturrilha D | Panturrilha E

Células vazias (null): exibir "—" em text-zinc-600.

### Corrigir card de última medição no frontend

Perfil.jsx — card no topo da tab Medidas:
Exibir TODOS os campos não nulos da última medição, não apenas 7.
Layout: grid responsivo de 3 ou 4 colunas com cards pequenos por métrica.

---

## PROBLEMA 3 — PDF: botão de download + EMAIL_FROM não configurado

### 3.1 — Botão de download do PDF (admin e aluno)

O PDF deve poder ser baixado diretamente, sem precisar enviar email.

Nova rota no backend:
  GET /api/admin/protocolos/:id/pdf
  Auth: Bearer token | Role: admin
  Response: arquivo PDF (application/pdf) com header Content-Disposition: attachment

  GET /api/aluno/protocolos/:id/pdf
  Auth: Bearer token | Role: aluno
  Response: arquivo PDF (application/pdf) com header Content-Disposition: attachment
  Erro 403 se o protocolo não pertencer ao aluno

  Controller para ambas as rotas:
  1. Buscar todos os dados do protocolo
  2. Chamar gerarPDFProtocolo(dados)
  3. res.setHeader('Content-Type', 'application/pdf')
  4. res.setHeader('Content-Disposition', `attachment; filename="protocolo-${protocolo.nome}.pdf"`)
  5. res.send(pdfBuffer)

No frontend:

AlunoDetalhe.jsx — na lista de protocolos do admin, adicionar botão:
  <Button onClick={() => baixarPDF(protocolo.id)} variant="ghost"
    className="text-zinc-400 border border-zinc-700 hover:text-white text-xs">
    ⬇ Baixar PDF
  </Button>

  async function baixarPDF(id) {
    const res = await api.get(`/admin/protocolos/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `protocolo-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

MeuProtocolo.jsx — na área do aluno, adicionar botão:
  Mesmo padrão usando GET /api/aluno/protocolos/:id/pdf

### 3.2 — Corrigir erro EMAIL_FROM não configurado

No email.js, adicionar validação antes de tentar enviar:

  async function enviarProtocoloPorEmail(...) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === '') {
      throw new Error('RESEND_API_KEY não configurada. Configure no .env para enviar emails.');
    }
    if (!process.env.EMAIL_FROM || process.env.EMAIL_FROM === '') {
      throw new Error('EMAIL_FROM não configurado. Configure no .env para enviar emails.');
    }
    // ... resto da função
  }

No controller de enviar PDF por email, melhorar a mensagem de erro 500:
  } catch (err) {
    console.error('[enviarPDF]', err.message);
    return res.status(500).json({
      message: err.message.includes('não configurad')
        ? err.message
        : 'Erro ao gerar ou enviar o PDF. Tente novamente.'
    });
  }

---

## PROBLEMA 4 — Imagem de alimentos não aparece ao adicionar URL

### Verificar

O campo foto_url em alimentos provavelmente está sendo salvo mas não está sendo
retornado corretamente no GET /api/admin/alimentos/:id ou GET /api/admin/alimentos.

### Corrigir backend

Verificar o SELECT na função de listagem de alimentos em aluno.js (model).
Garantir que foto_url está incluído nos campos retornados em TODAS as queries:
  - findAllAlimentos (listagem)
  - findAlimentoById (detalhe)

### Corrigir frontend — Alimentos.jsx

No card ou linha do alimento na listagem, exibir a imagem se foto_url existir:

  {alimento.foto_url && (
    <img
      src={alimento.foto_url}
      alt={alimento.nome}
      className="w-10 h-10 rounded-lg object-cover bg-surface-elevated"
      onError={(e) => { e.target.style.display = 'none'; }} // esconde se URL inválida
    />
  )}

No modal de edição/criação do alimento:
- Campo "URL da foto": input text com placeholder "https://..."
- Preview da imagem abaixo do campo (se URL preenchida):
  {fotoUrl && (
    <img src={fotoUrl} alt="preview"
      className="w-20 h-20 rounded-lg object-cover mt-2 bg-surface-elevated"
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  )}

---

## PROBLEMA 5 — Módulo Cardio redundante no Protocol Builder

### Contexto
O ProtocoloBuilder tem um módulo "Cardio" separado na sidebar, mas cardio já é
adicionado dentro do Módulo Treino escolhendo tipo "Cardio". O módulo separado
está vazio e confunde o usuário.

### Solução
Remover o módulo Cardio da sidebar do ProtocoloBuilder.

No ProtocoloBuilder.jsx:
1. Remover "Cardio" da lista de módulos da sidebar
2. Remover o componente/renderização do módulo Cardio
3. Manter o tipo "Cardio" disponível dentro do Módulo Treino (já funciona)
4. Se houver flag modulo_cardio no protocolo, mantê-la no banco mas não exibir
   como módulo separado no builder

Adicionar tooltip ou texto explicativo no Módulo Treino:
  <p className="text-xs text-zinc-600 mt-1">
    Para adicionar cardio, escolha o tipo "Cardio" ao adicionar um exercício.
  </p>

---

## AO FINALIZAR

1. Confirme que aluno consegue enviar fotos e elas aparecem em blocos por data
2. Confirme que admin vê os mesmos blocos e pode excluir fotos
3. Confirme que aluno NÃO tem botão de excluir
4. Confirme que tabela de medidas mostra todos os campos com scroll horizontal
5. Confirme que card de última medição é preenchido com dados reais
6. Confirme que botão "Baixar PDF" funciona no admin e no aluno
7. Confirme que erro de EMAIL_FROM retorna mensagem clara
8. Confirme que foto de alimento aparece na listagem e no modal
9. Confirme que módulo Cardio foi removido da sidebar do ProtocoloBuilder
10. Aplicar migrações M008 e M009 no migrate.js
11. Execute o rebuild:
    docker build --no-cache -f docker/backend.Dockerfile -t coach-backend:latest .
    docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
    docker service update --force --image coach-backend:latest coach_backend
    docker service update --force --image coach-frontend:latest coach_frontend
