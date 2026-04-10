import { FeedCard } from "./FeedCard";

export function FeedList({ listings }) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl">
        <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">
          No listings found
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {listings.map((item) => (
        <FeedCard key={item.id} item={item} />
      ))}
    </div>
  );
}
