import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import ReportModal from "./ReportModal";

export default function ListingDetail({ listing, onBack }) {
  const { user } = useAuth();
  const [images, setImages] = useState([]);
  const [current, setCurrent] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [phones, setPhones] = useState([]);
  const [whatsapp, setWhatsapp] = useState(null);

  // 🔥 NEW STATES FOR REPORTING
  const [reportStatus, setReportStatus] = useState(null);

  const isOwnListing = user?.id === listing.seller_id;

  useEffect(() => {
    fetchImages();
    fetchContacts();
    recordView(); // 🔥 Tracks the view when component mounts
  }, [listing.id]);

  // 🔥 CHECK IF USER ALREADY REPORTED THIS LISTING
  useEffect(() => {
    const checkReportStatus = async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, is_resolved")
        .eq("listing_id", listing.id)
        .eq("reporter_id", user.id) // Used reporter_id based on your DB insert logic
        .maybeSingle();

      if (data) {
        setReportStatus(data.is_resolved ? "resolved" : "submitted");
      }
    };

    if (user) checkReportStatus();
  }, [listing.id, user]);

  // --- RECORDING LOGIC ---
  const recordView = async () => {
    try {
      await supabase.rpc("record_engagement", {
        p_listing_id: listing.id,
        p_type: "view",
      });
    } catch (err) {
      console.error("View tracking failed", err);
    }
  };

  const recordContact = async () => {
    try {
      await supabase.rpc("record_engagement", {
        p_listing_id: listing.id,
        p_type: "contact",
      });
    } catch (err) {
      console.error("Contact tracking failed", err);
    }
  };

  const handleRevealContact = () => {
    setShowContact(true);
    recordContact(); // 🔥 Tracks engagement when button clicked
  };

  // --- DATA FETCHING ---
  const fetchImages = async () => {
    const { data } = await supabase
      .from("listing_images")
      .select("*")
      .eq("listing_id", listing.id)
      .order("position");
    setImages(data || []);
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("contact_numbers")
      .select("*")
      .eq("user_id", listing.seller_id);
    if (error || !data) return;
    setWhatsapp(data.find((c) => c.type === "whatsapp")?.phone_number || null);
    setPhones(
      data.filter((c) => c.type === "phone").map((c) => c.phone_number),
    );
  };

  // --- HELPERS ---
  const getPriceDisplay = () => {
    if (listing.price !== null) return "GH₵ " + listing.price;
    if (listing.price_min && listing.price_max)
      return "GH₵ " + listing.price_min + " – " + listing.price_max;
    if (listing.price_min) return "From GH₵ " + listing.price_min;
    if (listing.price_max) return "Up to GH₵ " + listing.price_max;
    return "Ask for price";
  };

  const isService = listing.listing_type === "service";
  const initial = (listing.seller_name || "U")[0].toUpperCase();
  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
  const next = () => setCurrent((c) => (c + 1) % images.length);

  return (
    <div className="max-w-5xl mx-auto pb-24 animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-slate-500 hover:text-white text-sm font-medium transition-colors group"
      >
        <span className="group-hover:-translate-x-1 transition-transform inline-block">
          ←
        </span>
        Back to marketplace
      </button>

      <div className="grid md:grid-cols-[1fr_360px] gap-8 items-start">
        {/* LEFT — GALLERY & DESCRIPTION */}
        <div className="space-y-4">
          <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
            {images.length > 0 ? (
              <>
                <img
                  src={images[current].image_url}
                  className="w-full h-full object-cover"
                  alt={listing.title}
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white text-xl flex items-center justify-center hover:bg-black/80 transition-all"
                    >
                      ‹
                    </button>
                    <button
                      onClick={next}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white text-xl flex items-center justify-center hover:bg-black/80 transition-all"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrent(i)}
                          className={
                            "w-2 h-2 rounded-full transition-all " +
                            (i === current
                              ? "bg-white scale-110"
                              : "bg-white/40")
                          }
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full flex-col gap-2">
                <div className="text-5xl opacity-30">📷</div>
                <p className="text-slate-600 text-sm">No images uploaded</p>
              </div>
            )}
            <span
              className={
                "absolute top-3 left-3 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md " +
                (isService
                  ? "bg-indigo-600/60 text-indigo-100 border border-indigo-400/40"
                  : "bg-emerald-600/60 text-emerald-100 border border-emerald-400/40")
              }
            >
              {isService ? "Service" : "Product"}
            </span>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={
                    "w-20 h-20 rounded-xl overflow-hidden border-2 transition-all " +
                    (i === current
                      ? "border-indigo-500"
                      : "border-slate-800 opacity-50 hover:opacity-100")
                  }
                >
                  <img
                    src={img.image_url}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </button>
              ))}
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
              Description
            </p>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {listing.description || "No description provided."}
            </p>
          </div>
        </div>

        {/* RIGHT — INFO & ACTIONS */}
        <div className="space-y-4 md:sticky md:top-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              {listing.category_name}
            </p>
            <h1 className="text-2xl font-black text-white leading-tight mb-5">
              {listing.title}
            </h1>
            <div className="text-3xl font-black text-white">
              {getPriceDisplay()}
            </div>
            {listing.negotiable && (
              <span className="inline-flex mt-3 text-[9px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                Price negotiable
              </span>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
              Seller
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-xl shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white truncate">
                  {listing.seller_name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-yellow-400 text-xs">★</span>
                  <span className="text-sm font-bold text-white">
                    {listing.trust_score || 50}
                  </span>
                  <span className="text-xs text-slate-600">/ 100 trust</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Contact Seller
            </p>
            {!showContact ? (
              <button
                onClick={handleRevealContact}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm transition-all border border-slate-700"
              >
                Reveal Contact Info
              </button>
            ) : (
              <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                {phones.length === 0 && !whatsapp && (
                  <p className="text-slate-600 text-xs text-center py-2">
                    No contact details provided
                  </p>
                )}
                {phones.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-xl border border-slate-800"
                  >
                    <span className="text-lg">📞</span>
                    <span className="text-white text-sm font-medium">
                      +233 {p}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {whatsapp && (
              <a
                href={"https://wa.me/233" + whatsapp}
                target="_blank"
                rel="noreferrer"
                onClick={recordContact}
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1fba59] text-white py-3.5 rounded-xl font-black text-sm transition-all"
              >
                <span>💬</span> Chat on WhatsApp
              </a>
            )}
          </div>

          {/* 🔥 REPORT BUTTON & STATUS UI */}
          {user && !isOwnListing && (
            <div className="flex flex-col items-center">
              <button
                onClick={() => setShowReport(true)}
                disabled={
                  reportStatus === "submitted" || reportStatus === "resolved"
                }
                className="w-full text-slate-600 hover:text-red-400 text-[11px] font-bold uppercase tracking-widest transition-colors border border-slate-800/50 hover:border-red-500/20 py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reportStatus === "submitted"
                  ? "🚩 Reported"
                  : reportStatus === "resolved"
                    ? "🚩 Report Reviewed"
                    : "🚩 Report this listing"}
              </button>

              {reportStatus === "submitted" && (
                <p className="text-xs text-amber-400 mt-2 text-center w-full">
                  Report submitted · Under review
                </p>
              )}

              {reportStatus === "resolved" && (
                <p className="text-xs text-emerald-400 mt-2 text-center w-full">
                  Report reviewed
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {showReport && (
        <ReportModal
          listing={listing}
          onClose={() => setShowReport(false)}
          onSuccess={() => setReportStatus("submitted")} // Update UI instantly without refresh
        />
      )}
    </div>
  );
}
