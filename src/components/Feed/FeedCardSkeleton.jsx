export function FeedCardSkeleton() {
  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800/60 animate-pulse">
      <div className="w-full aspect-square bg-slate-800/50" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-slate-800/50 rounded w-3/4" />
        <div className="h-3 bg-slate-800/50 rounded w-full" />
        <div className="h-3 bg-slate-800/50 rounded w-1/2" />
      </div>
    </div>
  );
}
