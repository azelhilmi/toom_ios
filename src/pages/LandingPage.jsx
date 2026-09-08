import { useNavigate } from "react-router-dom";
import { markVisited } from "../utils/landing";
import "./LandingPage.css";

export default function LandingPage({ onEnter }) {
  const navigate = useNavigate();

  function enter() {
    markVisited();
    onEnter();
  }

  function goJoin() {
    markVisited();
    navigate("/join");
  }

  return (
    <div className="landing">
      <img src="/brand/icon-round.webp" alt="Toom" className="landing__logo" />
      <h1 className="landing__title">Toom</h1>
      <p className="landing__tagline">We'll see tomorrow</p>

      <p className="landing__hook">
        Un appareil photo jetable, mais numérique. Prends tes photos, et
        découvre-les seulement le lendemain à 10h — comme au bon vieux temps
        du labo photo.
      </p>

      <ul className="landing__points">
        <li>
          <span className="landing__point-icon">📸</span>
          Prends sans filtre ni retouche, sans revoir tes photos avant
        </li>
        <li>
          <span className="landing__point-icon">⏳</span>
          Toutes tes photos se révèlent d'un coup, le lendemain à 10h
        </li>
        <li>
          <span className="landing__point-icon">🎉</span>
          Organise une pellicule partagée pour un mariage, un EVG, une soirée…
        </li>
      </ul>

      <button type="button" className="landing__cta" onClick={enter}>
        Ouvrir l'appareil
      </button>
      <button type="button" className="landing__secondary" onClick={goJoin}>
        J'ai un code d'événement à rejoindre
      </button>
    </div>
  );
}
