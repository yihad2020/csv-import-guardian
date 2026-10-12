import { useRef, useState } from "react";

export default function FileDrop({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const acceptFile = (file?: File) => {
    if (!file) return;
    onFile(file);
  };

  return (
    <div
      className={`drop-zone ${dragging ? "drop-zone--dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) acceptFile(event.dataTransfer.files[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        disabled={disabled}
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />

      <div className="drop-zone__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 4h16v16H4z" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      </div>

      <div>
        <strong>Drop a CSV here</strong>
        <p>Analyze structure and data quality locally in your browser.</p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        CHOOSE FILE
      </button>

      <small>Maximum demo file size: 15 MB</small>
    </div>
  );
}
