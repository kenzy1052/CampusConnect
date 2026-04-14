import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const REASONS = [
  "Item not as described",
  "Seller is unresponsive",
  "Suspected scam or fraud",
  "Fake listing / wrong photos",
  "Price manipulation",
  "Other",
];

export default function ReportModal({ listing, onClose, onSuccess }) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!user) {
      alert("You must be logged in to report listings.");
      return;
    }

    const finalReason =
      selectedReason === "Other" ? customReason.trim() : selectedReason;

    if (!finalReason) {
      alert("Please provide a reason.");
      return;
    }

    // 1. FORCE CONFIRMATION (Friction Point)
    if (
      !window.confirm(
        "Are you sure you want to report this listing? \n\nAbuse of this system may lead to account restrictions.",
      )
    ) {
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      // 2. PREVENT DOUBLE REPORTING (Manual Check)
      const { data: existing } = await supabase
        .from("reports")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("reporter_id", user.id)
        .maybeSingle();

      if (existing) {
        alert("You have already reported this listing.");
        setSubmitting(false);
        return;
      }

      // 3. INSERT REPORT
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        listing_id: listing.id,
        reason: finalReason,
        is_resolved: false,
      });

      if (error) throw error;

      setDone(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      if (err.code === "23505") {
        setErrorMsg("You have already reported this listing.");
      } else {
        setErrorMsg("Failed to submit report. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {done ? (
          /* SUCCESS STATE UI */
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl border border-emerald-500/20">
              ✓
            </div>
            <h2 className="text-lg font-black text-white mb-2">
              Report Submitted
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Thank you for keeping Campus Connect safe. Our admin team will
              review this shortly.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-white text-black py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
            >
              Back to Feed
            </button>
          </div>
        ) : (
          /* FORM STATE UI */
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white">Report Listing</h2>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-5">
              Reason for reporting{" "}
              <span className="text-white font-bold italic">
                "{listing.title}"
              </span>
              :
            </p>

            <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto pr-1">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedReason(r)}
                  className={
                    "w-full text-left px-4 py-3 rounded-xl text-sm border transition-all " +
                    (selectedReason === r
                      ? "bg-red-500/10 border-red-500/40 text-red-300 font-bold"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700")
                  }
                >
                  {r}
                </button>
              ))}
            </div>

            {selectedReason === "Other" && (
              <textarea
                rows={3}
                placeholder="Describe the issue..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-red-500/40 outline-none mb-4"
              />
            )}

            {/* CRITICAL WARNING TEXT */}
            <div className="mb-4 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
              <p className="text-[10px] text-red-400 font-bold leading-tight uppercase tracking-wider">
                ⚠️ Warning: False or abusive reports are a violation of campus
                policy and may lead to account restrictions.
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 font-bold mb-3 text-center">
                {errorMsg}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !selectedReason ||
                (selectedReason === "Other" && !customReason.trim())
              }
              className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-30"
            >
              {submitting ? "Processing..." : "Submit Official Report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
