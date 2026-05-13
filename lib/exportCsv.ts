/** Client-safe CSV helpers (browser download). */

export function downloadCsv(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k] ?? "")).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function pctCsv(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
