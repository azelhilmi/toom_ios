import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PhotoCard from "../components/Gallery/PhotoCard";
import Lightbox from "../components/Gallery/Lightbox";
import {
  listenEventGuests, listenEventPhotos, getEvent, updateEvent,
  syncGuestShotsAllowed, resetGuestRoll, saveEventTheme, saveEventThemePreset, clearEventTheme,
  deletePhoto, deleteEvent, getThemeBackground,
} from "../firebase/firestore";
import { blobToBase64 } from "../utils/imageCompression";
import { PRESET_THEMES } from "../utils/hotspots";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { downloadPhotosAsZip } from "../utils/downloadAlbum";
import ImageCropModal from "../components/UI/ImageCropModal";
import "./EventDashboardPage.css";
import "../styles/eventThemeForm.css";
import LoadingScreen from "../components/UI/LoadingScreen";
import BackToCameraButton from "../components/UI/BackToCameraButton";

const DEFAULT_MASK_COLOR = "#8a8a8a";

function toDatetimeLocalValue(timestamp) {
  if (!timestamp?.toDate) return "";
  const d = timestamp.toDate();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventDashboardPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { myThemes } = useTheme();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [openItems, setOpenItems] = useState(null);
  const [openIndex, setOpenIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [busyGuestId, setBusyGuestId] = useState(null);
  const [zipProgress, setZipProgress] = useState(null);

  // Thème imposé aux invités — 3 sources possibles.
  const [themeTab, setThemeTab] = useState("preset"); // "preset" | "mine" | "upload"
  const [applyingThemeId, setApplyingThemeId] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [maskColor, setMaskColor] = useState(DEFAULT_MASK_COLOR);
  const [transparent, setTransparent] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsub1 = listenEventGuests(eventId, setGuests);
    const unsub2 = listenEventPhotos(eventId, setPhotos);
    const id = setInterval(() => setNow(Date.now()), 30_000);
    getEvent(eventId).then((e) => {
      setEvent(e);
      setForm({
        shotsPerGuest: e.shotsPerGuest,
        revealDate: toDatetimeLocalValue(e.revealAt),
      });
    });
    return () => {
      unsub1();
      unsub2();
      clearInterval(id);
    };
  }, [eventId]);

  const photosByGuest = guests.map((guest) => ({
    guest,
    photos: photos.filter((p) => p.ownerId === guest.id),
  }));

  const revealedPhotos = photos.filter((p) => {
    const t = p.revealAt?.toMillis ? p.revealAt.toMillis() : Infinity;
    return now >= t;
  });

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSaving(true);
    await updateEvent(eventId, {
      shotsPerGuest: Number(form.shotsPerGuest),
      revealDate: form.revealDate,
    });
    if (applyToExisting) {
      await syncGuestShotsAllowed(eventId, Number(form.shotsPerGuest));
    }
    const refreshed = await getEvent(eventId);
    setEvent(refreshed);
    setSaving(false);
    setSettingsOpen(false);
  }

  async function handleResetGuest(guest) {
    const guestPhotoCount = photos.filter((p) => p.ownerId === guest.id).length;
    if (guestPhotoCount === 0) return;
    const confirmed = window.confirm(
      `Supprimer les ${guestPhotoCount} photo(s) de ${guest.name} et remettre sa pellicule à zéro ? Cette action est irréversible.`
    );
    if (!confirmed) return;
    setBusyGuestId(guest.id);
    await resetGuestRoll(eventId, guest.id);
    setBusyGuestId(null);
  }

  function handleThemeFileSelected(e) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
  }

  async function handleApplyPreset(presetKey) {
    setSavingTheme(true);
    await saveEventThemePreset(eventId, presetKey);
    const refreshed = await getEvent(eventId);
    setEvent(refreshed);
    setSavingTheme(false);
  }

  async function handleApplyMyTheme(theme) {
    setApplyingThemeId(theme.id);
    try {
      // On duplique le fond dans l'événement (les invités n'ont pas accès
      // à la bibliothèque personnelle de l'organisateur) — même stockage
      // qu'un nouvel upload, juste sans repasser par le recadrage.
      const background = await getThemeBackground(user.uid, theme.id, theme.chunkCount);
      await saveEventTheme(eventId, { maskColor: theme.maskColor, backgroundBase64: background });
      const refreshed = await getEvent(eventId);
      setEvent(refreshed);
    } finally {
      setApplyingThemeId(null);
    }
  }

  async function handleSaveTheme() {
    if (!croppedBlob) return;
    setSavingTheme(true);
    const optimized = await blobToBase64(croppedBlob);
    await saveEventTheme(eventId, {
      maskColor: transparent ? "transparent" : maskColor,
      backgroundBase64: optimized,
    });
    const refreshed = await getEvent(eventId);
    setEvent(refreshed);
    setCroppedBlob(null);
    setSavingTheme(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleClearTheme() {
    if (!window.confirm("Retirer l'habillage imposé ? Les invités reverront leur thème personnel.")) return;
    await clearEventTheme(eventId);
    const refreshed = await getEvent(eventId);
    setEvent(refreshed);
  }

  async function handleDownloadGuestAlbum(guest) {
    const guestRevealed = revealedPhotos.filter((p) => p.ownerId === guest.id);
    if (guestRevealed.length === 0) return;
    setZipProgress({ label: guest.name, done: 0, total: guestRevealed.length });
    await downloadPhotosAsZip(
      guestRevealed,
      `${event.name.replace(/\s+/g, "-")}-${guest.name}.zip`,
      (done, total) => setZipProgress({ label: guest.name, done, total })
    );
    setZipProgress(null);
  }

  async function handleDownloadFullAlbum() {
    if (revealedPhotos.length === 0) return;
    setZipProgress({ label: "album complet", done: 0, total: revealedPhotos.length });
    await downloadPhotosAsZip(
      revealedPhotos,
      `${event.name.replace(/\s+/g, "-")}-album-complet.zip`,
      (done, total) => setZipProgress({ label: "album complet", done, total })
    );
    setZipProgress(null);
  }

  async function handleDeleteEvent() {
    const confirmed = window.confirm(
      `Supprimer définitivement "${event.name}" ainsi que toutes les photos et pellicules des invités ? Cette action est irréversible.`
    );
    if (!confirmed) return;
    await deleteEvent(eventId);
    navigate("/event");
  }

  if (!event || !form) return <LoadingScreen />;

  return (
    <div className="event-dashboard watermark-bg">
      <BackToCameraButton />
      <header className="event-dashboard__header">
        <div>
          <img src="/brand/icon-round-small.webp" alt="" className="page-header-logo" />
          <h2>{event.name}</h2>
          <p className="event-dashboard__subtitle">
            {photos.length} photo{photos.length > 1 ? "s" : ""} · {guests.length} invité{guests.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="event-dashboard__header-actions">
          <button type="button" className="event-dashboard__btn" onClick={() => setSettingsOpen((v) => !v)}>
            Réglages
          </button>
          <button
            type="button"
            className="event-dashboard__btn event-dashboard__btn--primary"
            onClick={handleDownloadFullAlbum}
            disabled={revealedPhotos.length === 0 || !!zipProgress}
          >
            Télécharger l'album
          </button>
        </div>
      </header>

      {zipProgress && (
        <p className="event-dashboard__zip-progress">
          Préparation de l'archive ({zipProgress.label})… {zipProgress.done}/{zipProgress.total}
        </p>
      )}

      {settingsOpen && (
        <form className="event-dashboard__settings" onSubmit={handleSaveSettings}>
          <label>
            Poses par invité
            <input
              type="number"
              min="1"
              max="72"
              value={form.shotsPerGuest}
              onChange={(e) => setForm((f) => ({ ...f, shotsPerGuest: e.target.value }))}
            />
          </label>

          <label className="event-dashboard__checkbox">
            <input
              type="checkbox"
              checked={applyToExisting}
              onChange={(e) => setApplyToExisting(e.target.checked)}
            />
            Appliquer aussi aux invités déjà inscrits
          </label>

          <label>
            Date de révélation
            <input
              type="datetime-local"
              value={form.revealDate}
              onChange={(e) => setForm((f) => ({ ...f, revealDate: e.target.value }))}
            />
          </label>

          <div className="event-dashboard__theme-section">
            <p className="event-dashboard__theme-title">Habillage imposé aux invités</p>

            {(event.themeChunkCount > 0 || event.themePresetId) && !croppedBlob ? (
              <div className="event-dashboard__theme-current">
                {event.themePresetId ? (
                  <span
                    className="event-dashboard__theme-swatch"
                    style={{ backgroundImage: `url(${PRESET_THEMES[event.themePresetId]?.portrait})`, backgroundSize: "cover" }}
                  />
                ) : (
                  <span
                    className="event-dashboard__theme-swatch"
                    style={{ background: event.themeMaskColor === "transparent" ? "#8a8a8a" : event.themeMaskColor }}
                  />
                )}
                <span>
                  {event.themePresetId
                    ? `Thème "${PRESET_THEMES[event.themePresetId]?.name}" imposé à tous les invités.`
                    : "Un habillage personnalisé est imposé à tous les invités."}
                </span>
                <button type="button" className="event-dashboard__link-btn event-dashboard__link-btn--danger" onClick={handleClearTheme}>
                  Retirer
                </button>
              </div>
            ) : (
              <p className="event-dashboard__note">
                Aucun habillage imposé — chaque invité utilise son thème personnel.
              </p>
            )}

            <div className="event-dashboard__theme-tabs">
              <button type="button" className={themeTab === "preset" ? "active" : ""} onClick={() => setThemeTab("preset")}>
                Préréglé
              </button>
              <button type="button" className={themeTab === "mine" ? "active" : ""} onClick={() => setThemeTab("mine")}>
                Mes thèmes
              </button>
              <button type="button" className={themeTab === "upload" ? "active" : ""} onClick={() => setThemeTab("upload")}>
                Nouvelle image
              </button>
            </div>

            {themeTab === "preset" && (
              <div className="event-dashboard__preset-grid">
                {Object.entries(PRESET_THEMES).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    className={`event-dashboard__preset-card ${event.themePresetId === key ? "event-dashboard__preset-card--active" : ""}`}
                    onClick={() => handleApplyPreset(key)}
                    disabled={savingTheme}
                    style={{ backgroundImage: `url(${preset.portrait})` }}
                  >
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            )}

            {themeTab === "mine" && (
              myThemes.length > 0 ? (
                <div className="event-dashboard__mine-grid">
                  {myThemes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className="event-dashboard__mine-card"
                      onClick={() => handleApplyMyTheme(theme)}
                      disabled={applyingThemeId === theme.id}
                    >
                      {theme.thumbnail ? (
                        <img src={theme.thumbnail} alt="" />
                      ) : (
                        <span className="event-dashboard__mine-card-fallback" style={{ background: theme.maskColor }} />
                      )}
                      <span>{applyingThemeId === theme.id ? "…" : theme.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="event-dashboard__note">
                  Tu n'as pas encore de thème personnel — crée-en un depuis la page Thèmes.
                </p>
              )
            )}

            {themeTab === "upload" && (
              <>
                {pendingFile && (
                  <ImageCropModal
                    file={pendingFile}
                    onConfirm={(blob) => {
                      setCroppedBlob(blob);
                      setPendingFile(null);
                    }}
                    onCancel={() => {
                      setPendingFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  />
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleThemeFileSelected}
                  accept="image/*"
                  id="event-theme-upload"
                  style={{ display: "none" }}
                />
                <label htmlFor="event-theme-upload" className="event-form__upload-button">
                  {croppedBlob ? "Changer l'image" : "Choisir une nouvelle image"}
                </label>

                {croppedBlob && (
                  <>
                    <div
                      className="event-form__theme-preview"
                      style={{ backgroundImage: `url(${URL.createObjectURL(croppedBlob)})` }}
                    />
                    <div className="event-form__color-row">
                      <input type="color" value={maskColor} onChange={(e) => setMaskColor(e.target.value)} disabled={transparent} />
                      <label className="event-form__checkbox-label">
                        <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
                        Garder le mécanisme gris d'origine
                      </label>
                    </div>
                    <button type="button" className="event-dashboard__btn event-dashboard__btn--primary" onClick={handleSaveTheme} disabled={savingTheme}>
                      {savingTheme ? "Enregistrement…" : "Appliquer cet habillage"}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <button type="submit" className="event-dashboard__btn event-dashboard__btn--primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer les réglages"}
          </button>

          <div className="event-dashboard__danger-zone">
            <p className="event-dashboard__note">
              Supprime définitivement cet événement, toutes ses photos et les pellicules des invités.
            </p>
            <button type="button" className="event-dashboard__link-btn event-dashboard__link-btn--danger" onClick={handleDeleteEvent}>
              Supprimer l'événement
            </button>
          </div>
        </form>
      )}

      {photosByGuest.length === 0 && <p>Aucun invité n'a encore rejoint l'événement.</p>}

      {photosByGuest.map(({ guest, photos: guestPhotos }) => {
        const guestRevealedCount = revealedPhotos.filter((p) => p.ownerId === guest.id).length;
        return (
          <section key={guest.id} className="event-dashboard__guest">
            <div className="event-dashboard__guest-header">
              <h3>{guest.name} · {guestPhotos.length} photo{guestPhotos.length > 1 ? "s" : ""}</h3>
              <div className="event-dashboard__guest-actions">
                <button
                  type="button"
                  className="event-dashboard__link-btn"
                  onClick={() => handleDownloadGuestAlbum(guest)}
                  disabled={guestRevealedCount === 0 || !!zipProgress}
                >
                  Télécharger
                </button>
                <button
                  type="button"
                  className="event-dashboard__link-btn event-dashboard__link-btn--danger"
                  onClick={() => handleResetGuest(guest)}
                  disabled={guestPhotos.length === 0 || busyGuestId === guest.id}
                >
                  {busyGuestId === guest.id ? "Réinitialisation…" : "Réinitialiser"}
                </button>
              </div>
            </div>
            <div className="event-dashboard__grid">
              {guestPhotos.map((photo, i) => {
                const revealedGuestItems = guestPhotos
                  .map((p, j) => ({ photo: p, label: String(guestPhotos.length - j).padStart(2, "0") }))
                  .filter(({ photo: p }) => {
                    const revealAtMs = p.revealAt?.toMillis ? p.revealAt.toMillis() : 0;
                    return now >= revealAtMs;
                  })
                  .map(({ photo: p, label }) => ({ id: p.id, label }));
                return (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    index={guestPhotos.length - 1 - i}
                    now={now}
                    onOpen={(item) => {
                      const idx = revealedGuestItems.findIndex((it) => it.id === item.id);
                      setOpenItems(revealedGuestItems);
                      setOpenIndex(idx === -1 ? 0 : idx);
                    }}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {openItems && (
        <Lightbox
          items={openItems}
          index={openIndex}
          onNavigate={setOpenIndex}
          onClose={() => setOpenItems(null)}
          onDelete={async (photoId) => {
            await deletePhoto(photoId);
            setOpenItems(null);
          }}
        />
      )}
    </div>
  );
}
