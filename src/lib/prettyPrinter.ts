/**
 * Pretty_Printer — converts an in-memory CSV dataset back to a CSV string.
 *
 * Escaping rules (RFC 4180 / PapaParse compatible):
 *  - A field that contains a comma (`,`), a double-quote (`"`), or a newline
 *    (`\n` or `\r`) is wrapped in double-quotes.
 *  - Any double-quote character inside a quoted field is escaped by doubling
 *    it (`"` → `""`).
 *
 * Output format:
 *  - Header line followed by one line per data row.
 *  - Lines are separated by `\n`.
 *  - No trailing newline.
 */
export function printCSV(rows: Record<string, string>[], headers: string[]): string {
  const lines: string[] = [];

  // Header line
  lines.push(headers.map(escapeField).join(','));

  // Data lines
  for (const row of rows) {
    const fields = headers.map(header => escapeField(row[header] ?? ''));
    lines.push(fields.join(','));
  }

  return lines.join('\n');
}

/**
 * Escapes a single CSV field value.
 *
 * If the value contains a comma, double-quote, carriage return, or newline it
 * is enclosed in double-quotes and any internal double-quotes are doubled.
 */
function escapeField(value: string): string {
  const needsQuoting = /[,"\n\r]/.test(value);
  if (!needsQuoting) {
    return value;
  }
  // Escape internal double-quotes by doubling them, then wrap in quotes
  return `"${value.replace(/"/g, '""')}"`;
}
