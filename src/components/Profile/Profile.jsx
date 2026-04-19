import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import Cropper from "react-easy-crop";
import {
  Camera,
  CheckCircle2,
  XCircle,
  User as UserIcon,
  Building2,
  MessageCircle,
  Phone,
  PhoneCall,
  Loader2,
  X,
  ShieldCheck,
  Star,
} from "lucide-react";

// Utility functions
const validatePhone = (num) => {
  if (!num) return true; // optional field

  const digits = num.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    return digits.length === 10;
  }

  return digits.length === 9;
};

const normalizePhone = (num) => {
  let digits = num.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("233")) {
    digits = digits.slice(3);
  }

  return digits;
};

const formatPhoneForDisplay = (num) => {
  if (!num) return "";
  return "0" + num; // num is stored as 9-digit
};

// --- SUB-COMPONENTS ---

const Field = ({ label, icon: Icon, children }) => (
  <div className="space-y-2">
    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
      {Icon && <Icon size={14} className="text-slate-500" />}
      {label}
    </label>
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder, icon: Icon }) => (
  <div className="relative group flex rounded-xl overflow-hidden border border-slate-800 focus-within:border-indigo-500/60 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all bg-slate-950">
    {Icon && (
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
        <Icon size={18} />
      </div>
    )}
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`flex-1 py-4 pr-4 bg-transparent text-white outline-none placeholder:text-slate-700 text-sm ${Icon ? "pl-12" : "pl-4"}`}
    />
  </div>
);

const PhoneInput = ({ value, onChange, placeholder, icon: Icon }) => {
  const handleChange = (raw) => {
    // Remove non-digits
    let digits = raw.replace(/\D/g, "");

    if (digits.startsWith("0")) {
      digits = digits.slice(0, 10); // max 10
    } else {
      digits = digits.slice(0, 9); // max 9
    }

    onChange(digits);
  };

  return (
    <div className="flex rounded-xl overflow-hidden border border-slate-800 focus-within:border-indigo-500/60 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all bg-slate-950 group">
      <div className="px-4 flex items-center gap-2 bg-slate-900/50 text-slate-400 font-bold text-sm border-r border-slate-800 shrink-0 group-focus-within:text-indigo-400 transition-colors">
        {Icon && <Icon size={16} />}
        <span>+233</span>
      </div>
      <input
        type="tel"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="flex-1 p-4 bg-transparent text-white outline-none placeholder:text-slate-700 text-sm"
      />
    </div>
  );
};

