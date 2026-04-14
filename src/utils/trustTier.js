export const getTrustTier = (score) => {
  if (score >= 80) return { label: "Verified", color: "text-emerald-400" };
  if (score >= 60) return { label: "Trusted", color: "text-indigo-400" };
  if (score >= 40) return { label: "Active", color: "text-yellow-400" };
  return { label: "New", color: "text-slate-400" };
};
