import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/alunos', label: 'Alunos' },
  { to: '/admin/exercicios', label: 'Exercícios' },
  { to: '/admin/alimentos', label: 'Alimentos' },
  { to: '/admin/cardio', label: 'Cardio' },
];

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 shrink-0 bg-surface-card border-r border-surface-border flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight text-white">COACH</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5" />
          <span className="text-lg font-black tracking-tight text-white">SYS</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">
          Painel administrativo
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center px-5 py-2.5 text-xs uppercase tracking-widest font-bold transition-colors',
                isActive
                  ? 'border-l-2 border-brand bg-surface-elevated text-white'
                  : 'border-l-2 border-transparent text-zinc-500 hover:text-zinc-300'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-surface-border">
        <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Sessão</div>
        <div className="text-sm text-white truncate">{user?.email}</div>
        <button
          onClick={logout}
          className="mt-3 text-[11px] text-zinc-500 hover:text-brand uppercase tracking-widest font-bold transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
