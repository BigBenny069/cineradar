import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Rend l'app elle-même disponible hors-ligne (voir sw.js) — sans ça, le
// cache des données dans App.jsx ne sert à rien si le téléphone ne peut
// même pas re-télécharger l'app en premier lieu.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Pas grave si l'enregistrement échoue (navigateur non compatible,
      // contexte non sécurisé, etc.) — l'app fonctionne simplement sans
      // ce filet de sécurité hors-ligne dans ce cas.
    });
  });
}
