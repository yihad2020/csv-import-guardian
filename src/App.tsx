import { useState } from "react";
import FileDrop from "./components/FileDrop";
import ScoreCard from "./components/ScoreCard";
import IssueList from "./components/IssueList";
import ColumnTable from "./components/ColumnTable";
import PreviewTable from "./components/PreviewTable";
import { downloadNormalizedCsv, parseCsvFile } from "./core/csv";
import type { CsvAnalysis } from "./types/analysis";
import "./styles.css";

const SAMPLE_PATH = "/examples/customer-import.csv";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function App() {
  const [analysis, setAnalysis] = useState<CsvAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (file: File) => {
    setBusy(true);
    setError(null);

    try {
      const result = await parseCsvFile(file);
      setAnalysis(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not analyze this file.");
    } finally {
      setBusy(false);
    }
  };

  const loadSample = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(SAMPLE_PATH);
      const blob = await response.blob();
      await analyze(new File([blob], "customer-import.csv", { type: "text/csv" }));
    } catch {
      setError("Could not load the sample file.");
      setBusy(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">CSV</span>
          <div>
            <strong>Import Guardian</strong>
            <small>Preflight CSV validation</small>
          </div>
        </div>
        <a href="https://github.com/yihad2020/csv-import-guardian" target="_blank" rel="noreferrer">
          SOURCE ↗
        </a>
      </header>

      {!analysis ? (
        <section className="landing">
          <div className="landing__copy">
            <span className="eyebrow">CSV IMPORT PREFLIGHT</span>
            <h1>Catch bad data before it reaches production.</h1>
            <p>
              Upload a CSV and inspect malformed rows, duplicate records, missing values,
              whitespace, inferred data types, and format drift before importing it into a CRM,
              ERP, database, or internal tool.
            </p>
            <div className="privacy-note">
              <strong>Client-side analysis</strong>
              <span>Your file stays in the browser. This demo does not upload CSV contents to a server.</span>
            </div>
          </div>

          <div className="landing__drop">
            <FileDrop onFile={analyze} disabled={busy} />
            <button className="sample-button" type="button" onClick={loadSample} disabled={busy}>
              {busy ? "ANALYZING..." : "TRY SAMPLE FILE"}
            </button>
            {error && <p className="error-message">{error}</p>}
          </div>
        </section>
      ) : (
        <section className="results">
          <div className="results__topbar">
            <div>
              <span className="eyebrow">ANALYSIS COMPLETE</span>
              <h1>{analysis.fileName}</h1>
              <p>
                {formatBytes(analysis.fileSize)} · {analysis.rowCount.toLocaleString()} rows · {analysis.columnCount} columns · delimiter “{analysis.delimiter}”
              </p>
            </div>
            <div className="results__actions">
              <button type="button" onClick={() => downloadNormalizedCsv(analysis)}>
                DOWNLOAD NORMALIZED COPY
              </button>
              <button className="button-secondary" type="button" onClick={() => setAnalysis(null)}>
                ANALYZE ANOTHER
              </button>
            </div>
          </div>

          <div className="summary-grid">
            <ScoreCard score={analysis.score} />
            <article className="metric-card">
              <span>MALFORMED ROWS</span>
              <strong>{analysis.malformedRows}</strong>
              <p>Rows with a different number of fields than the header.</p>
            </article>
            <article className="metric-card">
              <span>DUPLICATE ROWS</span>
              <strong>{analysis.duplicateRows}</strong>
              <p>Exact repeated records after trimming surrounding whitespace.</p>
            </article>
            <article className="metric-card">
              <span>EMPTY CELLS</span>
              <strong>{analysis.emptyCells}</strong>
              <p>Potentially missing values across the imported dataset.</p>
            </article>
          </div>

          <IssueList issues={analysis.issues} />
          <ColumnTable columns={analysis.columns} />
          <PreviewTable analysis={analysis} />
        </section>
      )}

      <footer>
        Built as a small, production-minded data quality tool. Validation is generic by design; business-specific rules belong in a configurable rule layer.
      </footer>
    </main>
  );
}
