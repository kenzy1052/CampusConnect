import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Auth() {
  const [mode, setMode] = useState("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Email and password are required");
      return;
    }

    if (mode === "signup" && !fullName.trim()) {
      alert("Full name is required");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Incorrect email or password");
          }
          throw error;
        }
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName, // 🔥 feeds your trigger
            },
          },
        });

        if (error) throw error;

        if (!data.session) {
          alert("Check your email to confirm your account.");
        } else {
          alert("Account created. You are now logged in.");
        }

        // reset
        setMode("login");
        setPassword("");
      }
    } catch (err) {
      console.error(err.message);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-3xl border border-slate-800">
        <h2 className="text-2xl font-black text-indigo-500 mb-6 text-center">
          CampusConnect
        </h2>

        {/* MODE TOGGLE */}
        <div className="flex mb-6 bg-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setMode("login")}
            disabled={loading}
            className={`flex-1 py-3 text-xs font-black uppercase ${
              mode === "login" ? "bg-indigo-600 text-white" : "text-slate-400"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("signup")}
            disabled={loading}
            className={`flex-1 py-3 text-xs font-black uppercase ${
              mode === "signup" ? "bg-indigo-600 text-white" : "text-slate-400"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* FULL NAME (ONLY FOR SIGNUP) */}
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className="w-full mb-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
          />
        )}

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full mb-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
        />

        {/* PASSWORD */}
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-white"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* ACTION */}
        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-indigo-600 py-4 rounded-xl font-black text-white uppercase"
        >
          {loading
            ? "Processing..."
            : mode === "login"
              ? "Login"
              : "Create Account"}
        </button>
      </div>
    </div>
  );
}
