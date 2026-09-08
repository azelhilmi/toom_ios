import { useState } from "react";
import InstallAppCard from "../components/UI/InstallAppCard";
import "./SettingsPage.css";
import BackToCameraButton from "../components/UI/BackToCameraButton";
import { resetOnboarding } from "../utils/onboarding";

export default function SettingsPage() {
  const [tutorialResetDone, setTutorialResetDone] = useState(false);

  return (
    <div className="settings-page page-enter watermark-bg">
      <header className="settings-page__header">
        <div>
          <img src="/brand/icon-round-small.webp" alt="" className="page-header-logo" />
          <h1>Réglages</h1>
          <p>Installation et aide.</p>
        </div>
        <BackToCameraButton />
      </header>

      <section className="settings-page__section">
        <h2>Installer l'application</h2>
        <InstallAppCard />
      </section>

      <section className="settings-page__section">
        <h2>Aide</h2>
        <p className="settings-page__hint">
          Le petit didacticiel montré au premier lancement (molette, viseur,
          flash, déclencheur) t'a échappé, ou tu veux juste le revoir ?
        </p>
        <button
          type="button"
          className="settings-page__upload-button"
          onClick={() => {
            resetOnboarding();
            setTutorialResetDone(true);
          }}
        >
          Revoir le didacticiel
        </button>
        {tutorialResetDone && (
          <p className="settings-page__hint">Il réapparaîtra à ta prochaine ouverture de l'appareil.</p>
        )}
      </section>
    </div>
  );
}
