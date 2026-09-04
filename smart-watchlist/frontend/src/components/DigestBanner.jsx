export default function DigestBanner({ digest }) {
  if (!digest) return null;
  return (
    <div className={`digest ${digest.flaggedCount > 0 ? "digest--active" : ""}`}>
      <p>{digest.narrative || digest.summary}</p>
    </div>
  );
}