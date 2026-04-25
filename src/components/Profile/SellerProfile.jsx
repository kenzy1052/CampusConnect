import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { FeedCard } from "../Feed/FeedCard";
import { getTrustTier } from "../../utils/trustTier";

export default function SellerProfile() {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: ls }] = await Promise.all([
        supabase
          .from("seller_public_profile")
          .select("*")
          .eq("id", id)
          .single(),
        supabase
          .from("discovery_feed")
          .select("*")
          .eq("seller_id", id)
          .eq("is_active", true)
          .eq("is_hidden", false)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false }),
      ]);
      setSeller(s);
      setListings(ls || []);
    })();
  }, [id]);

  if (!seller) return <div className="text-slate-500 p-8">Loading…</div>;

  const tier = getTrustTier(seller.trust_score);
  const joined = new Date(seller.joined_at).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center">
            {seller.avatar_url ? (
              <img
                src={seller.avatar_url}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              <span className="text-2xl font-black text-white">
                {seller.full_name?.[0]}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">
              {seller.business_name || seller.full_name}
            </h1>
            <p className={`text-sm font-bold ${tier.color}`}>
              ★ {tier.label} · Trust {seller.trust_score}/100
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Member since {joined} · {seller.active_listings} active ·{" "}
              {seller.sold_count} sold
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">
        Active listings
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings.map((item) => (
          <Link key={item.id} to={`/listing/${item.id}`}>
            <FeedCard item={item} onClick={() => {}} />
          </Link>
        ))}
      </div>
    </div>
  );
}
