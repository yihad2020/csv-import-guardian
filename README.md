# CSV Import Guardian

A browser-based CSV preflight tool for catching common import problems before data reaches a CRM, ERP, database, or internal business system.

The project is intentionally small and practical: upload a CSV, get a structural/data-quality report, inspect inferred column types, preview the rows, and optionally download a normalized copy.

## Problem

CSV imports fail in predictable ways:

- duplicate rows create duplicate entities or transactions
- missing values violate required fields
- malformed rows shift values into the wrong columns
- duplicate headers create ambiguous mappings
- whitespace breaks lookups and identifiers
- a mostly-numeric/date/email column contains a few invalid values
- teams discover these issues only after an import job fails or bad data is already written

CSV Import Guardian moves those checks before the import step.

## What it checks

- row/column consistency
- duplicate headers
- exact duplicate rows
- empty cells
- leading/trailing whitespace
- inferred column types
  - number
  - date
  - email
  - boolean
  - string
- type drift inside inferred structured columns
- import-readiness score
- row preview

The included normalized export performs only conservative cleanup:

- trims surrounding whitespace
- removes exact duplicate rows

It intentionally does **not** silently coerce dates, numbers, emails, IDs, or business-specific fields.

## Privacy

Analysis runs client-side in the browser. CSV contents are not uploaded to an application server by this demo.

## Stack

- React
- TypeScript
- Vite

## Project structure

```text
src/
├── components/
│   ├── ColumnTable.tsx
│   ├── FileDrop.tsx
│   ├── IssueList.tsx
│   ├── PreviewTable.tsx
│   └── ScoreCard.tsx
├── core/
│   ├── analyzer.ts
│   └── csv.ts
├── types/
│   └── analysis.ts
├── App.tsx
├── main.tsx
└── styles.css
```

The analysis engine is kept separate from the React UI so additional rule packs can be added later without rewriting the interface.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Scalability path

This first version is deliberately client-side and bounded to a 15 MB demo file size. A larger production implementation could preserve the same rule/reporting model while moving parsing into:

- chunked Web Workers or streaming parsing for larger browser-side files
- a streaming upload API
- object storage + background jobs
- reusable organization-specific validation rules
- saved import profiles and required-field schemas
- import approval history

The core idea remains the same: validate first, write later.
