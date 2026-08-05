import { useState, useEffect } from "react";

const COLORS = {
  bg: "#13100C",
  surface: "#1D1812",
  surfaceRaised: "#241D16",
  gold: "#E7A23A",
  goldDim: "#8A6A34",
  red: "#B23A32",
  cream: "#F3ECDF",
  muted: "#93877A",
  line: "#37301F",
};

const PROVIDER_META = {
  "Canal+": { bg: "#000000", fg: "#FFFFFF", label: "CANAL+", weight: 800, category: "abonnement" },
  Netflix: { bg: "#E50914", fg: "#FFFFFF", label: "N", weight: 800, category: "abonnement" },
  "Disney+": { bg: "#0E1A2B", fg: "#FFFFFF", label: "D+", weight: 800, category: "abonnement" },
  "Prime Video": { bg: "#00A8E1", fg: "#0E1E25", label: "prime", weight: 700, category: "abonnement" },
  Max: { bg: "#001A1A", fg: "#FFFFFF", label: "max", weight: 700, italic: true, category: "abonnement" },
  "Orange VOD": { bg: "#FF7900", fg: "#FFFFFF", label: "orange", weight: 400, category: "vod" },
  "Apple TV Store": { bg: "#000000", fg: "#FFFFFF", label: "", weight: 700, category: "vod" },
  "Google Play Movies": { bg: "#FFFFFF", fg: "#5F6368", label: "▶", weight: 700, category: "vod" },
  "Canal VOD": { bg: "#000000", fg: "#FFFFFF", label: "CANAL+", weight: 800, category: "vod" },
  YouTube: { bg: "#FF0000", fg: "#FFFFFF", label: "▶", weight: 700, category: "vod" },
};

function LetterboxdMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Letterboxd">
      <circle cx="28" cy="50" r="22" fill="#FF8000" />
      <circle cx="50" cy="50" r="22" fill="#00E054" />
      <circle cx="72" cy="50" r="22" fill="#40BCF4" />
      <ellipse cx="21" cy="39" rx="7.5" ry="4.5" fill="rgba(255,255,255,0.32)" />
      <ellipse cx="43" cy="39" rx="7.5" ry="4.5" fill="rgba(255,255,255,0.32)" />
      <ellipse cx="65" cy="39" rx="7.5" ry="4.5" fill="rgba(255,255,255,0.32)" />
    </svg>
  );
}

function PlatformBadge({ name }) {
  const meta = PROVIDER_META[name] || {
    bg: COLORS.surfaceRaised,
    fg: COLORS.cream,
    label: name.slice(0, 1),
    weight: 700,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: meta.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: meta.bg === "#FFFFFF" ? `1px solid ${COLORS.line}` : "none",
        }}
      >
        <span
          style={{
            color: meta.fg,
            fontWeight: meta.weight,
            fontStyle: meta.italic ? "italic" : "normal",
            fontSize: meta.label.length > 2 ? 8 : 13,
          }}
        >
          {meta.label}
        </span>
      </div>
      <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 14, color: COLORS.cream }}>{name}</span>
    </div>
  );
}

