export default function EmptyState({ icone = '📭', titulo, descricao, acao }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-surface-border rounded-xl text-center px-6">
      <span className="text-4xl">{icone}</span>
      <p className="text-white font-bold text-sm">{titulo}</p>
      {descricao && <p className="text-zinc-500 text-xs max-w-xs">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}
