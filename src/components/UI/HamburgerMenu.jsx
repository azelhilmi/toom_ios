import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listenMyEvents } from "../../firebase/firestore";
import "./HamburgerMenu.css";

const LINKS = [
  {
    to: "/event",
    label: "Événement",
    desc: "Créer ou rejoindre une pellicule partagée",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="currentColor" d="M7 2v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2V2h-2v2H9V2H7zM5 9h14v11H5V9zm7 2l1.2 2.4 2.6.4-1.9 1.9.5 2.6L12 17l-2.4 1.3.5-2.6-1.9-1.9 2.6-.4L12 11z" />
      </svg>
    ),
  },
  {
    to: "/gallery",
    label: "Galerie",
    desc: "Retrouver tes photos développées",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="currentColor" d="M4 5a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2H4zm0 2h16v10H4V7zm3 1.5A1.5 1.5 0 108.5 10 1.5 1.5 0 007 8.5zM6 16l3.5-4.5 2.5 3L15 10l3 6H6z" />
      </svg>
    ),
  },
  {
    to: "/themes",
    label: "Thèmes",
    desc: "Choisir l'habillage de l'appareil",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="currentColor" d="M12 2a10 10 0 100 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.1 5.1 0 0022 10.5C22 5.8 17.5 2 12 2zM6.5 12a1.5 1.5 0 111.5-1.5A1.5 1.5 0 016.5 12zm3-4A1.5 1.5 0 119.5 6.5 1.5 1.5 0 019.5 8zm5 0a1.5 1.5 0 111.5-1.5A1.5 1.5 0 0114.5 8zm3 4a1.5 1.5 0 111.5-1.5 1.5 1.5 0 01-1.5 1.5z" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Réglages",
    desc: "Installation et aide",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="currentColor" d="M19.4 13a7.4 7.4 0 000-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 00-1.7-1L15 3h-6l-.3 2.5a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.4L4.6 11a7.4 7.4 0 000 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 001.7 1L9 21h6l.3-2.5a7.6 7.6 0 001.7-1l2.4 1 2-3.4L19.4 13zM12 15.5A3.5 3.5 0 1115.5 12 3.5 3.5 0 0112 15.5z" />
      </svg>
    ),
  },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState([]);
  const closeButtonRef = useRef(null);
  const triggerButtonRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    return listenMyEvents(user.uid, setMyEvents);
  }, [user?.uid]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      triggerButtonRef.current?.focus();
    };
  }, [open]);

  return (
    <div className="hamburger-menu">
      <button
        type="button"
        ref={triggerButtonRef}
        className={`hamburger-menu__button ${open ? "hamburger-menu__button--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
      >
        <span />
        <span />
        <span />
      </button>

      {open && (
        <div
          className="hamburger-modal"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
        >
          <div className="hamburger-modal__sheet" onClick={(e) => e.stopPropagation()}>
            <div className="hamburger-modal__header">
              <img src="/brand/icon-round.webp" alt="Toom" className="hamburger-modal__logo" />
              <button
                type="button"
                ref={closeButtonRef}
                className="hamburger-modal__close"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <nav className="hamburger-modal__links">
              {LINKS.map((link) => (
                <Link key={link.to} to={link.to} className="hamburger-modal__link" onClick={() => setOpen(false)}>
                  <span className="hamburger-modal__link-icon">{link.icon}</span>
                  <span className="hamburger-modal__link-text">
                    <span className="hamburger-modal__link-label">{link.label}</span>
                    <span className="hamburger-modal__link-desc">{link.desc}</span>
                  </span>
                </Link>
              ))}

              {myEvents.length > 0 && (
                <>
                  <p className="hamburger-modal__section-title">Mes événements</p>
                  {myEvents.map((e) => (
                    <Link
                      key={e.id}
                      to={`/event/${e.id}`}
                      className="hamburger-modal__link hamburger-modal__link--compact"
                      onClick={() => setOpen(false)}
                    >
                      <span className="hamburger-modal__link-icon hamburger-modal__link-icon--small">
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                          <path fill="currentColor" d="M4 5a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2H4zm0 2h16v10H4V7zm3 1.5A1.5 1.5 0 108.5 10 1.5 1.5 0 007 8.5zM6 16l3.5-4.5 2.5 3L15 10l3 6H6z" />
                        </svg>
                      </span>
                      <span className="hamburger-modal__link-text">
                        <span className="hamburger-modal__link-label">{e.name}</span>
                        <span className="hamburger-modal__link-desc">Tableau de bord organisateur</span>
                      </span>
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
