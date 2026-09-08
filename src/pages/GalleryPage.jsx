import { useEffect, useMemo, useState } from "react";
import Gallery from "../components/Gallery/Gallery";
import CollectionCard from "../components/Gallery/CollectionCard";
import { useAuth } from "../context/AuthContext";
import { listenToPhotos } from "../firebase/firestore";
import { downloadPhotosAsZip } from "../utils/downloadAlbum";
import "./GalleryPage.css";
import LoadingScreen from "../components/UI/LoadingScreen";
import BackToCameraButton from "../components/UI/BackToCameraButton";

function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function GalleryPage() {
  const { user, ready } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [exporting, setExporting] = useState(null);
  const [openDay, setOpenDay] = useState(null);

  useEffect(() => {
    if (!ready || !user) return;
    const unsub = listenToPhotos(user.uid, setPhotos);
    return unsub;
  }, [ready, user]);

  const collections = useMemo(() => {
    const map = new Map();
    for (const photo of photos) {
      const d = photo.takenAt?.toDate ? photo.takenAt.toDate() : new Date();
      const key = localDayKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(photo);
    }
    return Array.from(map.entries());
  }, [photos]);

  if (!ready) return <LoadingScreen />;

  const revealedPhotos = photos.filter((p) => {
    const revealAtMs = p.revealAt?.toMillis ? p.revealAt.toMillis() : 0;
    return Date.now() >= revealAtMs;
  });

  async function handleExportAll() {
    setExporting({ done: 0, total: revealedPhotos.length });
    await downloadPhotosAsZip(revealedPhotos, "toom-photos.zip", (done, total) => setExporting({ done, total }));
    setExporting(null);
  }

  const openCollection = openDay ? collections.find(([key]) => key === openDay) : null;

  return (
    <div className="gallery-page page-enter watermark-bg">
      <header className="gallery-page__header">
        <div>
          <img src="/brand/icon-round-small.webp" alt="" className="page-header-logo" />
          <h1>Labo Photo</h1>
          <p>{openCollection ? "Retour aux collections" : "Vos souvenirs, développés."}</p>
        </div>
        <BackToCameraButton />
      </header>

      {openCollection ? (
        <>
          <button type="button" className="gallery-page__back-to-collections" onClick={() => setOpenDay(null)}>
            ← Toutes les collections
          </button>
          <Gallery photos={openCollection[1]} />
        </>
      ) : (
        <>
          {photos.length > 0 && (
            <div className="gallery-page__toolbar">
              <p className="gallery-page__stats">
                {photos.length} photo{photos.length > 1 ? "s" : ""} · {revealedPhotos.length} développée
                {revealedPhotos.length > 1 ? "s" : ""}
              </p>
              {revealedPhotos.length > 0 && (
                <button type="button" className="gallery-page__export" onClick={handleExportAll} disabled={!!exporting}>
                  {exporting ? `Export… ${exporting.done}/${exporting.total}` : "Télécharger tout"}
                </button>
              )}
            </div>
          )}

          {collections.length === 0 ? (
            <div className="gallery gallery--empty">
              <p>Aucune photo pour l'instant. Ta première pellicule attend d'être développée.</p>
            </div>
          ) : (
            <div className="gallery-page__collections">
              {collections.map(([key, dayPhotos]) => (
                <CollectionCard key={key} dayKey={key} photos={dayPhotos} onOpen={setOpenDay} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
