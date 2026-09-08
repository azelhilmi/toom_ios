import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ouvre le flux de la caméra arrière (mobile) ou par défaut (desktop)
 * et l'attache à un <video> ref. Retourne aussi une erreur lisible si
 * l'utilisateur refuse l'accès ou si aucun périphérique n'est trouvé.
 *
 * Détecte aussi si le vrai flash matériel (torche) est pilotable via
 * MediaStreamTrack.applyConstraints({ advanced: [{ torch }] }) — supporté
 * sur Chrome/Android depuis longtemps, et sur Safari iOS depuis les
 * versions récentes (17.4+ environ). Sur les appareils/navigateurs qui ne
 * le supportent pas, applyTorch() ne fait simplement rien (silencieux) :
 * l'appelant doit prévoir un repli visuel (voir CameraBody / Viewfinder).
 */
export function useCameraStream() {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stream;
    let cancelled = false;

    async function start() {
      setError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        try {
          const capabilities = track.getCapabilities?.();
          setTorchSupported(!!capabilities?.torch);
        } catch {
          setTorchSupported(false);
        }
      } catch (err) {
        setError(
          err.name === "NotAllowedError"
            ? "Accès à la caméra refusé. Autorise-le dans les réglages du navigateur, puis réessaie."
            : "Impossible d'accéder à la caméra sur cet appareil."
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setReady(false);
    setAttempt((n) => n + 1);
  }, []);

  const applyTorch = useCallback((enabled) => {
    const track = trackRef.current;
    if (!track || !track.getCapabilities?.()?.torch) return Promise.resolve(false);
    return track
      .applyConstraints({ advanced: [{ torch: enabled }] })
      .then(() => true)
      .catch(() => false);
  }, []);

  return { videoRef, error, ready, torchSupported, applyTorch, retry };
}
