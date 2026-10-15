import * as XLSX from 'xlsx';

type Cell = string | number | boolean | null | undefined;

/**
 * Build and download a real .xlsx workbook from rows-of-arrays sheets.
 * Column widths are auto-fit from content.
 */
export function downloadXlsx(
  filename: string,
  sheets: { name: string; rows: Cell[][] }[],
): boolean {
  try {
    const wb = XLSX.utils.book_new();
    for (const s of sheets) {
      const ws = XLSX.utils.aoa_to_sheet(s.rows);
      ws['!cols'] = (s.rows[0] ?? []).map((_, i) => ({
        wch: Math.min(
          48,
          Math.max(10, ...s.rows.map((r) => String(r[i] ?? '').length + 2)),
        ),
      }));
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
    }
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
    return true;
  } catch {
    return false;
  }
}
