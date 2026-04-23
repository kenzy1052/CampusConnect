// src/components/Auth/AuthLayout.jsx
// Shared wrapper for all auth pages — glassmorphism card, 400px max width
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0a0f1e 0%, #0f172a 40%, #1a0533 100%)",
      }}
    >
      {/* ── Ambient light orbs ──────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          style={{
            position: "absolute",
            top: "-15%",
            left: "-10%",
            width: "520px",
            height: "520px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.20) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "25%",
            right: "-15%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-5%",
            left: "25%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(79,70,229,0.13) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      {/* ── Dot-grid texture ─────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148,163,184,0.04) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center mb-8 z-10">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            boxShadow:
              "0 0 48px rgba(99,102,241,0.50), 0 8px 32px rgba(0,0,0,0.45)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-white"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9,22 9,12 15,12 15,22" />
          </svg>
        </div>
        <h1 className="text-[22px] font-black tracking-tight text-white leading-none">
          Campus<span style={{ color: "#a78bfa" }}>Connect</span>
        </h1>
        <p
          className="text-[11px] mt-1.5 font-medium tracking-widest uppercase"
          style={{ color: "rgba(148,163,184,0.5)" }}
        >
          UCC Student Marketplace
        </p>
      </div>

      {/* ── Glassmorphism card — max 400px ────────────────────────────────── */}
      <div className="w-full z-10" style={{ maxWidth: "400px" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.045)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "22px",
            boxShadow:
              "0 0 0 1px rgba(99,102,241,0.08), 0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.09)",
            overflow: "hidden",
          }}
        >
          {/* Gradient top bar */}
          <div
            style={{
              height: "2px",
              background:
                "linear-gradient(90deg, transparent 0%, #6366f1 30%, #8b5cf6 70%, transparent 100%)",
            }}
          />

          <div className="p-8">
            {(title || subtitle) && (
              <div className="mb-7">
                {title && (
                  <h2 className="text-xl font-black text-white tracking-tight">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p
                    className="text-sm mt-1"
                    style={{ color: "rgba(148,163,184,0.65)" }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            {children}
          </div>
        </div>

        {/* UCC verified badge */}
        <div className="flex items-center justify-center mt-5 gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            style={{ boxShadow: "0 0 6px rgba(16,185,129,0.8)" }}
          />
          <p
            className="text-[11px] font-medium"
            style={{ color: "rgba(100,116,139,0.75)" }}
          >
            Exclusively for UCC students &amp; staff
          </p>
        </div>
      </div>
    </div>
  );
}
