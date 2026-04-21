import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabaseClient";
import MainApp from "./MainApp";
import Auth from "./components/Auth/Auth";
import { FeedList } from "./components/Feed/FeedList";
import ListingDetail from "./components/Feed/ListingDetail";
import { CreateListing } from "./components/Feed/CreateListing";
import Profile from "./components/Profile/Profile";
import MyListings from "./components/Profile/MyListings";
import AdminPanel from "./components/Admin/AdminPanel";
import ScrollManager from "./ScrollManager";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <p className="text-sm text-slate-400">Initializing session...</p>
      </div>
    </div>
  );
}

function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}

function AuthRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Auth />;
}

function FeedRoute() {
  const {
    listings,
    isInitialLoading,
    loading,
    hasMore,
    observerTarget,
    openDetailView,
  } = useOutletContext();

  if (isInitialLoading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <FeedList listings={listings} onListingClick={openDetailView} />

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
  );
}

// FIX: When the listing isn't in the in-memory feed (e.g. the user opened a
// shared link or refreshed the page), we fall back to fetching it directly
// from the discovery_feed view so shared links and refreshes always work.
function ListingDetailRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { listings } = useOutletContext();

  const [fetchedListing, setFetchedListing] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Try to find the listing in the in-memory feed first
  const inMemoryListing = useMemo(() => {
    if (location.state?.listing?.id === id) {
      return location.state.listing;
    }
    return listings.find((item) => String(item.id) === id) ?? null;
  }, [id, listings, location.state]);

  // If not found in memory, fetch from Supabase
  useEffect(() => {
    if (inMemoryListing || fetchedListing || fetching) return;

    let cancelled = false;
    setFetching(true);

    supabase
      .from("discovery_feed")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setFetchError(true);
        } else {
          setFetchedListing(data);
        }
        setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, inMemoryListing, fetchedListing, fetching]);

  const listing = inMemoryListing ?? fetchedListing;

  if (fetching) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError || (!fetching && !listing)) {
    return <Navigate to="/" replace />;
  }

  if (!listing) return null;

  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }
    navigate("/", { replace: true });
  };

  return <ListingDetail listing={listing} onBack={handleBack} />;
}

function CreateListingRoute() {
  const navigate = useNavigate();
  const { user, refetch } = useOutletContext();

  return (
    <CreateListing
      user={user}
      onCancel={() => navigate("/")}
      onSuccess={() => {
        refetch();
        navigate("/");
      }}
    />
  );
}

function MyListingsRoute() {
  const navigate = useNavigate();

  return <MyListings onCreateListing={() => navigate("/create")} />;
}

function AdminRoute() {
  const { isAdmin } = useOutletContext();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <AdminPanel />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        <Route path="/auth" element={<AuthRoute />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<MainApp />}>
            <Route index element={<FeedRoute />} />
            <Route path="listing/:id" element={<ListingDetailRoute />} />
            <Route path="profile" element={<Profile />} />
            <Route path="mylistings" element={<MyListingsRoute />} />
            <Route path="admin" element={<AdminRoute />} />
            <Route path="create" element={<CreateListingRoute />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
