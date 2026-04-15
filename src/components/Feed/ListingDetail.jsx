import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import ReportModal from "./ReportModal";

// ─── LIGHTBOX ────────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const offsetStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const MIN_SCALE = 1;
  const MAX_SCALE = 5;

  // Reset zoom/pan when image changes
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [index]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index]);

  // Prevent body scroll while lightbox is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Prevent passive event errors by handling preventDefault natively
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefault = (e) => e.preventDefault();

    // Attach non-passive listeners just to block default browser scrolling/zooming
    container.addEventListener("wheel", preventDefault, { passive: false });
    container.addEventListener("touchmove", preventDefault, { passive: false });

    return () => {
      container.removeEventListener("wheel", preventDefault);
      container.removeEventListener("touchmove", preventDefault);
    };
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  // Mouse wheel zoom
  const onWheel = (e) => {
    // e.preventDefault() removed here to avoid the React passive event warning
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)));
    // Reset pan if fully zoomed out
    if (scale + delta <= MIN_SCALE) setOffset({ x: 0, y: 0 });
  };

  // Drag to pan
  const onMouseDown = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
  };

  const onMouseMove = (e) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: offsetStart.current.x + dx,
      y: offsetStart.current.y + dy,
    });
  };

  const onMouseUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  // Touch pinch zoom
  const lastTouchDist = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1 && scale > 1) {
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      offsetStart.current = { ...offset };
    }
  };

  const onTouchMove = (e) => {
    // e.preventDefault() removed here to avoid the React passive event warning
    if (e.touches.length === 2 && lastTouchDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = (dist - lastTouchDist.current) * 0.01;
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)));
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && scale > 1 && dragStart.current) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setOffset({
        x: offsetStart.current.x + dx,
        y: offsetStart.current.y + dy,
      });
    }
  };

  const onTouchEnd = () => {
    lastTouchDist.current = null;
    dragStart.current = null;
    if (scale <= MIN_SCALE) setOffset({ x: 0, y: 0 });
  };

  const resetZoom = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s + 0.5));
  const zoomOut = () => {
    const next = Math.max(MIN_SCALE, scale - 0.5);
    setScale(next);
    if (next <= MIN_SCALE) setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/95 flex flex-col select-none">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-white/5">
        {/* Image counter */}
        <span className="text-slate-400 text-xs font-bold">
          {index + 1} / {images.length}
        </span>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
          <button
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 text-lg font-bold transition-all"
          >
            −
          </button>
          <button
            onClick={resetZoom}
            className="px-2 text-[11px] font-black text-slate-400 hover:text-white transition-all min-w-[44px] text-center"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 text-lg font-bold transition-all"
          >
            +
          </button>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-lg"
        >
          ✕
        </button>
      </div>

      {/* MAIN IMAGE AREA */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "default",
        }}
      >
        <img
          src={images[index].image_url}
          alt={`Image ${index + 1}`}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging ? "none" : "transform 0.15s ease",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            userSelect: "none",
          }}
        />

        {/* Zoom hint (shown only at scale 1) */}
        {scale === 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-600 font-bold uppercase tracking-widest pointer-events-none">
            Scroll to zoom · Drag to pan
          </div>
        )}

        {/* Arrow navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm text-white text-2xl flex items-center justify-center hover:bg-black/80 transition-all z-10"
            >
              ‹
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm text-white text-2xl flex items-center justify-center hover:bg-black/80 transition-all z-10"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* THUMBNAIL STRIP */}
      {images.length > 1 && (
        <div className="shrink-0 border-t border-white/5 px-4 py-3">
          <div className="flex gap-2 justify-center overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  i === index
                    ? "border-indigo-500 opacity-100"
                    : "border-transparent opacity-40 hover:opacity-70"
                }`}
              >
                <img
                  src={img.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ListingDetail({ listing, onBack }) {
  const { user } = useAuth();
  const [images, setImages] = useState([]);
  const [current, setCurrent] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [phones, setPhones] = useState([]);
  const [whatsapp, setWhatsapp] = useState(null);
  const [reportStatus, setReportStatus] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null); // null = closed

  const isOwnListing = user?.id === listing.seller_id;

  useEffect(() => {
    fetchImages();
    fetchContacts();
    recordView();
  }, [listing.id]);

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
    recordContact();
  };

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
    <>
      {/* Lightbox — rendered at root level */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

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
                    alt={listing.title}
                  />

                  {/* Click to open lightbox overlay */}
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
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white text-xl flex items-center justify-center hover:bg-black/80 transition-all z-10"
                      >
                        ‹
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          next();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white text-xl flex items-center justify-center hover:bg-black/80 transition-all z-10"
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

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={
                      "w-20 h-20 rounded-xl overflow-hidden border-2 transition-all relative group/thumb " +
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
                    {/* Zoom icon on thumb hover */}
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

            {/* SELLER CARD — with avatar support */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
                Seller
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-xl shrink-0 overflow-hidden border-2 border-slate-700">
                  {listing.seller_avatar_url ? (
                    <img
                      src={listing.seller_avatar_url}
                      alt={listing.seller_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initial
                  )}
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

            {/* CONTACT */}
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
          listing={listing}
          onClose={() => setShowReport(false)}
          onSuccess={() => setReportStatus("submitted")}
        />
      )}
    </>
  );
}
