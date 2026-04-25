import { Eye } from "lucide-react";
import { getTrustTier } from "../../utils/trustTier";

export function FeedCard({ item, onClick }) {
  const getPriceDisplay = () => {
    if (item.price !== null) return `GH₵ ${item.price}`;
    if (item.price_min && item.price_max)
      return `GH₵ ${item.price_min} – ${item.price_max}`;
    if (item.price_min) return `From GH₵ ${item.price_min}`;
    if (item.price_max) return `Up to GH₵ ${item.price_max}`;
    return "Ask for price";
  };

  const isService = item.listing_type === "service";
  const initial = (item.seller_name || "U")[0].toUpperCase();
  const tier = getTrustTier(item.seller_trust ?? 50);
  const views = item.view_count ?? 0;

  return (
    <div
      onClick={onClick}
      className="group bg-slate-900 rounded-xl overflow-hidden border border-slate-800/60 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(79,70,229,0.15)] transition-all duration-300 cursor-pointer flex flex-col"
    >
      {/* IMAGE BLOCK */}
      <div className="relative w-full aspect-square bg-slate-950 overflow-hidden shrink-0">
        <img
          src={item.image_url || "/placeholder.png"}
          onError={(e) => {
            if (e.currentTarget.src.endsWith("/placeholder.png")) return;
            e.currentTarget.src = "/placeholder.png";
          }}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-opacity duration-300"
          alt={item.title}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

        {/* Top badges only — no heart here, that lives on the detail page */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start gap-2">
          <span
            className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
              isService
                ? "bg-indigo-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {isService ? "Service" : "Product"}
          </span>

          <span className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-slate-900/90 text-slate-300 border border-white/10 backdrop-blur-sm truncate max-w-[80px]">
            {item.category_name}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <span className="text-white font-bold text-base tracking-tight drop-shadow-md">
            {getPriceDisplay()}
          </span>
        </div>
      </div>

      {/* TEXT BLOCK */}
      <div className="p-4 flex flex-col flex-1">
        <h2 className="font-bold text-[14px] text-slate-100 leading-snug line-clamp-2 transition-colors duration-300 group-hover:text-indigo-400">
          {item.title}
        </h2>

        <p className="text-[12px] text-slate-500 mt-1.5 line-clamp-2 flex-1 leading-relaxed">
          {item.description || "No description provided."}
        </p>

        {/* SELLER + STATS ROW */}
        <div className="mt-3 pt-3 border-t border-slate-800/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
              {item.seller_avatar_url ? (
                <img
                  src={item.seller_avatar_url}
                  alt={item.seller_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <span className="text-[11px] font-medium text-slate-400 truncate">
              {item.seller_name}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-0.5 text-slate-500">
              <Eye size={11} />
              <span className="text-[10px] font-bold">{views}</span>
            </div>
            <div className={`flex items-center gap-0.5 ${tier.color}`}>
              <span className="text-[10px]">★</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                {tier.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
