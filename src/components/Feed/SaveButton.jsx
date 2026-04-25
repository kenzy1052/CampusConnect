import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

export default function SaveButton({ listingId, className = "" }) {
  const auth = useAuth();
  const user = auth?.user ?? null;

  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !listingId) return;
    let cancelled = false;
    supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id)
      .eq("listing_id", listingId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSaved(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user, listingId]);

  if (!user || !listingId) return null;

  const toggle = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next); // optimistic
    const op = next
      ? supabase
          .from("saved_listings")
          .insert({ user_id: user.id, listing_id: listingId })
      : supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
    const { error } = await op;
    if (error) setSaved(!next); // rollback
    setBusy(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`p-2 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all ${className}`}
      aria-label={saved ? "Remove from saved" : "Save listing"}
    >
      <Heart
        size={18}
        className={saved ? "fill-red-500 text-red-500" : "text-white"}
      />
    </button>
  );
}
