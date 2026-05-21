import { useState } from 'react';
import api from '../../services/api';
import { useToast, errorMessage } from '../ui/Toast';

export default function HidratacaoCard({ protocolo, onSaved }) {
  const toast = useToast();
  const [metaAgua, setMetaAgua] = useState(
    protocolo.meta_agua_litros != null ? Number(protocolo.meta_agua_litros) : 2.5
  );
  const [saving, setSaving] = useState(false);

  async function salvarMetaAgua() {
    setSaving(true);
    try {
      await api.put(`/admin/protocolos/${protocolo.id}`, { meta_agua_litros: metaAgua });
      toast.success('Meta de água atualizada.');
      onSaved();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <div className="mt-4 border-t border-surface-border pt-4 px-5 pb-5">
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Hidratação</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0.5"
          max="10"
          step="0.5"
          value={metaAgua}
          onChange={(e) => setMetaAgua(Number(e.target.value))}
          className="w-20 bg-surface-input border border-surface-border text-white
            rounded px-2 py-1.5 text-sm text-center focus:border-brand focus:outline-none"
        />
        <span className="text-zinc-400 text-sm">litros / dia</span>
      </div>
      <button
        onClick={salvarMetaAgua}
        disabled={saving}
        className="mt-2 text-xs text-brand border border-brand/40 px-3 py-1 rounded
          hover:bg-brand/10 font-bold disabled:opacity-50"
      >
        {saving ? 'Salvando…' : 'Salvar meta'}
      </button>
    </div>
  );
}
