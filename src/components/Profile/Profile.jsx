import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

export default function Profile() {
  const { profile, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    full_name: "",
    business_name: "",
    whatsapp_number: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        business_name: profile.business_name || "",
        whatsapp_number: profile.whatsapp_number || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      return alert("Full name is required");
    }

    setSaving(true);

    try {
      await updateProfile({
        full_name: formData.full_name,
        business_name: formData.business_name,
        whatsapp_number: formData.whatsapp_number,
      });

      alert("Profile updated successfully");
    } catch (err) {
      console.error(err.message);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const initials = (formData.business_name || formData.full_name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-xl">
      <h2 className="text-2xl font-black text-indigo-400 mb-6">Your Profile</h2>

      {/* INITIALS AVATAR */}
      <div className="w-16 h-16 flex items-center justify-center rounded-full bg-indigo-600 text-white font-black text-xl mb-6">
        {initials}
      </div>

      <input
        placeholder="Full Name"
        value={formData.full_name}
        onChange={(e) =>
          setFormData({ ...formData, full_name: e.target.value })
        }
        className="w-full mb-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
      />

      <input
        placeholder="Business Name (optional)"
        value={formData.business_name}
        onChange={(e) =>
          setFormData({ ...formData, business_name: e.target.value })
        }
        className="w-full mb-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
      />

      <input
        placeholder="WhatsApp Number"
        value={formData.whatsapp_number}
        onChange={(e) =>
          setFormData({ ...formData, whatsapp_number: e.target.value })
        }
        className="w-full mb-6 p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-indigo-600 py-4 rounded-xl font-black text-white uppercase"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
