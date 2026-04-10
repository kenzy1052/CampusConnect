export function FeedCard({ item }) {
  const getPriceDisplay = () => {
    const type = item.listing_type;

    const price = item.price ? parseFloat(item.price) : null;
    const min = item.price_min ? parseFloat(item.price_min) : null;
    const max = item.price_max ? parseFloat(item.price_max) : null;

    // PRODUCT
    if (type === "product") {
      return price !== null ? `GH₵ ${price}` : "—";
    }

    // SERVICE

    if (min !== null && max !== null) {
      return `GH₵ ${min} - ${max}`;
    }

    if (min !== null && max === null) {
      return `From GH₵ ${min}`;
    }

    if (max !== null && min === null) {
      return `Up to GH₵ ${max}`;
    }

    return "Ask for pricing";
  };

  return (
    <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 hover:border-indigo-500/30 transition-all duration-300 group">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">
              {item.category_name}
            </span>
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              {item.listing_type}
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-100 tracking-tight group-hover:text-indigo-400 transition-colors">
            {item.title}
          </h2>

          <p className="text-slate-400 mt-2 text-sm italic opacity-80 leading-relaxed">
            "{item.description}"
          </p>
        </div>

        <div className="text-right ml-4">
          <span className="text-2xl font-black text-white italic">
            {getPriceDisplay()}
          </span>

          <div className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {item.business_name || item.seller_name}
          </div>
        </div>
      </div>
    </div>
  );
}
