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
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase.from("categories").select("*");
        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) return alert("Title required");
    if (!formData.category_id) return alert("Select category");

    // 🔥 VALIDATION
    if (formData.listing_type === "product") {
      if (!formData.price || isNaN(formData.price)) {
        return alert("Valid price required for products");
      }
    }

    if (formData.listing_type === "service") {
      const min = parseFloat(formData.price_min);
      const max = parseFloat(formData.price_max);

      if (formData.price_min && isNaN(min)) {
        return alert("Invalid minimum price");
      }

      if (formData.price_max && isNaN(max)) {
        return alert("Invalid maximum price");
      }

      if (min && max && min > max) {
        return alert("Minimum price cannot be greater than maximum price");
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.listing_type,
        category_id: formData.category_id,
        seller_id: user.id,
        price:
          formData.listing_type === "product"
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
      };

      const { error } = await supabase.from("listings").insert([payload]);

      if (error) throw error;

      onSuccess();
    } catch (err) {
      console.error(err.message);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-indigo-400">Loading categories...</p>;

  const filteredCategories = categories.filter(
    (c) => c.type === formData.listing_type,
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 p-8 rounded-3xl border border-slate-800"
    >
      <h3 className="text-xl font-bold mb-6 text-indigo-400">Create Listing</h3>

      {/* TYPE */}
      <div className="flex gap-2 mb-4">
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
                category_id: "",
              })
            }
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase ${
              formData.listing_type === type
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <input
        placeholder="Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        className="w-full mb-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
      />

      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        className="w-full mb-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
      />

      {/* PRICE SECTION */}
      {formData.listing_type === "product" && (
        <input
          type="number"
          placeholder="Price"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          className="w-full mb-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
        />
      )}

      {formData.listing_type === "service" && (
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            placeholder="Min Price"
            value={formData.price_min}
            onChange={(e) =>
              setFormData({ ...formData, price_min: e.target.value })
            }
            className="w-1/2 p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
          />
          <input
            type="number"
            placeholder="Max Price"
            value={formData.price_max}
            onChange={(e) =>
              setFormData({ ...formData, price_max: e.target.value })
            }
            className="w-1/2 p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
          />
        </div>
      )}

      <select
        value={formData.category_id}
        onChange={(e) =>
          setFormData({ ...formData, category_id: e.target.value })
        }
        className="w-full mb-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
      >
        <option value="">Select Category</option>
        {filteredCategories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-slate-400"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-indigo-600 py-3 rounded-xl"
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
