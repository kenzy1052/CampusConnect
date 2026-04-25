import * as Sentry from "@sentry/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async"; // ← add
import "./index.css";
import App from "./App.jsx";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});

const root = createRoot(document.getElementById("root"));

root.render(
  <StrictMode>
    <HelmetProvider>
      {" "}
      {/* ← wrap App */}
      <App />
    </HelmetProvider>
  </StrictMode>,
);
