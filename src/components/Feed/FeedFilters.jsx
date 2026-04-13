import { useState, useEffect } from "react";

export function FeedFilters({
  filter,
  setFilter,
  categoryId,
  setCategoryId,
  searchTerm,
  setSearchTerm,
  categories,
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilter, setTempFilter] = useState(filter);
  const [tempCategory, setTempCategory] = useState(categoryId);
  const [inputValue, setInputValue] = useState(searchTerm); // local — only commits on submit

  useEffect(() => {
    setTempFilter(filter);
    setTempCategory(categoryId);
  }, [filter, categoryId]);

  const submitSearch = () => setSearchTerm(inputValue);
  const handleKeyDown = (e) => {
    if (e.key === "Enter") submitSearch();
  };

  const handleApply = () => {
    setFilter(tempFilter);
    setCategoryId(tempCategory);
    setShowFilters(false);
  };

  return (
    <div className="mb-8 w-full">
      {/* SEARCH ROW */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden focus-within:border-indigo-500/60 transition-all">
          <input
            type="text"
            placeholder="Search listings..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent px-5 py-4 text-sm text-white focus:outline-none placeholder:text-slate-600"
          />
          <button
            onClick={submitSearch}
            className="px-5 py-4 text-slate-500 hover:text-white transition-colors border-l border-slate-800"
            aria-label="Search"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
            showFilters
              ? "bg-white text-black"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          {showFilters ? "✕" : "Filter"}
        </button>
      </div>

      {/* FILTER PANEL */}
      {showFilters && (
        <div className="mt-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="space-y-6">
            {/* TYPE */}
            <div>
              <p className="text-[10px] text-slate-500 mb-3 uppercase font-black tracking-widest">
                Listing Type
              </p>
              <div className="flex gap-2">
                {["all", "product", "service"].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setTempFilter(type);
                      const sel = categories.find((c) => c.id === tempCategory);
                      if (sel && type !== "all" && sel.type !== type)
                        setTempCategory("");
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                      tempFilter === type
                        ? "bg-indigo-500 text-white border-indigo-400"
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    {type === "all" ? "All" : type}
                  </button>
                ))}
              </div>
            </div>

            {/* CATEGORIES */}
            <div>
              <p className="text-[10px] text-slate-500 mb-3 uppercase font-black tracking-widest">
                Category
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTempCategory("")}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${
                    tempCategory === ""
                      ? "bg-white text-black border-white"
                      : "bg-slate-950 border-slate-800 text-slate-500"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => {
                  const disabled =
                    tempFilter !== "all" && cat.type !== tempFilter;
                  return (
                    <button
                      key={cat.id}
                      disabled={disabled}
                      onClick={() => setTempCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${
                        tempCategory === cat.id
                          ? "bg-indigo-500 text-white border-indigo-400"
                          : disabled
                            ? "opacity-30 cursor-not-allowed border-slate-800 text-slate-600"
                            : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleApply}
              className="w-full bg-white text-black py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
