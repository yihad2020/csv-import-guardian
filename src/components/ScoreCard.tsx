export default function ScoreCard({ score }: { score: number }) {
  const label = score >= 90 ? "Strong" : score >= 70 ? "Review" : "High risk";

  return (
    <article className="score-card">
      <span>IMPORT READINESS</span>
      <strong>{score}</strong>
      <small>/ 100</small>
      <p>{label}</p>
    </article>
  );
}
