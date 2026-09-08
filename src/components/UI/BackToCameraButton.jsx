import { Link } from "react-router-dom";
import "./BackToCameraButton.css";

export default function BackToCameraButton() {
  return (
    <Link to="/" className="back-to-camera" aria-label="Retour à l'appareil">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M15 4l-8 8 8 8" />
      </svg>
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" className="back-to-camera__cam">
        <path fill="currentColor" d="M4 8a2 2 0 012-2h1.2l.9-1.3A2 2 0 019.7 4h4.6a2 2 0 011.6.8L16.8 6H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8zm8 2.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
      </svg>
    </Link>
  );
}
