import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { installMockApi } from "./mock-api";
import { installWorkflowDemoApi } from "./workflow-demo-api";
import { installRemoteApi } from "./remote-api";
import "./globals.css";
import "./operation-hub.css";
import "./pending.css";

async function boot() {
  const remote = await installRemoteApi();
  if (!remote) {
    // GitHub-only visual demo fallback. Data is browser-local in this mode.
    installMockApi();
    installWorkflowDemoApi();
  }

  createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined));
  }
}

void boot();
