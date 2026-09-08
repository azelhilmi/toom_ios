import { useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { saveTheme, deleteTheme, setActiveTheme } from "../firebase/firestore";
import { blobToBase64, resizeToWebP } from "../utils/imageCompression";
import { PRESET_THEMES } from "../utils/hotspots";
import ImageCropModal from "../components/UI/ImageCropModal";
import BackToCameraButton from "../components/UI/BackToCameraButton";
import "./ThemesPage.css";

const DEFAULT_MASK_COLOR = "#8a8a8a";

export default function ThemesPage() {
  const { activeThemeId, myThemes } = useTheme();
  const { user } = useAuth();

  const [creating, setCreating] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [themeName, setThemeName] = useState("");
  const [maskColor, setMaskColor] = useState(DEFAULT_MASK_COLOR);
  const [transparent, setTransparent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Sélectionne une image.");
      return;
    }
    setError(null);
    setPendingFile(file);
  }

  function handleCropConfirm(blob) {
    setPendingFile(null);
    setCroppedBlob(blob);
  }

  async function handleSaveTheme(e) {
    e.preventDefault();
    if (!croppedBlob || !themeName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      // Déjà recadrée et compressée en WebP par ImageCropModal — un
      // second passage de compression ne faisait que ré-encoder à
      // l'identique (même taille), pour rien. Seule une petite vignette
      // (pour l'aperçu dans la liste) a besoin d'un nouveau passage,
      // volontairement minuscule pour rester rapide.
      const [optimized, thumbBlob] = await Promise.all([
        blobToBase64(croppedBlob),
        resizeToWebP(croppedBlob, 160, 0.7),
      ]);
      const thumbnail = await blobToBase64(thumbBlob);
      const themeId = await saveTheme(user.uid, {
        name: themeName.trim(),
        maskColor: transparent ? "transparent" : maskColor,
        backgroundBase64: optimized,
        thumbnail,
      });
      await setActiveTheme(user.uid, themeId);
      resetCreationForm();
    } catch (err) {
      console.error("Erreur sauvegarde thème:", err);
      setError(err?.message || "Échec de la sauvegarde du thème.");
    } finally {
      setIsSaving(false);
    }
  }

  function resetCreationForm() {
    setCreating(false);
    setCroppedBlob(null);
    setThemeName("");
    setMaskColor(DEFAULT_MASK_COLOR);
    setTransparent(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSelectPreset(presetKey) {
    await setActiveTheme(user.uid, presetKey === "default" ? null : `preset:${presetKey}`);
  }

  async function handleSelectCustom(themeId) {
    await setActiveTheme(user.uid, themeId);
  }

  async function handleDeleteTheme(theme) {
    if (!window.confirm(`Supprimer le thème "${theme.name}" ?`)) return;
    await deleteTheme(user.uid, theme.id, theme.chunkCount);
    if (activeThemeId === theme.id) {
      await setActiveTheme(user.uid, null);
    }
  }

  const isPresetActive = (key) =>
    key === "default" ? !activeThemeId : activeThemeId === `preset:${key}`;

  return (
    <div className="themes-page page-enter watermark-bg">
      {pendingFile && (
        <ImageCropModal
          file={pendingFile}
          onConfirm={handleCropConfirm}
          onCancel={() => {
            setPendingFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      )}

      <header className="themes-page__header">
        <div>
          <img src="/brand/icon-round-small.webp" alt="" className="page-header-logo" />
          <h1>Thèmes</h1>
          <p>Choisis l'habillage de ton appareil.</p>
        </div>
        <BackToCameraButton />
      </header>

      <section className="themes-page__section">
        <h2>Préréglés</h2>
        <div className="themes-page__presets">
          {Object.entries(PRESET_THEMES).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              className={`themes-page__preset-card ${isPresetActive(key) ? "themes-page__preset-card--active" : ""}`}
              onClick={() => handleSelectPreset(key)}
              style={{ backgroundImage: `url(${preset.portrait})` }}
            >
              <span className="themes-page__preset-name">{preset.name}</span>
              {isPresetActive(key) && <span className="themes-page__preset-badge">Actif</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="themes-page__section">
        <h2>Mes thèmes personnalisés</h2>
        <p className="themes-page__hint">
          Une image de ton choix + une couleur pour le mécanisme (boutons,
          molette). Crée-en autant que tu veux.
        </p>

        {myThemes.length > 0 && (
          <div className="theme-list">
            {myThemes.map((theme) => (
              <div key={theme.id} className={`theme-list__item ${activeThemeId === theme.id ? "theme-list__item--active" : ""}`}>
                <button type="button" className="theme-list__select" onClick={() => handleSelectCustom(theme.id)}>
                  {theme.thumbnail ? (
                    <img src={theme.thumbnail} alt="" className="theme-list__thumb" />
                  ) : (
                    <span
                      className="theme-list__swatch"
                      style={{ background: theme.maskColor === "transparent" ? "transparent" : theme.maskColor }}
                    />
                  )}
                  <span className="theme-list__name">{theme.name}</span>
                  {activeThemeId === theme.id && <span className="theme-list__badge">Actif</span>}
                </button>
                <button
                  type="button"
                  className="theme-list__delete"
                  onClick={() => handleDeleteTheme(theme)}
                  aria-label={`Supprimer ${theme.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {!creating ? (
          <button type="button" className="themes-page__new-theme" onClick={() => setCreating(true)}>
            + Nouveau thème
          </button>
        ) : (
          <form className="theme-create" onSubmit={handleSaveTheme}>
            <label className="theme-create__field">
              Nom du thème
              <input
                type="text"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="Ex. Vacances d'été"
                required
              />
            </label>

            <label className="theme-create__field">
              Image de fond
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                accept="image/*"
                className="themes-page__file-input"
                id="theme-image-upload"
              />
              <label htmlFor="theme-image-upload" className="themes-page__upload-button">
                {croppedBlob ? "Changer l'image" : "Choisir une image"}
              </label>
            </label>

            {croppedBlob && (
              <div className="themes-page__preview">
                <div
                  className="themes-page__preview-image"
                  style={{ backgroundImage: `url(${URL.createObjectURL(croppedBlob)})` }}
                />
              </div>
            )}

            <label className="theme-create__field">
              Couleur du mécanisme (boutons, molette)
              <div className="theme-create__color-row">
                <input
                  type="color"
                  value={maskColor}
                  onChange={(e) => setMaskColor(e.target.value)}
                  disabled={transparent}
                />
                <label className="theme-create__checkbox">
                  <input
                    type="checkbox"
                    checked={transparent}
                    onChange={(e) => setTransparent(e.target.checked)}
                  />
                  Transparent (garde le gris d'origine du mécanisme)
                </label>
              </div>
            </label>

            {error && <p className="themes-page__error">{error}</p>}

            <div className="theme-create__actions">
              <button type="button" className="theme-create__cancel" onClick={resetCreationForm} disabled={isSaving}>
                Annuler
              </button>
              <button type="submit" disabled={isSaving || !croppedBlob || !themeName.trim()}>
                {isSaving ? "Sauvegarde…" : "Enregistrer le thème"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
