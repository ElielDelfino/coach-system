import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast, errorMessage } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname;

  async function onSubmit(e) {
    e.preventDefault();
    if (!email || !senha) {
      toast.error('E-mail e senha são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      const u = await login(email, senha);
      const fallback = u.role === 'admin' ? '/admin/dashboard' : '/aluno/perfil';
      navigate(from && from !== '/login' ? from : fallback, { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2">
            <span className="text-3xl font-black tracking-tight text-white">COACH</span>
            <span className="w-2.5 h-2.5 rounded-full bg-brand mt-2.5" />
            <span className="text-3xl font-black tracking-tight text-white">SYS</span>
          </div>
          <div className="text-section-label mt-2">Painel de acesso</div>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-surface-card border border-surface-border rounded-lg p-6 space-y-4"
        >
          <div>
            <label className="text-section-label block mb-2">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="text-section-label block mb-2">Senha</label>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-[11px] text-zinc-600 mt-6 uppercase tracking-widest">
          Acesso restrito · Coach System
        </p>
      </div>
    </div>
  );
}
