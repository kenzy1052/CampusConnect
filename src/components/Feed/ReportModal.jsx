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

export default function ReportModal({ listing, onClose }) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      alert("You must be logged in.");
      return;
    }

    // Determine the final reason string
    const finalReason =
      selectedReason === "Other" ? customReason.trim() : selectedReason;

    if (!finalReason) {
      alert("Please provide a reason for the report.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      listing_id: listing.id,
      reason: finalReason,
      is_resolved: false,
    });

    setSubmitting(false);

    if (error) {
      console.error(error);
      alert("Failed to submit report: " + error.message);
      return;
    }

    setDone(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {done ? (
          /* SUCCESS STATE UI */
          <div className="text-center py-6">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-lg font-black text-white mb-2">
              Report Submitted
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Our admin team will review this. Thank you for keeping the
              marketplace safe.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-white text-black py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          /* FORM STATE UI */
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white">Report Listing</h2>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 mb-5">
              Reporting{" "}
              <span className="text-white font-bold">"{listing.title}"</span>.
              <br />
              <span className="text-red-400/80 mt-1 inline-block">
                This will be reviewed by the campus admin team.
              </span>
            </p>

            <div className="space-y-2 mb-4">
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
                placeholder="Please describe the issue in detail..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-red-500/40 resize-none mb-4 animate-in fade-in duration-200"
              />
            )}

            <button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !selectedReason ||
                (selectedReason === "Other" && !customReason.trim())
              }
              className="w-full bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
