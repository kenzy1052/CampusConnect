const { data } = await supabase
  .from("saved_listings")
  .select("listing_id, discovery_feed!inner(*)")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
const items = (data || []).map((r) => r.discovery_feed);
