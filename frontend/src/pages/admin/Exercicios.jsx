import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { GRUPOS_MUSCULARES, grupoColors } from '../../lib/gruposMusculares';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ImageUpload from '../../components/ImageUpload';
import { Field } from './Alunos';
import { SkeletonCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';

const NIVEIS = [
  { v: '', l: 'Todos os níveis' },
  { v: 'iniciante', l: 'Iniciante' },
  { v: 'intermediario', l: 'Intermediário' },
  { v: 'avancado', l: 'Avançado' },
];

const EQUIPAMENTOS = [
  'Peso livre',
  'Barra',
  'Halteres',
  'Polia',
  'Máquina',
  'Cabo',
  'Kettlebell',
  'Elástico',
  'Peso corporal',
  'Cardio',
];

export default function Exercicios() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [nivel, setNivel] = useState('');
  const [grupo, setGrupo] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmandoDesativar, setConfirmandoDesativar] = useState(null);
  const [salvandoStatus, setSalvandoStatus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/exercicios', {
        params: {
          busca: busca || undefined,
          nivel: nivel || undefined,
          grupo_muscular: grupo || undefined,
          ativo: mostrarInativos ? 'false' : undefined,
        },
      });
      setData(res.data.data || []);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [busca, nivel, grupo, mostrarInativos, toast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function aplicarStatus(ex) {
    try {
      setSalvandoStatus(true);
      await api.patch(`/admin/exercicios/${ex.id}/${ex.ativo ? 'desativar' : 'ativar'}`);
      toast.success(ex.ativo ? 'Exercício desativado.' : 'Exercício reativado.');
      setConfirmandoDesativar(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSalvandoStatus(false);
    }
  }

  function handleStatusClick(ex) {
    if (ex.ativo) {
      setConfirmandoDesativar(ex);
    } else {
      aplicarStatus(ex);
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 max-w-7xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-section-label">Biblioteca</div>
          <h1 className="text-page-title mt-1">Exercícios</h1>
        </div>
        <Button onClick={() => setOpenCreate(true)}>+ Adicionar exercício</Button>
      </header>

      <Card className="p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1"><Input placeholder="Buscar por nome…" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
          className="bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm md:w-52 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          <option value="">Todos os grupos</option>
          {GRUPOS_MUSCULARES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={nivel} onChange={(e) => setNivel(e.target.value)}
          className="bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm md:w-48">
          {NIVEIS.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400 cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
            className="accent-brand w-4 h-4"
          />
          Mostrar inativos
        </label>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icone="💪"
          titulo="Nenhum exercício cadastrado"
          descricao="Comece montando sua biblioteca de exercícios."
        />
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {data.map((ex) => (
          <Card key={ex.id} className="p-4 cursor-pointer hover:bg-surface-elevated transition-colors" onClick={() => setEditing(ex.id)}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-white truncate">{ex.nome}</h3>
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusClick(ex); }}
                className={
                  'shrink-0 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ' +
                  (ex.ativo
                    ? 'bg-green-950 border-green-900 text-green-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500')
                }
              >
                {ex.ativo ? 'Ativo' : 'Inativo'}
              </button>
            </div>
            {ex.grupo_muscular && (
              <span className={`inline-block mt-1.5 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${grupoColors(ex.grupo_muscular).badge}`}>
                {ex.grupo_muscular}
              </span>
            )}
            <div className="flex gap-2 mt-3 text-[10px] uppercase tracking-widest text-zinc-600">
              {ex.equipamento && <span>· {ex.equipamento}</span>}
              {ex.nivel && <span>· {ex.nivel}</span>}
            </div>
          </Card>
        ))}
      </div>
      )}

      <ExercicioModal
        open={openCreate || !!editing}
        onClose={() => { setOpenCreate(false); setEditing(null); }}
        exId={editing}
        onSaved={() => { setOpenCreate(false); setEditing(null); load(); }}
      />

      <ConfirmModal
        aberto={!!confirmandoDesativar}
        titulo="Desativar exercício?"
        descricao={
          confirmandoDesativar
            ? `"${confirmandoDesativar.nome}" será ocultado das buscas e dos treinos novos. Treinos que já usam este exercício continuam funcionando. Você pode reativá-lo a qualquer momento marcando "Mostrar inativos".`
            : ''
        }
        textoBotao="Sim, desativar"
        variante="warning"
        carregando={salvandoStatus}
        onConfirmar={() => confirmandoDesativar && aplicarStatus(confirmandoDesativar)}
        onCancelar={() => setConfirmandoDesativar(null)}
      />
    </div>
  );
}

