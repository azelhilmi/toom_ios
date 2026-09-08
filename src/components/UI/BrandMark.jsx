import "./BrandMark.css";

export default function BrandMark({ size = "medium", withTagline = true, animated = false }) {
  return (
    <div className={`brand-mark brand-mark--${size}`}>
      <img
        src="/brand/icon-round.webp"
        alt="Toom"
        className={`brand-mark__logo ${animated ? "brand-mark__logo--animated" : ""}`}
      />
      {withTagline && <p className="brand-mark__tagline">We'll see tomorrow</p>}
    </div>
  );
}
