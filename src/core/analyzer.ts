import type {
  ColumnAnalysis,
  CsvAnalysis,
  DataIssue,
  InferredType,
} from "../types/analysis";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NUMBER_PATTERN = /^[-+]?(?:\d+\.?\d*|\.\d+)$/;
const BOOLEAN_VALUES = new Set([
  "true",
  "false",
  "yes",
  "no",
  "1",
  "0",
]);

function clean(value: string) {
  return value.trim();
}

function isNumber(value: string) {
  return NUMBER_PATTERN.test(clean(value));
}

function isBoolean(value: string) {
  return BOOLEAN_VALUES.has(clean(value).toLowerCase());
}

function isEmail(value: string) {
  return EMAIL_PATTERN.test(clean(value));
}

function isDate(value: string) {
  const trimmed = clean(value);

  if (!/[\-\/]/.test(trimmed)) {
    return false;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed);
}

function ratio(matches: number, total: number) {
  return total === 0 ? 0 : matches / total;
}

function inferType(values: string[]): InferredType {
  const populated = values
    .map(clean)
    .filter(Boolean);

  if (populated.length === 0) {
    return "string";
  }

  const emailMatches = populated.filter(isEmail).length;
  const numberMatches = populated.filter(isNumber).length;
  const booleanMatches = populated.filter(isBoolean).length;
  const dateMatches = populated.filter(isDate).length;

  if (ratio(emailMatches, populated.length) >= 0.7) {
    return "email";
  }

  if (ratio(booleanMatches, populated.length) >= 0.85) {
    return "boolean";
  }

  if (ratio(numberMatches, populated.length) >= 0.85) {
    return "number";
  }

  if (ratio(dateMatches, populated.length) >= 0.85) {
    return "date";
  }

  return "string";
}

function matchesType(value: string, type: InferredType) {
  if (!clean(value)) {
    return true;
  }

  switch (type) {
    case "number":
      return isNumber(value);
    case "boolean":
      return isBoolean(value);
    case "email":
      return isEmail(value);
    case "date":
      return isDate(value);
    default:
      return true;
  }
}

function findDuplicateHeaders(headers: string[]) {
  const seen = new Map<string, number>();
  const duplicates = new Set<string>();

  headers.forEach((header) => {
    const key = clean(header).toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);

    if (count > 1) {
      duplicates.add(header || "(blank header)");
    }
  });

  return [...duplicates];
}

function buildColumnAnalysis(
  headers: string[],
  rows: string[][],
): ColumnAnalysis[] {
  return headers.map((header, index) => {
    const values = rows.map((row) => row[index] ?? "");
    const populated = values.filter((value) => clean(value));
    const inferredType = inferType(values);
    const invalid = populated.filter(
      (value) => !matchesType(value, inferredType),
    ).length;
    const whitespace = values.filter(
      (value) => value !== value.trim(),
    ).length;

    return {
      index,
      name: header || `Column ${index + 1}`,
      inferredType,
      nonEmpty: populated.length,
      empty: values.length - populated.length,
      unique: new Set(populated.map(clean)).size,
      invalid,
      whitespace,
      examples: [...new Set(populated.map(clean))].slice(0, 3),
    };
  });
}

function calculateScore(params: {
  rowCount: number;
  columnCount: number;
  malformedRows: number;
  duplicateRows: number;
  duplicateHeaders: number;
  emptyCells: number;
  whitespaceCells: number;
  invalidCells: number;
}) {
  const totalCells = Math.max(1, params.rowCount * params.columnCount);
  const emptyRatio = params.emptyCells / totalCells;
  const invalidRatio = params.invalidCells / totalCells;
  const whitespaceRatio = params.whitespaceCells / totalCells;

  let penalty = 0;
  penalty += Math.min(25, params.malformedRows * 5);
  penalty += Math.min(20, params.duplicateHeaders * 10);
  penalty += Math.min(15, params.duplicateRows * 2);
  penalty += Math.min(20, Math.round(emptyRatio * 80));
  penalty += Math.min(20, Math.round(invalidRatio * 120));
  penalty += Math.min(10, Math.round(whitespaceRatio * 60));

  return Math.max(0, 100 - penalty);
}

