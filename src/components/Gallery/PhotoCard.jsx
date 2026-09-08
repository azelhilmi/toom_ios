import { useEffect, useState } from "react";
import { getPhotoBase64 } from "../../firebase/firestore";
import { extensionFromDataUrl } from "../../utils/imageCompression";
import "./PhotoCard.css";

function formatRemaining(ms) {
  if (ms <= 0) return "Révélation imminente";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `Révélation dans ${h}h${String(m).padStart(2, "0")}`;
}

function formatDate(ms) {
  const d = new Date(ms);
  return `${d.toLocaleDateString("fr-FR")} - ${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function PhotoCard({ photo, index, now, forceReveal, onOpen }) {
  const revealAtMs = photo.revealAt?.toMillis ? photo.revealAt.toMillis() : 0;
  const takenAtMs = photo.takenAt?.toMillis ? photo.takenAt.toMillis() : Date.now();
  const isRevealed = forceReveal || now >= revealAtMs;
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (isRevealed && !url) {
      getPhotoBase64(photo.id).then((data) => {
        if (!cancelled && data) {
          // Ajouter le préfixe data URL si ce n'est pas déjà un data URL complet
          const urlWithPrefix = data.startsWith("data:") ? data : `data:image/jpeg;base64,${data}`;
          setUrl(urlWithPrefix);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [isRevealed, photo.id, url]);

  const filename = url ? `toom-${String(index + 1).padStart(2, "0")}.${extensionFromDataUrl(url)}` : null;

  return (
    <div className={`photo-card ${isRevealed ? "photo-card--revealed" : "photo-card--locked"}`}>
      <button
        type="button"
        className="photo-card__frame"
        onClick={() => url && onOpen?.({ url, filename, id: photo.id })}
        aria-disabled={!isRevealed || !url}
        aria-label={isRevealed ? "Agrandir la photo" : "Photo pas encore révélée"}
      >
        {isRevealed ? (
          url ? (
            <img src={url} alt="" className="photo-card__img" loading="lazy" />
          ) : (
            <div className="photo-card__loading">Chargement…</div>
          )
        ) : (
          <div className="photo-card__lock">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 116 0v3H9z"
              />
            </svg>
            <span>{formatRemaining(revealAtMs - now)}</span>
          </div>
        )}
      </button>
      <div className="photo-card__caption">
        <span className="photo-card__number">{String(index + 1).padStart(2, "0")}</span>
        <span className="photo-card__meta">
          {photo.guestName ? `${photo.guestName} · ` : ""}
          {isRevealed ? formatDate(takenAtMs) : ""}
        </span>
      </div>
    </div>
  );
}
