export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  /** Optional transform to flatten or format the value */
  transform?: (row: T) => string;
}

/**
 * Convert an array of objects to a CSV string.
 * Handles quoting fields that contain commas, quotes, or newlines.
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const header = columns.map((c) => escapeCSV(c.header)).join(",");

  const rows = data.map((row) =>
    columns
      .map((col) => {
        if (col.transform) return escapeCSV(col.transform(row));
        const val = row[col.key as keyof T];
        return escapeCSV(formatValue(val));
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  downloadFile(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Export data as a pretty-printed JSON file.
 */
export function exportToJSON<T>(data: T[], filename: string): void {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}.json`, "application/json");
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatValue(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.join("; ");
  if (typeof val === "object") {
    // Flatten simple key-value objects
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
  return String(val);
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