const Toast = ({ message, type }) => {
  if (!message) return null;
  const isError = type === "error";
  const styles = isError
    ? "bg-red-500/10 border-red-500/30 text-red-400"
    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border text-[13px] font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 ${styles} animate-in slide-in-from-bottom-4 duration-300`}
    >
      {isError ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
      {message}
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function Profile() {
  const { user, profile } = useAuth();

  // Profile Text States
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Contact States
  const [whatsapp, setWhatsapp] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");

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

  // Toast state
  const [toast, setToast] = useState({ message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3500);
  };

  const fetchContacts = useCallback(async () => {
    const { data } = await supabase
      .from("contact_numbers")
      .select("*")
      .eq("user_id", user.id);

    if (!data) return;

    const wa = data.find((c) => c.type === "whatsapp");
    const primary = data.find((c) => c.type === "phone" && c.is_primary);
    const secondary = data.find((c) => c.type === "phone" && !c.is_primary);

    if (wa) setWhatsapp(formatPhoneForDisplay(wa.phone_number));
    if (primary) setPrimaryPhone(formatPhoneForDisplay(primary.phone_number));
    if (secondary)
      setSecondaryPhone(formatPhoneForDisplay(secondary.phone_number));
  }, [user.id]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBusinessName(profile.business_name || "");
      setAvatarUrl(profile.avatar_url || null);
      fetchContacts();
    }
  }, [profile, fetchContacts]);

  const onCropComplete = (_, pixels) => {
    setCroppedAreaPixels(pixels);
  };

  const getCroppedImg = async () => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(avatarFile);
    image.src = objectUrl;

    await new Promise((resolve) => {
      image.onload = resolve;
    });

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

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return;
    if (!croppedAreaPixels) {
      showToast("Crop not ready — try adjusting the crop first.", "error");
      return;
    }

    setUploading(true);

    try {
      const croppedBlob = await getCroppedImg();
      if (!croppedBlob)
        throw new Error("Cropping failed — canvas returned null blob.");

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

    // Validate phone numbers
    if (!validatePhone(whatsapp)) {
      showToast("Invalid WhatsApp number", "error");
      return;
    }

    if (!validatePhone(primaryPhone)) {
      showToast("Invalid primary phone number", "error");
      return;
    }

    if (!validatePhone(secondaryPhone)) {
      showToast("Invalid secondary phone number", "error");
      return;
    }

    setSaving(true);

    try {
      // Save profile details first so identity info stays in sync.
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          business_name: businessName || null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const { data: existing, error: fetchError } = await supabase
        .from("contact_numbers")
        .select("*")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      const findContact = (type, isPrimary = null) =>
        existing?.find(
          (c) =>
            c.type === type &&
            (isPrimary === null || c.is_primary === isPrimary),
        );

      if (whatsapp.trim()) {
        const existingWhatsapp = findContact("whatsapp");

        if (existingWhatsapp) {
          const { error } = await supabase
            .from("contact_numbers")
            .update({ phone_number: normalizePhone(whatsapp) })
            .eq("id", existingWhatsapp.id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("contact_numbers").insert({
            user_id: user.id,
            phone_number: normalizePhone(whatsapp),
            type: "whatsapp",
            is_primary: false,
          });

          if (error) throw error;
        }
      }

      if (primaryPhone.trim()) {
        const existingPrimary = findContact("phone", true);

        if (existingPrimary) {
          const { error } = await supabase
            .from("contact_numbers")
            .update({
              phone_number: normalizePhone(primaryPhone),
              is_primary: true,
            })
            .eq("id", existingPrimary.id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("contact_numbers").insert({
            user_id: user.id,
            phone_number: normalizePhone(primaryPhone),
            type: "phone",
            is_primary: true,
          });

          if (error) throw error;
        }
      }

      if (secondaryPhone.trim()) {
        const existingSecondary = findContact("phone", false);

        if (existingSecondary) {
          const { error } = await supabase
            .from("contact_numbers")
            .update({
              phone_number: normalizePhone(secondaryPhone),
              is_primary: false,
            })
            .eq("id", existingSecondary.id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("contact_numbers").insert({
            user_id: user.id,
            phone_number: normalizePhone(secondaryPhone),
            type: "phone",
            is_primary: false,
          });

          if (error) throw error;
        }
      }

      showToast("Profile + contacts saved");
    } catch (err) {
      console.error(err);
      showToast("Save failed", "error");
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
        <h1 className="text-3xl font-black text-white tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Manage your identity and how buyers reach you.
        </p>
      </div>

      {/* AVATAR + TRUST CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 shadow-xl">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0 group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center border-4 border-slate-950 shadow-inner group-hover:border-indigo-500/50 transition-all duration-300">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-black text-3xl">
                  {initials}
                </span>
              )}
            </div>

            {/* Overlay trigger on hover */}
            <label
              htmlFor="avatar-upload"
              className="absolute inset-0 rounded-full bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
            >
              <Camera className="text-white mb-1" size={20} />
              <span className="text-white text-[10px] font-black uppercase tracking-widest text-center">
                Edit
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
                  setCroppedAreaPixels(null);
                  setShowCrop(true);
                }
              }}
              className="hidden"
            />
          </div>

          {/* Identity + trust */}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-xl leading-tight truncate">
              {profile?.business_name || profile?.full_name || "Your Name"}
            </div>
            <div className="text-slate-400 text-sm mt-1 truncate">
              {user?.email}
            </div>

            <div className="mt-4 bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-widest text-slate-400">
                  <ShieldCheck size={14} /> Trust Score
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${
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
                  <span
                    className={`text-sm flex items-center gap-1 font-black ${trustColor}`}
                  >
                    <Star size={14} className="fill-current" /> {trust}
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6 space-y-6 shadow-lg">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <UserIcon size={16} className="text-indigo-400" />
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-300">
            Personal Details
          </h2>
        </div>

        <Field label="Full Name *">
          <TextInput
            icon={UserIcon}
            placeholder="e.g. Kenzy Mawutor"
            value={fullName}
            onChange={setFullName}
          />
        </Field>

        <Field label="Business / Brand Name (Optional)">
          <TextInput
            icon={Building2}
            placeholder="e.g. KenzyVerse"
            value={businessName}
            onChange={setBusinessName}
          />
        </Field>
      </div>

      {/* CONTACT */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 space-y-6 shadow-lg">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <Phone size={16} className="text-emerald-400" />
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-300">
            Contact Methods
          </h2>
        </div>

        <Field label="WhatsApp Number">
          <PhoneInput
            icon={MessageCircle}
            value={whatsapp}
            onChange={setWhatsapp}
            placeholder="54 000 0000"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Primary Phone">
            <PhoneInput
              icon={Phone}
              value={primaryPhone}
              onChange={setPrimaryPhone}
              placeholder="54 000 0000"
            />
          </Field>

          <Field label="Secondary Phone">
            <PhoneInput
              icon={PhoneCall}
              value={secondaryPhone}
              onChange={setSecondaryPhone}
              placeholder="24 000 0000"
            />
          </Field>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl font-black text-[13px] uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/5"
      >
        {saving ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </button>

      {/* CROP MODAL */}
      {showCrop && avatarFile && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <p className="text-[12px] font-black flex items-center gap-2 uppercase tracking-widest text-slate-300">
                <Camera size={16} /> Crop Avatar
              </p>
              <button
                onClick={() => {
                  setShowCrop(false);
                  setAvatarFile(null);
                  setCroppedAreaPixels(null);
                }}
                className="text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Crop area */}
            <div className="relative w-full h-80 bg-black">
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
            <div className="px-6 pt-6 pb-2">
              <label className="text-[10px] font-black flex justify-between uppercase tracking-widest text-slate-400 mb-3">
                <span>Zoom</span>
                <span className="text-indigo-400">
                  {Math.round(zoom * 100)}%
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Action buttons */}
            <div className="p-6 flex gap-3">
              <button
                onClick={() => {
                  setShowCrop(false);
                  setAvatarFile(null);
                  setCroppedAreaPixels(null);
                }}
                className="flex-1 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>

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
                className="flex-1 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 flex justify-center items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
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