function Header({ onBack }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px 16px",
        paddingTop: "calc(14px + env(safe-area-inset-top))",
      }}
    >
      {onBack && (
        <button onClick={onBack} style={{ padding: 4, marginLeft: -4 }} aria-label="Retour">
          <span style={{ color: COLORS.cream, fontSize: 22 }}>←</span>
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: `1.5px solid ${COLORS.gold}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: COLORS.gold, fontSize: 16 }}>🎬</span>
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 24,
              letterSpacing: 1,
              color: COLORS.cream,
              lineHeight: 1,
            }}
          >
            CINÉ<span style={{ color: COLORS.gold }}>RADAR</span>
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              color: COLORS.muted,
              letterSpacing: 1,
            }}
          >
            SÉANCE PRIVÉE · 2 PLACES
          </div>
        </div>
      </div>
    </div>
  );
}

function MarqueeBadge({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        background: "rgba(231,162,58,0.12)",
        color: COLORS.gold,
        border: `1px solid ${COLORS.goldDim}`,
        borderRadius: 3,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: COLORS.gold,
          boxShadow: `0 0 6px ${COLORS.gold}`,
        }}
      />
      {children}
    </span>
  );
}

function StampBadge({ children, size = "normal" }) {
  const pad = size === "small" ? "3px 8px" : "5px 12px";
  const fontSize = size === "small" ? 9 : 11;
  return (
    <div
      style={{
        display: "inline-block",
        transform: "rotate(-7deg)",
        padding: pad,
        border: `2px solid ${COLORS.gold}`,
        borderRadius: 4,
        boxShadow: `0 0 0 2px ${COLORS.bg}, 0 0 0 3px ${COLORS.gold}`,
        background: "rgba(19,16,12,0.6)",
        color: COLORS.gold,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function MovieCard({ movie, onOpen }) {
  const providers = [...(movie.providers?.abonnement || []), ...(movie.providers?.vod || [])];
  return (
    <button
      onClick={() => onOpen(movie)}
      style={{
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: COLORS.surface,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 8,
      }}
    >
      <div style={{ aspectRatio: "2 / 3", position: "relative", background: "#000" }}>
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.muted,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
            }}
          >
            Affiche indisponible
          </div>
        )}
        {movie.providers?.abonnement?.length > 0 && (
          <div style={{ position: "absolute", top: 6, right: 6 }}>
            <StampBadge size="small">Abonné</StampBadge>
          </div>
        )}
      </div>
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: COLORS.cream, lineHeight: 1 }}>
          {movie.title}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: COLORS.muted, marginTop: 3 }}>
          {movie.year} · {movie.director}
        </div>
        <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
          {providers.slice(0, 3).map((p) => {
            const meta = PROVIDER_META[p] || { bg: COLORS.surfaceRaised, fg: COLORS.cream, label: p.slice(0, 1) };
            return (
              <div
                key={p}
                title={p}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: meta.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ color: meta.fg, fontWeight: meta.weight || 700, fontSize: 8 }}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </button>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: COLORS.cream, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function DetailView({ movie, onBack, onEdit, onDeleted }) {
  const [showLinks, setShowLinks] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const abonnement = movie.providers?.abonnement || [];
  const vod = movie.providers?.vod || [];

  const confirmDelete = async () => {
    setDeleteStatus("loading");
    setDeleteError("");
    try {
      const res = await fetch("/api/delete-movie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: movie.title,
          year: movie.year,
          tmdbId: movie.tmdbId,
          password: deletePassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteStatus("error");
        setDeleteError(data.error || "Erreur inconnue");
        return;
      }
      setDeleteStatus("success");
      setTimeout(() => onDeleted?.(), 1200);
    } catch (e) {
      setDeleteStatus("error");
      setDeleteError(e.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <Header onBack={onBack} />
      <div style={{ padding: "0 16px 96px" }}>
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ height: "42vh", background: "#000" }}>
            {movie.poster && (
              <img src={movie.poster} alt={movie.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            )}
          </div>
          <div style={{ padding: "14px 16px 18px" }}>
            {abonnement.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <StampBadge>Abonné</StampBadge>
              </div>
            )}
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: COLORS.cream, lineHeight: 1 }}>
              {movie.title}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.muted, marginTop: 6 }}>
              {movie.year} · {movie.director}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {(movie.genres || []).map((g) => (
                <span
                  key={g}
                  style={{
                    padding: "4px 10px",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: COLORS.cream,
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 3,
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  border: `2px solid ${COLORS.red}`,
                  transform: "rotate(-6deg)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ color: COLORS.red, fontSize: 12 }}>★</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: COLORS.red, lineHeight: 1 }}>
                  {movie.letterboxdRating ?? movie.tmdbRating}
                </span>
              </div>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.muted }}>
                  {movie.letterboxdRating ? "LETTERBOXD" : "TMDB (Letterboxd indisponible)"}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: COLORS.cream }}>
                  {movie.letterboxdVotes
                    ? `${movie.letterboxdVotes.toLocaleString("fr-FR")} votes`
                    : `${movie.tmdbVotes} votes TMDB`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {movie.letterboxdUrl && (
          
            href={movie.letterboxdUrl}
            style={{
              display: "flex",
              marginTop: 16,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "12px 0",
              background: COLORS.surface,
              border: `1.5px solid ${COLORS.gold}`,
              borderRadius: 6,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              color: COLORS.gold,
              letterSpacing: 0.5,
            }}
          >
            <LetterboxdMark size={30} /> OUVRIR DANS LETTERBOXD
          </a>
        )}

        {movie.synopsis && (
          <div style={{ marginTop: 24 }}>
            <SectionTitle>Synopsis</SectionTitle>
            <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: 15, lineHeight: 1.6, color: COLORS.cream }}>
              {movie.synopsis}
            </p>
          </div>
        )}

        {movie.cast && movie.cast.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <SectionTitle>Casting principal</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {movie.cast.map((c) => (
                <div
                  key={c}
                  style={{
                    padding: "10px 12px",
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 6,
                    fontFamily: "'Source Serif 4', serif",
                    fontSize: 14,
                    color: COLORS.cream,
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <SectionTitle>Où regarder</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {abonnement.length > 0 && (
              <div style={{ padding: 12, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.gold, marginBottom: 8 }}>
                  MES ABONNEMENTS
                </div>
                {abonnement.map((p) => (
                  <div
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderTop: `1px solid ${COLORS.line}`,
                    }}
                  >
                    <PlatformBadge name={p} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.gold }}>
                      Voir →
                    </span>
                  </div>
                ))}
              </div>
            )}
            {vod.length > 0 && (
              <div style={{ padding: 12, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.muted, marginBottom: 8 }}>
                  VOD · PAYANT
                </div>
                {vod.map((p) => (
                  <div
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderTop: `1px solid ${COLORS.line}`,
                    }}
                  >
                    <PlatformBadge name={p} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.gold }}>
                      Voir →
                    </span>
                  </div>
                ))}
              </div>
            )}
            {abonnement.length === 0 && vod.length === 0 && (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.muted }}>
                Aucune offre trouvée en France pour le moment.
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <SectionTitle>Informations</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ padding: 12, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 6 }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: COLORS.muted }}>
                RÉALISATION
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: COLORS.cream, marginTop: 4 }}>
                {movie.director}
              </div>
            </div>
            <button
              onClick={() => setShowLinks((v) => !v)}
              style={{ padding: 12, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 6, textAlign: "left" }}
            >
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: COLORS.muted }}>
                NOTE TMDB · toucher
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: COLORS.cream, marginTop: 4 }}>
                {movie.tmdbRating}/10
              </div>
            </button>
          </div>
          {showLinks && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              
                href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 0",
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 6,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: COLORS.cream,
                }}
              >
                TMDB ↗
              </a>
              {movie.imdbId && (
                
                  href={`https://www.imdb.com/title/${movie.imdbId}/`}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "10px 0",
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 6,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: COLORS.cream,
                  }}
                >
                  IMDb ↗
                </a>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => onEdit(movie)}
          style={{
            width: "100%",
            marginTop: 24,
            padding: "12px 0",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 6,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: COLORS.muted,
            letterSpacing: 0.5,
          }}
        >
          MODIFIER CETTE FICHE
        </button>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 0",
              border: `1px solid ${COLORS.red}`,
              borderRadius: 6,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: COLORS.red,
              letterSpacing: 0.5,
            }}
          >
            SUPPRIMER CETTE FICHE
          </button>
        ) : (
          <div
            style={{
              marginTop: 10,
              padding: 14,
              border: `1px solid ${COLORS.red}`,
              borderRadius: 6,
            }}
          >
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.cream, marginBottom: 10 }}>
              Confirmer la suppression de « {movie.title} » ?
            </div>
            <input
              placeholder="Mot de passe"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 6,
                color: COLORS.cream,
                fontFamily: "'Source Serif 4', serif",
                fontSize: 14,
                padding: "10px 12px",
                width: "100%",
                marginBottom: 10,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword("");
                  setDeleteStatus(null);
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 6,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: COLORS.muted,
                }}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={!deletePassword || deleteStatus === "loading"}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: COLORS.red,
                  borderRadius: 6,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: COLORS.cream,
                  opacity: !deletePassword || deleteStatus === "loading" ? 0.5 : 1,
                }}
              >
                {deleteStatus === "loading" ? "Suppression..." : "Confirmer"}
              </button>
            </div>
            {deleteStatus === "success" && (
              <div style={{ marginTop: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.gold }}>
                Supprimé ! Retour à l'accueil...
              </div>
            )}
            {deleteStatus === "error" && (
              <div style={{ marginTop: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.red }}>
                Erreur : {deleteError}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.muted }}>
          Dernière vérification · {new Date(movie.lastChecked).toLocaleString("fr-FR")}
        </div>
      </div>
    </div>
  );
}

