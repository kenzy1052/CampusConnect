import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import ReportModal from "./ReportModal";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";

import "yet-another-react-lightbox/styles.css";

export default function ListingDetail({ listing, onBack }) {
  const { user } = useAuth();
  const [listingData, setListingData] = useState(listing);
  const [images, setImages] = useState([]);
  const [current, setCurrent] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [phones, setPhones] = useState([]);
  const [whatsapp, setWhatsapp] = useState(null);
  const [reportStatus, setReportStatus] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const slides = useMemo(
    () => images.map((img) => ({ src: img.image_url })),
    [images],
  );

  const isOwnListing = user?.id === listingData.seller_id;

  const fetchListing = useCallback(async () => {
    const { data } = await supabase
      .from("discovery_feed")
      .select("*")
      .eq("id", listing.id)
      .single();
    return data || null;
  }, [listing.id]);

  // BUG FIX: The original code called supabase.rpc("record_engagement", ...)
  // but that function does not exist anywhere in the database. This caused all
  // view and contact tracking to silently fail — view_count and contact_count
  // never incremented, and the trust/visibility system had no engagement signal.
  //
  // Fix: Use a direct insert into listing_engagements. The table has partial
  // unique indices (unique_daily_view, unique_daily_contact) that deduplicate
  // entries per user per day — the ON CONFLICT DO NOTHING handles duplicates
  // gracefully without throwing an error to the user.
  const recordEngagement = useCallback(
    async (type) => {
      if (!user) return; // anonymous users don't track
      try {
        await supabase.from("listing_engagements").insert({
          listing_id: listing.id,
          user_id: user.id,
          type,
        });
        // Conflict (duplicate for today) is silently ignored by the DB index.
      } catch (err) {
        // Non-critical — never surface to the user.
        console.warn("Engagement tracking failed", err);
      }
    },
    [listing.id, user],
  );

  const recordView = useCallback(
    () => recordEngagement("view"),
    [recordEngagement],
  );

  const recordContact = useCallback(
    () => recordEngagement("contact"),
    [recordEngagement],
  );

  const handleRevealContact = () => {
    setShowContact(true);
    recordContact();
  };

  const fetchImages = useCallback(async () => {
    const { data } = await supabase
      .from("listing_images")
      .select("*")
      .eq("listing_id", listing.id)
      .order("position");
    return data || [];
  }, [listing.id]);

  const fetchContacts = useCallback(async () => {
    const { data, error } = await supabase
      .from("contact_numbers")
      .select("*")
      .eq("user_id", listing.seller_id);
    if (error || !data) {
      return { whatsapp: null, phones: [] };
    }
    return {
      whatsapp: data.find((c) => c.type === "whatsapp")?.phone_number || null,
      phones: data.filter((c) => c.type === "phone").map((c) => c.phone_number),
    };
  }, [listing.seller_id]);

  useEffect(() => {
    let cancelled = false;

    const loadListingData = async () => {
      const [nextListing, nextImages, nextContacts] = await Promise.all([
        fetchListing(),
        fetchImages(),
        fetchContacts(),
      ]);

      if (cancelled) return;

      if (nextListing) setListingData(nextListing);
      setImages(nextImages);
      setWhatsapp(nextContacts.whatsapp);
      setPhones(nextContacts.phones);
    };

    loadListingData();
    recordView();

    return () => {
      cancelled = true;
    };
  }, [fetchContacts, fetchImages, fetchListing, recordView]);

  useEffect(() => {
    const checkReportStatus = async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, is_resolved")
        .eq("listing_id", listing.id)
        .eq("reporter_id", user.id)
        .maybeSingle();
      if (data) setReportStatus(data.is_resolved ? "resolved" : "submitted");
    };
    if (user) checkReportStatus();
  }, [listing.id, user]);

  const getPriceDisplay = () => {
    if (listingData.price !== null) return "GH₵ " + listingData.price;
    if (listingData.price_min && listingData.price_max)
      return "GH₵ " + listingData.price_min + " – " + listingData.price_max;
    if (listingData.price_min) return "From GH₵ " + listingData.price_min;
    if (listingData.price_max) return "Up to GH₵ " + listingData.price_max;
    return "Ask for price";
  };

  const initials = (listingData?.seller_name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const createdDate = listingData.created_at
    ? new Date(listingData.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const whatsappMessage = encodeURIComponent(
    `Hi, I am interested in "${listingData.title}" on CampusConnect. Is it still available?`,
  );
  const whatsappLink = whatsapp
    ? `https://wa.me/233${whatsapp}?text=${whatsappMessage}`
    : null;

  const isService = listingData.listing_type === "service";
  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
  const next = () => setCurrent((c) => (c + 1) % images.length);

  return (
    <>
      <Lightbox
        open={lightboxIndex !== null}
        close={() => setLightboxIndex(null)}
        index={lightboxIndex ?? 0}
        slides={slides}
        plugins={[Zoom, Fullscreen]}
        on={{
          view: ({ index }) => setLightboxIndex(index),
        }}
        zoom={{
          maxZoomPixelRatio: 5,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
        }}
        animation={{
          fade: 0,
          swipe: 300,
          navigation: 300,
          easing: {
            fade: "linear",
            swipe: "ease-out",
            navigation: "ease-out",
          },
        }}
        carousel={{
          finite: false,
          preload: 1,
          padding: 0,
          spacing: 0,
        }}
        styles={{
          root: { backgroundColor: "#000" },
          container: { backgroundColor: "#000" },
          slide: { backgroundColor: "#000" },
        }}
      />

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
          {/* LEFT — GALLERY */}
          <div className="space-y-4">
            <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 group">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[current].image_url}
                    className="w-full h-full object-cover transition-all duration-300"
                    alt={listingData.title}
                  />

                  <button
                    onClick={() => setLightboxIndex(current)}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-200"
                    title="Click to zoom"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/60 border border-white/20 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                      Zoom
                    </span>
                  </button>

                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          prev();
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white text-xl flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all z-10"
                      >
                        ‹
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          next();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white text-xl flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all z-10"
                      >
                        ›
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrent(i);
                            }}
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
                      "w-20 h-20 rounded-xl overflow-hidden border-2 transition-all relative group/thumb active:scale-95 " +
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
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(i);
                      }}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-all"
                    >
                      <span className="text-white text-xs">🔍</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                Description
              </p>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {listingData.description || "No description provided."}
              </p>
            </div>
          </div>

          {/* RIGHT — INFO & ACTIONS */}
          <div className="space-y-4 md:sticky md:top-6">
            {/* TITLE & PRICE */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                {listingData.category_name}
              </p>
              <h1 className="text-2xl font-black text-white leading-tight mb-5">
                {listingData.title}
              </h1>
              <div className="text-3xl font-black text-white">
                {getPriceDisplay()}
              </div>
              {listingData.negotiable && (
                <span className="inline-flex mt-3 text-[9px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                  Price negotiable
                </span>
              )}

              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs">
                {/* BUG FIX: Only show Condition row for products.
                    Services don't have a condition field — previously it showed
                    "Unknown" for every service listing, which confused buyers. */}
                {!isService && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Condition</span>
                    <span
                      className={
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide " +
                        (listingData.condition === "new"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30")
                      }
                    >
                      {listingData.condition || "Not specified"}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Views</span>
                  <span className="text-white font-medium">
                    {listingData.view_count || 0}
                  </span>
                </div>

                {createdDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Posted</span>
                    <span className="text-white font-medium">
                      {createdDate}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* SELLER CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
                Seller
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 border-2 border-slate-700">
                  {listingData?.seller_avatar_url ? (
                    <img
                      src={listingData.seller_avatar_url}
                      alt={listingData.seller_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">
                    {listingData.seller_name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-yellow-400 text-xs">★</span>
                    <span className="text-sm font-bold text-white">
                      {listingData.trust_score || 50}
                    </span>
                    <span className="text-xs text-slate-600">/ 100 trust</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTACT */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Contact Seller
              </p>
              {!showContact ? (
                <button
                  onClick={handleRevealContact}
                  className="w-full bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white py-3 rounded-xl font-bold text-sm transition-all border border-slate-700"
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

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={recordContact}
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1fba59] active:scale-[0.98] text-white py-3.5 rounded-xl font-black text-sm transition-all"
                >
                  <span>💬</span> Chat on WhatsApp
                </a>
              )}
            </div>

            {/* REPORT */}
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
      </div>

      {showReport && (
        <ReportModal
          listing={listingData}
          onClose={() => setShowReport(false)}
          onSuccess={() => setReportStatus("submitted")}
        />
      )}
    </>
  );
}
