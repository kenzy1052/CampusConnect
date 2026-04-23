// src/components/Auth/AuthUI.jsx
// Reusable primitives — styled to match the glassmorphism AuthLayout
import { useState } from "react";

// ── Field wrapper ──────────────────────────────────────────────────────────────
export function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          className="block text-[11px] font-black uppercase tracking-widest"
          style={{ color: "rgba(148,163,184,0.7)" }}
        >
          {label}
        </label>
      )}
      {children}
      {error && (
        <p
          className="flex items-center gap-1.5 text-[11px]"
          style={{ color: "#f87171" }}
        >
          <svg
            className="w-3 h-3 shrink-0"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Shared input style (applied inline so it integrates with the glass card) ──
const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  color: "#fff",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const inputFocusStyle = {
  borderColor: "rgba(99,102,241,0.7)",
  boxShadow: "0 0 0 3px rgba(99,102,241,0.15)",
};

// ── Text input ─────────────────────────────────────────────────────────────────
export function Input({ disabled, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      disabled={disabled}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={{
        ...inputStyle,
        ...(focused ? inputFocusStyle : {}),
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "text",
        // Placeholder color via CSS variable not possible inline — use className trick
      }}
      className="placeholder-slate-600"
    />
  );
}

// ── Password input with show/hide ─────────────────────────────────────────────
export function PasswordInput({ disabled, ...props }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <input
        {...props}
        type={show ? "text" : "password"}
        disabled={disabled}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={{
          ...inputStyle,
          paddingRight: "48px",
          ...(focused ? inputFocusStyle : {}),
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
        className="placeholder-slate-600"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        style={{
          position: "absolute",
          right: "14px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(100,116,139,0.8)",
          padding: "2px",
          transition: "color 0.15s",
        }}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ── Primary button ─────────────────────────────────────────────────────────────
export function PrimaryButton({
  loading,
  children,
  type = "submit",
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={loading || props.disabled}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        background:
          loading || props.disabled
            ? "rgba(99,102,241,0.5)"
            : "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
        border: "1px solid rgba(139,92,246,0.4)",
        color: "#fff",
        fontWeight: 900,
        fontSize: "11px",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        padding: "14px 24px",
        borderRadius: "12px",
        cursor: loading || props.disabled ? "not-allowed" : "pointer",
        boxShadow:
          loading || props.disabled
            ? "none"
            : "0 4px 24px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
        transition: "all 0.2s",
      }}
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          Please wait…
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ── Error banner ───────────────────────────────────────────────────────────────
export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: "12px",
        padding: "14px 16px",
      }}
    >
      <svg
        className="w-4 h-4 shrink-0 mt-0.5"
        style={{ color: "#f87171" }}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      </svg>
      <p className="text-sm leading-snug" style={{ color: "#fca5a5" }}>
        {message}
      </p>
    </div>
  );
}

// ── Success banner ─────────────────────────────────────────────────────────────
export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        background: "rgba(16,185,129,0.08)",
        border: "1px solid rgba(16,185,129,0.25)",
        borderRadius: "12px",
        padding: "14px 16px",
      }}
    >
      <svg
        className="w-4 h-4 shrink-0 mt-0.5"
        style={{ color: "#34d399" }}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.78 5.28a.75.75 0 0 0-1.06-1.06L7 8.94 5.28 7.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25z" />
      </svg>
      <p className="text-sm leading-snug" style={{ color: "#6ee7b7" }}>
        {message}
      </p>
    </div>
  );
}

// ── Email validator ────────────────────────────────────────────────────────────
export function validateUCCEmail(email) {
  const trimmed = (email || "").trim().toLowerCase();
  if (!trimmed) return "Email is required.";
  if (!trimmed.includes("@")) return "Enter a valid email address.";
  if (!trimmed.endsWith("@ucc.edu.gh") && !trimmed.endsWith("@stu.ucc.edu.gh"))
    return "Only @ucc.edu.gh or @stu.ucc.edu.gh emails are allowed.";
  return null;
}
