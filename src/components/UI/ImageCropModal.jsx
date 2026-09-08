import { useRef, useState, useEffect } from "react";
import "./ImageCropModal.css";

// Dimensions logiques de sortie (indépendantes de l'écran) — l'image
// finale sera étirée de toute façon selon l'orientation réelle du
// téléphone (voir CameraBody), donc ce ratio n'a pas besoin d'être
// parfaitement exact, juste raisonnable pour cadrer confortablement.
const OUTPUT_W = 900;
const OUTPUT_H = 1200;

export default function ImageCropModal({ file, onConfirm, onCancel }) {
  const [imgEl, setImgEl] = useState(null);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // en pixels écran (espace du viewport)
  const viewportRef = useRef(null);
  const dragState = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Échelle "logique" qui fait couvrir le cadre de sortie par l'image,
  // compte tenu de la rotation courante (dimensions inversées à 90°/270°).
  function baseScale() {
    if (!imgEl) return 1;
    const rotated = rotation % 180 !== 0;
    const iw = rotated ? imgEl.height : imgEl.width;
    const ih = rotated ? imgEl.width : imgEl.height;
    return Math.max(OUTPUT_W / iw, OUTPUT_H / ih);
  }

  function viewportWidth() {
    return viewportRef.current?.clientWidth || OUTPUT_W;
  }

  function handlePointerDown(e) {
    dragState.current = { startX: e.clientX, startY: e.clientY, pan: { ...pan } };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan({ x: dragState.current.pan.x + dx, y: dragState.current.pan.y + dy });
  }

  function handlePointerUp(e) {
    dragState.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  function rotateLeft() {
    setRotation((r) => (r + 270) % 360);
    setPan({ x: 0, y: 0 });
  }
  function rotateRight() {
    setRotation((r) => (r + 90) % 360);
    setPan({ x: 0, y: 0 });
  }

  // Échelle d'affichage à l'écran = échelle logique convertie dans
  // l'espace pixels du viewport (qui peut être plus petit que OUTPUT_W).
  const displayScale = baseScale() * zoom * (viewportWidth() / OUTPUT_W);

  function handleConfirm() {
    // Conversion du pan écran → unités logiques de sortie.
    const toLogical = OUTPUT_W / viewportWidth();
    const panLogical = { x: pan.x * toLogical, y: pan.y * toLogical };

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.translate(OUTPUT_W / 2 + panLogical.x, OUTPUT_H / 2 + panLogical.y);
    ctx.rotate((rotation * Math.PI) / 180);
    const scale = baseScale() * zoom;
    ctx.scale(scale, scale);
    ctx.drawImage(imgEl, -imgEl.width / 2, -imgEl.height / 2);
    ctx.restore();
    canvas.toBlob((blob) => onConfirm(blob), "image/webp", 0.85);
  }

  return (
    <div className="image-crop-modal">
      <div className="image-crop-modal__panel">
        <p className="image-crop-modal__title">Ajuster ton image</p>
        <p className="image-crop-modal__hint">Glisse pour repositionner, utilise le curseur pour zoomer.</p>

        <div
          ref={viewportRef}
          className="image-crop-modal__viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {imgEl && (
            <img
              src={imgEl.src}
              alt=""
              draggable={false}
              className="image-crop-modal__image"
              style={{
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${displayScale})`,
              }}
            />
          )}
        </div>

        <div className="image-crop-modal__controls">
          <button type="button" className="image-crop-modal__icon-btn" onClick={rotateLeft} aria-label="Rotation à gauche">
            ↺
          </button>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="image-crop-modal__zoom"
          />
          <button type="button" className="image-crop-modal__icon-btn" onClick={rotateRight} aria-label="Rotation à droite">
            ↻
          </button>
        </div>

        <div className="image-crop-modal__actions">
          <button type="button" className="image-crop-modal__cancel" onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className="image-crop-modal__confirm" onClick={handleConfirm} disabled={!imgEl}>
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
