import "./StatusBanner.css";

const ICONS = {
  ready: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.6" fill="currentColor" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.5l4.5 4.5 10-11" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M12 7.5v6" />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  film: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path stroke="currentColor" strokeWidth="2" d="M8 5v14M16 5v14" />
      <path stroke="currentColor" strokeWidth="2" d="M3 9.5h5M16 9.5h5M3 14.5h5M16 14.5h5" />
    </svg>
  ),
};

export default function StatusBanner({ type, text }) {
  return (
    <div className={`status-banner status-banner--${type}`}>
      <span className="status-banner__icon">{ICONS[type] || ICONS.ready}</span>
      <p className="status-banner__text" role="status">{text}</p>
    </div>
  );
}
