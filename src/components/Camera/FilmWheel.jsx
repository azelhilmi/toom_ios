import { useRef, useState } from "react";
import { hapticTick, hapticConfirm } from "../../utils/haptics";
import { playWheelTick, playWheelArmed } from "../../utils/sounds";
import { relativeHotspotStyle } from "../../utils/hotspots";
import "./FilmWheel.css";

// Distance cumulée (en pixels) de glissé nécessaire pour armer l'appareil.
const DRAG_DISTANCE_NEEDED = 140;
// Nombre de "crans" haptiques/sonores ressentis pendant le glissé complet.
const NOTCH_COUNT = 5;

export default function FilmWheel({ armed, disabled, onArmed, axis = "horizontal", hotspotSpec, visualSpec }) {
  const [progress, setProgress] = useState(0); // 0 → 1
  // Décalage continu (en px, jamais remis à zéro sauf à l'armement) qui
  // pilote le motif de crantage visuel — donne l'impression que la
  // molette tourne réellement sous le doigt, indépendamment du seuil
  // d'armement.
  const [rollOffset, setRollOffset] = useState(0);
  const dragState = useRef(null);
  const lastNotch = useRef(0);

  function handlePointerDown(e) {
    if (disabled || armed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { last: axis === "horizontal" ? e.clientX : e.clientY };
    lastNotch.current = 0;
  }

  function handlePointerMove(e) {
    if (!dragState.current || disabled || armed) return;
    const current = axis === "horizontal" ? e.clientX : e.clientY;
    const delta = current - dragState.current.last;
    dragState.current.last = current;
    if (delta <= 0) return; // seul le glissé dans le sens attendu (droite ou bas) compte

    setRollOffset((o) => o + delta);

    setProgress((p) => {
      const next = p + delta / DRAG_DISTANCE_NEEDED;
      if (next >= 1) {
        hapticConfirm();
        playWheelArmed();
        onArmed();
        return 0;
      }
      const notch = Math.floor(next * NOTCH_COUNT);
      if (notch > lastNotch.current) {
        lastNotch.current = notch;
        hapticTick();
        playWheelTick();
      }
      return next;
    });
  }

  function handlePointerUp(e) {
    if (dragState.current) e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragState.current = null;
  }

  return (
    <div
      className={`film-wheel-hotspot ${armed ? "film-wheel-hotspot--armed" : ""} film-wheel-hotspot--${axis}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={armed ? 100 : Math.round(progress * 100)}
      aria-label={armed ? "Film remonté" : `Glisse pour remonter le film`}
      style={{ "--wheel-progress": progress, "--wheel-roll": `${rollOffset}px` }}
    >
      <div
        className="film-wheel-hotspot__ridges"
        aria-hidden="true"
        style={hotspotSpec && visualSpec ? relativeHotspotStyle(hotspotSpec, visualSpec) : undefined}
      />
    </div>
  );
}
