export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] bg-white/60 p-2 ring-1 ring-cocoa-900/5 ${className}`}
      aria-hidden="true"
    >
      <div className="aspect-[4/5] animate-pulse rounded-[calc(var(--radius-lg)-6px)] bg-cream-200" />
      <div className="space-y-2 px-3 pb-3 pt-4">
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-cream-200" />
        <div className="h-4 w-full animate-pulse rounded-full bg-cream-100" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading cakes"
    >
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
