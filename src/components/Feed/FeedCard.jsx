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

  return (
    <div
      onClick={onClick}
      className="group bg-slate-900 rounded-2xl overflow-hidden border border-slate-800/60 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-950/50 transition-all duration-300 cursor-pointer flex flex-col"
    >
      {/* IMAGE BLOCK */}
      <div className="relative w-full aspect-[4/3] bg-slate-800 overflow-hidden shrink-0">
        <img
          src={item.image_url || "/placeholder.png"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt={item.title}
        />
        {/* gradient so bottom text is legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* type badge — top left */}
        <span
          className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md ${
            isService
              ? "bg-indigo-600/60 text-indigo-100 border border-indigo-400/40"
              : "bg-emerald-600/60 text-emerald-100 border border-emerald-400/40"
          }`}
        >
          {isService ? "Service" : "Product"}
        </span>

        {/* category — top right */}
        <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-[8px] font-bold bg-black/50 text-slate-300 backdrop-blur-md border border-white/10 max-w-[90px] truncate">
          {item.category_name}
        </span>

        {/* price + negotiable — bottom of image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <span className="text-white font-black text-[15px] drop-shadow-lg leading-none">
            {getPriceDisplay()}
          </span>
          {item.negotiable && (
            <span className="text-[8px] font-bold bg-indigo-600/60 backdrop-blur-sm text-indigo-100 px-2 py-0.5 rounded-full border border-indigo-400/40 shrink-0">
              Negotiable
            </span>
          )}
        </div>
      </div>

      {/* TEXT BLOCK */}
      <div className="p-4 flex flex-col flex-1">
        <h2 className="font-bold text-[14px] text-white leading-snug line-clamp-2">
          {item.title}
        </h2>
        <p className="text-[12px] text-slate-500 mt-1.5 line-clamp-2 flex-1 leading-relaxed">
          {item.description || "No description provided."}
        </p>

        {/* SELLER ROW */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
              {initial}
            </div>
            <span className="text-[11px] text-slate-400 truncate">
              {item.seller_name}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 bg-slate-800 px-2 py-0.5 rounded-full">
            <span className="text-yellow-400 text-[10px]">★</span>
            <span className="text-[10px] font-bold text-slate-200">
              {item.seller_trust}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
