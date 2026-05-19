import Spinner from './Spinner';

export default function PageLoader({ mensagem = 'Carregando...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Spinner size="lg" />
      <p className="text-zinc-500 text-sm">{mensagem}</p>
    </div>
  );
}
