// src/Router.jsx  ← REPLACE YOUR EXISTING FILE WITH THIS
//
// Changes from original:
//  - /signin, /signup, /forgot-password, /reset-password routes added
//  - /auth redirects to /signin for backward compatibility
//  - RequireAuth now sends to /signin (not /auth), preserving the "from" location
//  - All existing protected routes and their logic are unchanged

import React, { useEffect, useRef, useState } from "react";
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

// ── Page components ─────────────────────────────────────────────────────────
import MainApp from "./MainApp";
import { FeedList } from "./components/Feed/FeedList";
import ListingDetail from "./components/Feed/ListingDetail";
import { CreateListing } from "./components/Feed/CreateListing";
import Profile from "./components/Profile/Profile";
import MyListings from "./components/Profile/MyListings";
import AdminPanel from "./components/Admin/AdminPanel";
import MobileNav from "./components/MobileNav";
import ScrollManager from "./ScrollManager";
import SellerProfile from "./components/Profile/SellerProfile";

// ── New auth pages ───────────────────────────────────────────────────────────
import AuthSignIn from "./components/Auth/AuthSignIn";
import AuthSignUp from "./components/Auth/AuthSignUp";
import AuthForgotPassword from "./components/Auth/AuthForgotPassword";
import AuthResetPassword from "./components/Auth/AuthResetPassword";

// ─────────────────────────────────────────────────────────────────────────────
// Shared loading screen
// ─────────────────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-sm text-slate-500">Initializing session…</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RequireAuth — redirects unauthenticated users to /signin
// Passes current location so AuthSignIn can redirect back after login
// ─────────────────────────────────────────────────────────────────────────────
function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user)
    return <Navigate to="/signin" state={{ from: location }} replace />;
  return <Outlet />;
}

// ─────────────────────────────────────────────────────────────────────────────
// GuestOnly — wraps auth pages; bounces logged-in users to the app
// ─────────────────────────────────────────────────────────────────────────────
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feed route (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
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
        {loading && <p className="text-xs text-indigo-400">Loading more…</p>}
        {!hasMore && listings.length > 0 && (
          <p className="text-xs text-slate-700">You&apos;ve seen everything</p>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Listing detail route — resolves listing from router state or fetches by id
// ─────────────────────────────────────────────────────────────────────────────
function ListingDetailRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [listing, setListing] = useState(location.state?.listing ?? null);
  const scrollY = useRef(location.state?.scrollY ?? 0);

  useEffect(() => {
    if (listing) {
      // re-fetch when navigating to a *different* listing
      if (listing.id === id) return;
    }
    supabase
      .from("discovery_feed")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setListing(data);
      });
  }, [id, listing]);

  const handleBack = () => {
    navigate("/", { state: { restoreScrollY: scrollY.current } });
  };

  // ✅ NEW: navigate to the next listing when a related-card is clicked
  const handleOpen = (next) => {
    setListing(next); // optimistic swap
    navigate(`/listing/${next.id}`, { state: { listing: next } });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!listing) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ListingDetail listing={listing} onBack={handleBack} onOpen={handleOpen} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create listing route
// ─────────────────────────────────────────────────────────────────────────────
function CreateRoute() {
  const { user, refetch } = useOutletContext();
  const navigate = useNavigate();

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

// ─────────────────────────────────────────────────────────────────────────────
// MyListings route
// ─────────────────────────────────────────────────────────────────────────────
function MyListingsRoute() {
  const navigate = useNavigate();
  return <MyListings onCreateListing={() => navigate("/create")} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin route — additionally guards by role
// ─────────────────────────────────────────────────────────────────────────────
function AdminRoute() {
  const { isAdmin } = useOutletContext();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AdminPanel />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root router — all routes declared here
// ─────────────────────────────────────────────────────────────────────────────
export default function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        {/* ── PUBLIC AUTH ROUTES ─────────────────────────────────────────── */}

        <Route
          path="/signin"
          element={
            <GuestOnly>
              <AuthSignIn />
            </GuestOnly>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestOnly>
              <AuthSignUp />
            </GuestOnly>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestOnly>
              <AuthForgotPassword />
            </GuestOnly>
          }
        />

        {/*
          /reset-password is intentionally NOT wrapped in GuestOnly.
          The user arrives here via the email magic link. Supabase sets a
          temporary PASSWORD_RECOVERY session via the URL fragment. We need
          that session active to call updateUser(). Wrapping in GuestOnly
          would redirect them away as soon as the session fires.
        */}
        <Route path="/reset-password" element={<AuthResetPassword />} />

        {/* Legacy path → redirect for any old hard-coded links */}
        <Route path="/auth" element={<Navigate to="/signin" replace />} />

        {/* ── PROTECTED APP ROUTES ───────────────────────────────────────── */}

        <Route element={<RequireAuth />}>
          <Route element={<MainApp />}>
            <Route index element={<FeedRoute />} />
            <Route path="listing/:id" element={<ListingDetailRoute />} />
            <Route path="create" element={<CreateRoute />} />
            <Route path="mylistings" element={<MyListingsRoute />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<AdminRoute />} />
            <Route path="/seller/:id" element={<SellerProfile />} />
          </Route>
        </Route>

        {/* 404 → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <MobileNav />
    </BrowserRouter>
  );
}
