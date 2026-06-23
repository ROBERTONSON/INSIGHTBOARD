import * as ss from 'simple-statistics'
import type {
  AnalysisInput,
  AnalysisResult,
  ColumnProfile,
  CorrelationMatrix,
  DescriptiveStats,
  Distribution,
  OutlierEntry,
  Trend,
  Warning,
} from '../types/index'

// ============================================================
// Type detection helpers
// ============================================================

const BOOLEAN_VALUES = new Set(['true', 'false', 'yes', 'no', '1', '0', 'sí', 'si'])

function isBoolean(value: string): boolean {
  return BOOLEAN_VALUES.has(value.toLowerCase())
}

function isDateParseable(value: string): boolean {
  if (/^-?\d+(\.\d+)?$/.test(value)) return false;
  const parsed = Date.parse(value)
  return !isNaN(parsed)
}

function isNumeric(value: string): boolean {
  const n = parseFloat(value)
  return !isNaN(n) && isFinite(Number(value))
}

// ============================================================
// computeDescriptiveStats — Task 7.1
// ============================================================

/**
 * Computes descriptive statistics for an array of numeric values.
 *
 * - stdDev is null when values has fewer than 2 elements.
 *
 * Requirements: 4.1, 4.2, 4.3
 */
export function computeDescriptiveStats(values: number[]): DescriptiveStats {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    mean: ss.mean(values),
    median: ss.median(sorted),
    stdDev: values.length >= 2 ? ss.standardDeviation(values) : null,
    min: ss.min(values),
    max: ss.max(values),
    p25: ss.quantile(sorted, 0.25),
    p75: ss.quantile(sorted, 0.75),
  }
}

// ============================================================
// detectTypes
// ============================================================

/**
 * Detects the data type of each column following this precedence:
 *   boolean → date → numeric → text
 *
 * - boolean: ALL non-null values (case-insensitive) belong to
 *   {true, false, yes, no, 1, 0, sí, si}
 * - date: ≥ 80% of non-null values are parseable as a date
 * - numeric: ≥ 80% of non-null values are parseable as a number
 * - text: any other case (including columns with 0 non-null values)
 *
 * Requirements: 2.2
 */
export function detectTypes(
  rows: Record<string, string>[],
  headers: string[]
): Record<string, 'numeric' | 'text' | 'date' | 'boolean'> {
  const result: Record<string, 'numeric' | 'text' | 'date' | 'boolean'> = {}

  for (const header of headers) {
    // Extract all non-null/empty values for this column
    const nonNull: string[] = []
    for (const row of rows) {
      const value = row[header]
      if (value !== '' && value !== null && value !== undefined) {
        nonNull.push(value)
      }
    }

    // Columns with no non-null values default to 'text'
    if (nonNull.length === 0) {
      result[header] = 'text'
      continue
    }

    // 1. boolean: ALL values belong to the boolean set
    if (nonNull.every(isBoolean)) {
      result[header] = 'boolean'
      continue
    }

    // 2. date: ≥ 80% parseable as date
    const dateCount = nonNull.filter(isDateParseable).length
    if (dateCount / nonNull.length >= 0.8) {
      result[header] = 'date'
      continue
    }

    // 3. numeric: ≥ 80% parseable as number
    const numericCount = nonNull.filter(isNumeric).length
    if (numericCount / nonNull.length >= 0.8) {
      result[header] = 'numeric'
      continue
    }

    // 4. text: fallback
    result[header] = 'text'
  }

  return result
}

// ============================================================
// computeColumnProfiles
// ============================================================

/**
 * Computes a ColumnProfile for each header, including:
 *   - nullCount: cells where value === '' || null || undefined
 *   - nullPercent: (nullCount / rows.length) * 100 (0 if rows is empty)
 *   - uniqueCount: count of distinct non-null values
 *   - detectedType: via detectTypes()
 *   - stats: null (populated later by computeDescriptiveStats)
 *
 * Also registers a Warning of type "high_nulls" for any column
 * whose nullPercent is strictly greater than 80.
 *
 * Requirements: 2.3, 2.4
 */
