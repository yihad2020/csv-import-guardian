import type { CsvAnalysis } from "../types/analysis";

export default function PreviewTable({ analysis }: { analysis: CsvAnalysis }) {
  const previewRows = analysis.normalizedRows.slice(0, 8);

  return (
    <section className="panel panel--wide">
      <div className="panel__header">
        <div>
          <span>PREVIEW</span>
          <h2>First rows</h2>
        </div>
        <small>Showing {previewRows.length} of {analysis.rowCount}</small>
      </div>

      <div className="table-scroll">
        <table className="preview-table">
          <thead>
            <tr>
              {analysis.headers.map((header, index) => (
                <th key={`${header}-${index}`}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {analysis.headers.map((_, columnIndex) => (
                  <td key={columnIndex}>{row[columnIndex] || <em>empty</em>}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