function buildIssues(params: {
  malformedRows: number;
  duplicateRows: number;
  duplicateHeaders: string[];
  emptyCells: number;
  whitespaceCells: number;
  columns: ColumnAnalysis[];
  rowCount: number;
}) {
  const issues: DataIssue[] = [];

  if (params.duplicateHeaders.length > 0) {
    issues.push({
      id: "duplicate-headers",
      severity: "critical",
      title: "Duplicate column names",
      detail: `Repeated headers can cause imported values to overwrite or map to the wrong field: ${params.duplicateHeaders.join(", ")}.`,
      count: params.duplicateHeaders.length,
    });
  }

  if (params.malformedRows > 0) {
    issues.push({
      id: "malformed-rows",
      severity: "critical",
      title: "Rows do not match the header width",
      detail: "Some rows contain more or fewer fields than the header row. This commonly breaks bulk imports or shifts data into the wrong columns.",
      count: params.malformedRows,
    });
  }

  const driftingColumns = params.columns.filter(
    (column) => column.invalid > 0 && column.inferredType !== "string",
  );

  driftingColumns.forEach((column) => {
    issues.push({
      id: `type-drift-${column.index}`,
      severity: "warning",
      title: `Type drift in ${column.name}`,
      detail: `${column.invalid} populated value${column.invalid === 1 ? "" : "s"} do not match the inferred ${column.inferredType} format.`,
      count: column.invalid,
      column: column.name,
    });
  });

  if (params.duplicateRows > 0) {
    issues.push({
      id: "duplicate-rows",
      severity: "warning",
      title: "Exact duplicate rows",
      detail: "Repeated records can create duplicate customers, transactions, inventory entries, or events after import.",
      count: params.duplicateRows,
    });
  }

  if (params.emptyCells > 0) {
    issues.push({
      id: "empty-cells",
      severity: "info",
      title: "Missing values",
      detail: `${params.emptyCells} cell${params.emptyCells === 1 ? " is" : "s are"} empty across ${params.rowCount} data rows. Review whether those fields are optional before importing.`,
      count: params.emptyCells,
    });
  }

  if (params.whitespaceCells > 0) {
    issues.push({
      id: "whitespace",
      severity: "info",
      title: "Leading or trailing whitespace",
      detail: "Whitespace can make identifiers, emails, categories, and lookup values appear different even when they look identical in a spreadsheet.",
      count: params.whitespaceCells,
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "clean",
      severity: "info",
      title: "No obvious import blockers detected",
      detail: "The file is structurally consistent based on the current checks. Business-specific validation may still be required.",
    });
  }

  return issues;
}

export function analyzeCsv(params: {
  fileName: string;
  fileSize: number;
  delimiter: string;
  rawRows: string[][];
}): CsvAnalysis {
  const [headerRow = [], ...bodyRows] = params.rawRows;
  const headers = headerRow.map((header, index) =>
    clean(header) || `Column ${index + 1}`,
  );
  const columnCount = headers.length;
  const malformedRows = bodyRows.filter(
    (row) => row.length !== columnCount,
  ).length;

  const normalizedRows = bodyRows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ""),
  );

  const rowKeys = normalizedRows.map((row) => JSON.stringify(row.map(clean)));
  const uniqueRowKeys = new Set<string>();
  let duplicateRows = 0;

  rowKeys.forEach((rowKey) => {
    if (uniqueRowKeys.has(rowKey)) {
      duplicateRows += 1;
      return;
    }

    uniqueRowKeys.add(rowKey);
  });

  const duplicateHeaders = findDuplicateHeaders(headerRow);
  const columns = buildColumnAnalysis(headers, normalizedRows);
  const emptyCells = columns.reduce((sum, column) => sum + column.empty, 0);
  const whitespaceCells = columns.reduce(
    (sum, column) => sum + column.whitespace,
    0,
  );
  const invalidCells = columns.reduce((sum, column) => sum + column.invalid, 0);

  const score = calculateScore({
    rowCount: normalizedRows.length,
    columnCount,
    malformedRows,
    duplicateRows,
    duplicateHeaders: duplicateHeaders.length,
    emptyCells,
    whitespaceCells,
    invalidCells,
  });

  const issues = buildIssues({
    malformedRows,
    duplicateRows,
    duplicateHeaders,
    emptyCells,
    whitespaceCells,
    columns,
    rowCount: normalizedRows.length,
  });

  return {
    fileName: params.fileName,
    fileSize: params.fileSize,
    delimiter: params.delimiter,
    headers,
    rows: bodyRows,
    normalizedRows,
    rowCount: normalizedRows.length,
    columnCount,
    malformedRows,
    duplicateRows,
    duplicateHeaders,
    emptyCells,
    whitespaceCells,
    score,
    columns,
    issues,
  };
}