export function computeColumnProfiles(
  rows: Record<string, string>[],
  headers: string[]
): { profiles: ColumnProfile[]; warnings: Warning[] } {
  const detectedTypes = detectTypes(rows, headers)
  const profiles: ColumnProfile[] = []
  const warnings: Warning[] = []
  const totalRows = rows.length

  for (const header of headers) {
    let nullCount = 0
    const uniqueValues = new Set<string>()

    for (const row of rows) {
      const value = row[header]
      if (value === '' || value === null || value === undefined) {
        nullCount++
      } else {
        uniqueValues.add(value)
      }
    }

    const nullPercent = totalRows === 0 ? 0 : (nullCount / totalRows) * 100
    const uniqueCount = uniqueValues.size

    // Compute descriptive stats for numeric columns
    let stats: DescriptiveStats | null = null
    if (detectedTypes[header] === 'numeric') {
      const numericValues: number[] = []
      for (const row of rows) {
        const raw = row[header]
        if (raw !== '' && raw !== null && raw !== undefined) {
          const n = parseFloat(raw)
          if (!isNaN(n) && isFinite(n)) {
            numericValues.push(n)
          }
        }
      }

      if (numericValues.length < 2) {
        warnings.push({
          type: 'insufficient_data',
          column: header,
          message: `Column "${header}" has fewer than 2 non-null numeric values; standard deviation cannot be computed.`,
        })
      }

      if (numericValues.length >= 1) {
        stats = computeDescriptiveStats(numericValues)
      }
    }

    profiles.push({
      name: header,
      detectedType: detectedTypes[header],
      nullCount,
      nullPercent,
      uniqueCount,
      stats,
    })

    if (nullPercent > 80) {
      warnings.push({
        type: 'high_nulls',
        column: header,
        message: `Column "${header}" has ${nullPercent.toFixed(1)}% null or empty values (threshold: 80%).`,
      })
    }
  }

  return { profiles, warnings }
}

// ============================================================
// computeCorrelationMatrix — Task 7.2
// ============================================================

/**
 * Computes the Pearson correlation matrix for a set of numeric columns.
 *
 * - Receives a map of columnName → number[] (pre-extracted numeric values,
 *   using NaN to represent missing/invalid values per row).
 * - rows is kept to align indices: values[colName][i] corresponds to rows[i].
 * - If fewer than 2 columns: returns { matrix: null, warnings: [] }.
 * - For each pair (i, j) with fewer than 30 rows where both values are valid:
 *   the pair is skipped and a Warning of type "insufficient_data" is registered.
 * - Diagonal is 1; matrix is symmetric.
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export function computeCorrelationMatrix(
  columnData: Record<string, number[]>,
  _rows: Record<string, string>[],
): { matrix: CorrelationMatrix | null; warnings: Warning[] } {
  const warnings: Warning[] = []
  const columns = Object.keys(columnData)

  if (columns.length < 2) {
    return { matrix: null, warnings }
  }

  const n = columns.length
  // Initialize matrix with 1 on diagonal, 0 elsewhere
  const values: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => (i === j ? 1 : 0)),
  )

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const colA = columns[i]
      const colB = columns[j]
      const dataA = columnData[colA]
      const dataB = columnData[colB]
      const len = Math.min(dataA.length, dataB.length)

      // Find row indices where both values are valid (not NaN, not null/undefined)
      const pairsA: number[] = []
      const pairsB: number[] = []
      for (let k = 0; k < len; k++) {
        const a = dataA[k]
        const b = dataB[k]
        if (a !== null && a !== undefined && !isNaN(a) && b !== null && b !== undefined && !isNaN(b)) {
          pairsA.push(a)
          pairsB.push(b)
        }
      }

      if (pairsA.length < 30) {
        warnings.push({
          type: 'insufficient_data',
          column: `${colA}, ${colB}`,
          message: `Pair ("${colA}", "${colB}") has only ${pairsA.length} common valid rows (minimum required: 30); correlation omitted.`,
        })
        // Leave values[i][j] and values[j][i] as 0 (omitted)
        continue
      }

      const corr = ss.sampleCorrelation(pairsA, pairsB)
      values[i][j] = corr
      values[j][i] = corr
    }
  }

  return {
    matrix: { columns, values },
    warnings,
  }
}

// ============================================================
// detectOutliersForColumn — Task 8.1
// ============================================================

/**
 * Detects outliers in a single column using either IQR or Z-score method.
 *
 * - IQR: value is an outlier if < Q1 - 1.5*IQR or > Q3 + 1.5*IQR
 * - Z-score: value is an outlier if |z| > 3
 *
 * Requirements: 6.1, 6.2, 6.3
 */
