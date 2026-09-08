import { useEffect, useRef, useState } from "react";
import { getPhotoBase64 } from "../../firebase/firestore";
import { extensionFromDataUrl } from "../../utils/imageCompression";
import { downloadImage, shareImage } from "../../utils/saveImage";
import "./Lightbox.css";

const SWIPE_THRESHOLD_PX = 50;

/**
 * @param {Array<{id: string, label: string}>} items - photos déjà révélées, dans l'ordre d'affichage
 * @param {number} index - index de la photo actuellement ouverte dans `items`
 * @param {(index: number) => void} onNavigate
 * @param {() => void} onClose
 * @param {(id: string) => Promise<void>} onDelete
 */
export default function Lightbox({ items, index, onNavigate, onClose, onDelete }) {
  const [url, setUrl] = useState(null);
  const [status, setStatus] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const dragState = useRef(null);
  const [dragX, setDragX] = useState(0);

  const current = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    getPhotoBase64(current.id).then((data) => {
      if (cancelled || !data) return;
      setUrl(data.startsWith("data:") ? data : `data:image/jpeg;base64,${data}`);
    });
    return () => {
      cancelled = true;
    };
  }, [current.id]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
      else if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, hasPrev, hasNext, onNavigate, onClose]);

  const filename = url ? `toom-${current.label}.${extensionFromDataUrl(url)}` : null;

  async function handleShare() {
    setStatus("En cours…");
    const result = await shareImage(url, filename);
    if (result === "unsupported") {
      downloadImage(url, filename);
      setStatus("Téléchargée (partage indisponible sur ce navigateur)");
    } else if (result === "shared") {
      setStatus("Partagée !");
    } else {
      setStatus(null);
    }
    setTimeout(() => setStatus(null), 2500);
  }

  function handleDownload() {
    downloadImage(url, filename);
    setStatus("Téléchargée !");
    setTimeout(() => setStatus(null), 2500);
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm("Supprimer définitivement cette photo ? Cette action est irréversible.")) return;
    setDeleting(true);
    await onDelete(current.id);
    setDeleting(false);
  }

  function handlePointerDown(e) {
    dragState.current = { startX: e.clientX, active: true };
  }
  function handlePointerMove(e) {
    if (!dragState.current?.active) return;
    setDragX(e.clientX - dragState.current.startX);
  }
  function handlePointerUp() {
    if (!dragState.current?.active) return;
    if (dragX <= -SWIPE_THRESHOLD_PX && hasNext) onNavigate(index + 1);
    else if (dragX >= SWIPE_THRESHOLD_PX && hasPrev) onNavigate(index - 1);
    dragState.current = null;
    setDragX(0);
  }

  return (
    <div className="lightbox" onClick={onClose}>
      <button type="button" className="lightbox__close" onClick={onClose} aria-label="Fermer">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path fill="currentColor" d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {items.length > 1 && (
        <p className="lightbox__counter">{index + 1} / {items.length}</p>
      )}

      <div
        className="lightbox__stage"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {hasPrev && (
          <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => onNavigate(index - 1)} aria-label="Photo précédente">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M15 4l-8 8 8 8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}

        {url ? (
          <img
            src={url}
            alt=""
            className="lightbox__img"
            style={{ transform: `translateX(${dragX}px)` }}
            draggable={false}
          />
        ) : (
          <p className="lightbox__loading">Chargement…</p>
        )}

        {hasNext && (
          <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => onNavigate(index + 1)} aria-label="Photo suivante">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M9 4l8 8-8 8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
      </div>

      <div className="lightbox__actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lightbox__button" onClick={handleDownload} disabled={!url}>
          Télécharger
        </button>
        <button type="button" className="lightbox__button lightbox__button--primary" onClick={handleShare} disabled={!url}>
          Partager
        </button>
        {onDelete && (
          <button type="button" className="lightbox__button lightbox__button--danger" onClick={handleDelete} disabled={deleting || !url}>
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
        )}
      </div>

      {status && <p className="lightbox__status">{status}</p>}
    </div>
  );
}
