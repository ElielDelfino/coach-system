function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-surface-elevated rounded ${className}`} />
  );
}

export function SkeletonTabela({ linhas = 5, colunas = 5 }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-3 border-b border-surface-border">
          {Array.from({ length: colunas }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-elevated border border-surface-border rounded-xl p-4 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export default Skeleton;
