// src/components/Auth/AuthSignUp.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import AuthLayout from "./AuthLayout";
import {
  Field,
  Input,
  PasswordInput,
  PrimaryButton,
  ErrorBanner,
  SuccessBanner,
  validateUCCEmail,
} from "./AuthUI";

// ── Password strength meter ────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;

  const checks = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: "Contains a number", pass: /\d/.test(password) },
    { label: "Contains a letter", pass: /[a-zA-Z]/.test(password) },
    { label: "Contains a symbol", pass: /[^a-zA-Z0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.pass).length;
  const levels = [
    { label: "Too weak", color: "bg-red-500", bar: "w-1/4" },
    { label: "Weak", color: "bg-orange-500", bar: "w-2/4" },
    { label: "Fair", color: "bg-yellow-500", bar: "w-3/4" },
    { label: "Strong", color: "bg-emerald-500", bar: "w-full" },
  ];
  const level = levels[Math.min(score - 1, 3)] || levels[0];

  return (
    <div className="space-y-2 mt-2">
      {/* Bar */}
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${level.color} ${level.bar}`}
        />
      </div>

      {/* Checks */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 ${c.pass ? "bg-emerald-500" : "bg-slate-700"}`}
            >
              {c.pass && (
                <svg
                  className="w-2 h-2 text-white"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span
              className={`text-[10px] ${c.pass ? "text-emerald-400" : "text-slate-600"}`}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthSignUp() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = "Full name is required.";
    const emailErr = validateUCCEmail(email);
    if (emailErr) errs.email = emailErr;
    if (!password) errs.password = "Password is required.";
    else if (password.length < 8)
      errs.password = "Password must be at least 8 characters.";
    if (!confirm) errs.confirm = "Please confirm your password.";
    else if (password !== confirm) errs.confirm = "Passwords do not match.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validate()) return;

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(), // ← feeds your profile trigger
          },
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("already registered")) {
          throw new Error(
            "An account with this email already exists. Try signing in instead.",
          );
        }
        throw authError;
      }

      // Supabase returns a session if email confirmation is disabled,
      // or null session if confirmation is required.
      if (data?.session) {
        // Email confirmation OFF — user is immediately signed in
        navigate("/", { replace: true });
      } else {
        // Email confirmation ON — prompt user to check inbox
        setSuccess(
          "Account created! We've sent a confirmation link to your email. Please verify your address before signing in.",
        );
        // Clear sensitive fields
        setPassword("");
        setConfirm("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Join the UCC student marketplace"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* ── Global error / success ─── */}
        <ErrorBanner message={error} />
        <SuccessBanner message={success} />

        {/* If success, show a button back to sign in */}
        {success ? (
          <div className="space-y-4 pt-2">
            <p className="text-center text-sm text-slate-500">
              Already verified?{" "}
              <Link
                to="/signin"
                className="text-indigo-400 hover:text-indigo-300 font-bold"
              >
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          <>
            {/* ── Full name ─── */}
            <Field label="Full name" error={fieldErrors.fullName}>
              <Input
                type="text"
                placeholder="e.g. Kwame Mensah"
                value={fullName}
                autoComplete="name"
                autoFocus
                disabled={loading}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName)
                    setFieldErrors((p) => ({ ...p, fullName: "" }));
                }}
              />
            </Field>

            {/* ── Email ─── */}
            <Field label="Email address" error={fieldErrors.email}>
              <Input
                type="email"
                placeholder="you@stu.ucc.edu.gh"
                value={email}
                autoComplete="email"
                disabled={loading}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email)
                    setFieldErrors((p) => ({ ...p, email: "" }));
                }}
              />
              <p className="text-[10px] text-slate-600 mt-1">
                Only @ucc.edu.gh or @stu.ucc.edu.gh addresses
              </p>
            </Field>

            {/* ── Password ─── */}
            <Field label="Password" error={fieldErrors.password}>
              <PasswordInput
                placeholder="Create a strong password"
                value={password}
                autoComplete="new-password"
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password)
                    setFieldErrors((p) => ({ ...p, password: "" }));
                }}
              />
              <PasswordStrength password={password} />
            </Field>

            {/* ── Confirm password ─── */}
            <Field label="Confirm password" error={fieldErrors.confirm}>
              <PasswordInput
                placeholder="Repeat your password"
                value={confirm}
                autoComplete="new-password"
                disabled={loading}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (fieldErrors.confirm)
                    setFieldErrors((p) => ({ ...p, confirm: "" }));
                }}
              />
            </Field>

            {/* ── Submit ─── */}
            <PrimaryButton loading={loading} type="submit">
              Create Account
            </PrimaryButton>

            {/* ── Switch to sign in ─── */}
            <p className="text-center text-sm text-slate-500 pt-1">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
