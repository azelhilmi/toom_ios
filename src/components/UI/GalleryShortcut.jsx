import { Link } from "react-router-dom";
import "./GalleryShortcut.css";

export default function GalleryShortcut() {
  return (
    <Link to="/gallery" className="gallery-shortcut" aria-label="Voir la galerie">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M4 5a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2H4zm0 2h16v10H4V7zm3 1.5A1.5 1.5 0 108.5 10 1.5 1.5 0 007 8.5zM6 16l3.5-4.5 2.5 3L15 10l3 6H6z" />
      </svg>
    </Link>
  );
}
