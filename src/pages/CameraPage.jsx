import { useCallback, useEffect, useState } from "react";
import CameraBody from "../components/Camera/CameraBody";
import { useAuth } from "../context/AuthContext";
import { getOrCreateActiveRoll, listenToRoll, takePhoto } from "../firebase/firestore";
import LoadingScreen from "../components/UI/LoadingScreen";

export default function CameraPage() {
  const { user, ready } = useAuth();
  const [rollId, setRollId] = useState(null);
  const [roll, setRoll] = useState(null);

  const loadActiveRoll = useCallback(() => {
    if (!user) return () => {};
    let unsub = () => {};
    getOrCreateActiveRoll(user.uid).then((id) => {
      setRollId(id);
      unsub = listenToRoll(id, setRoll);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!ready || !user) return;
    const cleanup = loadActiveRoll();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  if (!ready || !roll) {
    return <LoadingScreen message="Chargement de la pellicule…" />;
  }

  const isFull = roll.shotsUsed >= roll.shotsAllowed;
  const revealAtMs = roll.revealAt?.toMillis ? roll.revealAt.toMillis() : null;
  const isDeveloped = revealAtMs ? Date.now() >= revealAtMs : false;

  async function handleCapture(videoEl, flashUsed) {
    await takePhoto({
      cameraId: rollId,
      ownerId: user.uid,
      videoEl,
      flashUsed,
    });
  }

  return (
    <CameraBody
      shotsRemaining={roll.shotsAllowed - roll.shotsUsed}
      shotsAllowed={roll.shotsAllowed}
      onCapture={handleCapture}
      developingUntilMs={isFull && !isDeveloped ? revealAtMs : null}
      onReload={
        isFull && isDeveloped
          ? () => {
              setRoll(null);
              loadActiveRoll();
            }
          : null
      }
    />
  );
}
