import type { ColumnAnalysis } from "../types/analysis";

export default function ColumnTable({ columns }: { columns: ColumnAnalysis[] }) {
  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <span>SCHEMA</span>
          <h2>Column profile</h2>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th>Filled</th>
              <th>Empty</th>
              <th>Unique</th>
              <th>Invalid</th>
              <th>Examples</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => (
              <tr key={`${column.index}-${column.name}`}>
                <td><strong>{column.name}</strong></td>
                <td><span className="type-pill">{column.inferredType}</span></td>
                <td>{column.nonEmpty}</td>
                <td>{column.empty}</td>
                <td>{column.unique}</td>
                <td className={column.invalid > 0 ? "cell-alert" : ""}>{column.invalid}</td>
                <td className="examples">{column.examples.join(" · ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
