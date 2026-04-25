import { FeedCard } from "./FeedCard";
import { FeedCardSkeleton } from "./FeedCardSkeleton";
import { EmptyState } from "./EmptyState";

export function FeedList({ listings, onListingClick, loading, type = "feed" }) {
  // 1. Loading State
  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <FeedCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  // 2. Empty States
  if (!listings || listings.length === 0) {
    if (type === "favorites") {
      return (
        <EmptyState
          icon="💖"
          title="No saved items"
          description="Heart items you like to keep track of them here. They might sell fast!"
          buttonText="Browse Feed"
          buttonTo="/"
        />
      );
    }

    if (type === "profile") {
      return (
        <EmptyState
          icon="📦"
          title="No active listings"
          description="Your shop is looking a bit empty. Turn your clutter into cash!"
          buttonText="Post a listing"
          buttonTo="/sell"
        />
      );
    }

    // Default: Search / General Feed
    return (
      <EmptyState
        icon="🔍"
        title="No listings found"
        description="Try adjusting your filters or search terms to find what you're looking for."
        buttonText="Back to Feed"
        buttonTo="/"
      />
    );
  }

  // 3. Data State
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