export function detectOutliersForColumn(
  column: string,
  values: (number | null)[],
  method: 'iqr' | 'zscore',
  rowIndices: number[],
): OutlierEntry[] {
  // Extract valid (non-null, non-NaN) values for threshold calculation
  const validValues: number[] = []
  for (const v of values) {
    if (v !== null && v !== undefined && !isNaN(v)) {
      validValues.push(v)
    }
  }

  if (validValues.length === 0) return []

  const outliers: OutlierEntry[] = []

  if (method === 'iqr') {
    const sorted = [...validValues].sort((a, b) => a - b);
    const q1 = ss.quantile(sorted, 0.25)
    const q3 = ss.quantile(sorted, 0.75)
    const iqr = q3 - q1
    const lower = q1 - 1.5 * iqr
    const upper = q3 + 1.5 * iqr

    for (let i = 0; i < values.length; i++) {
      const v = values[i]
      if (v !== null && v !== undefined && !isNaN(v)) {
        if (v < lower || v > upper) {
          outliers.push({
            rowIndex: rowIndices[i] ?? i,
            column,
            value: v,
            method: 'iqr',
          })
        }
      }
    }
  } else {
    // Z-score method requires at least 2 values for stdDev
    if (validValues.length < 2) return []

    const mean = ss.mean(validValues)
    const std = ss.standardDeviation(validValues)

    if (std === 0) return []

    for (let i = 0; i < values.length; i++) {
      const v = values[i]
      if (v !== null && v !== undefined && !isNaN(v)) {
        const z = Math.abs((v - mean) / std)
        if (z > 3) {
          outliers.push({
            rowIndex: rowIndices[i] ?? i,
            column,
            value: v,
            method: 'zscore',
          })
        }
      }
    }
  }

  return outliers
}

// ============================================================
// computeDistributions — Task 8.2
// ============================================================

/**
 * Computes frequency distributions for the given columns.
 *
 * - For each column: counts the frequency of each non-null/non-empty value.
 * - percent = (count / totalNonNull) * 100
 * - Results are sorted by frequency descending.
 *
 * Requirements: 7.1, 7.2
 */
