import { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  const fecharMenu = useCallback(() => setMenuAberto(false), []);
  const abrirMenu  = useCallback(() => setMenuAberto(true),  []);

  return (
    <>
      {/* Topbar mobile com hamburguer */}
      <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-surface-card border-b border-surface-border">
        <button
          type="button"
          onClick={abrirMenu}
          className="text-zinc-400 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Abrir menu"
        >
          <div className="space-y-1">
            <div className="w-5 h-0.5 bg-current" />
            <div className="w-5 h-0.5 bg-current" />
            <div className="w-5 h-0.5 bg-current" />
          </div>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-base font-black tracking-tight text-white">COACH</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1" />
          <span className="text-base font-black tracking-tight text-white">SYS</span>
        </div>
      </div>

      {/* Overlay escuro quando menu aberto (mobile) */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={fecharMenu}
        />
      )}

      {/* Sidebar — drawer no mobile, fixa no desktop */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-60 bg-surface-card border-r border-surface-border flex flex-col transition-transform duration-200',
          'md:sticky md:top-0 md:h-screen md:translate-x-0 md:shrink-0',
          menuAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <button
          type="button"
          onClick={fecharMenu}
          className="absolute top-3 right-3 text-zinc-500 hover:text-white md:hidden p-2"
          aria-label="Fechar menu"
        >
          ✕
        </button>

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
              onClick={fecharMenu}
              className={({ isActive }) =>
                clsx(
                  'flex items-center px-5 py-3 text-xs uppercase tracking-widest font-bold transition-colors min-h-[44px] md:min-h-0 md:py-2.5',
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
            onClick={() => { fecharMenu(); void logout(); }}
            className="mt-3 text-[11px] text-zinc-500 hover:text-brand uppercase tracking-widest font-bold transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
