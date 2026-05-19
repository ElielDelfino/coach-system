export default function ConfirmModal({
  aberto,
  titulo,
  descricao,
  textoBotao = 'Confirmar',
  variante = 'danger',
  onConfirmar,
  onCancelar,
  carregando,
}) {
  if (!aberto) return null;
  const cores = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    primary: 'bg-brand hover:bg-brand-dark',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-white font-black text-base mb-2">{titulo}</h3>
        {descricao && <p className="text-zinc-400 text-sm mb-6">{descricao}</p>}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancelar}
            disabled={carregando}
            className="text-xs text-zinc-400 border border-surface-border px-4 py-2 rounded hover:text-white disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={carregando}
            className={`text-xs text-white font-bold px-4 py-2 rounded disabled:opacity-50 ${cores[variante]}`}
          >
            {carregando ? 'Aguarde...' : textoBotao}
          </button>
        </div>
      </div>
    </div>
  );
}
