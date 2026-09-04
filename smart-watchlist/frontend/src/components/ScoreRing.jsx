export default function ScoreRing({ score }) {
  const pct = Math.min(score / 10, 1);
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  const color = score >= 7 ? "var(--color-amber)" : score >= 4 ? "#d9a441" : "var(--text-muted)";

  return (
    <svg viewBox="0 0 40 40" className="score-ring">
      <circle cx="20" cy="20" r={radius} className="score-ring__track" />
      <circle
        cx="20"
        cy="20"
        r={radius}
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
        className="score-ring__progress"
      />
      <text x="20" y="24" textAnchor="middle" className="score-ring__text">
        {score.toFixed(0)}
      </text>
    </svg>
  );
}