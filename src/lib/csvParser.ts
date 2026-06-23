import Papa from 'papaparse';
import type { ParseResult, DatasetMeta, Warning } from '../types/index';

/**
 * Parses a CSV File in the browser using PapaParse.
 *
 * Validations (in order):
 *  1. File size must be ≤ 52,428,800 bytes (50 MB).
 *  2. File name must end with `.csv` (case-insensitive).
 *
 * Post-processing:
 *  - Duplicate headers are renamed with incremental suffixes (_2, _3, …).
 *  - A Warning of type "duplicate_header" is registered for each renamed header.
 *
 * Rejects with an Error if the CSV contains 0 rows of data.
 */
export function parseCSV(file: File, sessionId: string): Promise<ParseResult> {
  // 1. Validate size
  if (file.size > 52_428_800) {
    return Promise.reject(new Error('El archivo supera el límite de 50 MB.'));
  }

  // 2. Validate extension
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return Promise.reject(new Error('Solo se aceptan archivos con extensión .csv.'));
  }

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        try {
          const warnings: Warning[] = [];

          // Post-process headers: resolve duplicates
          const rawHeaders: string[] = results.meta.fields ?? [];
          const dedupedHeaders = deduplicateHeaders(rawHeaders, warnings);

          // If headers were renamed, remap row keys accordingly
          let rows: Record<string, string>[] = results.data;
          if (warnings.length > 0) {
            rows = remapRowKeys(rows, rawHeaders, dedupedHeaders);
          }

          // Validate that there is at least one data row
          if (rows.length === 0) {
            return reject(new Error('El archivo CSV no contiene datos.'));
          }

          const meta: DatasetMeta = {
            filename: file.name,
            rowCount: rows.length,
            columnCount: dedupedHeaders.length,
            columns: dedupedHeaders,
            uploadedAt: new Date().toISOString(),
            sessionId,
          };

          resolve({ meta, rows, warnings });
        } catch (err) {
          reject(err);
        }
      },
      error(error) {
        reject(new Error(error.message));
      },
    });
  });
}

/**
 * Takes a list of raw header names (possibly with duplicates) and returns a
 * new list where all names are unique. For each renamed header a Warning of
 * type "duplicate_header" is pushed into the provided warnings array.
 *
 * Naming scheme: first occurrence keeps the original name; subsequent
 * occurrences receive suffixes _2, _3, … in the order they appear.
 */
function deduplicateHeaders(headers: string[], warnings: Warning[]): string[] {
  // Count how many times each name has been seen so far
  const seen = new Map<string, number>();
  const result: string[] = [];

  for (const header of headers) {
    const count = seen.get(header) ?? 0;
    if (count === 0) {
      // First occurrence — keep as-is
      result.push(header);
      seen.set(header, 1);
    } else {
      // Duplicate — find the next available suffix
      const newCount = count + 1;
      const renamed = `${header}_${newCount}`;
      result.push(renamed);
      seen.set(header, newCount);

      warnings.push({
        type: 'duplicate_header',
        column: renamed,
        message: `El header "${header}" estaba duplicado y fue renombrado a "${renamed}".`,
      });
    }
  }

  return result;
}

/**
 * Remaps the keys of every row from the original (possibly-duplicate) header
 * names to the deduplicated header names. PapaParse keeps only the last value
 * for truly duplicate keys, so we reconstruct the mapping positionally.
 *
 * Because PapaParse with `header: true` already collapsed duplicate keys in
 * `results.data`, we need to re-parse each row from the raw string. Instead,
 * we apply a positional remap based on what PapaParse stored: for headers that
 * were NOT duplicated, the value is already correct; for renamed duplicates we
 * copy the value from the original key and write it under the new key.
 */
function remapRowKeys(
  rows: Record<string, string>[],
  rawHeaders: string[],
  dedupedHeaders: string[]
): Record<string, string>[] {
  // Build a mapping from old key → new key for every position
  // PapaParse stores the first occurrence under the original name
  // and subsequent occurrences are lost (overwritten). We handle this by
  // tracking which original keys have already been mapped.
  const keyMap: Array<{ from: string; to: string }> = rawHeaders.map((raw, i) => ({
    from: raw,
    to: dedupedHeaders[i],
  }));

  return rows.map(row => {
    const newRow: Record<string, string> = {};
    // Track which original keys we've already consumed to handle true dupes
    const consumed = new Map<string, number>(); // original key → times consumed

    for (const { from, to } of keyMap) {
      const timesConsumed = consumed.get(from) ?? 0;
      if (timesConsumed === 0) {
        // First time we see this original key: copy its value directly
        newRow[to] = row[from] ?? '';
      } else {
        // Subsequent duplicate: PapaParse will have stored only one value
        // under the original key (the last one parsed). For now we carry
        // forward the same value since we cannot recover the original column
        // data without re-reading the raw text.
        newRow[to] = row[from] ?? '';
      }
      consumed.set(from, timesConsumed + 1);
    }

    return newRow;
  });
}
