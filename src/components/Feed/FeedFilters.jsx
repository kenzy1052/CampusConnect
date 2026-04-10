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

  // Local temp state
  const [tempFilter, setTempFilter] = useState(filter);
  const [tempCategory, setTempCategory] = useState(categoryId);

  // ✅ FIX 1: Sync temp state with parent
  useEffect(() => {
    setTempFilter(filter);
    setTempCategory(categoryId);
  }, [filter, categoryId]);

  const handleApply = () => {
    setFilter(tempFilter);
    setCategoryId(tempCategory);
    setShowFilters(false);
  };

  return (
    <div className="mb-8 w-full">
      {" "}
      {/* ✅ FIX 2: remove hard width */}
      {/* TOP BAR */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search listings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-indigo-500"
        />

        <button
          onClick={() => setShowFilters((prev) => !prev)}
          className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest ${
            showFilters ? "bg-white text-black" : "bg-indigo-600 text-white"
          }`}
        >
          {showFilters ? "Close" : "Filters"}
        </button>
      </div>
      {/* FILTER PANEL */}
      {showFilters && (
        <div className="mt-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="space-y-8">
            {/* LISTING TYPE */}
            <div>
              <p className="text-[10px] text-slate-500 mb-4 uppercase font-black tracking-widest">
                Listing Type
              </p>

              <div className="flex gap-2">
                {["all", "product", "service"].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setTempFilter(type);

                      // ✅ FIX 3: only reset if invalid
                      const selectedCat = categories.find(
                        (c) => c.id === tempCategory,
                      );

                      if (
                        selectedCat &&
                        type !== "all" &&
                        selectedCat.type !== type
                      ) {
                        setTempCategory("");
                      }
                    }}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border ${
                      tempFilter === type
                        ? "bg-indigo-500 text-white border-indigo-400"
                        : "bg-slate-950 border-slate-800 text-slate-500"
                    }`}
                  >
                    {type === "all" ? "All" : type}
                  </button>
                ))}
              </div>
            </div>

            {/* CATEGORY */}
            <div>
              <p className="text-[10px] text-slate-500 mb-4 uppercase font-black tracking-widest">
                Category
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTempCategory("")}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase border ${
                    tempCategory === ""
                      ? "bg-white text-black border-white"
                      : "bg-slate-950 border-slate-800 text-slate-500"
                  }`}
                >
                  All
                </button>

                {categories.map((cat) => {
                  const isDisabled =
                    tempFilter !== "all" && cat.type !== tempFilter;

                  return (
                    <button
                      key={cat.id}
                      disabled={isDisabled}
                      onClick={() => setTempCategory(cat.id)}
                      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase border ${
                        tempCategory === cat.id
                          ? "bg-indigo-500 text-white border-indigo-400"
                          : isDisabled
                            ? "opacity-40 cursor-not-allowed border-slate-800 text-slate-600"
                            : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* APPLY */}
            <button
              onClick={handleApply}
              className="w-full bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
