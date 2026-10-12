import { analyzeCsv } from "./analyzer";
import type { CsvAnalysis } from "../types/analysis";

export const MAX_FILE_SIZE = 15 * 1024 * 1024;

function detectDelimiter(text: string) {
  const candidates = [",", ";", "\t", "|"];
  const firstLogicalLine = text
    .split(/\r?\n/)
    .find((line) => line.trim()) ?? "";

  let winner = ",";
  let winnerCount = -1;

  for (const candidate of candidates) {
    let count = 0;
    let quoted = false;

    for (let index = 0; index < firstLogicalLine.length; index += 1) {
      const character = firstLogicalLine[index];

      if (character === '"') {
        quoted = !quoted;
      } else if (!quoted && character === candidate) {
        count += 1;
      }
    }

    if (count > winnerCount) {
      winner = candidate;
      winnerCount = count;
    }
  }

  return winner;
}

export function parseCsvText(text: string) {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (!quoted && character === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && next === "\n") {
        index += 1;
      }

      row.push(field);
      field = "";

      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += character;
  }

  row.push(field);

  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  return { delimiter, rows };
}

function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function serializeCsv(rows: string[][], delimiter = ",") {
  return rows
    .map((row) => row.map(escapeCsvCell).join(delimiter))
    .join("\r\n");
}

export async function parseCsvFile(file: File): Promise<CsvAnalysis> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("This demo accepts CSV files up to 15 MB.");
  }

  const text = await file.text();
  const parsed = parseCsvText(text);

  if (parsed.rows.length < 2) {
    throw new Error("The CSV needs a header row and at least one data row.");
  }

  return analyzeCsv({
    fileName: file.name,
    fileSize: file.size,
    delimiter: parsed.delimiter,
    rawRows: parsed.rows,
  });
}

export function downloadNormalizedCsv(analysis: CsvAnalysis) {
  const seen = new Set<string>();
  const cleanedRows = analysis.normalizedRows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => {
      const key = JSON.stringify(row);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

  const csv = serializeCsv([
    analysis.headers.map((header) => header.trim()),
    ...cleanedRows,
  ]);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const baseName = analysis.fileName.replace(/\.csv$/i, "");

  anchor.href = url;
  anchor.download = `${baseName}-normalized.csv`;
  anchor.click();

  URL.revokeObjectURL(url);
}
