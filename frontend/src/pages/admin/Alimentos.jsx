import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { useToast, errorMessage } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ImageUpload from '../../components/ImageUpload';
import { Field } from './Alunos';
import { SkeletonTabela } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const UNIDADES = [
  { v: 'gramas', l: 'Gramas (g)' },
  { v: 'ml', l: 'Mililitros (ml)' },
  { v: 'unidade', l: 'Unidade' },
  { v: 'colher_sopa', l: 'Colher de sopa' },
  { v: 'colher_cha', l: 'Colher de chá' },
  { v: 'scoop', l: 'Scoop' },
];

export default function Alimentos() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/alimentos', {
        params: { busca: busca || undefined, categoria: categoria || undefined },
      });
      setData(res.data.data || []);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [busca, categoria, toast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleAtivo(al) {
    try {
      await api.patch(`/admin/alimentos/${al.id}/${al.ativo ? 'desativar' : 'ativar'}`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 max-w-7xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-section-label">Biblioteca nutricional</div>
          <h1 className="text-page-title mt-1">Alimentos</h1>
        </div>
        <Button onClick={() => setOpenCreate(true)}>+ Adicionar alimento</Button>
      </header>

      <Card className="p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1"><Input placeholder="Buscar por nome…" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <Input placeholder="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="md:w-48" />
      </Card>

      {loading ? (
        <Card className="overflow-hidden">
          <SkeletonTabela linhas={8} colunas={6} />
        </Card>
      ) : data.length === 0 ? (
        <EmptyState
          icone="🥗"
          titulo="Nenhum alimento cadastrado"
          descricao="Cadastre os alimentos para montar planos alimentares."
        />
      ) : (
      <>
        {/* Desktop: tabela */}
        <Card className="hidden md:block overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-section-label border-b border-surface-border">
                  <th className="text-left px-3 py-3 font-semibold w-14"></th>
                  <th className="text-left px-3 py-3 font-semibold">Alimento</th>
                  <th className="text-left px-5 py-3 font-semibold">Categoria</th>
                  <th className="text-right px-5 py-3 font-semibold">Base</th>
                  <th className="text-right px-5 py-3 font-semibold">Kcal</th>
                  <th className="text-right px-5 py-3 font-semibold">Prot</th>
                  <th className="text-right px-5 py-3 font-semibold">Carb</th>
                  <th className="text-right px-5 py-3 font-semibold">Gord</th>
                  <th className="text-center px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((al) => (
                  <tr
                    key={al.id}
                    className="border-b border-surface-border text-zinc-300 hover:bg-surface-elevated transition-colors cursor-pointer"
                    onClick={() => setEditing(al.id)}
                  >
                    <td className="px-3 py-2 w-14">
                      {al.foto_url ? (
                        <img
                          src={al.foto_url}
                          alt={al.nome}
                          className="w-10 h-10 rounded-lg object-cover bg-surface-elevated"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-surface-border" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-white">{al.nome}</td>
                    <td className="px-5 py-2.5 text-zinc-500">{al.categoria || '—'}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-zinc-400">{al.quantidade_base} {al.unidade}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-bold text-brand">{al.calorias}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-sky-400">{al.proteinas}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-amber-400">{al.carboidratos}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-rose-400">{al.gorduras}</td>
                    <td className="px-5 py-2.5 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAtivo(al); }}
                        className={
                          'text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ' +
                          (al.ativo
                            ? 'bg-green-950 border-green-900 text-green-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500')
                        }
                      >
                        {al.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Mobile: grid de cards */}
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.map((al) => (
            <div
              key={al.id}
              className="bg-surface-card border border-surface-border rounded-xl p-3 cursor-pointer hover:bg-surface-elevated transition-colors"
              onClick={() => setEditing(al.id)}
            >
              <div className="flex items-start gap-3">
                {al.foto_url ? (
                  <img
                    src={al.foto_url}
                    alt={al.nome}
                    className="w-14 h-14 rounded-lg object-cover bg-surface-elevated shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-surface-elevated border border-surface-border shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-sm truncate">{al.nome}</h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAtivo(al); }}
                      className={
                        'shrink-0 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ' +
                        (al.ativo
                          ? 'bg-green-950 border-green-900 text-green-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500')
                      }
                    >
                      {al.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{al.categoria || '—'}</p>
                  <p className="text-[10px] text-zinc-600 tabular-nums mt-0.5">{al.quantidade_base} {al.unidade}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                <Macro label="Kcal" value={al.calorias} color="text-brand" />
                <Macro label="Prot" value={al.proteinas} color="text-sky-400" />
                <Macro label="Carb" value={al.carboidratos} color="text-amber-400" />
                <Macro label="Gord" value={al.gorduras} color="text-rose-400" />
              </div>
            </div>
          ))}
        </div>
      </>
      )}

      <AlimentoModal
        open={openCreate || !!editing}
        onClose={() => { setOpenCreate(false); setEditing(null); }}
        alId={editing}
        onSaved={() => { setOpenCreate(false); setEditing(null); load(); }}
      />
    </div>
  );
}

function Macro({ label, value, color }) {
  return (
    <div className="bg-surface-input border border-surface-border rounded-md py-1.5">
      <div className="text-[9px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className={`text-xs font-bold tabular-nums ${color}`}>{value ?? '—'}</div>
    </div>
  );
}

function AlimentoModal({ open, onClose, alId, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const isEdit = !!alId;

  useEffect(() => {
    if (!open) return;
    if (!alId) {
      setForm({ nome: '', categoria: '', quantidade_base: 100, unidade: 'gramas',
        calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibra: '', sodio: '', foto_url: '' });
    } else {
      (async () => {
        try {
          const res = await api.get(`/admin/alimentos/${alId}`);
          setForm(res.data);
        } catch (err) { toast.error(errorMessage(err)); }
      })();
    }
  }, [open, alId, toast]);

  async function salvar() {
    if (!form.nome || form.calorias == null || form.proteinas == null || form.carboidratos == null || form.gorduras == null) {
      toast.error('Nome, kcal, proteínas, carboidratos e gorduras são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id; delete payload.ativo; delete payload.created_at; delete payload.updated_at;
      delete payload.foto_s3_key;
      ['calorias','proteinas','carboidratos','gorduras','fibra','sodio','quantidade_base'].forEach((k) => {
        if (payload[k] !== '' && payload[k] != null) payload[k] = Number(payload[k]);
      });
      Object.keys(payload).forEach((k) => { if (payload[k] === '' || payload[k] == null) delete payload[k]; });

      if (isEdit) {
        await api.put(`/admin/alimentos/${alId}`, payload);
        toast.success('Alimento atualizado.');
      } else {
        await api.post('/admin/alimentos', payload);
        toast.success('Alimento cadastrado.');
      }
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function uploadFoto(file) {
    if (!isEdit) {
      toast.error('Salve o alimento antes de enviar a foto.');
      return;
    }
    const fd = new FormData();
    fd.append('foto', file);
    try {
      const res = await api.put(`/admin/alimentos/${alId}/foto`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((f) => ({ ...f, foto_url: res.data.foto_url, foto_s3_key: res.data.foto_s3_key }));
      toast.success('Foto enviada.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar alimento' : 'Novo alimento'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Cadastrar'}</Button>
      </>}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nome *"><Input value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Categoria"><Input value={form.categoria || ''} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Quantidade base">
            <Input type="number" step="0.01" value={form.quantidade_base ?? ''} onChange={(e) => setForm({ ...form, quantidade_base: e.target.value })} />
          </Field>
          <Field label="Unidade">
            <select value={form.unidade || 'gramas'} onChange={(e) => setForm({ ...form, unidade: e.target.value })}
              className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-base md:text-sm">
              {UNIDADES.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Kcal *"><Input type="number" step="0.1" value={form.calorias ?? ''} onChange={(e) => setForm({ ...form, calorias: e.target.value })} /></Field>
          <Field label="Prot. *"><Input type="number" step="0.1" value={form.proteinas ?? ''} onChange={(e) => setForm({ ...form, proteinas: e.target.value })} /></Field>
          <Field label="Carb. *"><Input type="number" step="0.1" value={form.carboidratos ?? ''} onChange={(e) => setForm({ ...form, carboidratos: e.target.value })} /></Field>
          <Field label="Gord. *"><Input type="number" step="0.1" value={form.gorduras ?? ''} onChange={(e) => setForm({ ...form, gorduras: e.target.value })} /></Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Fibra"><Input type="number" step="0.1" value={form.fibra ?? ''} onChange={(e) => setForm({ ...form, fibra: e.target.value })} /></Field>
          <Field label="Sódio (mg)"><Input type="number" step="0.1" value={form.sodio ?? ''} onChange={(e) => setForm({ ...form, sodio: e.target.value })} /></Field>
        </div>

        <div>
          <div className="text-section-label mb-2">Foto do alimento</div>
          <ImageUpload
            label="Selecione a foto (JPG/PNG/WebP — máx. 15MB)"
            accept="image/jpeg,image/png,image/webp"
            maxMB={15}
            preview={form.foto_url}
            onUpload={uploadFoto}
          />
          {!isEdit && (
            <p className="text-xs text-zinc-600 mt-2">Salve o alimento primeiro para habilitar o upload.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
