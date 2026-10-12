import type { DataIssue } from "../types/analysis";

export default function IssueList({ issues }: { issues: DataIssue[] }) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span>FINDINGS</span>
          <h2>Import risks</h2>
        </div>
        <strong>{issues.length}</strong>
      </div>

      <div className="issue-list">
        {issues.map((issue) => (
          <article className="issue" key={issue.id}>
            <div className={`issue__severity issue__severity--${issue.severity}`}>
              {issue.severity}
            </div>
            <div>
              <strong>{issue.title}</strong>
              <p>{issue.detail}</p>
            </div>
            {typeof issue.count === "number" && <span>{issue.count}</span>}
          </article>
        ))}
      </div>
    </section>
  );
}
