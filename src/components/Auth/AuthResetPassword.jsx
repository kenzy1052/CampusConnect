// src/components/Auth/AuthResetPassword.jsx
//
// This page is reached via the magic link in the password-reset email.
// Supabase embeds the session tokens in the URL fragment (#access_token=...).
// The supabase-js client automatically picks them up on page load.
//
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import AuthLayout from "./AuthLayout";
import {
  Field,
  PasswordInput,
  PrimaryButton,
  ErrorBanner,
  SuccessBanner,
} from "./AuthUI";

// ── Password strength check (minimum bar) ─────────────────────────────────────
function meetsMinimum(pw) {
  return pw && pw.length >= 8;
}

export default function AuthResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [ready, setReady] = useState(false); // session detected?

  // ── Detect the PASSWORD_RECOVERY event ────────────────────────────────────
  // When Supabase redirects the user back from the email link it fires
  // a PASSWORD_RECOVERY event (after parsing the URL fragment tokens).
  // We wait for this before showing the form so the session is active.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if a session already exists (e.g. user reloaded the page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!password) errs.password = "New password is required.";
    else if (!meetsMinimum(password))
      errs.password = "Password must be at least 8 characters.";
    if (!confirm) errs.confirm = "Please confirm your new password.";
    else if (password !== confirm) errs.confirm = "Passwords do not match.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess("Password updated successfully! Redirecting you to sign in…");

      // Sign the user out so they log in fresh with the new password
      await supabase.auth.signOut();

      setTimeout(() => navigate("/signin", { replace: true }), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Waiting for the session event ─────────────────────────────────────────
  if (!ready) {
    return (
      <AuthLayout
        title="Checking link…"
        subtitle="One moment while we verify your reset link"
      >
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 text-center">
            If nothing happens,{" "}
            <button
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
              onClick={() => setReady(true)}
            >
              click here
            </button>{" "}
            to continue.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Choose a strong password for your account"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <ErrorBanner message={error} />
        <SuccessBanner message={success} />

        {!success && (
          <>
            {/* ── New password ─── */}
            <Field label="New password" error={fieldErrors.password}>
              <PasswordInput
                placeholder="At least 8 characters"
                value={password}
                autoComplete="new-password"
                autoFocus
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password)
                    setFieldErrors((p) => ({ ...p, password: "" }));
                }}
              />
            </Field>

            {/* ── Confirm password ─── */}
            <Field label="Confirm new password" error={fieldErrors.confirm}>
              <PasswordInput
                placeholder="Repeat your new password"
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

            {/* ── Requirements hint ─── */}
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <svg
                className="w-3.5 h-3.5 shrink-0"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
              </svg>
              Use at least 8 characters. Mix letters, numbers, and symbols for a
              stronger password.
            </div>

            {/* ── Submit ─── */}
            <PrimaryButton loading={loading} type="submit">
              Update Password
            </PrimaryButton>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
