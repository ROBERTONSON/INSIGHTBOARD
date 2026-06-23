import type { Warning } from '../types/index'

// ============================================================
// PII detection patterns
// ============================================================

interface PIIPattern {
  type: 'email' | 'phone' | 'id_document'
  regex: RegExp
  label: string
}

const PII_PATTERNS: PIIPattern[] = [
  {
    type: 'email',
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    label: 'email address',
  },
  {
    type: 'phone',
    regex: /^\+?(?!.*\d{4}-\d{2}-\d{2})[\d\s\-(). ]{7,15}$/,
    label: 'phone number',
  },
  {
    type: 'id_document',
    regex: /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/,
    label: 'Chilean RUT',
  },
  {
    type: 'id_document',
    regex: /^\d{8}[A-Z]$/,
    label: 'Spanish DNI',
  },
]

/**
 * Inspects each column for PII patterns (email, phone, RUT, DNI).
 * If at least one value in a column matches any PII pattern, a Warning
 * of type "pii" is recorded for that column.
 *
 * Requirements: 9.1, 9.2
 */
export function detectPII(
  rows: Record<string, string>[],
  headers: string[]
): Warning[] {
  const warnings: Warning[] = []

  for (const header of headers) {
    // Track which PII type was first detected so we can build a descriptive message
    let detectedLabel: string | null = null

    outer: for (const row of rows) {
      const value = row[header]
      if (value === undefined || value === null || value === '') continue

      for (const pattern of PII_PATTERNS) {
        if (pattern.regex.test(value.trim())) {
          detectedLabel = pattern.label
          break outer
        }
      }
    }

    if (detectedLabel !== null) {
      warnings.push({
        type: 'pii',
        column: header,
        message: `Column "${header}" may contain sensitive personal data (${detectedLabel} detected).`,
      })
    }
  }

  return warnings
}
