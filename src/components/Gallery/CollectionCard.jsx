import { useEffect, useState } from "react";
import { getPhotoBase64 } from "../../firebase/firestore";
import "./CollectionCard.css";

function formatDayLabel(date) {
  const label = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function CollectionCard({ dayKey, photos, onOpen }) {
  // "La première" photo de la collection = la première prise ce jour-là.
  const coverPhoto = photos[photos.length - 1];
  const revealAtMs = coverPhoto.revealAt?.toMillis ? coverPhoto.revealAt.toMillis() : 0;
  const [now] = useState(() => Date.now());
  const isRevealed = now >= revealAtMs;
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (isRevealed) {
      getPhotoBase64(coverPhoto.id).then((data) => {
        if (!cancelled && data) {
          setUrl(data.startsWith("data:") ? data : `data:image/jpeg;base64,${data}`);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [isRevealed, coverPhoto.id]);

  const revealedCount = photos.filter((p) => {
    const ms = p.revealAt?.toMillis ? p.revealAt.toMillis() : 0;
    return now >= ms;
  }).length;

  const date = coverPhoto.takenAt?.toDate ? coverPhoto.takenAt.toDate() : new Date();

  return (
    <button type="button" className="collection-card" onClick={() => onOpen(dayKey)}>
      <div className="collection-card__stack">
        {photos.length > 2 && <span className="collection-card__slice collection-card__slice--3" />}
        {photos.length > 1 && <span className="collection-card__slice collection-card__slice--2" />}
        <div className="collection-card__cover">
          {isRevealed ? (
            url ? (
              <img src={url} alt="" className="collection-card__img" loading="lazy" />
            ) : (
              <div className="collection-card__loading" />
            )
          ) : (
            <div className="collection-card__lock">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 116 0v3H9z"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
      <p className="collection-card__label">{formatDayLabel(date)}</p>
      <p className="collection-card__count">
        {revealedCount}/{photos.length} photo{photos.length > 1 ? "s" : ""}
      </p>
    </button>
  );
}
