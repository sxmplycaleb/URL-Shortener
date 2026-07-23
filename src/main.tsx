import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { BrowserRouter } from "react-router-dom";

import { App } from "@/App";
import "@/styles/globals.css";

const isProduction = import.meta.env.PROD;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {isProduction ? (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      ) : null}
    </BrowserRouter>
  </React.StrictMode>,
);