function HomeView({ movies, onOpen, loading, error, onAdd }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <Header />
      <div style={{ padding: "0 16px 40px" }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.gold, letterSpacing: 1 }}>
          GUICHET
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: COLORS.cream, marginTop: 4, lineHeight: 1.05 }}>
          Où regarder votre prochain film ?
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "16px 8px", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 6 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: COLORS.cream }}>{movies.length}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.muted }}>SUIVIS</div>
          </div>
        </div>

        <button
          onClick={onAdd}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "12px 0",
            border: `1px solid ${COLORS.gold}`,
            borderRadius: 6,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            color: COLORS.gold,
            letterSpacing: 0.5,
          }}
        >
          + AJOUTER UN FILM
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: COLORS.cream }}>Derniers films</div>
        </div>

        {loading && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.muted }}>
            Chargement des données...
          </div>
        )}
        {error && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.red }}>
            Erreur : {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {movies.map((m) => (
            <MovieCard key={m.tmdbId} movie={m} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AddView({ onCancel, editingMovie }) {
  const isEditing = Boolean(editingMovie);
  const [title, setTitle] = useState(editingMovie?.title || "");
  const [year, setYear] = useState(editingMovie ? String(editingMovie.year) : "");
  const [director, setDirector] = useState(editingMovie?.director || "");
  const [letterboxdUrl, setLetterboxdUrl] = useState(editingMovie?.letterboxdUrl || "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fieldStyle = {
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 6,
    color: COLORS.cream,
    fontFamily: "'Source Serif 4', serif",
    fontSize: 14,
    padding: "10px 12px",
    width: "100%",
  };

  const canSubmit = title && director && /^\d{4}$/.test(year) && password && status !== "loading";

  const submit = async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/add-movie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          year,
          director,
          letterboxdUrl,
          password,
          originalTitle: editingMovie?.title,
          originalYear: editingMovie?.year,
          originalTmdbId: editingMovie?.tmdbId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Erreur inconnue");
        return;
      }
      setStatus("success");
      setTitle("");
      setYear("");
      setDirector("");
      setLetterboxdUrl("");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <Header onBack={onCancel} />
      <div style={{ padding: "0 16px 60px" }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.gold, letterSpacing: 1 }}>
          COMMANDE
        </div>
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 30,
            color: COLORS.cream,
            margin: "4px 0 20px",
          }}
        >
          {isEditing ? "Modifier la fiche" : "Ajouter un film"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="Titre *" value={title} onChange={(e) => setTitle(e.target.value)} style={fieldStyle} />
          <input
            placeholder="Année * (ex. 1997)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={fieldStyle}
          />
          <input
            placeholder="Réalisateur *"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
            style={fieldStyle}
          />
          <input
            placeholder="Lien Letterboxd (optionnel)"
            value={letterboxdUrl}
            onChange={(e) => setLetterboxdUrl(e.target.value)}
            style={fieldStyle}
          />
          <input
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={fieldStyle}
          />
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            width: "100%",
            marginTop: 16,
            padding: "12px 0",
            background: COLORS.gold,
            borderRadius: 6,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            color: "#1A1206",
            letterSpacing: 0.5,
            opacity: canSubmit ? 1 : 0.5,
          }}
        >
          {status === "loading" ? "ENVOI EN COURS..." : isEditing ? "METTRE À JOUR" : "AJOUTER À LA LISTE"}
        </button>

        {status === "success" && (
          <div style={{ marginTop: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.gold }}>
            {isEditing
              ? "Fiche mise à jour ! Les changements seront visibles d'ici quelques minutes."
              : "Film ajouté ! Il apparaîtra sur l'accueil d'ici quelques minutes, le temps que les infos se récupèrent automatiquement."}
          </div>
        )}
        {status === "error" && (
          <div style={{ marginTop: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.red }}>
            Erreur : {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("home");
  const [editingMovie, setEditingMovie] = useState(null);

  useEffect(() => {
    fetch("/data/enriched.json")
      .then((res) => {
        if (!res.ok) throw new Error("fichier introuvable");
        return res.json();
      })
      .then((data) => {
        setMovies(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (view === "add") {
    return (
      <AddView
        editingMovie={editingMovie}
        onCancel={() => {
          setEditingMovie(null);
          setView("home");
        }}
      />
    );
  }

  return selected ? (
    <DetailView
      movie={selected}
      onBack={() => setSelected(null)}
      onEdit={(movie) => {
        setEditingMovie(movie);
        setSelected(null);
        setView("add");
      }}
      onDeleted={() => setSelected(null)}
    />
  ) : (
    <HomeView
      movies={movies}
      onOpen={setSelected}
      loading={loading}
      error={error}
      onAdd={() => {
        setEditingMovie(null);
        setView("add");
      }}
    />
  );
}
