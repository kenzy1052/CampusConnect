import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export function CreateListing({ user, onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    listing_type: "product",
    price: "",
    price_min: "",
    price_max: "",
    category_id: "",
    negotiable: false,
    condition: "new",
  });

  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase.from("categories").select("*");

      if (error) {
        console.error("CATEGORY ERROR:", error.message);
      }

      setCategories(data || []);
      setLoading(false);
    }

    fetchCategories();
  }, []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    if (files.length < 1) return alert("At least 1 image required");
    if (files.length > 3) return alert("Max 3 images allowed");

    setImages(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return; // 🔥 prevents double click race

    if (!formData.title.trim()) return alert("Title required");
    if (!formData.category_id) return alert("Select category");
    if (images.length === 0) return alert("Upload at least 1 image");

    if (formData.listing_type === "product") {
      if (!formData.price && !formData.negotiable) {
        return alert("Enter a price or mark as negotiable");
      }
    }

    setSubmitting(true);

    try {
      // 🔥 STEP 1: CREATE LISTING
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert([
          {
            title: formData.title,
            description: formData.description,
            type: formData.listing_type,
            category_id: formData.category_id,
            seller_id: user.id,
            condition:
              formData.listing_type === "product" ? formData.condition : null,

            price:
              formData.listing_type === "product" && formData.price
                ? parseFloat(formData.price)
                : null,

            price_min:
              formData.listing_type === "service" && formData.price_min
                ? parseFloat(formData.price_min)
                : null,

            price_max:
              formData.listing_type === "service" && formData.price_max
                ? parseFloat(formData.price_max)
                : null,

            negotiable:
              formData.listing_type === "product" ? formData.negotiable : false,
          },
        ])
        .select()
        .single();

      if (listingError || !listing) {
        throw new Error(listingError?.message || "Listing insert failed");
      }

      // 🔥 STEP 2: UPLOAD IMAGES (SAFE LOOP)
      for (let i = 0; i < images.length; i++) {
        const file = images[i];

        const cleanName = file.name
          .toLowerCase()
          .replace(/\s+/g, "-") // spaces → dash
          .replace(/[^a-z0-9.-]/g, "") // remove unsafe chars
          .slice(0, 50); // limit length

        const filePath = `${listing.id}/${Date.now()}-${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file);

        if (uploadError) {
          console.error("UPLOAD ERROR:", uploadError);
          throw new Error("Image upload failed: " + uploadError.message);
        }

        const { data } = supabase.storage
          .from("listing-images")
          .getPublicUrl(filePath);

        const imageUrl = data?.publicUrl;

        if (!imageUrl) {
          throw new Error("Failed to generate image URL");
        }

        const { error: imageError } = await supabase
          .from("listing_images")
          .insert([
            {
              listing_id: listing.id,
              image_url: imageUrl,
              position: i + 1,
            },
          ]);

        if (imageError) {
          throw new Error("DB insert failed: " + imageError.message);
        }
      }

      // 🔥 STEP 3: SUCCESS
      onSuccess();
    } catch (err) {
      console.error("CREATE LISTING ERROR:", err);
      alert(err.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );

  const filteredCategories = categories.filter(
    (c) => c.type === formData.listing_type,
  );

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 space-y-8"
      >
        {/* HEADER */}
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Create Listing
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Fill in the details to publish your item to the marketplace.
          </p>
        </div>

        {/* TYPE TOGGLE */}
        <div className="bg-slate-950 p-1.5 rounded-xl flex border border-slate-800">
          {["product", "service"].map((type) => (
            <button
              type="button"
              key={type}
              onClick={() =>
                setFormData({
                  ...formData,
                  listing_type: type,
                  price: "",
                  price_min: "",
                  price_max: "",
                  condition: type === "product" ? "new" : null,
                })
              }
              className={`flex-1 py-3 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                formData.listing_type === type
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {type === "product"
                ? "📦 Physical Product"
                : "🛠️ Professional Service"}
            </button>
          ))}
        </div>

        {/* BASIC DETAILS */}
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
              Listing Title
            </label>
            <input
              placeholder="e.g. Vintage Camera or Logo Design"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
              Description
            </label>
            <textarea
              rows="4"
              placeholder="Describe your offering in detail..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none placeholder:text-slate-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white appearance-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value="">Select Category</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* NEW CONDITION DROPDOWN */}
            {formData.listing_type === "product" && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                  Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({ ...formData, condition: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white appearance-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                >
                  <option value="new">New</option>
                  <option value="used">Used</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* PRICING SECTION */}
        <div className="p-5 bg-slate-950/50 border border-slate-800 rounded-xl space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
            Pricing Details
          </label>

          {formData.listing_type === "product" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <input
                  type="number"
                  placeholder="Price (GH₵)"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Custom Toggle Switch for Negotiable */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer group w-max">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.negotiable}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          negotiable: e.target.checked,
                        })
                      }
                      className="peer sr-only"
                    />
                    <div className="w-12 h-6 bg-slate-800 border border-slate-700 rounded-full peer-checked:bg-indigo-600 peer-checked:border-indigo-500 transition-all"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6 shadow-sm"></div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors uppercase tracking-wider">
                    Price is negotiable
                  </span>
                </label>
              </div>
            </div>
          )}

          {formData.listing_type === "service" && (
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="number"
                placeholder="Min Price (GH₵)"
                value={formData.price_min}
                onChange={(e) =>
                  setFormData({ ...formData, price_min: e.target.value })
                }
                className="w-full sm:w-1/2 bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              />
              <input
                type="number"
                placeholder="Max Price (GH₵)"
                value={formData.price_max}
                onChange={(e) =>
                  setFormData({ ...formData, price_max: e.target.value })
                }
                className="w-full sm:w-1/2 bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          )}
        </div>

        {/* MEDIA UPLOAD */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
            Product Media (Max 3)
          </label>
          <div className="w-full">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-slate-400 
                file:mr-4 file:py-3 file:px-6 
                file:rounded-xl file:border-0 
                file:text-[10px] file:font-black file:uppercase file:tracking-widest 
                file:bg-indigo-500/10 file:text-indigo-400 
                hover:file:bg-indigo-500/20 file:transition-all 
                cursor-pointer bg-slate-950 border border-slate-800 rounded-xl p-2"
            />
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 text-slate-400 hover:text-white text-[11px] font-black uppercase tracking-widest transition-colors rounded-xl border border-transparent hover:border-slate-700 hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            disabled={submitting}
            className="flex-1 bg-white text-black py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/5 hover:shadow-indigo-500/25"
          >
            {submitting ? "Publishing..." : "Publish Listing"}
          </button>
        </div>
      </form>
    </div>
  );
}
