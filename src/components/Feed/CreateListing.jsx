import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Package,
  Tag,
  Wrench,
  X,
} from "lucide-react";

// ─── CONTACT GATE BANNER ─────────────────────────────────────────────────────
function ContactGateBanner({ onGoToSettings, onDismiss }) {
  return (
    <div className="animate-in slide-in-from-top-2 duration-300 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-300 leading-snug">
            Contact info required before publishing
          </p>
          <p className="text-xs text-amber-400/70 mt-1 leading-relaxed">
            Buyers need a way to reach you. Add a phone or WhatsApp number in
            Account Settings first.
          </p>
          <button
            type="button"
            onClick={onGoToSettings}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-amber-300 hover:text-white bg-amber-500/15 hover:bg-amber-500/30 px-3 py-2 rounded-lg transition-all"
          >
            Go to Account Settings
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-slate-600 hover:text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── IMAGE PREVIEW ────────────────────────────────────────────────────────────
function ImagePreview({ files, onRemove }) {
  if (!files.length) return null;
  return (
    <div className="flex gap-3 flex-wrap mt-3">
      {files.map((file, i) => (
        <div
          key={i}
          className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-800"
        >
          <img
            src={URL.createObjectURL(file)}
            alt=""
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          {i === 0 && (
            <span className="absolute bottom-1 left-1 text-[8px] font-black uppercase bg-indigo-600/80 text-white px-1.5 py-0.5 rounded-md">
              Cover
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function CreateListing({ user, onCancel, onSuccess }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    listing_type: "product",
    price: "",
    price_min: "",
    price_max: "",
    category_id: "",
    negotiable: false,
  });

  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contactGate, setContactGate] = useState(false); // inline banner

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) console.error("CATEGORY ERROR:", error.message);
      setCategories(data || []);
      setLoading(false);
    }
    fetchCategories();
  }, []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length < 1) return;
    if (files.length > 3) return alert("Max 3 images allowed");
    setImages(files);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // ── Basic validation ──
    if (!formData.title.trim()) return alert("Title required");
    if (!formData.category_id) return alert("Select a category");
    if (images.length === 0) return alert("Upload at least 1 image");
    if (
      formData.listing_type === "product" &&
      !formData.price &&
      !formData.negotiable
    ) {
      return alert("Enter a price or mark as negotiable");
    }

    setSubmitting(true);
    setContactGate(false);

    try {
      // ── STEP 1: CONTACT GATE ──────────────────────────────────────────────
      const { data: contacts, error: contactError } = await supabase
        .from("contact_numbers")
        .select("type, is_primary")
        .eq("user_id", user.id);

      if (contactError) {
        alert("Failed to verify contact info. Please try again.");
        setSubmitting(false);
        return;
      }

      const hasPrimaryPhone = contacts?.some(
        (c) => c.type === "phone" && c.is_primary,
      );
      const hasWhatsapp = contacts?.some((c) => c.type === "whatsapp");

      if (!hasPrimaryPhone && !hasWhatsapp) {
        setContactGate(true); // show inline banner
        setSubmitting(false);
        // scroll banner into view
        setTimeout(() => {
          document.getElementById("contact-gate-banner")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
        return;
      }

      // ── STEP 2: CREATE LISTING ────────────────────────────────────────────
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert([
          {
            title: formData.title,
            description: formData.description,
            type: formData.listing_type,
            category_id: formData.category_id,
            seller_id: user.id,
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

      // ── STEP 3: UPLOAD IMAGES ─────────────────────────────────────────────
      for (let i = 0; i < images.length; i++) {
        const file = images[i];

        const cleanName = file.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9.-]/g, "")
          .slice(0, 50);

        const filePath = `${listing.id}/${Date.now()}-${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file);

        if (uploadError)
          throw new Error("Image upload failed: " + uploadError.message);

        const { data } = supabase.storage
          .from("listing-images")
          .getPublicUrl(filePath);

        if (!data?.publicUrl) throw new Error("Failed to generate image URL");

        const { error: imageError } = await supabase
          .from("listing_images")
          .insert([
            {
              listing_id: listing.id,
              image_url: data.publicUrl,
              position: i + 1,
            },
          ]);

        if (imageError)
          throw new Error("DB insert failed: " + imageError.message);
      }

      // ── STEP 4: SUCCESS ───────────────────────────────────────────────────
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
        <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
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

        {/* CONTACT GATE BANNER */}
        {contactGate && (
          <div id="contact-gate-banner">
            <ContactGateBanner
              onGoToSettings={() => navigate("/profile")}
              onDismiss={() => setContactGate(false)}
            />
          </div>
        )}

        {/* TYPE TOGGLE */}
        <div className="bg-slate-950 p-1.5 rounded-xl flex border border-slate-800">
          {[
            { value: "product", label: "Physical Product", icon: Package },
            { value: "service", label: "Professional Service", icon: Wrench },
          ].map(({ value, label, icon: Icon }) => (
            <button
              type="button"
              key={value}
              onClick={() =>
                setFormData({
                  ...formData,
                  listing_type: value,
                  price: "",
                  price_min: "",
                  price_max: "",
                })
              }
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                formData.listing_type === value
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
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

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
              Category
            </label>
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
              <select
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-4 text-white appearance-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value="">Select Category</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* PRICING */}
        <div className="p-5 bg-slate-950/50 border border-slate-800 rounded-xl space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
            Pricing Details
          </label>

          {formData.listing_type === "product" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <input
                type="number"
                placeholder="Price (GH₵)"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              />
              <label className="flex items-center gap-3 cursor-pointer group w-max">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.negotiable}
                    onChange={(e) =>
                      setFormData({ ...formData, negotiable: e.target.checked })
                    }
                    className="peer sr-only"
                  />
                  <div className="w-12 h-6 bg-slate-800 border border-slate-700 rounded-full peer-checked:bg-indigo-600 peer-checked:border-indigo-500 transition-all" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6 shadow-sm" />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors uppercase tracking-wider">
                  Price is negotiable
                </span>
              </label>
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
          <label className="flex items-center gap-3 cursor-pointer w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 transition-all group">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 flex items-center justify-center transition-all shrink-0">
              <ImagePlus className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-300">
                {images.length > 0
                  ? `${images.length} image${images.length > 1 ? "s" : ""} selected`
                  : "Click to upload images"}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                JPG, PNG, WEBP · Max 3 files
              </p>
            </div>
            {images.length > 0 && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />
          </label>

          <ImagePreview files={images} onRemove={removeImage} />
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
            type="submit"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/5 hover:shadow-indigo-500/25"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish Listing"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
