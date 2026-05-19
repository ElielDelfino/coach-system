import { useNavigate } from 'react-router-dom';

const ITENS = [
  { id: 'home',   label: 'Home',   icone: '🏠', rota: '/aluno/home' },
  { id: 'treino', label: 'Treino', icone: '🏋️', rota: '/aluno/treino' },
  { id: 'dieta',  label: 'Dieta',  icone: '🍽️', rota: '/aluno/dieta' },
  { id: 'perfil', label: 'Perfil', icone: '👤', rota: '/aluno/perfil' },
];

export default function AlunoLayout({ children, paginaAtiva }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto relative">
      <div className="flex-1 pb-24">
        {children}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto
        bg-surface-card border-t border-surface-border z-50">
        <div className="flex items-center justify-around px-4 py-2">
          {ITENS.map((item) => {
            const ativo = paginaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.rota)}
                className="flex flex-col items-center gap-1 py-2 px-4 min-w-[60px]"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
                    ${ativo ? 'bg-brand' : 'bg-transparent'}`}
                >
                  <span className="text-lg">{item.icone}</span>
                </div>
                <span
                  className={`text-xs font-bold transition-colors
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
