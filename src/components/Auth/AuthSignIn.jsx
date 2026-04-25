// src/components/Auth/AuthSignIn.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import AuthLayout from "./AuthLayout";
import {
  Field,
  Input,
  PasswordInput,
  PrimaryButton,
  ErrorBanner,
  validateUCCEmail,
} from "./AuthUI";

export default function AuthSignIn() {
  const navigate = useNavigate();
  const location = useLocation();

  // If we were redirected from a protected route, go back there after login
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Inline validation ──────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    const emailErr = validateUCCEmail(email);
    if (emailErr) errs.email = emailErr;
    if (!password) errs.password = "Password is required.";
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
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        // Supabase returns a generic message — we humanize it
        if (authError.message.toLowerCase().includes("email not confirmed")) {
          throw new Error(
            "Your email hasn't been verified yet. Check your inbox for the confirmation link.",
          );
        }

        if (
          authError.message.toLowerCase().includes("invalid login") ||
          authError.message.toLowerCase().includes("invalid credentials")
        ) {
          throw new Error(
            "Incorrect email or password. Please check your details and try again.",
          );
        }
        throw authError;
      }

      // Success — AuthContext's onAuthStateChange will fire and update user
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* ── Global error ─── */}
        <ErrorBanner message={error} />

        {/* ── Email ─── */}
        <Field label="Email address" error={fieldErrors.email}>
          <Input
            type="email"
            placeholder="you@stu.ucc.edu.gh"
            value={email}
            autoComplete="email"
            autoFocus
            disabled={loading}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email)
                setFieldErrors((p) => ({ ...p, email: "" }));
            }}
          />
        </Field>

        {/* ── Password ─── */}
        <Field label="Password" error={fieldErrors.password}>
          <PasswordInput
            placeholder="Your password"
            value={password}
            autoComplete="current-password"
            disabled={loading}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password)
                setFieldErrors((p) => ({ ...p, password: "" }));
            }}
          />
        </Field>

        {/* ── Forgot password link ─── */}
        <div className="flex justify-end -mt-1">
          <Link
            to="/forgot-password"
            className="text-[12px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            Forgot your password?
          </Link>
        </div>

        {/* ── Submit ─── */}
        <PrimaryButton loading={loading} type="submit">
          Sign In
        </PrimaryButton>

        {/* ── Switch to sign up ─── */}
        <p className="text-center text-sm text-slate-500 pt-1">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
          >
            Create account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
