// ============================================================
// Core data model types for InsightBoard
// ============================================================

/**
 * Metadata about a loaded CSV dataset.
 */
export interface DatasetMeta {
  filename: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  /** ISO 8601 timestamp of when the file was uploaded */
  uploadedAt: string;
  sessionId: string;
}

/**
 * Descriptive statistics for a single numeric column.
 * stdDev is null when the column has fewer than 2 non-null values.
 */
export interface DescriptiveStats {
  mean: number;
  median: number;
  /** null if fewer than 2 non-null values */
  stdDev: number | null;
  min: number;
  max: number;
  p25: number;
  p75: number;
}

/**
 * Profile of a single column: type detection, null metrics, and optional stats.
 */
export interface ColumnProfile {
  name: string;
  detectedType: 'numeric' | 'text' | 'date' | 'boolean';
  nullCount: number;
  /** Percentage of null/empty cells (0–100) */
  nullPercent: number;
  uniqueCount: number;
  /** Descriptive statistics for numeric columns; null for all other types */
  stats: DescriptiveStats | null;
}

/**
 * Pearson correlation matrix between numeric columns.
 * values[i][j] = Pearson(columns[i], columns[j])
 */
export interface CorrelationMatrix {
  columns: string[];
  values: number[][];
}

/**
 * A single detected outlier value in a specific row and column.
 */
export interface OutlierEntry {
  rowIndex: number;
  column: string;
  value: number;
  method: 'iqr' | 'zscore';
}

/**
 * Frequency distribution for a categorical or boolean column.
 */
export interface Distribution {
  column: string;
  frequencies: {
    value: string;
    count: number;
    /** Percentage of total non-null rows (0–100) */
    percent: number;
  }[];
}

/**
 * Temporal trend for a numeric column relative to a date column.
 */
export interface Trend {
  column: string;
  temporalColumn: string;
  direction: 'ascending' | 'descending' | 'stable';
  slope: number;
  rSquared: number;
}

/**
 * A warning generated during parsing or analysis.
 */
export interface Warning {
  type: 'pii' | 'high_nulls' | 'duplicate_header' | 'insufficient_data';
  column: string;
  message: string;
}

/**
 * The complete result of running the analysis engine.
 */
export interface AnalysisResult {
  /** null if fewer than 2 numeric columns were selected */
  correlationMatrix: CorrelationMatrix | null;
  outliers: OutlierEntry[];
  distributions: Distribution[];
  trends: Trend[];
  warnings: Warning[];
}

// ============================================================
// Error types (Result pattern — never thrown, always returned)
// ============================================================

/**
 * Typed errors returned by Analysis_Engine functions instead of throwing.
 */
export type AnalysisError =
  | { kind: 'insufficient_data'; column: string; minRequired: number; actual: number }
  | { kind: 'invalid_type'; column: string; expectedType: string }
  | { kind: 'empty_column'; column: string };

// ============================================================
// Parser types
// ============================================================

/**
 * Result produced by CSV_Parser after successfully parsing a file.
 */
export interface ParseResult {
  meta: DatasetMeta;
  rows: Record<string, string>[];
  warnings: Warning[];
}

// ============================================================
// Analysis input
// ============================================================

/**
 * Input payload for runAnalysis().
 */
export interface AnalysisInput {
  rows: Record<string, string>[];
  selectedColumns: string[];
  columnProfiles: ColumnProfile[];
  outlierMethod: 'iqr' | 'zscore';
  /** Optional: column to use as the temporal axis for trend analysis */
  temporalColumn?: string;
}

// ============================================================
// Session state
// ============================================================

/**
 * The complete in-memory state of a single browser-tab session.
 * Never persisted to localStorage or sessionStorage.
 */
export interface SessionState {
  /** UUID v4 generated once at session creation */
  sessionId: string;
  /** Loaded dataset, or null before any file is uploaded */
  dataset: { meta: DatasetMeta; rows: Record<string, string>[] } | null;
  columnProfiles: ColumnProfile[];
  /** Set of column names currently selected for analysis */
  selectedColumns: Set<string>;
  /** Result of the most recent analysis run, or null */
  analysisResult: AnalysisResult | null;
  warnings: Warning[];
}
