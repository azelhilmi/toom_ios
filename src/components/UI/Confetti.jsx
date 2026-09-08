import "./Confetti.css";

const COLORS = ["#c8102e", "#f5c518", "#2f5233", "#e9dfc8", "#ffffff"];
const PIECES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 0.4,
  duration: 1.8 + Math.random() * 1.2,
  color: COLORS[i % COLORS.length],
  rotate: Math.random() * 360,
  drift: (Math.random() - 0.5) * 60,
}));

export default function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {PIECES.map((p) => (
        <span
          key={p.id}
          className="confetti__piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--drift": `${p.drift}px`,
            "--rotate": `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
