// src/components/Auth/AuthForgotPassword.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import AuthLayout from "./AuthLayout";
import {
  Field,
  Input,
  PrimaryButton,
  ErrorBanner,
  SuccessBanner,
  validateUCCEmail,
} from "./AuthUI";

export default function AuthForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldError, setFieldError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldError("");

    const emailErr = validateUCCEmail(email);
    if (emailErr) {
      setFieldError(emailErr);
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          // Supabase will append ?token=... to this URL
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (authError) throw authError;

      // Always show success to prevent email enumeration attacks
      setSuccess(
        "If that email is registered, you'll receive a reset link shortly. Check your inbox and spam folder.",
      );
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* ── Global error / success ─── */}
        <ErrorBanner message={error} />
        <SuccessBanner message={success} />

        {!success && (
          <>
            {/* ── Email ─── */}
            <Field label="Email address" error={fieldError}>
              <Input
                type="email"
                placeholder="you@stu.ucc.edu.gh"
                value={email}
                autoComplete="email"
                autoFocus
                disabled={loading}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError("");
                }}
              />
            </Field>

            {/* ── Submit ─── */}
            <PrimaryButton loading={loading} type="submit">
              Send Reset Link
            </PrimaryButton>
          </>
        )}

        {/* ── Back to sign in ─── */}
        <div className="flex items-center justify-center pt-1">
          <Link
            to="/signin"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors group"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
