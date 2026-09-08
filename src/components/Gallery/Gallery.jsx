import { useEffect, useRef, useState } from "react";
import PhotoCard from "./PhotoCard";
import Lightbox from "./Lightbox";
import { deletePhoto } from "../../firebase/firestore";
import "./Gallery.css";

const EASTER_EGG_CLICKS = 10;
const EASTER_EGG_WINDOW_MS = 5000;

export default function Gallery({ photos }) {
  const [now, setNow] = useState(Date.now());
  const [cheatMode, setCheatMode] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);
  const clickTimestamps = useRef([]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  function handleSecretClick() {
    const t = Date.now();
    clickTimestamps.current = [...clickTimestamps.current, t].filter(
      (ts) => t - ts <= EASTER_EGG_WINDOW_MS
    );
    if (clickTimestamps.current.length >= EASTER_EGG_CLICKS) {
      setCheatMode(true);
      clickTimestamps.current = [];
    }
  }

  // Liste des photos réellement révélées, dans l'ordre d'affichage —
  // sert à naviguer d'une photo ouverte à l'autre (swipe/flèches) sans
  // jamais s'arrêter sur une photo encore verrouillée.
  const revealedItems = photos
    .map((photo, i) => ({ photo, label: String(photos.length - i).padStart(2, "0") }))
    .filter(({ photo }) => {
      const revealAtMs = photo.revealAt?.toMillis ? photo.revealAt.toMillis() : 0;
      return cheatMode || now >= revealAtMs;
    })
    .map(({ photo, label }) => ({ id: photo.id, label }));

  function handleOpen(photoId) {
    const idx = revealedItems.findIndex((item) => item.id === photoId);
    if (idx !== -1) setOpenIndex(idx);
  }

  async function handleDelete(photoId) {
    await deletePhoto(photoId);
    // La liste va se raccourcir au prochain rendu (le parent écoute les
    // photos en temps réel) — on ferme simplement la visionneuse plutôt
    // que de jongler avec un index qui va devenir invalide.
    setOpenIndex(null);
  }

  if (photos.length === 0) {
    return (
      <div className="gallery gallery--empty" onClick={handleSecretClick}>
        <p>Aucune photo pour l'instant. Ta première pellicule attend d'être développée.</p>
      </div>
    );
  }

  return (
    <div className="gallery">
      {cheatMode && (
        <p className="gallery__cheat-banner">
          🥚 Easter egg activé : toutes les photos sont révélées avant l'heure, rien que pour toi.
        </p>
      )}
      <div className="gallery__grid" onClick={handleSecretClick}>
        {photos.map((photo, i) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            index={photos.length - 1 - i}
            now={now}
            forceReveal={cheatMode}
            onOpen={(item) => handleOpen(item.id)}
          />
        ))}
      </div>

      {openIndex !== null && revealedItems[openIndex] && (
        <Lightbox
          items={revealedItems}
          index={openIndex}
          onNavigate={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
