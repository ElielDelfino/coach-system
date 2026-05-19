export default function ErrorState({ mensagem, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 border border-red-900/50 bg-red-950/20 rounded-xl text-center px-6">
      <span className="text-3xl">⚠️</span>
      <p className="text-red-400 font-bold text-sm">Algo deu errado</p>
      <p className="text-zinc-500 text-xs max-w-xs">
        {mensagem || 'Não foi possível carregar os dados. Verifique sua conexão.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-xs text-brand border border-brand/40 px-3 py-1 rounded hover:bg-brand/10 font-bold"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
