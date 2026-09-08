import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listenMyEvents } from "../firebase/firestore";
import "./EventHubPage.css";
import BackToCameraButton from "../components/UI/BackToCameraButton";

export default function EventHubPage() {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    return listenMyEvents(user.uid, setMyEvents);
  }, [user?.uid]);

  return (
    <div className="event-hub page-enter watermark-bg">
      <img src="/brand/icon-round.webp" alt="" className="event-hub__logo" />
      <h1>Événement</h1>
      <p>Organise une pellicule partagée pour un mariage, un anniversaire, une soirée…</p>

      <Link to="/event/new" className="event-hub__card">
        <span className="event-hub__card-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M12 4a1 1 0 011 1v6h6a1 1 0 010 2h-6v6a1 1 0 01-2 0v-6H5a1 1 0 010-2h6V5a1 1 0 011-1z" />
          </svg>
        </span>
        <span>
          <span className="event-hub__card-title">Créer un événement</span>
          <span className="event-hub__card-desc">Invite des proches et centralise leurs photos</span>
        </span>
      </Link>

      <Link to="/join" className="event-hub__card">
        <span className="event-hub__card-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M10 17l5-5-5-5v10zM4 3h2v18H4V3z" />
          </svg>
        </span>
        <span>
          <span className="event-hub__card-title">Rejoindre un événement</span>
          <span className="event-hub__card-desc">Avec un code ou un lien d'invitation</span>
        </span>
      </Link>

      {myEvents.length > 0 && (
        <div className="event-hub__mine">
          <p className="event-hub__mine-title">Mes événements</p>
          {myEvents.map((e) => (
            <Link key={e.id} to={`/event/${e.id}`} className="event-hub__mine-link">
              <span>{e.name}</span>
              <span>Tableau de bord →</span>
            </Link>
          ))}
        </div>
      )}

      <BackToCameraButton />
    </div>
  );
}
