import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast, errorMessage } from '../ui/Toast';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { Field } from '../../pages/admin/Alunos';
import { Info, Metric, formatDate } from './shared';

export default function TabPerfil({ aluno, onReload }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(aluno);
  const [saving, setSaving] = useState(false);
  const [senhaModalOpen, setSenhaModalOpen] = useState(false);

  // Só sincroniza o form quando o aluno for recarregado fora do modo edição.
  // Impede que um reload externo (ex: toast disparando um re-fetch) apague o que
  // o usuário está digitando.
  useEffect(() => {
    if (!editing) setForm(aluno);
  }, [aluno, editing]);

  async function salvar() {
    setSaving(true);
    try {
      const allowed = ['nome', 'telefone', 'data_nascimento', 'sexo', 'objetivo', 'restricoes', 'lesoes', 'observacoes', 'dias_tolerancia', 'periodicidade_dias'];
      const payload = {};
      allowed.forEach((k) => { if (form[k] !== undefined) payload[k] = form[k]; });
      await api.put(`/admin/alunos/${aluno.id}`, payload);
      toast.success('Aluno atualizado.');
      setEditing(false);
      onReload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2 p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-section-label">Dados pessoais</h2>
          {!editing ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSenhaModalOpen(true)}
                className="text-xs uppercase tracking-widest font-bold text-zinc-400 hover:text-white"
              >
                Alterar senha
              </button>
              <button onClick={() => setEditing(true)} className="text-xs uppercase tracking-widest font-bold text-brand hover:text-brand-dark">
                Editar
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm(aluno); }}>Cancelar</Button>
              <Button size="sm" onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {editing ? (
            <>
              <Field label="Nome"><Input value={form.nome || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, nome: v })); }} /></Field>
              <Field label="Telefone"><Input value={form.telefone || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, telefone: v })); }} /></Field>
              <Field label="Nascimento"><Input type="date" value={(form.data_nascimento || '').slice(0, 10)} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, data_nascimento: v })); }} /></Field>
              <Field label="Sexo">
                <select
                  value={form.sexo || ''}
                  onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, sexo: v })); }}
                  className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </Field>
              <Field label="Objetivo"><Input value={form.objetivo || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, objetivo: v })); }} /></Field>
              <Field label="Tolerância (dias)">
                <Input type="number" min={0} value={form.dias_tolerancia ?? 7} onChange={(e) => { const v = Number(e.target.value); setForm((f) => ({ ...f, dias_tolerancia: v })); }} />
              </Field>
              <Field label="Periodicidade do plano (dias)">
                <Input type="number" min={1} value={form.periodicidade_dias ?? 30} onChange={(e) => { const v = Number(e.target.value); setForm((f) => ({ ...f, periodicidade_dias: v })); }} />
              </Field>
              <div className="col-span-2"><Field label="Restrições">
                <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
                  value={form.restricoes || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, restricoes: v })); }} /></Field></div>
              <div className="col-span-2"><Field label="Lesões">
                <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
                  value={form.lesoes || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, lesoes: v })); }} /></Field></div>
              <div className="col-span-2"><Field label="Observações">
                <textarea rows={2} className="w-full bg-surface-input border border-surface-border text-white rounded-md px-3 py-2 text-sm resize-none"
                  value={form.observacoes || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, observacoes: v })); }} /></Field></div>
            </>
          ) : (
            <>
              <Info label="Telefone" value={aluno.telefone} />
              <Info label="Nascimento" value={formatDate(aluno.data_nascimento)} />
              <Info label="Sexo" value={aluno.sexo} />
              <Info label="Objetivo" value={aluno.objetivo} />
              <Info label="Restrições" value={aluno.restricoes} span={2} />
              <Info label="Lesões" value={aluno.lesoes} span={2} />
              <Info label="Observações" value={aluno.observacoes} span={2} />
            </>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-section-label mb-4">Última medição</h2>
        {aluno.ultima_medicao ? (
          <div className="space-y-3">
            <Metric label="Peso" value={`${aluno.ultima_medicao.peso_kg ?? '—'} kg`} />
            <Metric label="% Gordura" value={`${aluno.ultima_medicao.percentual_gordura ?? '—'}%`} />
            <Metric label="Massa magra" value={`${aluno.ultima_medicao.peso_magro_kg ?? '—'} kg`} />
            <Metric label="Massa gorda" value={`${aluno.ultima_medicao.peso_gordo_kg ?? '—'} kg`} />
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest pt-2 border-t border-surface-border">
              {formatDate(aluno.ultima_medicao.data_medicao)}
            </div>
          </div>
        ) : (
          <div className="text-zinc-500 text-sm">Sem medições registradas.</div>
        )}
      </Card>

      <AlterarSenhaModal
        open={senhaModalOpen}
        onClose={() => setSenhaModalOpen(false)}
        alunoId={aluno.id}
        alunoNome={aluno.nome}
      />
    </div>
  );
}

function AlterarSenhaModal({ open, onClose, alunoId, alunoNome }) {
  const toast = useToast();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setSenha(''); setConfirmacao(''); }
  }, [open]);

  async function salvar() {
    if (senha.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (senha !== confirmacao) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/admin/alunos/${alunoId}/senha`, { senha });
      toast.success('Senha redefinida com sucesso.');
      onClose();
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
      title={`Alterar senha — ${alunoNome}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar nova senha'}</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="bg-yellow-950/40 border border-yellow-900 text-yellow-300 rounded-md px-3 py-2 text-xs">
          O aluno usará essa nova senha no próximo login. Sessões já abertas continuam ativas até o token expirar.
        </div>
        <Field label="Nova senha (mín. 8 caracteres)">
          <Input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Digite a nova senha"
            autoFocus
          />
        </Field>
        <Field label="Confirmar nova senha">
          <Input
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            placeholder="Digite novamente"
          />
        </Field>
      </div>
    </Modal>
  );
}
