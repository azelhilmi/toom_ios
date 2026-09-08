import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createEvent } from "../firebase/firestore";
import { generateInviteQrCode } from "../utils/qrCode";
import { shareInvite } from "../utils/saveImage";
import BackToCameraButton from "../components/UI/BackToCameraButton";
import Confetti from "../components/UI/Confetti";
import "./EventCreatePage.css";

const EVENT_TYPES = [
  { id: "EVG", label: "EVG", icon: "🥂", placeholder: "EVG de Thomas" },
  { id: "EVJF", label: "EVJF", icon: "💃", placeholder: "EVJF de Léa" },
  { id: "MARIAGE", label: "Mariage", icon: "💍", placeholder: "Mariage de Léa & Tom" },
  { id: "SOIREE", label: "Soirée", icon: "🍺", placeholder: "Soirée d'anniversaire" },
];

export default function EventCreatePage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState(null);
  const [name, setName] = useState("");
  const [revealDate, setRevealDate] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const nameInputRef = useRef(null);

  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    if (!result) return;
    const inviteUrl = `${window.location.origin}/invite/${result.inviteCode}`;
    generateInviteQrCode(inviteUrl).then(setQrDataUrl);
  }, [result]);

  function selectType(type) {
    setEventType(type);
    setTimeout(() => setStep(2), 200);
  }

  function handleNameSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setStep(3);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!ready || !user || !revealDate || !tosAccepted) return;
    setSubmitting(true);
    setError(null);
    try {
      const { eventId, inviteCode } = await createEvent(user.uid, {
        name: name.trim(),
        eventType: eventType?.id || null,
        shotsPerGuest: 24,
        revealDate,
      });
      setResult({ eventId, inviteCode });
      setStep(4);
    } catch (err) {
      console.error("Erreur création événement:", err);
      setError("La création a échoué, réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInvite() {
    const inviteUrl = `${window.location.origin}/invite/${result.inviteCode}`;
    const outcome = await shareInvite({
      title: name,
      text: `Rejoins "${name}" sur Toom et prends des photos avec nous !`,
      url: inviteUrl,
    });
    if (outcome === "unsupported") {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(result.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  return (
    <div className="event-wizard watermark-bg">
      <BackToCameraButton />
      <img src="/brand/icon-round-small.webp" alt="Toom" className="event-wizard__logo" />
      {step < 4 && (
        <div className="event-wizard__progress">
          <div className="event-wizard__gauge">
            <div className="event-wizard__gauge-fill" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
          <span className="event-wizard__gauge-label">Étape {step} / 3</span>
        </div>
      )}

      <div className={`event-wizard__slide event-wizard__slide--${step}`}>
        {step === 1 && (
          <div className="event-wizard__screen">
            <h1 className="event-wizard__question">Quel événement préparez-vous ?</h1>
            <div className="event-wizard__type-cards">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`event-wizard__type-card ${eventType?.id === t.id ? "event-wizard__type-card--selected" : ""}`}
                  onClick={() => selectType(t)}
                >
                  <span className="event-wizard__type-icon">{t.icon}</span>
                  <span className="event-wizard__type-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <form className="event-wizard__screen" onSubmit={handleNameSubmit}>
            <h1 className="event-wizard__question">Quel est le nom de l'événement ?</h1>
            <input
              ref={nameInputRef}
              type="text"
              className="event-wizard__name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={eventType?.placeholder || "Nom de l'événement"}
              enterKeyHint="next"
              required
            />
            <div className="event-wizard__nav-row">
              <button type="button" className="event-wizard__back-btn" onClick={goBack}>
                ← Retour
              </button>
              <button type="submit" className="event-wizard__next-btn" disabled={!name.trim()}>
                Suivant →
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form className="event-wizard__screen" onSubmit={handleCreate}>
            <h1 className="event-wizard__question">C'est pour quand ?</h1>
            <input
              type="datetime-local"
              className="event-wizard__date-input"
              value={revealDate}
              onChange={(e) => setRevealDate(e.target.value)}
              required
            />

            <label className="event-wizard__tos">
              <input type="checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)} />
              <span>
                J'accepte les{" "}
                <Link to="/terms" target="_blank" rel="noopener noreferrer">
                  Conditions Générales d'Utilisation
                </Link>
              </span>
            </label>

            {error && <p className="event-wizard__error">{error}</p>}

            <button type="submit" className="event-wizard__create-btn" disabled={submitting || !revealDate || !tosAccepted}>
              {submitting ? "Création…" : "Créer l'événement"}
            </button>
            <button type="button" className="event-wizard__back-btn event-wizard__back-btn--alone" onClick={goBack} disabled={submitting}>
              ← Retour
            </button>
          </form>
        )}

        {step === 4 && result && (
          <div className="event-wizard__screen event-wizard__screen--success">
            <Confetti />
            <p className="event-wizard__success-icon">🎉</p>
            <h1 className="event-wizard__question">C'est prêt !</h1>

            {qrDataUrl && <img src={qrDataUrl} alt="QR code d'invitation" className="event-wizard__qr" />}

            <button type="button" className="event-wizard__code" onClick={copyCode}>
              {result.inviteCode}
              <span className="event-wizard__code-hint">{copied ? "Copié !" : "Toucher pour copier"}</span>
            </button>

            <button type="button" className="event-wizard__invite-btn" onClick={handleInvite}>
              Inviter le groupe
            </button>

            <button type="button" className="event-wizard__dashboard-link" onClick={() => navigate(`/event/${result.eventId}`)}>
              Aller au tableau de bord
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
