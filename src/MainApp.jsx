import { useRef, useEffect, useState } from "react";
import { useDiscoveryFeed } from "./hooks/useDiscoveryFeed";
import { FeedList } from "./components/Feed/FeedList";
import { FeedFilters } from "./components/Feed/FeedFilters";
import { CreateListing } from "./components/Feed/CreateListing";
import ListingDetail from "./components/Feed/ListingDetail";
import Profile from "./components/Profile/Profile";
import AdminPanel from "./components/Admin/AdminPanel";
import MyListings from "./components/Profile/MyListings"; // Ensure this import is correct
import { useAuth } from "./context/AuthContext";

export default function MainApp() {
  const { user, profile, logout } = useAuth();
  const [activeView, setActiveView] = useState("feed");
  const [selectedListing, setSelectedListing] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = profile?.role === "admin";

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
    const el = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          hasMore &&
          activeView === "feed"
        )
          loadMore();
      },
      { rootMargin: "150px" },
    );
    if (el) observer.observe(el);
    return () => el && observer.unobserve(el);
  }, [loading, hasMore, loadMore, activeView]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  const initials = (profile?.business_name || profile?.full_name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleBackToFeed = () => {
    setActiveView("feed");
    setSelectedListing(null);
  };

  const openDetailView = (listing) => {
    setSelectedListing(listing);
    setActiveView("detail");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* ── HEADER ── */}
        <header className="mb-6 flex items-center justify-between gap-4">
          <button
            onClick={handleBackToFeed}
            className="text-2xl font-black text-indigo-500 tracking-tighter hover:text-indigo-400 transition-colors"
          >
            CampusConnect
          </button>

          <div className="flex items-center gap-4">
            {/* My Listings Button */}
            {activeView !== "mylistings" && (
              <button
                onClick={() => setActiveView("mylistings")}
                className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
              >
                My Listings
              </button>
            )}

            {/* Admin Panel Button */}
            {isAdmin && activeView !== "admin" && (
              <button
                onClick={() => setActiveView("admin")}
                className="text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
              >
                Admin Panel
              </button>
            )}

            {/* Post / Back button */}
            {activeView === "feed" ? (
              <button
                onClick={() => setActiveView("create")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                + Post
              </button>
            ) : (
              <button
                onClick={handleBackToFeed}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
              >
                ← Back
              </button>
            )}

            {/* Profile avatar + dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen((p) => !p)}
                className={`w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm transition-all ${
                  menuOpen
                    ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950"
                    : "hover:ring-2 hover:ring-indigo-500/50 hover:ring-offset-1 hover:ring-offset-slate-950"
                }`}
              >
                {initials}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-52 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-xs font-bold text-white truncate">
                      {profile?.business_name ||
                        profile?.full_name ||
                        "Your Account"}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setActiveView("profile");
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <span>⚙️</span> Account Settings
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 border-t border-slate-800"
                  >
                    <span>→</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── FILTERS ── */}
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

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-xs mb-6">
            {error}
          </div>
        )}

        {/* ── VIEWS ── */}
        {isAdmin && activeView === "admin" && <AdminPanel />}

        {activeView === "mylistings" && (
          <MyListings onCreateListing={() => setActiveView("create")} />
        )}

        {activeView === "create" && (
          <CreateListing
            user={user}
            onCancel={handleBackToFeed}
            onSuccess={() => {
              handleBackToFeed();
              refetch();
            }}
          />
        )}

        {activeView === "profile" && <Profile />}

        {activeView === "detail" && selectedListing && (
          <ListingDetail listing={selectedListing} onBack={handleBackToFeed} />
        )}

        {activeView === "feed" && (
          <>
            {isInitialLoading ? (
              <div className="flex justify-center py-32">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : (
              <FeedList listings={listings} onListingClick={openDetailView} />
            )}

            <div
              ref={observerTarget}
              className="h-32 flex justify-center items-center"
            >
              {loading && <p className="text-xs text-indigo-400">Loading...</p>}
              {!hasMore && listings.length > 0 && (
                <p className="text-xs text-slate-700">You've seen everything</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
