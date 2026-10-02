import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Filet de sécurité : si un écran de l'app rencontre un problème imprévu en
// s'affichant, React arrête tout sans rien montrer d'autre qu'une page
// blanche — particulièrement déroutant sur une PWA installée en plein écran
// sur téléphone, où il n'y a pas de console pour comprendre ce qui se passe.
// Ce composant attrape ce genre de problème et affiche à la place un écran
// simple avec un bouton pour relancer l'app proprement, plutôt que rien du
// tout. Doit être une classe : React n'a pas d'équivalent en Hooks pour ça.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Pas de service de suivi d'erreurs branché sur ce projet perso — la
    // console reste la seule trace, mais c'est toujours mieux que rien pour
    // comprendre ce qui a coincé après coup.
    console.error("CinéRadar — erreur d'affichage interceptée :", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
            background: "#13100C",
            color: "#F2EDE4",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 40 }}>🎬💥</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Quelque chose s'est mal passé</div>
          <div style={{ fontSize: 14, color: "#A89F91", maxWidth: 320 }}>
            Un affichage a rencontré un problème inattendu. Tes films restent en sécurité — un rechargement suffit
            en général à repartir normalement.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: "10px 20px",
              borderRadius: 6,
              border: "1px solid #A89F91",
              background: "transparent",
              color: "#F2EDE4",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Recharger l'application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
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
