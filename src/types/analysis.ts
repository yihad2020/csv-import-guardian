export type InferredType =
  | "string"
  | "number"
  | "date"
  | "email"
  | "boolean";

export type IssueSeverity = "critical" | "warning" | "info";

export type DataIssue = {
  id: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  count?: number;
  column?: string;
};

export type ColumnAnalysis = {
  index: number;
  name: string;
  inferredType: InferredType;
  nonEmpty: number;
  empty: number;
  unique: number;
  invalid: number;
  whitespace: number;
  examples: string[];
};

export type CsvAnalysis = {
  fileName: string;
  fileSize: number;
  delimiter: string;
  headers: string[];
  rows: string[][];
  normalizedRows: string[][];
  rowCount: number;
  columnCount: number;
  malformedRows: number;
  duplicateRows: number;
  duplicateHeaders: string[];
  emptyCells: number;
  whitespaceCells: number;
  score: number;
  columns: ColumnAnalysis[];
  issues: DataIssue[];
};