function extrairYoutubeId(url) {
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

function ExercicioModal({ open, onClose, exId, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [tipoVideo, setTipoVideo] = useState('youtube');
  const isEdit = !!exId;

  useEffect(() => {
    if (!open) return;
    if (!exId) {
      setForm({
        nome: '', grupo_muscular: '', equipamento: '', nivel: 'intermediario',
        video_url: '', video_youtube_url: '', video_tipo: 'youtube',
        observacoes_tecnicas: '', execucao_correta: '', execucao_errada: '',
        descanso_padrao_seg: 60, series_recomendadas: 4, repeticoes_recomendadas: '8-12', cadencia: '',
      });
      setTipoVideo('youtube');
    } else {
      (async () => {
        try {
          const res = await api.get(`/admin/exercicios/${exId}`);
          setForm(res.data);
          setTipoVideo(res.data.video_tipo || (res.data.video_youtube_url ? 'youtube' : (res.data.video_url ? 's3' : 'youtube')));
        } catch (err) {
          toast.error(errorMessage(err));
        }
      })();
    }
  }, [open, exId, toast]);

  async function salvar() {
    if (!form.nome || !form.grupo_muscular) {
      toast.error('Nome e grupo muscular são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id; delete payload.ativo; delete payload.created_at; delete payload.updated_at;
      delete payload.video_embed_url; delete payload.thumbnail_s3_key; delete payload.video_s3_key;
      // Se tipo for YouTube, mandamos video_youtube_url. Se for S3, não tocamos no campo
      // (upload de vídeo via rota separada já gravou video_url + video_tipo='s3').
      if (tipoVideo === 'youtube') {
        if (!payload.video_youtube_url) {
          delete payload.video_youtube_url;
          delete payload.video_tipo;
        }
      } else {
        delete payload.video_youtube_url;
        delete payload.video_tipo;
      }
      Object.keys(payload).forEach((k) => { if (payload[k] === '' || payload[k] == null) delete payload[k]; });

      if (isEdit) {
        await api.put(`/admin/exercicios/${exId}`, payload);
        toast.success('Exercício atualizado.');
      } else {
        await api.post('/admin/exercicios', payload);
        toast.success('Exercício cadastrado.');
      }
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function uploadVideoS3(file) {
    if (!isEdit) {
      toast.error('Salve o exercício antes de enviar o vídeo.');
      return;
    }
    const fd = new FormData();
    fd.append('video', file);
    try {
      const res = await api.put(`/admin/exercicios/${exId}/video`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((f) => ({ ...f, video_url: res.data.video_url, video_s3_key: res.data.video_s3_key, video_tipo: 's3', video_youtube_url: '' }));
      toast.success('Vídeo enviado.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const youtubeId = extrairYoutubeId(form.video_youtube_url);
  const embedUrl  = youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar exercício' : 'Novo exercício'}
      size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Cadastrar'}</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nome *"><Input value={form.nome || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, nome: v })); }} /></Field>
          <Field label="Grupo muscular *">
            <select
              value={form.grupo_muscular || ''}
              onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, grupo_muscular: v })); }}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">Selecione…</option>
              {GRUPOS_MUSCULARES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Equipamento">
            <select
              value={form.equipamento || ''}
              onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, equipamento: v })); }}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">Selecione…</option>
              {EQUIPAMENTOS.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          </Field>
          <Field label="Nível">
            <select value={form.nivel || 'intermediario'} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, nivel: v })); }}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm">
              <option value="iniciante">Iniciante</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Séries recom."><Input type="number" value={form.series_recomendadas ?? ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, series_recomendadas: v })); }} /></Field>
          <Field label="Reps. recom."><Input value={form.repeticoes_recomendadas ?? ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, repeticoes_recomendadas: v })); }} placeholder="8-12" /></Field>
          <Field label="Descanso (s)"><Input type="number" value={form.descanso_padrao_seg ?? ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, descanso_padrao_seg: v })); }} /></Field>
          <Field label="Cadência"><Input value={form.cadencia ?? ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, cadencia: v })); }} placeholder="2-1-2" /></Field>
        </div>

        <div>
          <div className="text-section-label mb-2">Vídeo demonstrativo</div>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setTipoVideo('youtube')}
              className={
                'text-xs px-3 py-1 rounded font-bold ' +
                (tipoVideo === 'youtube' ? 'bg-brand text-[#0A0A0E]' : 'bg-surface-elevated text-zinc-400')
              }
            >
              YouTube
            </button>
            <button
              type="button"
              onClick={() => setTipoVideo('s3')}
              className={
                'text-xs px-3 py-1 rounded font-bold ' +
                (tipoVideo === 's3' ? 'bg-brand text-[#0A0A0E]' : 'bg-surface-elevated text-zinc-400')
              }
            >
              Upload de arquivo
            </button>
          </div>

          {tipoVideo === 'youtube' && (
            <div className="space-y-2">
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={form.video_youtube_url || ''}
                onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, video_youtube_url: v })); }}
              />
              {embedUrl && (
                <iframe
                  src={embedUrl}
                  title="Pré-visualização"
                  className="w-full h-56 rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                  allowFullScreen
                />
              )}
            </div>
          )}

          {tipoVideo === 's3' && (
            <div className="space-y-2">
              <ImageUpload
                label="Selecione o vídeo (MP4/WebM/MOV — máx. 500MB)"
                accept="video/mp4,video/webm,video/quicktime"
                maxMB={500}
                onUpload={uploadVideoS3}
              />
              {form.video_url && form.video_tipo === 's3' && (
                <video src={form.video_url} controls className="w-full rounded-lg max-h-64" />
              )}
              {!isEdit && (
                <p className="text-xs text-zinc-600">Salve o exercício primeiro para habilitar o upload.</p>
              )}
            </div>
          )}
        </div>

        <Field label="Observações técnicas">
          <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm resize-none"
            value={form.observacoes_tecnicas || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, observacoes_tecnicas: v })); }} />
        </Field>
        <Field label="Execução correta">
          <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm resize-none"
            value={form.execucao_correta || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, execucao_correta: v })); }} />
        </Field>
        <Field label="Execução errada">
          <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm resize-none"
            value={form.execucao_errada || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, execucao_errada: v })); }} />
        </Field>
      </div>
    </Modal>
  );
}
