import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { migrarLocalStorage } from '../../store/aluno';

const ITENS = [
  { id: 'home',   label: 'Home',   icone: '🏠', rota: '/aluno/home' },
  { id: 'treino', label: 'Treino', icone: '🏋️', rota: '/aluno/treino' },
  { id: 'dieta',  label: 'Dieta',  icone: '🍽️', rota: '/aluno/dieta' },
  { id: 'perfil', label: 'Perfil', icone: '👤', rota: '/aluno/perfil' },
];

function derivarPaginaAtiva(pathname) {
  if (pathname.startsWith('/aluno/treino')) return 'treino';
  if (pathname.startsWith('/aluno/dieta'))  return 'dieta';
  if (pathname.startsWith('/aluno/perfil')) return 'perfil';
  return 'home';
}

export default function AlunoLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const paginaAtiva = derivarPaginaAtiva(location.pathname);

  useEffect(() => {
    if (user?.id) migrarLocalStorage(user.id);
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto relative">
      <div className="flex-1 pb-24">
        <Outlet />
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto
        bg-surface-card/80 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="flex items-center justify-around px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {ITENS.map((item) => {
            const ativo = paginaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.rota)}
                className="flex flex-col items-center gap-1 py-2 px-4 min-w-[60px]"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${ativo ? 'bg-brand glow-magenta-sm' : 'bg-transparent'}`}
                >
                  <span className="text-lg">{item.icone}</span>
                </div>
                <span
                  className={`text-[10px] font-display font-semibold uppercase tracking-wider transition-colors
                    ${ativo ? 'text-brand' : 'text-zinc-500'}`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