export function computeDistributions(
  rows: Record<string, string>[],
  columns: string[],
): Distribution[] {
  const result: Distribution[] = []

  for (const column of columns) {
    const freqMap = new Map<string, number>()
    let totalNonNull = 0

    for (const row of rows) {
      const value = row[column]
      if (value !== '' && value !== null && value !== undefined) {
        totalNonNull++
        freqMap.set(value, (freqMap.get(value) ?? 0) + 1)
      }
    }

    const frequencies = Array.from(freqMap.entries())
      .map(([value, count]) => ({
        value,
        count,
        percent: totalNonNull > 0 ? (count / totalNonNull) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)

    result.push({ column, frequencies })
  }

  return result
}

// ============================================================
// computeTrends — Task 8.3
// ============================================================

/**
 * Computes linear regression trends for numeric columns relative to a date column.
 *
 * - Extracts date column values as numeric timestamps via Date.parse().
 * - For each numeric column: pairs (timestamp, numericValue) where both are valid.
 * - Computes linear regression using ss.linearRegression and R² with ss.rSquared.
 * - direction: slope > 0.001 → 'ascending', slope < -0.001 → 'descending', else 'stable'
 *
 * Requirements: 8.1, 8.2
 */
export function computeTrends(
  rows: Record<string, string>[],
  dateCol: string,
  numericCols: string[],
): Trend[] {
  const result: Trend[] = []

  // Extract timestamps
  const timestamps: (number | null)[] = rows.map((row) => {
    const raw = row[dateCol]
    if (raw === '' || raw === null || raw === undefined) return null
    const ts = Date.parse(raw)
    return isNaN(ts) ? null : ts
  })

  for (const column of numericCols) {
    // Build pairs where both timestamp and numeric value are valid
    const pairs: [number, number][] = []
    for (let i = 0; i < rows.length; i++) {
      const ts = timestamps[i]
      if (ts === null) continue
      const raw = rows[i][column]
      if (raw === '' || raw === null || raw === undefined) continue
      const num = parseFloat(raw)
      if (isNaN(num) || !isFinite(num)) continue
      pairs.push([ts, num])
    }

    // Need at least 2 points for regression
    if (pairs.length < 2) continue

    const regression = ss.linearRegression(pairs)
    const regressionLine = ss.linearRegressionLine(regression)
    const rSquared = ss.rSquared(pairs, regressionLine)

    const { m: slope } = regression

    let direction: Trend['direction']
    if (slope > 0.001) {
      direction = 'ascending'
    } else if (slope < -0.001) {
      direction = 'descending'
    } else {
      direction = 'stable'
    }

    result.push({
      column,
      temporalColumn: dateCol,
      direction,
      slope,
      rSquared,
    })
  }

  return result
}

// ============================================================
// runAnalysis — Task 9.1
// ============================================================

/**
 * Orchestrates all statistical sub-functions using ONLY the columns in
 * `input.selectedColumns`. The result NEVER references columns outside
 * that set.
 *
 * Steps:
 *  1. Filter rows to only carry selected columns
 *  2. Narrow columnProfiles to selectedColumns
 *  3. Classify columns by type (numeric, categorical, date)
 *  4. Detect outliers per numeric column
 *  5. Build columnData for correlation matrix
 *  6. Compute correlation matrix
 *  7. Compute frequency distributions for categorical columns
 *  8. Compute trends if temporalColumn is present
 *  9. Accumulate all warnings
 * 10. Return AnalysisResult
 *
 * Requirements: 3.2, 3.3
 */
export function runAnalysis(input: AnalysisInput): AnalysisResult {
  const { rows, selectedColumns, columnProfiles, outlierMethod, temporalColumn } = input

  // 1. Filter rows to only include selected columns
  const filteredRows: Record<string, string>[] = rows.map((row) => {
    const filtered: Record<string, string> = {}
    for (const col of selectedColumns) {
      filtered[col] = row[col] ?? ''
    }
    return filtered
  })

  // 2. Narrow columnProfiles to only selectedColumns
  const selectedSet = new Set(selectedColumns)
  const selectedProfiles = columnProfiles.filter((p) => selectedSet.has(p.name))

  // 3. Classify columns by detected type
  const numericCols: string[] = []
  const categoricalCols: string[] = []
  const dateCols: string[] = []

  for (const profile of selectedProfiles) {
    if (profile.detectedType === 'numeric') {
      numericCols.push(profile.name)
    } else if (profile.detectedType === 'text' || profile.detectedType === 'boolean') {
      categoricalCols.push(profile.name)
    } else if (profile.detectedType === 'date') {
      dateCols.push(profile.name)
    }
  }

  const allWarnings: Warning[] = []

  // 4. Detect outliers for each numeric column
  const outliers: OutlierEntry[] = []

  for (const col of numericCols) {
    const values: (number | null)[] = []
    const rowIndices: number[] = []

    for (let i = 0; i < filteredRows.length; i++) {
      const raw = filteredRows[i][col]
      if (raw === '' || raw === null || raw === undefined) {
        values.push(null)
      } else {
        const n = parseFloat(raw)
        values.push(isNaN(n) || !isFinite(n) ? NaN : n)
      }
      rowIndices.push(i)
    }

    const colOutliers = detectOutliersForColumn(col, values, outlierMethod, rowIndices)
    outliers.push(...colOutliers)
  }

  // 5. Build columnData (Record<string, number[]>) for correlation matrix
  //    Each entry is a full-length array with NaN for missing/invalid values
  const columnData: Record<string, number[]> = {}
  for (const col of numericCols) {
    columnData[col] = filteredRows.map((row) => {
      const raw = row[col]
      if (raw === '' || raw === null || raw === undefined) return NaN
      const n = parseFloat(raw)
      return isNaN(n) || !isFinite(n) ? NaN : n
    })
  }

  // 6. Compute correlation matrix
  const { matrix: correlationMatrix, warnings: corrWarnings } = computeCorrelationMatrix(
    columnData,
    filteredRows,
  )
  allWarnings.push(...corrWarnings)

  // 7. Compute frequency distributions for categorical columns
  const distributions = computeDistributions(filteredRows, categoricalCols)

  // 8. Compute trends if temporalColumn is defined and there are numeric columns
  let trends: Trend[] = []
  if (temporalColumn && numericCols.length > 0) {
    trends = computeTrends(filteredRows, temporalColumn, numericCols)
  }

  // 9. Return the assembled AnalysisResult
  return {
    correlationMatrix,
    outliers,
    distributions,
    trends,
    warnings: allWarnings,
  }
}
