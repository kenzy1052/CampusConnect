import * as Sentry from "@sentry/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Initialize Sentry before the app starts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  // Adjust these for your needs:
  tracesSampleRate: 0.1, // Captures 10% of performance transactions
  replaysSessionSampleRate: 0.1, // Captures 10% of all sessions
  replaysOnErrorSampleRate: 1.0, // Captures 100% of sessions that end in an error
  integrations: [Sentry.replayIntegration()],
});

const root = createRoot(document.getElementById("root"));

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
