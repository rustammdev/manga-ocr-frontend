import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: { background: "#1c1c1c", border: "1px solid #333", color: "#e5e5e5" },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
