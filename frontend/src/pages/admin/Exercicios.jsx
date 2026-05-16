import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Field } from './Alunos';

const NIVEIS = [
  { v: '', l: 'Todos os níveis' },
  { v: 'iniciante', l: 'Iniciante' },
  { v: 'intermediario', l: 'Intermediário' },
  { v: 'avancado', l: 'Avançado' },
];

export default function Exercicios() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [nivel, setNivel] = useState('');
  const [grupo, setGrupo] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/exercicios', {
        params: { busca: busca || undefined, nivel: nivel || undefined, grupo_muscular: grupo || undefined },
      });
      setData(res.data.data || []);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [busca, nivel, grupo, toast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleAtivo(ex) {
    try {
      await api.patch(`/admin/exercicios/${ex.id}/${ex.ativo ? 'desativar' : 'ativar'}`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-section-label">Biblioteca</div>
          <h1 className="text-page-title mt-1">Exercícios</h1>
        </div>
        <Button onClick={() => setOpenCreate(true)}>+ Adicionar exercício</Button>
      </header>

      <Card className="p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1"><Input placeholder="Buscar por nome…" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <Input placeholder="Grupo muscular" value={grupo} onChange={(e) => setGrupo(e.target.value)} className="md:w-48" />
        <select value={nivel} onChange={(e) => setNivel(e.target.value)}
          className="bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm md:w-48">
          {NIVEIS.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}
        </select>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <div className="col-span-full text-center text-zinc-500 py-10">Carregando…</div>}
        {!loading && data.length === 0 && (
          <div className="col-span-full text-center text-zinc-500 py-10">Nenhum exercício encontrado.</div>
        )}
        {data.map((ex) => (
          <Card key={ex.id} className="overflow-hidden cursor-pointer hover:bg-surface-elevated transition-colors" onClick={() => setEditing(ex.id)}>
            <div className="aspect-video bg-surface-input flex items-center justify-center overflow-hidden">
              {ex.thumbnail_url ? (
                <img src={ex.thumbnail_url} alt={ex.nome} className="w-full h-full object-cover" />
              ) : (
                <div className="text-zinc-700 text-xs uppercase tracking-widest">Sem mídia</div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-white truncate">{ex.nome}</h3>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleAtivo(ex); }}
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
              <div className="text-xs text-zinc-500 mt-1">{ex.grupo_muscular}</div>
              <div className="flex gap-2 mt-3 text-[10px] uppercase tracking-widest text-zinc-600">
                {ex.equipamento && <span>· {ex.equipamento}</span>}
                {ex.nivel && <span>· {ex.nivel}</span>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ExercicioModal
        open={openCreate || !!editing}
        onClose={() => { setOpenCreate(false); setEditing(null); }}
        exId={editing}
        onSaved={() => { setOpenCreate(false); setEditing(null); load(); }}
      />
    </div>
  );
}

function ExercicioModal({ open, onClose, exId, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const isEdit = !!exId;

  useEffect(() => {
    if (!open) return;
    if (!exId) {
      setForm({
        nome: '', grupo_muscular: '', equipamento: '', nivel: 'intermediario',
        video_url: '', thumbnail_url: '',
        observacoes_tecnicas: '', execucao_correta: '', execucao_errada: '',
        descanso_padrao_seg: 60, series_recomendadas: 4, repeticoes_recomendadas: '8-12', cadencia: '',
      });
    } else {
      (async () => {
        try {
          const res = await api.get(`/admin/exercicios/${exId}`);
          setForm(res.data);
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
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome *"><Input value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Grupo muscular *"><Input value={form.grupo_muscular || ''} onChange={(e) => setForm({ ...form, grupo_muscular: e.target.value })} /></Field>
          <Field label="Equipamento"><Input value={form.equipamento || ''} onChange={(e) => setForm({ ...form, equipamento: e.target.value })} /></Field>
          <Field label="Nível">
            <select value={form.nivel || 'intermediario'} onChange={(e) => setForm({ ...form, nivel: e.target.value })}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm">
              <option value="iniciante">Iniciante</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
          </Field>
          <Field label="URL do vídeo"><Input value={form.video_url || ''} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></Field>
          <Field label="URL da thumbnail"><Input value={form.thumbnail_url || ''} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></Field>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Field label="Séries recom."><Input type="number" value={form.series_recomendadas ?? ''} onChange={(e) => setForm({ ...form, series_recomendadas: e.target.value })} /></Field>
          <Field label="Reps. recom."><Input value={form.repeticoes_recomendadas ?? ''} onChange={(e) => setForm({ ...form, repeticoes_recomendadas: e.target.value })} placeholder="8-12" /></Field>
          <Field label="Descanso (s)"><Input type="number" value={form.descanso_padrao_seg ?? ''} onChange={(e) => setForm({ ...form, descanso_padrao_seg: e.target.value })} /></Field>
          <Field label="Cadência"><Input value={form.cadencia ?? ''} onChange={(e) => setForm({ ...form, cadencia: e.target.value })} placeholder="2-1-2" /></Field>
        </div>

        <Field label="Observações técnicas">
          <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
            value={form.observacoes_tecnicas || ''} onChange={(e) => setForm({ ...form, observacoes_tecnicas: e.target.value })} />
        </Field>
        <Field label="Execução correta">
          <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
            value={form.execucao_correta || ''} onChange={(e) => setForm({ ...form, execucao_correta: e.target.value })} />
        </Field>
        <Field label="Execução errada">
          <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
            value={form.execucao_errada || ''} onChange={(e) => setForm({ ...form, execucao_errada: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
