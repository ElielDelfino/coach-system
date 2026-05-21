import { useState } from 'react';
import api from '../../services/api';
import { useToast, errorMessage } from '../ui/Toast';
import { Card } from '../ui/Card';
import Button from '../ui/Button';

export default function ModuloObservacoes({ protocolo, onSaved }) {
  const toast = useToast();
  const [obs, setObs] = useState(protocolo.observacoes || '');
  const [saving, setSaving] = useState(false);

  async function salvar() {
    setSaving(true);
    try {
      await api.put(`/admin/protocolos/${protocolo.id}`, { observacoes: obs });
      toast.success('Observações atualizadas.');
      onSaved();
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <header>
        <div className="text-section-label">Módulo</div>
        <h2 className="text-page-title mt-1">Observações</h2>
      </header>
      <Card className="p-5">
        <textarea
          rows={12}
          className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Notas gerais sobre o protocolo…"
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar observações'}</Button>
        </div>
      </Card>
    </div>
  );
}
