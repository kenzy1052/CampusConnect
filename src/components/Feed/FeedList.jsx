import { FeedCard } from "./FeedCard";

export function FeedList({ listings, onListingClick }) {
  if (!listings.length) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-4xl mb-5">
          🏪
        </div>
        <p className="text-white font-bold text-lg">No listings found</p>
        <p className="text-slate-500 text-sm mt-2">
          Try a different search term or filter
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {listings.map((item) => (
        <FeedCard
          key={item.id}
          item={item}
          onClick={() => onListingClick(item)}
        />
      ))}
    </div>
  );
}
