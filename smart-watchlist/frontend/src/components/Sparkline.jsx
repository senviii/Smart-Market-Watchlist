export default function Sparkline({ points = [], positive = true }) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 100;
  const h = 24;

  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${x},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sparkline">
      <polyline
        points={coords}
        fill="none"
        stroke={positive ? "var(--color-success)" : "var(--color-danger)"}
        strokeWidth="2"
      />
    </svg>
  );
}
