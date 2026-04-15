import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import ListingDetail from "../Feed/ListingDetail";

export default function AdminPanel() {
  const [reports, setReports] = useState([]);
  const [resolvedReports, setResolvedReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (tab === "audit") fetchLogs();
  }, [tab]);

  // 🔴 STEP 3 — FIXED: STRICT ERROR CHECKING IN FETCHALL
  const fetchAll = async () => {
    setLoading(true);

    const [
      pendingRes,
      resolvedRes,
      usersRes,
      listingsCountRes,
      usersCountRes,
      pendingCountRes,
    ] = await Promise.all([
      supabase
        .from("reports")
        .select("*, listings(id, title, seller_id, is_hidden)")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("reports")
        .select("*, listings(id, title, seller_id)")
        .eq("is_resolved", true)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("*")
        .order("trust_score", { ascending: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("is_resolved", false),
    ]);

    if (pendingRes.error || resolvedRes.error || usersRes.error) {
      console.error(
        "FetchAll Errors:",
        pendingRes.error,
        resolvedRes.error,
        usersRes.error,
      );
      setLoading(false);
      return;
    }

    const repsRaw = pendingRes.data;
    const resolvedReps = resolvedRes.data;
    const usrs = usersRes.data;

    // Group pending reports by listing
    const grouped = Object.values(
      repsRaw?.reduce((acc, r) => {
        const key = r.listing_id;
        if (!acc[key]) acc[key] = { listing: r.listings, reports: [] };
        acc[key].reports.push(r);
        return acc;
      }, {}) || {},
    );

    setReports(grouped);
    setResolvedReports(resolvedReps || []);
    if (usrs) setUsers(usrs);
    setStats({
      listings: listingsCountRes.count ?? 0,
      users: usersCountRes.count ?? 0,
      pending: pendingCountRes.count ?? 0,
    });
    setLoading(false);
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs(data || []);
  };

  const logAdminAction = async (action, targetType, targetId) => {
    await supabase
      .from("admin_audit_logs")
      .insert({ action, target_type: targetType, target_id: targetId });
  };

  // ✅ STEP 2 & 5 — REPLACED DISMISS LOGIC + VERIFICATION LOGS
  const dismissReport = async (report) => {
    setActionId(report.id);
    console.log("Before dismiss:", report);

    const { error } = await supabase.rpc("admin_dismiss_report", {
      p_report_id: report.id,
    });

    if (error) {
      alert(error.message);
      setActionId(null);
      return;
    }

    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("id", report.id)
      .single();

    console.log("After dismiss:", data);

    await fetchAll(); // 🔴 MUST BE AWAITED

    setActionId(null);
  };

  // Kept for the "Dismiss All on Listing" top-level button, but strictly awaited
  const dismissAllReports = async (listingId) => {
    if (!window.confirm("Dismiss all reports for this listing?")) return;
    setActionId(listingId);
    await supabase
      .from("reports")
      .update({ is_resolved: true, resolution_action: "dismissed" })
      .eq("listing_id", listingId);
    await logAdminAction("DISMISS_REPORTS", "listing", listingId);
    await fetchAll();
    setActionId(null);
  };

  const handleViewListing = async (listingId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        seller_profile:profiles!seller_id(full_name, business_name, trust_score),
        category:categories(name)
      `,
      )
      .eq("id", listingId)
      .single();

    if (error || !data) {
      alert("Listing not found or already deleted.");
    } else {
      setSelectedListing({
        ...data,
        listing_type: data.type,
        seller_name:
          data.seller_profile?.business_name || data.seller_profile?.full_name,
        seller_trust: data.seller_profile?.trust_score,
        trust_score: data.seller_profile?.trust_score,
        category_name: data.category?.name,
      });
    }
    setLoading(false);
  };

  const handleDeleteListing = async (listingId) => {
    if (
      !window.confirm(
        "CRITICAL: Permanently delete this listing? This cannot be undone.",
      )
    )
      return;
    setActionId(listingId);
    const { error } = await supabase.rpc("admin_delete_listing", {
      p_listing_id: listingId,
    });
    if (error) alert(error.message);
    else await logAdminAction("DELETE_LISTING", "listing", listingId);
    await fetchAll();
    setActionId(null);
  };

  // --- NEW: TOGGLE HIDE LOGIC ---
  const toggleHide = async (listingId, hidden) => {
    setActionId(listingId);
    const { error } = await supabase.rpc("admin_set_listing_visibility", {
      p_listing_id: listingId,
      p_hidden: hidden,
    });

    if (error) alert(error.message);
    else
      await logAdminAction(
        hidden ? "HIDE_LISTING" : "UNHIDE_LISTING",
        "listing",
        listingId,
      );

    await fetchAll();
    setActionId(null);
  };

  const confirmListingPenalty = async (listingId) => {
    if (
      !window.confirm(
        "Apply −10 trust penalty to seller and resolve all reports?",
      )
    )
      return;
    setActionId(listingId);
    const { error } = await supabase.rpc("apply_listing_penalty_once", {
      p_listing_id: listingId,
    });
    if (error) alert(error.message);
    else await logAdminAction("APPLY_PENALTY", "listing", listingId);
    await fetchAll();
    setActionId(null);
  };

  const resetTrust = async (userId, name) => {
    if (!window.confirm(`Reset ${name}'s trust score to 25?`)) return;
    await supabase
      .from("profiles")
      .update({ trust_score: 25 })
      .eq("id", userId);
    await logAdminAction("RESET_USER_TRUST", "profile", userId);
    await fetchAll();
  };

  const toggleSuspension = async (u) => {
    const newState = !u.is_suspended;
    await supabase
      .from("profiles")
      .update({ is_suspended: newState })
      .eq("id", u.id);
    await logAdminAction(
      newState ? "SUSPEND_USER" : "UNSUSPEND_USER",
      "profile",
      u.id,
    );
    await fetchAll();
  };

  // ── LISTING INSPECTOR VIEW ──
  if (selectedListing)
    return (
      <div className="pt-4 max-w-5xl mx-auto animate-in fade-in duration-300">
        <div className="mb-4 flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            🛡️ Admin Inspector
          </span>
          <button
            onClick={() => setSelectedListing(null)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase rounded-xl transition-all"
          >
            ← Back to Panel
          </button>
        </div>
        <ListingDetail
          listing={selectedListing}
          onBack={() => setSelectedListing(null)}
        />
      </div>
    );

  if (loading)
    return (
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto pb-24 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">🛡️ Admin Panel</h1>
        <p className="text-sm text-slate-500 mt-1">
          Moderate reports · Manage users · Audit actions
        </p>
      </div>

      {/* STATS ROW */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "Total Listings",
              value: stats.listings,
              color: "text-indigo-400",
            },
            {
              label: "Total Users",
              value: stats.users,
              color: "text-emerald-400",
            },
            {
              label: "Pending Reports",
              value: stats.pending,
              color: "text-red-400",
            },
            {
              label: "Reports Resolved",
              value: resolvedReports.length,
              color: "text-slate-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center"
            >
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {[
          { id: "reports", label: `Pending (${reports.length})` },
          { id: "resolved", label: `History (${resolvedReports.length})` },
          { id: "users", label: `Users (${users.length})` },
          { id: "audit", label: "Audit Log" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === t.id
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={fetchAll}
          className="ml-auto px-4 py-2.5 rounded-xl text-[10px] font-bold text-slate-500 hover:text-white border border-slate-800 hover:border-slate-700 transition-all"
        >
          ↻ Refresh
        </button>
      </div>

      {/* PENDING REPORTS */}
      {tab === "reports" && (
        <div className="space-y-6">
          {reports.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-slate-500 font-bold">No pending reports</p>
            </div>
          ) : (
            reports.map((group) => {
              const listing = group.listing;

              // ✅ STEP 4 — ADD UI DEFENSIVE FILTER (NON-NEGOTIABLE)
              // Filters the reports inside the group map to prevent ghost entries
              const reportList = group.reports.filter((r) => !r.is_resolved);

              // If all reports in this group were resolved/dismissed locally, don't render the listing box at all
              if (reportList.length === 0) return null;

              const busy = actionId === listing?.id;
              return (
                <div
                  key={listing?.id || Math.random()}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
                >
                  {/* LISTING HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-lg font-bold text-white">
                          "{listing?.title || "Deleted listing"}"
                        </p>
                        {listing?.is_hidden && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-red-400 font-bold mt-1 uppercase tracking-widest">
                        {reportList.length} report
                        {reportList.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {listing?.id && (
                        <button
                          onClick={() => handleViewListing(listing.id)}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-lg transition-all"
                        >
                          👁 View
                        </button>
                      )}

                      {/* NEW: Hide/Unhide Buttons */}
                      {listing?.id &&
                        (listing.is_hidden ? (
                          <button
                            onClick={() => toggleHide(listing.id, false)}
                            disabled={busy}
                            className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase rounded-lg transition-all disabled:opacity-40"
                          >
                            {busy ? "..." : "👁 Unhide"}
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleHide(listing.id, true)}
                            disabled={busy}
                            className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase rounded-lg transition-all disabled:opacity-40"
                          >
                            {busy ? "..." : "🙈 Hide"}
                          </button>
                        ))}

                      <button
                        onClick={() => dismissAllReports(listing.id)}
                        disabled={busy}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase rounded-lg border border-slate-700 transition-all disabled:opacity-40"
                      >
                        {busy ? "..." : "Dismiss All"}
                      </button>
                      <button
                        onClick={() => confirmListingPenalty(listing.id)}
                        disabled={busy}
                        className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase rounded-lg transition-all disabled:opacity-40"
                      >
                        {busy ? "..." : "−10 Trust"}
                      </button>
                      <button
                        onClick={() => handleDeleteListing(listing.id)}
                        disabled={busy}
                        className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase rounded-lg transition-all disabled:opacity-40"
                      >
                        {busy ? "..." : "🗑 Delete Post"}
                      </button>
                    </div>
                  </div>

                  {/* INDIVIDUAL REPORT REASONS */}
                  <div className="space-y-2 border-t border-slate-800/50 pt-4">
                    {reportList.map((r) => {
                      const isDismissing = actionId === r.id;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between bg-slate-950/60 border border-slate-800/50 rounded-xl px-4 py-2.5 gap-3"
                        >
                          <p className="text-xs text-slate-400 italic flex-1">
                            "{r.reason}"
                          </p>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9px] text-slate-600">
                              {new Date(r.created_at).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                },
                              )}
                            </span>
                            {/* NEW: Individual dismiss button to utilize the admin_dismiss_report RPC */}
                            <button
                              onClick={() => dismissReport(r)}
                              disabled={isDismissing}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-black uppercase rounded border border-slate-700 transition-all disabled:opacity-40"
                            >
                              {isDismissing ? "..." : "Dismiss"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* RESOLVED HISTORY */}
      {tab === "resolved" && (
        <div className="space-y-3">
          {resolvedReports.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-600 font-bold">
                No resolved reports yet
              </p>
            </div>
          ) : (
            resolvedReports.map((r) => (
              <div
                key={r.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-300 font-bold truncate">
                    "{r.listings?.title || "Deleted listing"}"
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 italic">
                    "{r.reason}"
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] text-slate-600">
                    {new Date(r.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${
                      r.resolution_action === "confirmed"
                        ? "text-red-400 border-red-500/30"
                        : r.resolution_action === "dismissed"
                          ? "text-slate-400 border-slate-700"
                          : r.resolution_action === "deleted"
                            ? "text-red-500 border-red-500/40"
                            : "text-slate-500 border-slate-800"
                    }`}
                  >
                    {r.resolution_action === "confirmed"
                      ? "Penalty Applied"
                      : r.resolution_action === "dismissed"
                        ? "Dismissed"
                        : r.resolution_action === "deleted"
                          ? "Listing Removed"
                          : "Resolved"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* USERS */}
      {tab === "users" && (
        <div className="space-y-3">
          {users.map((u) => {
            const name = u.business_name || u.full_name || "Unknown";
            const trust = u.trust_score ?? 50;
            const tc =
              trust >= 70
                ? "text-emerald-400"
                : trust >= 40
                  ? "text-indigo-400"
                  : "text-red-400";
            const bar =
              trust >= 70
                ? "bg-emerald-400"
                : trust >= 40
                  ? "bg-indigo-400"
                  : "bg-red-400";
            return (
              <div
                key={u.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center text-white font-black text-sm shrink-0">
                  {name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white text-sm truncate">
                      {name}
                    </p>
                    {u.is_suspended && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        Suspended
                      </span>
                    )}
                    <span className="text-[9px] text-slate-600 uppercase">
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs font-black ${tc}`}>
                      ★ {trust}
                    </span>
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${bar}`}
                        style={{ width: `${trust}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => resetTrust(u.id, name)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase bg-slate-800 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 rounded-lg border border-slate-700 hover:border-amber-500/20 transition-all"
                  >
                    Reset →25
                  </button>
                  <button
                    onClick={() => toggleSuspension(u)}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all ${
                      u.is_suspended
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                    }`}
                  >
                    {u.is_suspended ? "✓ Unsuspend" : "⊘ Suspend"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AUDIT LOG */}
      {tab === "audit" && (
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-600 font-bold">No audit logs yet</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center gap-4"
              >
                <div>
                  <p className="text-sm text-white font-bold">
                    {log.action.replaceAll("_", " ")}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {log.target_type} · {log.target_id?.slice(0, 12)}...
                  </p>
                </div>
                <p className="text-[10px] text-slate-600 font-black uppercase shrink-0">
                  {new Date(log.created_at).toLocaleString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
