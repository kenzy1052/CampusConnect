import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { compressImage } from "../../utils/compressImage";
import { supabase } from "../../lib/supabaseClient";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Info,
  Lightbulb,
  Loader2,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Wrench,
  X,
  ZapIcon,
} from "lucide-react";
import { cleanTitle, cleanDescription } from "../../utils/text";

// ─── PRO TIP ─────────────────────────────────────────────────────────────────
function ProTip({ icon: Icon = Lightbulb, children }) {
  return (
    <div className="flex items-start gap-2.5 bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-4 py-3">
      <Icon className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
      <p className="text-[11px] text-indigo-300/80 leading-relaxed">
        {children}
      </p>
    </div>
  );
}

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
function ImagePreview({ files, coverIndex, setCoverIndex, onRemove }) {
  if (!files.length) return null;
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {files.length} image{files.length > 1 ? "s" : ""} selected ·{" "}
          {(files.reduce((s, f) => s + f.size, 0) / 1024).toFixed(0)} KB total
        </p>
        {files.length > 1 && (
          <p className="text-[10px] text-slate-600">
            Tap an image to set as cover
          </p>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        {files.map((file, i) => (
          <div
            key={i}
            className={`relative group w-24 h-24 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
              i === coverIndex
                ? "border-indigo-500 shadow-lg shadow-indigo-500/25"
                : "border-slate-800 hover:border-slate-600"
            }`}
            onClick={() => setCoverIndex(i)}
          >
            <img
              src={URL.createObjectURL(file)}
              alt=""
              className="w-full h-full object-cover"
            />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-10"
            >
              <X className="w-3 h-3 text-white" />
            </button>

            <div
              className={`absolute bottom-0 inset-x-0 py-1.5 flex items-center justify-center gap-1 text-[9px] font-black uppercase transition-all ${
                i === coverIndex
                  ? "bg-indigo-600 text-white"
                  : "bg-black/60 text-slate-400 opacity-0 group-hover:opacity-100"
              }`}
            >
              {i === coverIndex ? (
                <>
                  <Star className="w-2.5 h-2.5" /> Cover
                </>
              ) : (
                "Set cover"
              )}
            </div>
          </div>
        ))}
      </div>

      {files.length > 1 && (
        <ProTip icon={Star}>
          The <strong className="text-indigo-300">cover image</strong> is the
          first thing buyers see in the feed. Choose your clearest, most
          eye-catching photo — it directly impacts your click-through rate.
        </ProTip>
      )}
    </div>
  );
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
      {children}
    </p>
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
    condition: "",
    negotiable: false,
  });

  const [images, setImages] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contactGate, setContactGate] = useState(false);

  useEffect(() => {
    const CACHE_KEY = "cc.categories.v1";
    const ONE_HOUR = 60 * 60 * 1000;

    async function fetchCategories() {
      // 1. Try to load from Cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { ts, data } = JSON.parse(cached);
          if (Date.now() - ts < ONE_HOUR) {
            setCategories(data);
            setLoading(false); // <-- CRITICAL: Stop the spinner
            return;
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }

      // 2. Fetch from Supabase if cache is missing or stale
      const { data, error } = await supabase.from("categories").select("*");

      if (error) {
        console.error("CATEGORY ERROR:", error.message);
      } else if (data) {
        setCategories(data);
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ts: Date.now(), data }),
        );
      }

      setLoading(false); // <-- CRITICAL: Stop the spinner
    }

    fetchCategories();
  }, []);

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length < 1) return;
    if (files.length > 3) return alert("Max 3 images allowed");

    // Reject anything insanely huge BEFORE compressing (avoids OOM on weak phones)
    for (const f of files) {
      if (f.size > 15 * 1024 * 1024) {
        return alert(`"${f.name}" is over 15 MB. Please pick a smaller photo.`);
      }
    }

    try {
      const compressed = await Promise.all(files.map(compressImage));
      setImages(compressed);
      setCoverIndex(0);
    } catch (err) {
      console.error("Image prep failed:", err);
      alert("Could not prepare images. Try different photos.");
    }
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (coverIndex >= next.length)
        setCoverIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const title = cleanTitle(formData.title);
    const description = cleanDescription(formData.description);

    // ── Validation ────────────────────────────────────────────────────────────
    if (title.length < 3)
      return alert("Title must be at least 3 characters long");
    if (!formData.category_id) return alert("Select a category");
    if (formData.listing_type === "product" && !formData.condition) {
      return alert("Select item condition (New or Used)");
    }
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

    // Track what we created so we can roll back if anything fails
    let createdListingId = null;
    const uploadedPaths = [];

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
      if (!contacts || contacts.length === 0) {
        setContactGate(true);
        setSubmitting(false);
        setTimeout(() => {
          document.getElementById("contact-gate-banner")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
        return;
      }

      // ── STEP 2: CREATE LISTING (HIDDEN) ───────────────────────────────────
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert([
          {
            title: cleanTitle(formData.title),
            description: cleanDescription(formData.description),
            type: formData.listing_type,
            category_id: formData.category_id,
            seller_id: user.id,
            is_active: false, // <-- hidden until images are in
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
      createdListingId = listing.id;

      // ── STEP 3: UPLOAD IMAGES ─────────────────────────────────────────────
      const safeCover = Math.min(coverIndex, images.length - 1);
      const imageRows = [];

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const ext = (file.name.split(".").pop() || "bin")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 5);

        // user_id / listing_id / index-uuid.ext  — unique, scoped, no collisions
        const filePath = `${user.id}/${listing.id}/${i}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: "31536000",
            upsert: false,
          });
        if (uploadError)
          throw new Error("Image upload failed: " + uploadError.message);
        uploadedPaths.push(filePath);

        const { data: pub } = supabase.storage
          .from("listing-images")
          .getPublicUrl(filePath);
        if (!pub?.publicUrl) throw new Error("Failed to generate image URL");

        imageRows.push({
          listing_id: listing.id,
          image_url: pub.publicUrl,
          position: i + 1,
          is_cover: i === safeCover,
        });
      }

      // ── STEP 4: INSERT ALL IMAGE ROWS IN ONE CALL ─────────────────────────
      const { error: imageError } = await supabase
        .from("listing_images")
        .insert(imageRows);
      if (imageError)
        throw new Error("DB insert failed: " + imageError.message);

      // ── STEP 5: FLIP TO ACTIVE — feed picks it up here ────────────────────
      const { error: activateError } = await supabase
        .from("listings")
        .update({ is_active: true })
        .eq("id", listing.id);
      if (activateError)
        throw new Error("Activation failed: " + activateError.message);

      // ── STEP 6: SUCCESS ───────────────────────────────────────────────────
      onSuccess();
    } catch (err) {
      console.error("CREATE LISTING ERROR:", err);
      // Roll back uploaded files
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("listing-images").remove(uploadedPaths);
      }
      // Roll back the listing row (cascades to listing_images and discovery_feed)
      if (createdListingId) {
        await supabase.from("listings").delete().eq("id", createdListingId);
      }
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
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-2xl font-black text-white tracking-tight">
                Create Listing
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Fill in the details below to publish to the marketplace.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shrink-0">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
              Verified
            </span>
          </div>
        </div>

        {/* ── CONTACT GATE ───────────────────────────────────────────────── */}
        {contactGate && (
          <div id="contact-gate-banner">
            <ContactGateBanner
              onGoToSettings={() => navigate("/profile")}
              onDismiss={() => setContactGate(false)}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            LISTING TYPE
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-5">
          <SectionLabel>What are you listing?</SectionLabel>

          {/* Type toggle */}
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
                    condition: "",
                  })
                }
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
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
        </div>

        <div className="border-t border-slate-800/60" />

        {/* ══════════════════════════════════════════════════════════════════
            TITLE
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <SectionLabel>Listing Title</SectionLabel>
          <input
            placeholder={
              formData.listing_type === "product"
                ? "e.g. Vintage Polaroid Camera, barely used"
                : "e.g. Professional Logo Design & Branding"
            }
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700"
          />
          <p className="text-[10px] text-slate-600 ml-1">
            Be specific — "Nike Air Force 1 Size 43" gets far more clicks than
            "White Sneakers"
          </p>
        </div>

        <div className="border-t border-slate-800/60" />

        {/* ══════════════════════════════════════════════════════════════════
            DESCRIPTION
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <SectionLabel>Description</SectionLabel>
          <textarea
            rows="4"
            placeholder={
              formData.listing_type === "product"
                ? "Brand, size, age, any defects, reason for selling..."
                : "What's included, turnaround time, examples of past work..."
            }
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none placeholder:text-slate-700"
          />
        </div>

        <div className="border-t border-slate-800/60" />

        {/* ══════════════════════════════════════════════════════════════════
            CATEGORY
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <SectionLabel>Category</SectionLabel>
          <div className="relative">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
            <select
              value={formData.category_id}
              onChange={(e) =>
                setFormData({ ...formData, category_id: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-10 py-4 text-white appearance-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            >
              <option value="">Select a category</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none rotate-90" />
          </div>
        </div>

        <div className="border-t border-slate-800/60" />

        {/* ══════════════════════════════════════════════════════════════════
            CONDITION (products only)
        ══════════════════════════════════════════════════════════════════ */}
        {formData.listing_type === "product" && (
          <>
            <div className="space-y-3">
              <SectionLabel>
                Condition{" "}
                <span className="text-red-500 ml-0.5 normal-case font-bold">
                  *required
                </span>
              </SectionLabel>
              <div className="flex gap-3">
                {[
                  {
                    value: "new",
                    label: "New",
                    desc: "Unused · original packaging",
                    icon: BadgeCheck,
                  },
                  {
                    value: "used",
                    label: "Used",
                    desc: "Pre-owned · may show wear",
                    icon: ZapIcon,
                  },
                ].map(({ value, label, desc, icon: Icon }) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() =>
                      setFormData({ ...formData, condition: value })
                    }
                    className={`flex-1 flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 transition-all text-left ${
                      formData.condition === value
                        ? "bg-indigo-600/10 border-indigo-500"
                        : "bg-slate-950 border-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          formData.condition === value
                            ? "text-indigo-400"
                            : "text-slate-600"
                        }`}
                      />
                      <span
                        className={`text-xs font-black uppercase tracking-widest ${
                          formData.condition === value
                            ? "text-white"
                            : "text-slate-400"
                        }`}
                      >
                        {label}
                      </span>
                      {formData.condition === value && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 ml-auto" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 ml-6">{desc}</p>
                  </button>
                ))}
              </div>
              <ProTip icon={Info}>
                Buyers filter by condition. Accurate listings build trust and
                reduce post-purchase disputes.
              </ProTip>
            </div>

            <div className="border-t border-slate-800/60" />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PRICING
        ══════════════════════════════════════════════════════════════════ */}
        <div className="p-5 bg-slate-950/50 border border-slate-800 rounded-xl space-y-4">
          <SectionLabel>Pricing Details</SectionLabel>

          {formData.listing_type === "product" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold pointer-events-none">
                  GH₵
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-14 pr-4 py-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
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
                  <div className="w-12 h-6 bg-slate-800 border border-slate-700 rounded-full peer-checked:bg-indigo-600 peer-checked:border-indigo-500 transition-all" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6 shadow-sm" />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors uppercase tracking-wider">
                  Negotiable
                </span>
              </label>
            </div>
          )}

          {formData.listing_type === "service" && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold pointer-events-none">
                  GH₵
                </span>
                <input
                  type="number"
                  placeholder="Min"
                  value={formData.price_min}
                  onChange={(e) =>
                    setFormData({ ...formData, price_min: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-14 pr-4 py-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold pointer-events-none">
                  GH₵
                </span>
                <input
                  type="number"
                  placeholder="Max"
                  value={formData.price_max}
                  onChange={(e) =>
                    setFormData({ ...formData, price_max: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-14 pr-4 py-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          )}

          <ProTip icon={Lightbulb}>
            {formData.listing_type === "product"
              ? "Research similar listings first. Competitive pricing gets 3× faster responses from buyers."
              : "A clear price range filters time-wasters and attracts serious clients from the start."}
          </ProTip>
        </div>

        <div className="border-t border-slate-800/60" />

        {/* ══════════════════════════════════════════════════════════════════
            PHOTOS
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <SectionLabel>Photos</SectionLabel>

          <label className="flex items-center gap-4 cursor-pointer w-full bg-slate-950 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-xl p-5 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 flex items-center justify-center transition-all shrink-0">
              <ImagePlus className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-200">
                {images.length > 0
                  ? `${images.length} of 3 photos added`
                  : "Upload up to 3 photos"}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                JPG, PNG, WEBP · Good lighting = more buyers
              </p>
            </div>
            {images.length > 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest shrink-0">
                Browse
              </span>
            )}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />
          </label>

          {images.length === 0 && (
            <ProTip icon={Lightbulb}>
              Listings with photos get{" "}
              <strong className="text-indigo-300">5× more views</strong>. Use
              natural light and a clean background. Show all angles — front,
              back, and any defects. You can add up to 3 images.
            </ProTip>
          )}

          <ImagePreview
            files={images}
            coverIndex={coverIndex}
            setCoverIndex={setCoverIndex}
            onRemove={removeImage}
          />
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
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
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Publish Listing
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
