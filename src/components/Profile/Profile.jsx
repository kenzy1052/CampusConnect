import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";

// --- SUB-COMPONENTS MOVED OUTSIDE TO FIX FOCUS ISSUE ---

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

// --- MAIN COMPONENT ---

export default function Profile() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBusinessName(profile.business_name || "");
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
      const sPhone = data.find((c) => c.type === "phone" && !c.is_primary);
      if (wa) setWhatsapp(wa.phone_number);
      if (pPhone) setPrimaryPhone(pPhone.phone_number);
      if (sPhone) setSecondaryPhone(sPhone.phone_number);
    }
  };

  const normalizePhone = (input) => {
    if (!input) return null;
    let v = input.replace(/\D/g, "");
    if (v.length === 10 && v.startsWith("0")) v = v.slice(1);
    if (v.length !== 9 || v.startsWith("0")) return null;
    return v;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) return alert("Full name required");
    const normWa = normalizePhone(whatsapp);
    const normPrimary = normalizePhone(primaryPhone);
    const normSecondary = normalizePhone(secondaryPhone);
    if (whatsapp && !normWa) return alert("Invalid WhatsApp number");
    if (primaryPhone && !normPrimary)
      return alert("Invalid Primary Phone number");
    if (secondaryPhone && !normSecondary)
      return alert("Invalid Secondary Phone number");
    if (!normWa && !normPrimary)
      return alert("Provide at least a WhatsApp or Primary phone number.");

    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ full_name: fullName, business_name: businessName || null })
        .eq("id", user.id);
      await supabase.from("contact_numbers").delete().eq("user_id", user.id);
      const payload = [];
      if (normWa)
        payload.push({
          user_id: user.id,
          phone_number: normWa,
          type: "whatsapp",
          is_primary: false,
        });
      if (normPrimary)
        payload.push({
          user_id: user.id,
          phone_number: normPrimary,
          type: "phone",
          is_primary: true,
        });
      if (normSecondary)
        payload.push({
          user_id: user.id,
          phone_number: normSecondary,
          type: "phone",
          is_primary: false,
        });
      if (payload.length > 0)
        await supabase.from("contact_numbers").insert(payload);
      alert("Profile updated successfully");
    } catch (err) {
      console.error(err.message);
      alert("Failed to save profile changes");
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

  return (
    <div className="max-w-xl mx-auto pb-24 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your identity and how buyers reach you.
        </p>
      </div>

      {/* AVATAR + TRUST CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-lg leading-tight truncate">
            {profile?.business_name || profile?.full_name || "Your Name"}
          </div>
          <div className="text-slate-500 text-xs mt-0.5 truncate">
            {user?.email}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Trust Score
              </span>
              <span className={`text-sm font-black ${trustColor}`}>
                ★ {trust} / 100
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${trustBg}`}
                style={{ width: `${trust}%` }}
              />
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
            placeholder="e.g. Emmanuel Sasu"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500/60 outline-none transition-all placeholder:text-slate-700 text-sm"
          />
        </Field>
        <Field label="Business / Brand Name (Optional)">
          <input
            placeholder="e.g. GMJ Glamour"
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
          <p className="text-[10px] text-slate-600 mt-1.5">
            Buyers will message you here directly.
          </p>
        </Field>

        <Field label="📞 Primary Call Number">
          <PhoneInput
            value={primaryPhone}
            onChange={setPrimaryPhone}
            placeholder="54 000 0000"
          />
        </Field>

        <Field label="📞 Secondary Number (Optional)">
          <PhoneInput
            value={secondaryPhone}
            onChange={setSecondaryPhone}
            placeholder="Backup number"
          />
        </Field>
      </div>

      {/* SAVE */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-white text-black py-4 rounded-xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
