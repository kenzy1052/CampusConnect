import { useMemo } from "react";
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

function ListingDetailRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { listings } = useOutletContext();

  const listing = useMemo(() => {
    if (location.state?.listing?.id === id) {
      return location.state.listing;
    }

    return listings.find((item) => String(item.id) === id) ?? null;
  }, [id, listings, location.state]);

  if (!listing) {
    return <Navigate to="/" replace />;
  }

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
