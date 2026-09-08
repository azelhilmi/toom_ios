import { useState } from "react";
import { useInstallPrompt } from "../../utils/installPrompt";
import "./InstallAppCard.css";

export default function InstallAppCard() {
  const { isStandalone, isIOS, canInstallNative, promptInstall } = useInstallPrompt();
  const [status, setStatus] = useState(null);

  if (isStandalone) {
    return (
      <div className="install-app-card install-app-card--done">
        ✓ L'application est déjà installée sur cet appareil.
      </div>
    );
  }

  async function handleInstall() {
    const outcome = await promptInstall();
    if (outcome === "accepted") setStatus("Installée !");
    else if (outcome === "dismissed") setStatus(null);
  }

  if (canInstallNative) {
    return (
      <div className="install-app-card">
        <p className="install-app-card__text">
          Installe Toom sur ton écran d'accueil pour un accès direct, en plein écran, sans barre de navigateur.
        </p>
        <button type="button" className="install-app-card__button" onClick={handleInstall}>
          Installer l'application
        </button>
        {status && <p className="install-app-card__status">{status}</p>}
      </div>
    );
  }

  if (isIOS) {
    return (
      <div className="install-app-card">
        <p className="install-app-card__text">
          Safari ne propose pas d'installation automatique — trois étapes suffisent :
        </p>
        <ol className="install-app-card__steps">
          <li>
            <span className="install-app-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 2l4 4h-3v9h-2V6H8l4-4zM5 11h2v9h10v-9h2v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9z"
                />
              </svg>
            </span>
            Appuie sur le bouton <strong>Partager</strong> en bas de Safari
          </li>
          <li>
            <span className="install-app-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 2a1 1 0 011 1v8h1a1 1 0 010 2h-1v8a1 1 0 01-2 0v-8H9a1 1 0 010-2h2V3a1 1 0 011-1z"
                />
              </svg>
            </span>
            Sélectionne <strong>"Sur l'écran d'accueil"</strong>
          </li>
          <li>Confirme en appuyant sur <strong>"Ajouter"</strong></li>
        </ol>
      </div>
    );
  }

  // Navigateur sans API d'installation connue (ex. Firefox mobile) : pas
  // de bouton trompeur, on n'affiche rien plutôt qu'une fausse promesse.
  return null;
}
