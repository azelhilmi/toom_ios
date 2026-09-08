import { useEffect, useRef, useState } from "react";
import Viewfinder from "./Viewfinder";
import FilmWheel from "./FilmWheel";
import PoseCounter from "./PoseCounter";
import FlashButton from "./FlashButton";
import HamburgerMenu from "../UI/HamburgerMenu";
import GalleryShortcut from "../UI/GalleryShortcut";
import DevelopClock from "./DevelopClock";
import OnboardingTutorial from "./OnboardingTutorial";
import StatusBanner from "./StatusBanner";
import { hasSeenOnboarding } from "../../utils/onboarding";
import { useCameraStream } from "../../utils/useCameraStream";
import { requestAppFullscreen } from "../../utils/fullscreen";
import { hapticCapture } from "../../utils/haptics";
import { playShutter } from "../../utils/sounds";
import { useTheme } from "../../context/ThemeContext";
import { HOTSPOTS, PRESET_THEMES, hotspotStyle } from "../../utils/hotspots";
import "./CameraBody.css";

function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(
    () => window.matchMedia("(orientation: landscape)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const onChange = (e) => setIsLandscape(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isLandscape ? "landscape" : "portrait";
}

export default function CameraBody({
  shotsRemaining, shotsAllowed, onCapture, developingUntilMs = null, onReload = null,
  overrideSkin = undefined, overrideMaskColor = undefined, overridePresetId = undefined,
}) {
  const { videoRef, error, ready, torchSupported, applyTorch, retry } = useCameraStream();
  const themeCtx = useTheme();
  // Un événement peut imposer son propre thème (voir EventCameraPage) —
  // dans ce cas il prime sur le thème personnel de l'invité.
  const customSkin = overrideSkin !== undefined ? overrideSkin : themeCtx.customSkin;
  const maskColor = overrideMaskColor !== undefined ? overrideMaskColor : themeCtx.maskColor;
  const presetId = overridePresetId !== undefined ? overridePresetId : themeCtx.presetId;
  const orientation = useOrientation();
  const layout = HOTSPOTS[orientation];
  const preset = PRESET_THEMES[presetId] || PRESET_THEMES.default;
  const skinSrc = customSkin || preset[orientation];

  const [armed, setArmed] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [flashPulse, setFlashPulse] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());
  const fullscreenRequested = useRef(false);

  const outOfFilm = shotsRemaining <= 0;

  function tryEnterFullscreen() {
    if (fullscreenRequested.current) return;
    fullscreenRequested.current = true;
    requestAppFullscreen();
  }

  async function handleShutter() {
    tryEnterFullscreen();
    if (!armed || capturing || outOfFilm || !ready) return;
    setCapturing(true);

    let torchWasLit = false;
    if (flashOn) {
      torchWasLit = await applyTorch(true);
      setFlashPulse(true);
      setTimeout(() => setFlashPulse(false), 220);
      await new Promise((r) => setTimeout(r, torchWasLit ? 250 : 80));
    }

    try {
      hapticCapture();
      playShutter();
      await onCapture(videoRef.current, flashOn);
      setFeedback({ type: "success", text: "Cliché capturé. Rendez-vous demain pour le découvrir." });
    } catch (e) {
      setFeedback({ type: "error", text: "La prise de vue a échoué, réessaie." });
    } finally {
      if (torchWasLit) applyTorch(false);
      setArmed(false);
      setCapturing(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  return (
    <div className="camera-body" onPointerDownCapture={tryEnterFullscreen}>
      {/* Couche 1 : l'image du boîtier — préréglée ou personnalisée,
          étirée pour remplir exactement l'écran. Tous les thèmes ont
          désormais une vraie transparence aux fenêtres viseur/compteur,
          révélées PAR-DESSOUS (couche en dessous, z-index inférieur),
          pas superposées : évite l'effet de carré/bordure visible
          d'un fond opaque qui ne correspond jamais exactement au
          contour dessiné dans l'image. */}
      <img className="camera-body__skin" src={skinSrc} alt="" draggable={false} />

      {/* Sur une image personnalisée uniquement : le mécanisme (boutons,
          molette, grip) reste TOUJOURS visible avec son relief d'origine.
          Une couleur choisie s'applique par-dessus comme une teinte
          (mix-blend-mode: color) — elle colore sans jamais remplacer le
          dessin ni aplatir ses ombres/reflets. */}
      {customSkin && (
        <>
          <img className="camera-body__skin-relief" src={layout.mask} alt="" draggable={false} />
          {maskColor && maskColor !== "transparent" && (
            <div
              className="camera-body__skin-relief-tint"
              style={{
                backgroundColor: maskColor,
                WebkitMaskImage: `url(${layout.mask})`,
                maskImage: `url(${layout.mask})`,
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
              }}
            />
          )}
        </>
      )}

      {/* Couche 2 : viseur et compte-poses, par-dessus l'image, exactement
          à l'endroit où elle dessine leurs fenêtres. */}
      <div className="camera-body__viewfinder-slot" style={hotspotStyle(layout.viewfinder)}>
        <Viewfinder videoRef={videoRef} error={error} flashPulse={flashPulse} retry={retry} fill />
      </div>
      <div className="camera-body__pose-slot" style={hotspotStyle(layout.poseCounter)}>
        <PoseCounter remaining={Math.max(shotsRemaining, 0)} total={shotsAllowed} bare />
      </div>

      {/* Couche 3 : zones fonctionnelles transparentes, superposées
          exactement à l'endroit où l'image dessine chaque contrôle. */}
      <div className="camera-body__hotspot" style={hotspotStyle(layout.shutter)}>
        <button
          type="button"
          className="camera-body__shutter-hotspot"
          onClick={handleShutter}
          disabled={!armed || capturing || outOfFilm || !ready}
          aria-label="Déclencher"
        />
      </div>

      <div className="camera-body__hotspot" style={hotspotStyle(layout.flashButton)}>
        <FlashButton active={flashOn} torchSupported={torchSupported} onToggle={() => setFlashOn((v) => !v)} bare />
      </div>

      <div className="camera-body__hotspot" style={hotspotStyle(layout.filmWheel)}>
        <FilmWheel
          armed={armed}
          disabled={outOfFilm}
          onArmed={() => setArmed(true)}
          axis={layout.wheelAxis}
          hotspotSpec={layout.filmWheel}
          visualSpec={layout.filmWheelVisual}
          bare
        />
      </div>

      {developingUntilMs && (
        <div className="camera-body__hotspot camera-body__instructions" style={hotspotStyle(layout.instructionsZone)}>
          <DevelopClock targetMs={developingUntilMs} ready={!!onReload} onReload={onReload} />
        </div>
      )}

      <HamburgerMenu />
      <GalleryShortcut />

      {(outOfFilm || feedback || armed) && (
        <StatusBanner
          type={outOfFilm ? "film" : feedback ? feedback.type : "ready"}
          text={
            outOfFilm
              ? "Pellicule épuisée — regarde l'heure de développement ci-dessus."
              : feedback
              ? feedback.text
              : "Prêt ! Appuie sur le déclencheur."
          }
        />
      )}

      {showOnboarding && !developingUntilMs && (
        <OnboardingTutorial layout={layout} onDone={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
