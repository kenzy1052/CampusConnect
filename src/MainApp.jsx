import { useRef, useEffect, useState } from "react";
import { useDiscoveryFeed } from "./hooks/useDiscoveryFeed";
import { FeedList } from "./components/Feed/FeedList";
import { FeedFilters } from "./components/Feed/FeedFilters";
import { CreateListing } from "./components/Feed/CreateListing";
import Profile from "./components/Profile/Profile";
import { useAuth } from "./context/AuthContext";

export default function MainApp() {
  const { user, profile, logout } = useAuth();

  const [activeView, setActiveView] = useState("feed");

  const {
    listings,
    loading,
    isInitialLoading,
    error,
    hasMore,
    loadMore,
    refetch,
    filter,
    setFilter,
    categoryId,
    setCategoryId,
    searchTerm,
    setSearchTerm,
    categories,
  } = useDiscoveryFeed();

  const observerTarget = useRef(null);

  useEffect(() => {
    const current = observerTarget.current;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          hasMore &&
          activeView === "feed"
        ) {
          loadMore();
        }
      },
      { rootMargin: "150px" },
    );

    if (current) observer.observe(current);
    return () => current && observer.unobserve(current);
  }, [loading, hasMore, loadMore, activeView]);

  const initials = (profile?.business_name || profile?.full_name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 font-sans">
      <div className="w-full max-w-7xl mx-auto px-4">
        {/* HEADER */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <h1 className="text-4xl font-black text-indigo-500 tracking-tighter">
            CampusConnect
          </h1>

          <div className="flex items-center gap-4 flex-wrap">
            {activeView === "feed" && (
              <FeedFilters
                categories={categories}
                filter={filter}
                setFilter={setFilter}
                categoryId={categoryId}
                setCategoryId={setCategoryId}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />
            )}

            {/* CREATE BUTTON */}
            <button
              onClick={() =>
                setActiveView(activeView === "feed" ? "create" : "feed")
              }
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-black uppercase text-[10px]"
            >
              {activeView === "feed" ? "+ Post" : "← Back"}
            </button>

            {/* PROFILE ICON BUTTON */}
            <button
              onClick={() =>
                setActiveView(activeView === "profile" ? "feed" : "profile")
              }
              className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white font-black"
            >
              {initials}
            </button>

            <button
              onClick={logout}
              className="text-[10px] text-red-400 font-bold"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-400 text-xs mb-6">
            {error}
          </div>
        )}

        {/* CREATE */}
        {activeView === "create" && (
          <CreateListing
            user={user}
            onCancel={() => setActiveView("feed")}
            onSuccess={() => {
              setActiveView("feed");
              refetch();
            }}
          />
        )}

        {/* PROFILE */}
        {activeView === "profile" && <Profile />}

        {/* FEED */}
        {activeView === "feed" && (
          <>
            {isInitialLoading ? (
              <div className="flex justify-center py-32">
                <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <FeedList listings={listings} />
            )}

            <div
              ref={observerTarget}
              className="h-40 flex justify-center items-center"
            >
              {loading && <p className="text-xs text-indigo-400">Loading...</p>}
              {!hasMore && listings.length > 0 && (
                <p className="text-xs text-slate-600">End of feed</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
