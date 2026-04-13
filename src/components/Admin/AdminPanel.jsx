import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AdminPanel() {
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: reps }, { data: usrs }] = await Promise.all([
      supabase
        .from("reports")
        .select("*, listings(id, title, seller_id)")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("*")
        .order("trust_score", { ascending: true }),
    ]);

    if (reps && reps.length > 0) {
      const sellerIds = [
        ...new Set(reps.map((r) => r.listings?.seller_id).filter(Boolean)),
      ];
      const { data: sellers } = await supabase
        .from("profiles")
        .select("id, full_name, business_name, trust_score")
        .in("id", sellerIds);
      const sm = {};
      sellers?.forEach((s) => {
        sm[s.id] = s;
      });
      setReports(
        reps.map((r) => ({ ...r, seller: sm[r.listings?.seller_id] || null })),
      );
    } else {
      setReports([]);
    }
    if (usrs) setUsers(usrs);
    setLoading(false);
  };

  const approveReport = async (report) => {
    setActionId(report.id);

    const { error } = await supabase.rpc("apply_report_penalty", {
      report_id: report.id,
    });

    if (error) {
      alert("Error: " + error.message);
      setActionId(null);
      return;
    }

    setReports((prev) => prev.filter((r) => r.id !== report.id));
    setActionId(null);
  };

  const dismissReport = async (report) => {
    // Reverse the -10 penalty via RPC, then close
    setActionId(report.id);
    const { error } = await supabase.rpc("reverse_report_penalty", {
      report_id: report.id,
    });
    if (error) {
      alert("RPC error: " + error.message);
      setActionId(null);
      return;
    }
    await supabase
      .from("reports")
      .update({ is_resolved: true })
      .eq("id", report.id);
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("trust_score", { ascending: true });
    if (data) setUsers(data);
    setActionId(null);
  };

  const resetTrust = async (userId, name) => {
    if (!window.confirm("Reset " + name + " trust score to 0?")) return;
    await supabase.from("profiles").update({ trust_score: 0 }).eq("id", userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, trust_score: 0 } : u)),
    );
  };

  const clearListings = async (userId, name) => {
    if (
      !window.confirm(
        "Delete ALL listings from " + name + "? Cannot be undone.",
      )
    )
      return;
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("seller_id", userId);
    if (error) alert("Error: " + error.message);
    else alert("Done. Listings deleted.");
  };

  if (loading)
    return (
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto pb-24 animate-in fade-in duration-300">
      <div className="mb-8 flex items-center gap-3">
        <span className="text-2xl">🛡️</span>
        <div>
          <h1 className="text-2xl font-black text-white">Admin Panel</h1>
          <p className="text-sm text-slate-500">
            Moderate reports · Manage users
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-8">
        {[
          { id: "reports", label: "Reports (" + reports.length + ")" },
          { id: "users", label: "Users (" + users.length + ")" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all " +
              (tab === t.id
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white")
            }
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={fetchAll}
          className="ml-auto px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-500 hover:text-white border border-slate-800 hover:border-slate-700 transition-all"
        >
          ↻ Refresh
        </button>
      </div>

      {/* REPORTS */}
      {tab === "reports" && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-slate-500 font-bold">No pending reports</p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {new Date(report.created_at).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short" },
                        )}
                      </span>
                    </div>
                    <p className="font-bold text-white mb-1">
                      "{report.listings?.title || "Deleted listing"}"
                    </p>
                    <p className="text-sm text-slate-400 mb-2">
                      <span className="text-slate-600">Reason: </span>
                      {report.reason}
                    </p>
                    {report.seller && (
                      <p className="text-xs text-slate-600">
                        Seller:{" "}
                        <span className="text-slate-400">
                          {report.seller.business_name ||
                            report.seller.full_name}
                        </span>
                        {" · "}Trust:{" "}
                        <span className="text-indigo-400 font-bold">
                          ★ {report.seller.trust_score}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => dismissReport(report)}
                      disabled={actionId === report.id}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl border border-slate-700 transition-all disabled:opacity-40"
                    >
                      {actionId === report.id ? "..." : "Dismiss (+10 back)"}
                    </button>
                    <button
                      onClick={() => approveReport(report)}
                      disabled={actionId === report.id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-40"
                    >
                      {actionId === report.id ? "..." : "Confirm (-10 kept)"}
                    </button>
                  </div>
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
                <div className="w-10 h-10 rounded-full bg-indigo-600/40 flex items-center justify-center text-white font-black text-sm shrink-0">
                  {name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">
                    {name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={"text-xs font-black " + tc}>
                      ★ {trust}
                    </span>
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={"h-full rounded-full transition-all " + bar}
                        style={{ width: trust + "%" }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-600 uppercase tracking-wider">
                      {u.role}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => resetTrust(u.id, name)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase bg-slate-800 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 rounded-lg border border-slate-700 hover:border-amber-500/20 transition-all"
                  >
                    Reset Trust
                  </button>
                  <button
                    onClick={() => clearListings(u.id, name)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 hover:border-red-500/20 transition-all"
                  >
                    Clear Posts
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
