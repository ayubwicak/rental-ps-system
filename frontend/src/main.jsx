import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { getPreferredTheme, applyTheme } from "./utils/theme.js";

// Terapkan tema sedini mungkin (sebelum render) agar tidak berkedip.
applyTheme(getPreferredTheme());

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
