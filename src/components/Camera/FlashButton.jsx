import { hapticTick } from "../../utils/haptics";
import "./FlashButton.css";

export default function FlashButton({ active, onToggle, torchSupported }) {
  function handleClick() {
    hapticTick();
    onToggle();
  }

  return (
    <button
      type="button"
      className={`flash-hotspot ${active ? "flash-hotspot--on" : ""}`}
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? "Désactiver le flash" : "Activer le flash"}
      title={torchSupported ? "Flash réel disponible sur cet appareil" : "Flash à l'écran"}
    >
      <svg viewBox="0 0 24 24" className="flash-hotspot__icon" aria-hidden="true">
        <path fill="currentColor" d="M11 2L3 14h6l-1 8 9-13h-6l1-7z" />
      </svg>
    </button>
  );
}
