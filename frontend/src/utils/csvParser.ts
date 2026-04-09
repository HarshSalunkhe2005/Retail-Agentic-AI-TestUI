import Papa from 'papaparse';
import type { CSVRow } from '../store/wizardStore';

export interface ParseResult {
  data: CSVRow[];
  headers: string[];
  errors: string[];
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const errors = results.errors.map((e) => e.message);
        resolve({ data: results.data, headers, errors });
      },
      error: (error) => {
        resolve({ data: [], headers: [], errors: [error.message] });
      },
    });
  });
}

export function exportAsCSV(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportAsJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
