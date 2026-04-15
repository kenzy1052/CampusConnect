import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import Cropper from "react-easy-crop";

// --- SUB-COMPONENTS ---
const Field = ({ label, children }) => (
  <div>
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
      {label}
    </label>
    {children}
  </div>
);

const PhoneInput = ({ value, onChange, placeholder }) => (
  <div className="flex rounded-xl overflow-hidden border border-slate-800 focus-within:border-indigo-500/60 transition-all bg-slate-950">
    <div className="px-4 flex items-center bg-slate-900 text-slate-500 font-bold text-sm border-r border-slate-800 shrink-0">
      +233
    </div>
    <input
      type="tel"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 p-4 bg-transparent text-white outline-none placeholder:text-slate-700 text-sm"
    />
  </div>
);

// Inline toast — no alert() anywhere in the file
const Toast = ({ message, type }) => {
  if (!message) return null;
  const styles =
    type === "error"
      ? "bg-red-500/10 border-red-500/30 text-red-400"
      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl border text-[12px] font-bold shadow-2xl backdrop-blur-md ${styles} animate-in slide-in-from-bottom-4 duration-300`}
    >
      {type === "error" ? "✗ " : "✓ "}
      {message}
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function Profile() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Upload & UI state
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Cropper states
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Toast state (replaces alert())
  const [toast, setToast] = useState({ message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3500);
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBusinessName(profile.business_name || "");
      setAvatarUrl(profile.avatar_url || null);
      fetchContacts();
    }
  }, [profile]);

  const fetchContacts = async () => {
    const { data } = await supabase
      .from("contact_numbers")
      .select("*")
      .eq("user_id", user.id);
    if (data && data.length > 0) {
      const wa = data.find((c) => c.type === "whatsapp");
      const pPhone = data.find((c) => c.type === "phone" && c.is_primary);
      if (wa) setWhatsapp(wa.phone_number);
      if (pPhone) setPrimaryPhone(pPhone.phone_number);
    }
  };

  const onCropComplete = (_, pixels) => {
    setCroppedAreaPixels(pixels);
  };

  // FIX 3: Revoke object URL to prevent memory leak
  const getCroppedImg = async () => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(avatarFile);
    image.src = objectUrl;

    await new Promise((resolve) => {
      image.onload = resolve;
    });

    // Revoke after load — memory leak fixed
    URL.revokeObjectURL(objectUrl);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg");
    });
  };

  // FIX 1: Hard guard against null croppedAreaPixels
  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return;

    // Guard: crop must be initialised before we proceed
    if (!croppedAreaPixels) {
      showToast("Crop not ready — try adjusting the crop first.", "error");
      return;
    }

    setUploading(true);

    try {
      const croppedBlob = await getCroppedImg();

      // Guard: blob must be valid
      if (!croppedBlob) {
        throw new Error("Cropping failed — canvas returned null blob.");
      }

      const filePath = `${user.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, {
          upsert: true,
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update UI state FIRST, then confirm to the user
      setAvatarUrl(publicUrl);
      setAvatarFile(null);
      showToast("Avatar updated successfully");
    } catch (err) {
      console.error("Avatar upload error:", err);
      showToast(err.message || "Failed to upload avatar", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      showToast("Full name is required", "error");
      return;
    }

    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ full_name: fullName, business_name: businessName || null })
        .eq("id", user.id);

      showToast("Profile saved successfully");
    } catch (err) {
      console.error(err.message);
      showToast("Failed to save profile changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const initials = (profile?.business_name || profile?.full_name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const trust = profile?.trust_score ?? 50;
  const trustColor =
    trust >= 70
      ? "text-emerald-400"
      : trust >= 40
        ? "text-indigo-400"
        : "text-red-400";
  const trustBg =
    trust >= 70
      ? "bg-emerald-400"
      : trust >= 40
        ? "bg-indigo-400"
        : "bg-red-400";
  const trustLabel =
    trust >= 80
      ? "Verified"
      : trust >= 60
        ? "Trusted"
        : trust >= 40
          ? "Active"
          : "New";

  return (
    <div className="max-w-xl mx-auto pb-24 animate-in fade-in duration-300">
      <Toast message={toast.message} type={toast.type} />

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your identity and how buyers reach you.
        </p>
      </div>

      {/* AVATAR + TRUST CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0 group">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center border-2 border-slate-700 group-hover:border-indigo-500/50 transition-all">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-black text-2xl">
                  {initials}
                </span>
              )}
            </div>
            {/* Overlay trigger on hover */}
            <label
              htmlFor="avatar-upload"
              className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            >
              <span className="text-white text-[10px] font-black uppercase tracking-widest text-center leading-tight px-1">
                Change
              </span>
            </label>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setAvatarFile(file);
                  setCroppedAreaPixels(null); // reset so guard works correctly
                  setShowCrop(true);
                }
              }}
              className="hidden"
            />
          </div>

          {/* Identity + trust */}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-lg leading-tight truncate">
              {profile?.business_name || profile?.full_name || "Your Name"}
            </div>
            <div className="text-slate-500 text-xs mt-0.5 truncate">
              {user?.email}
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Trust Score
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      trust >= 80
                        ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        : trust >= 60
                          ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
                          : trust >= 40
                            ? "text-sky-400 border-sky-500/30 bg-sky-500/10"
                            : "text-slate-400 border-slate-700 bg-slate-800"
                    }`}
                  >
                    {trustLabel}
                  </span>
                  <span className={`text-sm font-black ${trustColor}`}>
                    ★ {trust}
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${trustBg}`}
                  style={{ width: `${trust}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PERSONAL DETAILS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4 space-y-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-4">
          Personal Details
        </p>
        <Field label="Full Name *">
          <input
            placeholder="e.g. Kenzy Mawutor"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500/60 outline-none transition-all placeholder:text-slate-700 text-sm"
          />
        </Field>
        <Field label="Business / Brand Name (Optional)">
          <input
            placeholder="e.g. KenzyVerse"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500/60 outline-none transition-all placeholder:text-slate-700 text-sm"
          />
        </Field>
      </div>

      {/* CONTACT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 space-y-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-4">
          Contact Methods
        </p>
        <Field label="💬 WhatsApp Number">
          <PhoneInput
            value={whatsapp}
            onChange={setWhatsapp}
            placeholder="54 000 0000"
          />
        </Field>
        <Field label="📞 Primary Call Number">
          <PhoneInput
            value={primaryPhone}
            onChange={setPrimaryPhone}
            placeholder="54 000 0000"
          />
        </Field>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-white text-black py-4 rounded-xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      {/* CROP MODAL */}
      {showCrop && avatarFile && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Crop Avatar
              </p>
              <button
                onClick={() => {
                  setShowCrop(false);
                  setAvatarFile(null);
                  setCroppedAreaPixels(null);
                }}
                className="text-slate-600 hover:text-white text-lg leading-none transition-all"
              >
                ✕
              </button>
            </div>

            {/* Crop area */}
            <div className="relative w-full h-72 bg-black">
              <Cropper
                image={URL.createObjectURL(avatarFile)}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom slider */}
            <div className="px-5 pt-4 pb-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2 block">
                Zoom
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Action buttons */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => {
                  setShowCrop(false);
                  setAvatarFile(null);
                  setCroppedAreaPixels(null);
                }}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>

              {/* FIX 2: Guard against null croppedAreaPixels on button click */}
              <button
                onClick={async () => {
                  if (!croppedAreaPixels) {
                    showToast("Adjust the crop first", "error");
                    return;
                  }
                  await handleAvatarUpload();
                  setShowCrop(false);
                }}
                disabled={uploading}
                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  "Crop & Upload"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
