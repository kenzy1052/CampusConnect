import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { getTrustTier } from "../../utils/trustTier";

export default function MyListings({ onCreateListing }) {
  const { user, profile } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchMyListings();
  }, [user]);

  const fetchMyListings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("discovery_feed")
      .select(
        `
        *,
        listing_images(image_url, position)
      `,
      )
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setListings(data);
    setLoading(false);
  };

  const getStatus = (listing) => {
    if (listing.is_hidden) return "Hidden";
    if (!listing.is_active && listing.sold_at) return "Sold";
    if (!listing.is_active) return "Removed";
    return "Active";
  };

  const getStatusColor = (listing) => {
    if (listing.is_hidden) return "text-red-400";
    if (!listing.is_active) {
      return listing.sold_at ? "text-slate-400" : "text-red-400";
    }
    return "text-emerald-400";
  };

  // --- UPDATED DELETE (NO LEAKS) ---
  const deleteListing = async (listing) => {
    if (!window.confirm(`Permanently delete "${listing.title}"?`)) return;

    setActionId(listing.id);

    // 1. Get images associated with listing
    const { data: images } = await supabase
      .from("listing_images")
      .select("image_url")
      .eq("listing_id", listing.id);

    // 2. Wipe from storage bucket
    if (images?.length) {
      const paths = images.map((img) => {
        // Handle full URLs or just paths depending on your storage setup
        return img.image_url.split("/").pop();
      });

      await supabase.storage.from("listing-images").remove(paths);
    }

    // 3. Delete from DB
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listing.id)
      .eq("seller_id", user.id);

    if (error) {
      alert("Failed: " + error.message);
    } else {
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
    }

    setActionId(null);
  };

  const markAsSold = async (listing) => {
    if (!window.confirm(`Mark "${listing.title}" as sold?`)) return;
    setActionId(listing.id);
    const { error } = await supabase
      .from("listings")
      .update({ is_active: false, sold_at: new Date().toISOString() })
      .eq("id", listing.id);

    if (error) {
      alert("Failed: " + error.message);
    } else {
      await supabase.rpc("increment_trust_on_sale", {
        p_listing_id: listing.id,
      });
      fetchMyListings();
    }
    setActionId(null);
  };

  const getPrice = (l) => {
    if (l.price !== null) return "GH₵ " + l.price;
    if (l.price_min && l.price_max)
      return `GH₵ ${l.price_min} – ${l.price_max}`;
    return l.price_min ? `From GH₵ ${l.price_min}` : "Ask for price";
  };

  const tier = getTrustTier(profile?.trust_score ?? 50);

  if (loading)
    return (
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto pb-24 animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">My Listings</h1>
        <p className="text-sm text-slate-500 mt-1">
          {listings.length} listings · Trust score:{" "}
          <span className={`font-bold ${tier.color}`}>{tier.label}</span>
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-white font-bold text-lg">No listings yet</p>
          <button
            onClick={onCreateListing}
            className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm"
          >
            Create your first listing
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => {
            const img = (listing.listing_images || []).sort(
              (a, b) => a.position - b.position,
            )[0];
            const busy = actionId === listing.id;
            const statusLabel = getStatus(listing);

            return (
              <div
                key={listing.id}
                className={`bg-slate-900 border rounded-2xl overflow-hidden flex flex-col transition-all ${
                  listing.is_hidden || (!listing.is_active && !listing.sold_at)
                    ? "border-red-500/30 opacity-70"
                    : listing.is_active
                      ? "border-slate-800"
                      : "border-slate-800/30 opacity-60"
                }`}
              >
                {!listing.is_active && !listing.sold_at && (
                  <div className="w-full px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[11px] font-bold">
                    ⚠️ This listing was removed for violating guidelines.
                  </div>
                )}

                {listing.is_hidden && (
                  <div className="w-full px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[11px] font-bold flex items-center justify-between">
                    <span>⚠️ Hidden due to reports.</span>
                    <button
                      onClick={() => alert("Review Flow coming soon.")}
                      className="text-red-300 text-[10px] underline hover:text-red-200"
                    >
                      Review
                    </button>
                  </div>
                )}

                <div className="flex w-full">
                  <div className="w-24 h-24 md:w-28 md:h-28 shrink-0 bg-slate-800 overflow-hidden">
                    {img ? (
                      <img
                        src={img.image_url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700 text-2xl">
                        📷
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm truncate">
                          {listing.title}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800/50 border border-slate-700/50 ${getStatusColor(listing)}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        {listing.category_name} · {getPrice(listing)}
                      </p>

                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          👁️{" "}
                          <span className="text-white font-bold">
                            {listing.view_count ?? 0}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          💬{" "}
                          <span className="text-white font-bold">
                            {listing.contact_count ?? 0}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {listing.is_active && !listing.is_hidden && (
                        <button
                          onClick={() => markAsSold(listing)}
                          disabled={busy}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                        >
                          {busy ? "..." : "Mark Sold"}
                        </button>
                      )}

                      <button
                        onClick={() => deleteListing(listing)}
                        disabled={busy}
                        className="p-2 bg-slate-800 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-xl transition-all border border-slate-700"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
