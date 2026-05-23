/**
 * Export helpers — XLSX and PDF.
 *
 * Both libraries (xlsx ~250KB gz, jspdf+autotable ~150KB gz) are heavy and
 * only used when the user clicks an Export button. We dynamically import
 * them at call time so they never enter the route bundle. The functions
 * become async — callers should `await` and the UI should disable the
 * button while the chunk loads + the file is generated.
 */

export type ExportColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

export async function exportToXLSX<T>(
  filename: string,
  columns: ExportColumn<T>[],
  rows: T[],
): Promise<void> {
  const XLSX = await import('xlsx');
  const aoa: (string | number)[][] = [
    columns.map((c) => c.header),
    ...rows.map((r) =>
      columns.map((c) => {
        const v = c.accessor(r);
        return v == null ? '' : (typeof v === 'number' ? v : String(v));
      }),
    ),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export async function exportToPDF<T>(
  filename: string,
  title: string,
  columns: ExportColumn<T>[],
  rows: T[],
): Promise<void> {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = (autoTableMod as any).default || (autoTableMod as any);

  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString('pt-BR'), 14, 20);
  autoTable(doc, {
    startY: 26,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) =>
      columns.map((c) => {
        const v = c.accessor(r);
        return v == null ? '' : String(v);
      }),
    ),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [10, 10, 20] },
  });
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
